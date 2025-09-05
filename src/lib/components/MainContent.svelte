<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { settings } from '../stores/settings';
  import { sendChatRequest, type Message } from '../services/groq';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import { keyboardShortcuts, DEFAULT_SHORTCUTS, type ShortcutAction } from '../services/keyboardShortcuts';

  // Define content part types
  type TextContent = {
    type: 'text';
    text: string;
  };

  type ImageContent = {
    type: 'image_url';
    image_url: {
      url: string;
    };
  };

  type ContentPart = TextContent | ImageContent;

  // Function to safely convert any content to a readable string
  function safeStringify(content: any): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'number' || typeof content === 'boolean') {
      return String(content);
    }

    if (typeof content === 'object') {
      try {
        // If it's an array, join the elements
        if (Array.isArray(content)) {
          return content.map(item => safeStringify(item)).join('');
        }

        // If it has a text property, use that
        if (content.text && typeof content.text === 'string') {
          return content.text;
        }

        // If it has a content property, use that
        if (content.content && typeof content.content === 'string') {
          return content.content;
        }

        // If it has a message property, use that
        if (content.message && typeof content.message === 'string') {
          return content.message;
        }

        // If it has innerHTML or outerHTML (for DOM elements), use that
        if (content.innerHTML && typeof content.innerHTML === 'string') {
          return content.innerHTML;
        }

        // If it has a raw property (common in marked.js tokens), use that
        if (content.raw && typeof content.raw === 'string') {
          return content.raw;
        }

        // If it has a value property, use that
        if (content.value && typeof content.value === 'string') {
          return content.value;
        }

        // For objects with only primitive values, try to extract meaningful text
        const values = Object.values(content).filter(v =>
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        );
        if (values.length > 0) {
          return values.map(v => String(v)).join(' ');
        }

        // Try to format as readable JSON as last resort
        return JSON.stringify(content, null, 2);
      } catch (e) {
        console.warn('Error stringifying object:', e);
        return 'Unable to display content';
      }
    }

    // Fallback for any other type
    return String(content);
  }

  // Chrome extension API type declarations
  interface ChromeRuntime {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => boolean | void) => void;
    };
    lastError?: {
      message: string;
    };
  }
  
  interface ChromeTabs {
    query: (queryInfo: {active: boolean, currentWindow: boolean}, callback: (tabs: any[]) => void) => void;
    captureVisibleTab: (windowId: number | null, options: {format: string}, callback: (dataUrl: string) => void) => void;
    sendMessage: (tabId: number, message: any, callback?: (response: any) => void) => void;
  }
  
  interface ChromeScripting {
    executeScript: (details: {target: {tabId: number}, files?: string[], func?: Function, args?: any[]}) => Promise<any[]>;
  }
  
  interface Chrome {
    runtime: ChromeRuntime;
    tabs: ChromeTabs;
    scripting: ChromeScripting;
  }
  
  // Type declaration for global chrome variable
  const chrome = (window as any).chrome as Chrome;
  
  // Crop area type with enhanced page context
  interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
    dpr: number;
    pageUrl?: string;
    pageDomain?: string;
    pageTitle?: string;
    pageDescription?: string;
    timestamp?: number;
    viewport?: {
      width: number;
      height: number;
    };
  }

  let message = $state("");
  let messages = $state<Message[]>([]);
  
  let chatContainer: HTMLDivElement | null = null;
  let isNewChat = $state(false);
  let isHoveringNewChat = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state("");
  let attachedImage = $state<string | null>(null);
  let isHoveringAttachedImage = $state(false);
  let cropAreaInfo = $state<CropArea | null>(null);
  let messageInput: HTMLInputElement | null = null;

  // Batch processing state
  interface BatchImage {
    id: string;
    imageData: string;
    cropArea: CropArea;
  }

  let batchImages = $state<BatchImage[]>([]);
  let isBatchMode = $state(false);

  async function sendMessage() {
    if (message.trim() || attachedImage) {
      // Check if API key is available
      if (!$settings.apiKey) {
        errorMessage = "Please set your API key in Settings first";
        return;
      }

      // Handle image + text message
      if (attachedImage && cropAreaInfo) {
        sendMessageWithImage(message || "What's in this image?", attachedImage);
        attachedImage = null;
        cropAreaInfo = null;
        message = "";
        return;
      }

      // Handle text-only message
      const userMessage: Message = {
        role: 'user',
        content: message.trim()
      };
      
      messages = [...messages, userMessage];
      message = "";
      isLoading = true;
      errorMessage = "";
      
      try {
        // Send message to Groq API
        const messagesForAPI = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
        const response = await sendChatRequest(messagesForAPI);
        
        if (response.error) {
          errorMessage = response.error;
          return;
        }
        
        // Add AI response to the chat
        const aiResponse: Message = {
          role: 'assistant',
          content: response.content
        };
        
        messages = [...messages, aiResponse];
      } catch (error) {
        console.error('Error sending message:', error);
        errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      } finally {
        isLoading = false;
      }
    }
  }
  
  function startNewChat() {
    messages = [];
    isNewChat = true;
    errorMessage = "";
    attachedImage = null;
    cropAreaInfo = null;
  }
  
  // Direct screenshot function that takes the entire tab screenshot without prompt
  function directCaptureScreenshot() {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      if (!tabs || tabs.length === 0) {
        errorMessage = "No active tab found";
        return;
      }
      
      const activeTab = tabs[0];
      
      // Check if the tab is a restricted URL (chrome://, edge://, etc.)
      if (activeTab.url.startsWith('chrome://') || 
          activeTab.url.startsWith('edge://') || 
          activeTab.url.startsWith('brave://') || 
          activeTab.url.startsWith('about:') ||
          activeTab.url.startsWith('chrome-extension://')) {
        errorMessage = "Cannot capture screenshots of browser pages. Please navigate to a website first.";
        return;
      }
      
      try {
        // Execute a function directly in the tab context to gather page information
        const results = await chrome.scripting.executeScript({
          target: {tabId: activeTab.id},
          func: () => {
            // Get page metadata
            const getMetaContent = (name: string): string => {
              const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`);
              return meta?.getAttribute('content') || '';
            };

            return {
              width: window.innerWidth,
              height: window.innerHeight,
              dpr: window.devicePixelRatio || 1,
              url: window.location.href,
              title: document.title,
              description: getMetaContent('description'),
              domain: window.location.hostname,
              timestamp: Date.now()
            };
          }
        });
        
        if (!results || results.length === 0) {
          errorMessage = "Could not get tab dimensions";
          return;
        }

        const pageInfo = results[0].result;

        // Now capture the full tab
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
          if (chrome.runtime.lastError) {
            errorMessage = `Screenshot error: ${chrome.runtime.lastError.message}`;
            return;
          }

          // Store the screenshot and crop info with enhanced page context
          const fullCropArea: CropArea = {
            x: 0,
            y: 0,
            width: pageInfo.width,
            height: pageInfo.height,
            dpr: pageInfo.dpr,
            pageUrl: pageInfo.url,
            pageDomain: pageInfo.domain,
            pageTitle: pageInfo.title,
            pageDescription: pageInfo.description,
            timestamp: pageInfo.timestamp,
            viewport: {
              width: pageInfo.width,
              height: pageInfo.height
            }
          };
          
          // Process the cropped image and attach it to the message input
          cropImage(dataUrl, fullCropArea).then(croppedImage => {
            if (isBatchMode) {
              // Add to batch instead of attaching directly
              addToBatch(croppedImage, fullCropArea);
            } else {
              attachedImage = croppedImage;
              cropAreaInfo = fullCropArea;
            }
          }).catch(error => {
            console.error('Error processing screenshot:', error);
            errorMessage = `Screenshot processing error: ${error instanceof Error ? error.message : String(error)}`;
          });
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Cannot access contents of the page")) {
          errorMessage = "Cannot capture screenshots of this page due to security restrictions. Please try a different website.";
        } else {
          errorMessage = `Screenshot error: ${err instanceof Error ? err.message : String(err)}`;
        }
        console.error("Error in direct screenshot:", err);
      }
    });
  }
  
  // Function to capture a selected region using the content script
  function captureSelectedRegion() {
    chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
      if (!tabs || tabs.length === 0) {
        errorMessage = "No active tab found";
        return;
      }
      
      const activeTab = tabs[0];
      
      // Check if the tab is a restricted URL (chrome://, edge://, etc.)
      if (activeTab.url.startsWith('chrome://') || 
          activeTab.url.startsWith('edge://') || 
          activeTab.url.startsWith('brave://') || 
          activeTab.url.startsWith('about:') ||
          activeTab.url.startsWith('chrome-extension://')) {
        errorMessage = "Cannot capture screenshots of browser pages. Please navigate to a website first.";
        return;
      }
      
      try {
        // First, ensure we have proper access to the tab by executing a simple script
        await chrome.scripting.executeScript({
          target: {tabId: activeTab.id},
          func: () => {
            return { status: "OK" };
          }
        });
        
        // First capture the full screenshot, which we'll pass to the content script
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
          if (chrome.runtime.lastError) {
            errorMessage = `Screenshot error: ${chrome.runtime.lastError.message}`;
            return;
          }
          
          // Function to send the selection UI message with retry logic
          const showSelectionUI = (retryCount = 2) => {
            console.log(`Attempting to show selection UI (attempts left: ${retryCount})`);
            
            // Now directly inject and communicate with the content script
            chrome.scripting.executeScript({
              target: {tabId: activeTab.id},
              files: ['content-script.js']
            }).then(() => {
              // Give a small delay to ensure content script is loaded
              setTimeout(() => {
                // Send the screenshot to the content script for selection
                chrome.tabs.sendMessage(activeTab.id, {
                  action: 'showSelectionUIWithScreenshot',
                  screenshot: dataUrl
                }, (response) => {
                  if (chrome.runtime.lastError || !response || !response.success) {
                    const error = chrome.runtime.lastError 
                      ? chrome.runtime.lastError.message 
                      : 'Failed to show selection UI';
                    
                    console.error(`Error showing selection UI (attempt ${3-retryCount}/3):`, error);
                    
                    if (retryCount > 0) {
                      // Try again with a longer delay
                      setTimeout(() => showSelectionUI(retryCount - 1), 500);
                    } else {
                      // All retries failed
                      errorMessage = `Region selection failed: ${error}`;
                    }
                  } else {
                    console.log('Selection UI shown successfully');
                  }
                });
              }, 300);
            }).catch(err => {
              console.error("Error injecting content script:", err);
              
              if (retryCount > 0) {
                // Try again with a longer delay
                setTimeout(() => showSelectionUI(retryCount - 1), 500);
              } else {
                errorMessage = `Region selection failed: ${err.message}`;
              }
            });
          };
          
          // Start the process with initial retry count
          showSelectionUI();
        });
      } catch (err) {
        errorMessage = `Region selection error: ${err instanceof Error ? err.message : String(err)}`;
        console.error("Error initiating region selection:", err);
      }
    });
  }
  
  // Listen for screenshotCaptured message from the background script
  chrome.runtime.onMessage.addListener((msgEvent: {action: string, imageData?: string, cropArea?: CropArea, prompt?: string}, 
                                       sender: any, 
                                       sendResponse: (response: {success: boolean}) => void) => {
    if (msgEvent.action === 'screenshotCaptured') {
      console.log('Screenshot captured, processing');
      
      // Process the captured screenshot
      if (msgEvent.imageData && msgEvent.cropArea) {
        // Instead of processing with a prompt, just attach it to the input
        cropImage(msgEvent.imageData, msgEvent.cropArea).then(croppedImage => {
          if (isBatchMode) {
            // Add to batch instead of attaching directly
            addToBatch(croppedImage, msgEvent.cropArea || {
              x: 0, y: 0, width: 0, height: 0, dpr: 1
            });
          } else {
            attachedImage = croppedImage;
            cropAreaInfo = msgEvent.cropArea || null;
          }

          // If a prompt was provided with the screenshot, put it in the message input
          if (msgEvent.prompt) {
            // Set the message input field with the prompt that came with the screenshot
            message = msgEvent.prompt;
          }

          // Ensure the UI is updated
          setTimeout(() => {
            console.log('Screenshot attached, ready for chat');
          }, 100);
        }).catch(error => {
          console.error('Error processing screenshot:', error);
          errorMessage = `Screenshot processing error: ${error instanceof Error ? error.message : String(error)}`;
        });
      } else {
        console.error('Screenshot data missing required fields:', msgEvent);
        errorMessage = "Screenshot data incomplete";
      }
      
      // Send response back
      sendResponse({ success: true });
      return true;
    }
    
    return false; // Let other handlers process unhandled messages
  });
  
  function removeAttachedImage() {
    attachedImage = null;
    cropAreaInfo = null;
  }

  // Batch processing functions
  function toggleBatchMode() {
    isBatchMode = !isBatchMode;
    if (!isBatchMode) {
      batchImages = [];
    }
  }

  function addToBatch(imageData: string, cropArea: CropArea) {
    const batchImage: BatchImage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      imageData,
      cropArea
    };

    batchImages = [...batchImages, batchImage];
  }

  function removeBatchImage(imageId: string) {
    batchImages = batchImages.filter(img => img.id !== imageId);
  }

  async function processBatchImages() {
    if (batchImages.length === 0) return;

    // Check if API key is available
    if (!$settings.apiKey) {
      errorMessage = "Please set your API key in Settings first";
      return;
    }

    const promptText = message.trim() || "Analyze these images and provide insights.";

    // Build context with all images and their OCR results
    let contextText = promptText;

    // Add batch context
    contextText += `\n\n**Batch Analysis of ${batchImages.length} Images:**`;

    batchImages.forEach((img, index) => {
      contextText += `\n\n**Image ${index + 1}:**`;

      if (img.cropArea.pageTitle) {
        contextText += `\nPage: ${img.cropArea.pageTitle}`;
      }
      if (img.cropArea.pageUrl) {
        contextText += `\nURL: ${img.cropArea.pageUrl}`;
      }
    });

    // Create message with all images
    const contentParts: ContentPart[] = [
      {
        type: 'text',
        text: contextText
      }
    ];

    // Add all images
    batchImages.forEach(img => {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: img.imageData
        }
      });
    });

    const userMessage: Message = {
      role: 'user',
      content: contentParts
    };

    messages = [...messages, userMessage];
    message = "";
    isLoading = true;
    errorMessage = "";

    // Clear batch after sending
    batchImages = [];
    isBatchMode = false;

    try {
      // Send message to Groq API
      const messagesForAPI = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
      const response = await sendChatRequest(messagesForAPI);

      if (response.error) {
        errorMessage = response.error;
        return;
      }

      // Add AI response to the chat
      const aiResponse: Message = {
        role: 'assistant',
        content: response.content
      };

      messages = [...messages, aiResponse];
    } catch (error) {
      console.error('Error sending batch message:', error);
      errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    } finally {
      isLoading = false;
    }
  }
  
  function handleAttachedImageMouseEnter() {
    isHoveringAttachedImage = true;
  }
  
  function handleAttachedImageMouseLeave() {
    isHoveringAttachedImage = false;
  }
  
  // Helper function to crop an image
  function cropImage(imageUrl: string, cropArea: CropArea): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        
        img.onload = function() {
          try {
            console.log('Image loaded, dimensions:', img.width, 'x', img.height);
            console.log('Crop area:', cropArea);
            
            const canvas = document.createElement('canvas');
            // Get device pixel ratio, defaulting to 1 if not provided
            const dpr = cropArea.dpr || window.devicePixelRatio || 1;
            console.log('Using device pixel ratio:', dpr);
            
            // Set canvas size to the crop dimensions
            canvas.width = cropArea.width;
            canvas.height = cropArea.height;
            
            const ctx = canvas.getContext('2d');
            
            // Draw only the selected portion of the image
            // Apply DPR to correctly scale crop coordinates
            ctx?.drawImage(
              img,
              cropArea.x * dpr,             // Source X adjusted for DPR
              cropArea.y * dpr,             // Source Y adjusted for DPR
              cropArea.width * dpr,         // Source width adjusted for DPR
              cropArea.height * dpr,        // Source height adjusted for DPR
              0, 0,                         // Destination X, Y (0,0 for the canvas)
              cropArea.width,               // Destination width
              cropArea.height               // Destination height
            );
            
            const croppedImageUrl = canvas.toDataURL('image/png');
            resolve(croppedImageUrl);
          } catch (err) {
            console.error('Error drawing image on canvas:', err);
            reject(err);
          }
        };
        
        img.onerror = function(err) {
          console.error('Error loading image for cropping:', err);
          reject(new Error('Failed to load image for cropping'));
        };
        
        img.src = imageUrl;
      } catch (error) {
        console.error('Error in cropImage:', error);
        reject(error);
      }
    });
  }
  
  // Send a message with an image
  async function sendMessageWithImage(promptText: string, imageData: string) {
    // Check if API key is available
    if (!$settings.apiKey) {
      errorMessage = "Please set your API key in Settings first";
      return;
    }

    if (!promptText || !promptText.trim()) {
      // Use a default prompt if none provided
      promptText = "What's in this image?";
    }

    // Build context information if available
    let contextText = promptText;
    if (cropAreaInfo) {
      const contextParts = [];

      if (cropAreaInfo.pageTitle) {
        contextParts.push(`Page Title: ${cropAreaInfo.pageTitle}`);
      }

      if (cropAreaInfo.pageUrl) {
        contextParts.push(`URL: ${cropAreaInfo.pageUrl}`);
      }

      if (cropAreaInfo.pageDomain) {
        contextParts.push(`Domain: ${cropAreaInfo.pageDomain}`);
      }

      if (cropAreaInfo.pageDescription) {
        contextParts.push(`Page Description: ${cropAreaInfo.pageDescription}`);
      }

      if (contextParts.length > 0) {
        contextText = `${promptText}\n\n**Page Context:**\n${contextParts.join('\n')}`;
      }
    }



    // Add the screenshot and query as a message
    const userMessage: Message = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: contextText
        },
        {
          type: 'image_url',
          image_url: {
            url: imageData
          }
        }
      ] as ContentPart[]
    };
    
    messages = [...messages, userMessage];
    isLoading = true;
    errorMessage = "";
    
    // Process the message with the image
    try {
      // Send message to Groq API
      const messagesForAPI = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
      const response = await sendChatRequest(messagesForAPI);
      
      if (response.error) {
        errorMessage = response.error;
        return;
      }
      
      // Add AI response to the chat
      const aiResponse: Message = {
        role: 'assistant',
        content: response.content
      };
      
      messages = [...messages, aiResponse];
    } catch (error) {
      console.error('Error sending message with image:', error);
      errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    } finally {
      isLoading = false;
    }
  }

  function handleMouseEnter() {
    isHoveringNewChat = true;
  }

  function handleMouseLeave() {
    isHoveringNewChat = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  }

  onMount(() => {
    scrollToBottom();
    setupKeyboardShortcuts();
  });

  onDestroy(() => {
    keyboardShortcuts.stopListening();
  });

  function setupKeyboardShortcuts() {
    // Register keyboard shortcuts
    const shortcuts: ShortcutAction[] = [
      {
        ...DEFAULT_SHORTCUTS.TAKE_SCREENSHOT,
        action: () => {
          if (!isLoading && !attachedImage) {
            directCaptureScreenshot();
          }
        }
      },
      {
        ...DEFAULT_SHORTCUTS.SELECT_REGION,
        action: () => {
          if (!isLoading && !attachedImage) {
            captureSelectedRegion();
          }
        }
      },
      {
        ...DEFAULT_SHORTCUTS.NEW_CHAT,
        action: () => {
          startNewChat();
        }
      },
      {
        ...DEFAULT_SHORTCUTS.FOCUS_INPUT,
        action: () => {
          if (messageInput) {
            messageInput.focus();
          }
        }
      },
      {
        ...DEFAULT_SHORTCUTS.ESCAPE,
        action: () => {
          if (attachedImage) {
            removeAttachedImage();
          } else if (isBatchMode) {
            toggleBatchMode();
          }
        }
      },
      {
        key: 'b',
        ctrlKey: true,
        description: 'Toggle batch mode',
        action: () => {
          toggleBatchMode();
        }
      }
    ];

    // Register all shortcuts
    shortcuts.forEach(shortcut => {
      keyboardShortcuts.register(shortcut);
    });

    // Start listening
    keyboardShortcuts.startListening();
  }
  
  function scrollToBottom() {
    if (chatContainer && chatContainer.scrollHeight) {
      setTimeout(() => {
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 0);
    }
  }

  // Copy message content to clipboard
  async function copyToClipboard(content: string | ContentPart[]) {
    try {
      let textToCopy = '';
      
      if (typeof content === 'string') {
        textToCopy = content;
      } else if (Array.isArray(content)) {
        // Extract text from content parts
        const textParts = content
          .filter(part => part && part.type === 'text')
          .map(part => part.text)
          .join('\n');
        textToCopy = textParts;
      } else {
        textToCopy = safeStringify(content);
      }

      await navigator.clipboard.writeText(textToCopy);
      
      // You could add a toast notification here if desired
      console.log('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = typeof content === 'string' ? content : safeStringify(content);
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Copied to clipboard (fallback)');
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }
  
  $effect(() => {
    // Auto-scroll when messages change
    if (messages.length) scrollToBottom();
  });
</script>

<div class="flex flex-col h-full">
  <!-- Chat Messages Container - Full height, relative positioning -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm flex-1 flex flex-col relative h-full">
    <!-- New Chat Button - Semi-transparent, becomes opaque on hover -->
    <div 
      class="absolute top-3 left-3 z-10"
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
      role="region"
      aria-label="New chat controls"
    >
      <button 
        class="bg-logo-purple dark:bg-logo-purple text-white p-2 rounded-full hover:bg-logo-purple hover:shadow-lg transition-all duration-200"
        style="opacity: {isHoveringNewChat ? '1' : '0.7'};"
        onclick={startNewChat}
        title="New Chat"
        aria-label="Start a new chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
      </button>
      <div 
        class="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-sm whitespace-nowrap transition-opacity duration-200"
        style="opacity: {isHoveringNewChat ? '1' : '0'};"
      >
        New Chat
      </div>
    </div>
    
    <!-- Scrollable Message Area with proper height calculation -->
    <div 
      class="flex-1 overflow-y-auto p-4 pb-20" 
      bind:this={chatContainer}
      style="max-height: calc(100% - 60px);"
    >
      {#if messages.length === 0}
        <div class="flex items-center justify-center h-full">
          <div class="text-center text-gray-500 dark:text-gray-400 max-w-md">
            <div class="mb-6">
              <p class="text-lg font-medium">Start a new conversation</p>
              <p class="text-sm mt-2">Your messages will appear here</p>
            </div>

            <!-- Keyboard Shortcuts -->
            <div class="text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-4">
              <h3 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">⌨️ Keyboard Shortcuts</h3>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between items-center">
                  <span>Take screenshot</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+S</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span>Select region</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+Shift+S</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span>New chat</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+N</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span>Batch mode</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+B</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span>Focus input</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">/</kbd>
                </div>
                <div class="flex justify-between items-center">
                  <span>Send message</span>
                  <kbd class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                </div>
              </div>
            </div>

            <!-- Features -->
            <div class="text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
              <h3 class="text-sm font-semibold mb-3 text-blue-700 dark:text-blue-300">✨ Features</h3>
              <div class="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                <div>📸 Full page & region screenshots</div>
                <div>🔄 Batch image processing</div>
                <div>🌐 Automatic page context</div>
                <div>📝 Markdown formatted responses</div>
                <div>⚡ Fast AI inference with Groq</div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        {#each messages as msg}
          <div class="mb-4 flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="relative group {msg.role === 'user' ? 'bg-logo-purple dark:bg-logo-purple text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'} rounded-xl p-3 max-w-[80%] break-words">
              {#if typeof msg.content === 'string'}
                {#if msg.role === 'assistant'}
                  <MarkdownRenderer content={msg.content} />
                {:else}
                  {safeStringify(msg.content)}
                {/if}
              {:else if Array.isArray(msg.content)}
                {#each msg.content as contentPart}
                  {#if contentPart && contentPart.type === 'text'}
                    <div>
                      {#if msg.role === 'assistant'}
                        <MarkdownRenderer content={safeStringify(contentPart.text)} />
                      {:else}
                        {safeStringify(contentPart.text)}
                      {/if}
                    </div>
                  {:else if contentPart && contentPart.type === 'image_url' && contentPart.image_url && contentPart.image_url.url}
                    <div class="mt-2">
                      <img src={contentPart.image_url.url} alt="Screenshot" class="rounded-lg max-w-full max-h-64" />
                    </div>
                  {:else}
                    <!-- Fallback for unknown content part types -->
                    <div class="text-sm opacity-75">
                      {safeStringify(contentPart)}
                    </div>
                  {/if}
                {/each}
              {:else}
                <!-- Fallback for non-string, non-array content -->
                <div>
                  {#if msg.role === 'assistant'}
                    <MarkdownRenderer content={safeStringify(msg.content)} />
                  {:else}
                    {safeStringify(msg.content)}
                  {/if}
                </div>
              {/if}
              
              <!-- Copy Button - only for assistant messages -->
              {#if msg.role === 'assistant'}
                <button
                  class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  onclick={() => copyToClipboard(msg.content)}
                  title="Copy message"
                  aria-label="Copy message to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}
        
        {#if isLoading}
          <div class="flex justify-start mb-4">
            <div class="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex items-center gap-2">
              <div class="flex gap-1">
                <div class="w-2 h-2 bg-logo-purple dark:bg-logo-purple rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-logo-purple dark:bg-logo-purple rounded-full animate-bounce" style="animation-delay: 200ms"></div>
                <div class="w-2 h-2 bg-logo-purple dark:bg-logo-purple rounded-full animate-bounce" style="animation-delay: 400ms"></div>
              </div>
              <span class="text-sm text-gray-600 dark:text-gray-300"></span>
            </div>
          </div>
        {/if}
        
        {#if errorMessage}
          <div class="flex justify-center mb-4">
            <div class="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-xl p-3 max-w-[80%] break-words">
              <p class="text-sm font-medium">Error: {errorMessage}</p>
            </div>
          </div>
        {/if}
      {/if}
    </div>
    
    <!-- Fixed Chat Input - Fixed positioning to ensure visibility -->
    <div class="absolute bottom-0 left-0 right-0 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md z-10">

      <!-- Batch Mode Toggle -->
      <div class="mb-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            class="text-xs px-2 py-1 rounded {isBatchMode ? 'bg-logo-purple text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'} hover:opacity-80 transition"
            onclick={toggleBatchMode}
            title="Toggle batch mode to capture multiple screenshots"
          >
            {isBatchMode ? '📸 Batch Mode ON' : '📸 Batch Mode'}
          </button>

          {#if isBatchMode && batchImages.length > 0}
            <span class="text-xs text-gray-600 dark:text-gray-400">
              {batchImages.length} image{batchImages.length !== 1 ? 's' : ''} captured
            </span>

            <button
              class="text-xs px-2 py-1 bg-logo-purple text-white rounded hover:bg-logo-purple/90 transition"
              onclick={processBatchImages}
              disabled={isLoading}
            >
              Analyze Batch
            </button>
          {/if}
        </div>

      </div>

      <!-- Batch Images Preview -->
      {#if isBatchMode && batchImages.length > 0}
        <div class="mb-2 flex gap-2 overflow-x-auto pb-2">
          {#each batchImages as batchImg}
            <div class="relative flex-shrink-0">
              <img src={batchImg.imageData} alt="Batch screenshot" class="h-12 w-16 object-cover rounded border" />

              <!-- Remove button -->
              <button
                class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                onclick={() => removeBatchImage(batchImg.id)}
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      {/if}
      <!-- Attached Image Preview -->
      {#if attachedImage}
        <div
          class="relative mb-2 inline-block"
          onmouseenter={handleAttachedImageMouseEnter}
          onmouseleave={handleAttachedImageMouseLeave}
          role="button"
          tabindex="0"
        >
          <div class="relative bg-gray-200 dark:bg-gray-700 rounded-lg p-1 inline-flex items-center">
            <img src={attachedImage} alt="Attached screenshot" class="h-16 rounded-lg object-contain" />
            
            <!-- Remove button -->
            <button 
              class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md transition-opacity duration-200"
              style="opacity: {isHoveringAttachedImage ? '1' : '0.7'};"
              onclick={removeAttachedImage}
              aria-label="Remove attached image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            
            <span class="ml-1 text-xs text-gray-600 dark:text-gray-300">Type your question about this image</span>
          </div>
        </div>
      {/if}
      
      <div class="flex gap-2 items-center">
        <input
          type="text"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={attachedImage ? "Ask about this image..." : "Type your message..."}
          bind:value={message}
          bind:this={messageInput}
          onkeydown={handleKeyDown}
          disabled={isLoading}
        />
        
        <!-- Region Selection Button -->
        <button 
          class="bg-white dark:bg-gray-700 text-logo-purple dark:text-logo-purple p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition border border-logo-purple dark:border-logo-purple"
          onclick={captureSelectedRegion}
          title="Select a region to screenshot"
          aria-label="Select a region of the screen for your question"
          disabled={isLoading || attachedImage !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm2 2v8h10V5H5z" clip-rule="evenodd" />
            <path d="M7 7h6v6H7V7z" />
          </svg>
        </button>
        
        <!-- Screenshot Button -->
        <button 
          class="bg-white dark:bg-gray-700 text-logo-purple dark:text-logo-purple p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition border border-logo-purple dark:border-logo-purple"
          onclick={directCaptureScreenshot}
          title="Take a screenshot"
          aria-label="Take a screenshot for your question"
          disabled={isLoading || attachedImage !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        </button>
        
        <!-- Send Button -->
        <button
          class="bg-logo-purple dark:bg-logo-purple text-white p-2 rounded-full hover:bg-logo-purple/90 dark:hover:bg-logo-purple/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={isBatchMode && batchImages.length > 0 ? processBatchImages : sendMessage}
          disabled={(message.trim() === "" && !attachedImage && batchImages.length === 0) || isLoading}
          aria-label={isBatchMode && batchImages.length > 0 ? "Analyze batch images" : "Send message"}
        >
          {#if isLoading}
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
