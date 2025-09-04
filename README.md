# Xipchat - Llama 4 Multi-Modal Chrome Extension

**Chrome extension with Llama 4 multi-modal AI via Groq's fast inference. Chat with AI and analyze webpages directly in your browser.**

![xipchat demo](xipchat.gif)

## Overview

This Chrome extension demonstrates multi-modal AI chat capabilities using Groq API for ultra-fast inference with Llama 4 models, built as a complete template that you can fork, customize, and deploy as your own Chrome extension.

The extension opens as a chat interface in Chrome's side panel, but its true power lies in its **vision capabilities** - users can select any region of a webpage or capture full-page screenshots, then ask Llama 4 questions about the visual content, from analyzing UI designs to extracting data from charts and diagrams.

**Key Features:**

- **Multi-Modal AI** powered by Llama 4 Maverick and Scout models for text and image understanding
- **Visual Analysis**: Select regions or capture full-page screenshots for AI-powered image analysis
- **Batch Processing**: Capture and analyze multiple screenshots simultaneously for comprehensive workflows
- **Smart Context**: Automatic page metadata integration (title, URL, domain) for enhanced AI understanding
- **Markdown Responses**: Beautifully formatted AI responses with code blocks, tables, and rich text
- **Power User Shortcuts**: Comprehensive keyboard shortcuts for lightning-fast workflow
- **Contextual Chat**: Ask questions about visual content with full context awareness
- Sub-second response times with Groq Fast AI Inference acceleration

## Try It Now

**Want to test the extension immediately without setting up a development environment?**

1. **Download the Latest Release**

   - Go to the [Releases section](https://github.com/xeven777/xipchat/releases) of this repository
   - Download the latest `xipchat-extension.zip` file
   - Extract the ZIP file to a folder on your computer

2. **Load the Unpacked Extension**

   - Open `chrome://extensions` in your Chrome browser
   - Enable **Developer Mode** (toggle in the top-right corner)
   - Click **Load unpacked** and select the extracted folder

3. **Start Using xipchat**
   - Click the xipchat extension icon in your Chrome toolbar
   - Enter your [Groq API key](https://console.groq.com/keys) in the settings
   - Begin chatting with Llama 4 and analyzing webpage content!

**No coding required** - just download, load, and start exploring the power of multi-modal AI in your browser.

## ✨ New Features & Enhancements

### **🚀 Productivity Features**

- **⌨️ Keyboard Shortcuts**: Lightning-fast workflow with comprehensive shortcuts

  - `Ctrl+S` - Take full page screenshot
  - `Ctrl+Shift+S` - Select region for screenshot
  - `Ctrl+N` - Start new chat
  - `Ctrl+B` - Toggle batch mode
  - `/` - Focus message input
  - `Enter` - Send message
  - `Escape` - Cancel current action

- **📸 Batch Screenshot Processing**: Capture multiple screenshots and analyze them together
  - Queue multiple screenshots for comprehensive analysis
  - Visual preview of all captured images
  - Perfect for analyzing user flows, comparing designs, or processing workflows

### **🧠 Enhanced AI Intelligence**

- **🌐 Smart Page Context**: Automatically includes page metadata with every screenshot

  - Page title, URL, domain, and description
  - Enhanced AI understanding of what it's analyzing
  - More relevant and accurate responses

- **📝 Markdown Formatted Responses**: Professional-quality AI responses
  - Code blocks with syntax highlighting
  - Tables, lists, and structured content
  - Links, headings, and rich text formatting
  - Copy-friendly code snippets

### **💡 User Experience Improvements**

- **🎯 Interactive Welcome Screen**: Helpful shortcuts and features guide
- **⚡ Optimized Performance**: Faster loading and reduced bundle size
- **♿ Accessibility**: Improved keyboard navigation and screen reader support
- **🎨 Visual Feedback**: Clear indicators for batch mode and processing states

## Architecture

**Tech Stack:**

- **Frontend:** Svelte 5, TypeScript, TailwindCSS, DaisyUI
- **Build System:** Vite with Chrome Extension optimization
- **Extension Framework:** Chrome Manifest V3 with service workers
- **AI Infrastructure:** Groq API with Llama 4 Maverick and Scout models

**Extension Components:**

- **Side Panel:** Main chat interface accessible from Chrome toolbar
- **Content Scripts:** Web page interaction capabilities
- **Background Service Worker:** Extension lifecycle and API management
- **Popup/Action:** Quick access and settings

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/) (v7 or higher)
- [Google Chrome](https://www.google.com/chrome/)
- Groq API key ([Create a free GroqCloud account and generate an API key here](https://console.groq.com/keys))

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/xeven777/xipchat
   cd xipchat
   ```

2. **Install Dependencies**

   ```bash
   bun install
   ```

3. **Build for Production**

   ```bash
   bun run build
   ```

   The production-ready extension will be output to the `dist/` directory.

4. **Load Extension in Chrome**

   - Open `chrome://extensions` in your browser
   - Enable **Developer Mode** (toggle in the top-right corner)
   - Click **Load unpacked** and select the `dist/` folder

5. **Configure API Key**
   - Click the xipchat extension icon in Chrome toolbar
   - Enter your [Groq API key](https://console.groq.com/keys) in the settings
   - Start chatting with Llama 4 models!

## 🚀 How to Use New Features

### **Keyboard Shortcuts**

- **Quick Screenshots**: Press `Ctrl+S` for instant full-page capture or `Ctrl+Shift+S` for region selection
- **Fast Navigation**: Use `Ctrl+N` for new chat, `/` to focus input, `Enter` to send
- **Batch Mode**: Toggle with `Ctrl+B` to capture multiple screenshots

### **Batch Processing Workflow**

1. **Enable Batch Mode**: Click the "📸 Batch Mode" button or press `Ctrl+B`
2. **Capture Multiple Screenshots**: Take screenshots normally - they'll be added to the batch queue
3. **Review Your Batch**: See thumbnail previews of all captured images
4. **Analyze Together**: Click "Analyze Batch" to send all images for comprehensive analysis
5. **Exit Batch Mode**: Press `Escape` or click the batch toggle to return to single-image mode

### **Smart Context Features**

- **Automatic Context**: Page title, URL, and metadata are automatically included with screenshots
- **Enhanced Responses**: AI receives rich context about what it's analyzing for better accuracy
- **Markdown Formatting**: AI responses include formatted code, tables, and structured content

### **Power User Tips**

- Use batch mode for analyzing user flows across multiple pages
- Combine region selection with batch processing for detailed UI analysis
- Leverage keyboard shortcuts for 10x faster workflow
- The welcome screen shows all available shortcuts and features

## Project Structure

```
.
├── public/                 # Static assets (manifest.json, icons)
├── src/
│   ├── background/         # Background scripts for Chrome extension functionality
│   ├── content-script/     # Content scripts for injecting into web pages
│   ├── lib/                # Reusable components, services, stores and types
│   │   ├── components/     # UI components (MainContent, Settings, MarkdownRenderer)
│   │   ├── services/       # Service implementations (Groq API, Keyboard Shortcuts)
│   │   ├── stores/         # State management (theme, settings)
│   │   └── types/          # TypeScript interfaces and type definitions
│   ├── App.svelte          # Main application component
│   ├── app.css             # Global styles
│   └── main.ts             # Application entry point
├── tailwind.config.js      # TailwindCSS configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── postcss.config.js       # PostCSS plugins (for TailwindCSS)
└── package.json            # Project dependencies and scripts
```

## Manifest Configuration

The **manifest.json** file is located in the `public/` directory and defines the Chrome extension's permissions and entry points.

**Key Settings:**

- **Permissions**: Add only the permissions you need to maintain user privacy
- **Background Service Worker**: Configured using Vite for background tasks
- **Content Scripts**: Enable interaction with web pages

```json
{
  "manifest_version": 3,
  "name": "xipchat - Llama4 + Groq",
  "version": "1.0.0",
  "description": "A side panel Chrome extension for chatting with Llama4 multi-modal, accelerated by Groq | Fast AI Inference",
  "permissions": ["sidePanel", "storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_title": "Open XipChat",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "64": "icons/icon64.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "index.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

## Styling with TailwindCSS and DaisyUI

- **TailwindCSS**: Highly customizable utility classes for rapid UI design
- **DaisyUI**: Prebuilt Tailwind components for a polished design

## Development Scripts

- **`bun run dev`**: Start the development server with HMR
- **`bun run build`**: Build the extension for production

## Customization

This template is designed to be a foundation for you to get started with. Key areas for customization:

### **Core Functionality**

- **Model Selection:** Update Groq model configuration in `src/lib/services/` directory to use different Llama 4 variants or other Groq-supported models
- **UI/Styling:** Customize themes and components in `src/lib/components/` and `tailwind.config.js`
- **Extension Permissions:** Modify `public/manifest.json` to add or remove Chrome extension permissions
- **Chat Features:** Extend chat functionality in `src/lib/` components and services
- **Content Script Integration:** Customize web page interactions in `src/content-script/`

### **Use Cases & Extensions**

#### **🎨 Design & UX Analysis**

- **UI/UX Review & Competitor Analysis:** Analyze mockups, competitor sites, accessibility issues, A/B test variations with Figma API integration, color palette extraction, brand guideline checks

#### **📊 Business Intelligence**

- **Data Analysis & Reporting:** Extract insights from charts, dashboards, financial graphs, competitor research with automated report generation, analytics platform integration, price monitoring alerts

#### **🎓 Education & Research**

- **Academic Support & Learning:** Analyze research papers, diagrams, educational materials, language learning content with subject-specific prompts, plagiarism detection, multi-language support

#### **💼 E-commerce & Enterprise**

- **Business Operations & Process Optimization:** Product analysis, inventory dashboards, documentation generation with CRM/analytics platform integration, automated workflow triggers, compliance checking

#### **🔧 Development & Technical**

- **Code Analysis & Documentation:** Analyze code screenshots, API visualizations, system monitoring, technical writing with GitHub/GitLab integration, automated documentation, code quality analysis

### **Advanced Extensions**

- **✅ Batch Processing:** Multiple screenshot analysis, automated workflows (IMPLEMENTED)
- **✅ Smart Context Integration:** Automatic page metadata inclusion (IMPLEMENTED)
- **✅ Markdown Rendering:** Rich text formatting for AI responses (IMPLEMENTED)
- **✅ Keyboard Shortcuts:** Power user workflow optimization (IMPLEMENTED)
- **Export Features:** PDF reports, integration APIs (Slack, Notion, Jira)
- **Custom Templates:** Industry-specific prompts, analytics dashboard
- **Collaboration:** Share results, team management, usage tracking
- **OCR Integration:** Text extraction from images before AI analysis

## Next Steps

### For Developers

- **Create your free GroqCloud account:** Access official API docs, the playground for experimentation, and more resources via [Groq Console](https://console.groq.com)
- **Build and customize:** Fork this repo and start customizing to build out your own Chrome extension with AI capabilities
- **Explore Chrome Extension APIs:** Learn more about [Chrome Extension development](https://developer.chrome.com/docs/extensions/) to add advanced features
- **Get support:** Connect with other developers building on Groq, chat with our team, and submit feature requests on our [Groq Developer Forum](https://community.groq.com)

## Security Notes

- **Minimal Permissions**: Only request permissions that are absolutely necessary
- **Static Asset Validation**: Ensure all static assets (icons, scripts) are valid and trusted
- **Content Script Isolation**: Use content scripts judiciously to avoid conflicts with the web page
- **Dynamic API Key**: By inputting the API key in the front-end, you do not have to deploy the app with a stored secret key

## Resources

- [Llama 4 Documentation](https://ai.meta.com/llama/)
- [Groq Documentation](https://console.groq.com/docs/overview)
- [Svelte Documentation](https://svelte.dev/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [DaisyUI Documentation](https://daisyui.com/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

Created by [Anish Biswas](https://anish7.me)
