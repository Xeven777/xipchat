<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    content: any;
  }

  let { content }: Props = $props();
  let renderedText = $state('');

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

  // Function to clean markdown and return plain text
  function cleanMarkdownToText(text: any): string {
    try {
      // Safely convert to string first
      const textContent = safeStringify(text);

      // Remove markdown formatting
      let cleanText = textContent
        // Remove headers (# ## ### etc.)
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic (**text** *text* __text__ _text_)
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        // Remove strikethrough (~~text~~)
        .replace(/~~(.*?)~~/g, '$1')
        // Remove inline code (`code`)
        .replace(/`([^`]+)`/g, '$1')
        // Remove code blocks (```code```)
        .replace(/```[\s\S]*?```/g, '')
        // Remove links [text](url)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images ![alt](url)
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove blockquotes (> text)
        .replace(/^>\s+/gm, '')
        // Remove horizontal rules (--- or ***)
        .replace(/^[-*]{3,}$/gm, '')
        // Remove list markers (- * + 1. 2. etc.)
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        // Remove extra whitespace and normalize line breaks
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return cleanText;
    } catch (error) {
      console.error('Error cleaning markdown:', error);
      // Fallback to safe stringify
      return safeStringify(text);
    }
  }

  // Reactive statement to update rendered text when content changes
  $effect(() => {
    renderedText = cleanMarkdownToText(content);
  });

  onMount(() => {
    renderedText = cleanMarkdownToText(content);
  });
</script>

<!-- Render the plain text with proper styling and line breaks -->
<div class="text-content whitespace-pre-wrap break-words">
  {renderedText}
</div>

<style>
  .text-content {
    line-height: 1.6;
  }
</style>
