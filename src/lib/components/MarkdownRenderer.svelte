<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  interface Props {
    content: string;
  }

  let { content }: Props = $props();
  let renderedHtml = $state('');

  // Configure marked options for better security and formatting
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
    sanitize: false, // We'll handle sanitization manually if needed
    smartypants: true, // Use smart quotes and dashes
  });

  // Custom renderer for better styling
  const renderer = new marked.Renderer();
  
  // Customize code blocks
  renderer.code = function(code, language) {
    const validLanguage = language && /^[a-zA-Z0-9_+-]*$/.test(language) ? language : '';
    return `<pre class="bg-gray-100 dark:bg-gray-800 rounded-md p-3 overflow-x-auto my-2"><code class="language-${validLanguage} text-sm">${code}</code></pre>`;
  };

  // Customize inline code
  renderer.codespan = function(code) {
    return `<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">${code}</code>`;
  };

  // Customize links to open in new tab
  renderer.link = function(href, title, text) {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${text}</a>`;
  };

  // Customize blockquotes
  renderer.blockquote = function(quote) {
    return `<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">${quote}</blockquote>`;
  };

  // Customize lists
  renderer.list = function(body, ordered) {
    const tag = ordered ? 'ol' : 'ul';
    const className = ordered ? 'list-decimal list-inside' : 'list-disc list-inside';
    return `<${tag} class="${className} my-2 space-y-1">${body}</${tag}>`;
  };

  // Customize headings
  renderer.heading = function(text, level) {
    const sizes = {
      1: 'text-xl font-bold',
      2: 'text-lg font-semibold',
      3: 'text-base font-semibold',
      4: 'text-sm font-semibold',
      5: 'text-sm font-medium',
      6: 'text-xs font-medium'
    };
    const className = sizes[level as keyof typeof sizes] || sizes[6];
    return `<h${level} class="${className} mt-4 mb-2">${text}</h${level}>`;
  };

  // Customize tables
  renderer.table = function(header, body) {
    return `<div class="overflow-x-auto my-4">
      <table class="min-w-full border border-gray-300 dark:border-gray-600">
        <thead class="bg-gray-50 dark:bg-gray-700">${header}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  };

  renderer.tablerow = function(content) {
    return `<tr class="border-b border-gray-200 dark:border-gray-600">${content}</tr>`;
  };

  renderer.tablecell = function(content, flags) {
    const tag = flags.header ? 'th' : 'td';
    const className = flags.header 
      ? 'px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100'
      : 'px-3 py-2 text-gray-700 dark:text-gray-300';
    return `<${tag} class="${className}">${content}</${tag}>`;
  };

  marked.use({ renderer });

  // Function to render markdown
  function renderMarkdown(text: string): string {
    try {
      // Ensure we have a string
      const textContent = typeof text === 'string' ? text : String(text);
      return marked(textContent);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      // Fallback to plain text with line breaks
      const fallbackText = typeof text === 'string' ? text : String(text);
      return fallbackText.replace(/\n/g, '<br>');
    }
  }

  // Reactive statement to update rendered HTML when content changes
  $effect(() => {
    renderedHtml = renderMarkdown(content);
  });

  onMount(() => {
    renderedHtml = renderMarkdown(content);
  });
</script>

<!-- Render the HTML with proper styling -->
<div class="markdown-content prose prose-sm max-w-none dark:prose-invert">
  {@html renderedHtml}
</div>

<style>
  /* Additional custom styles for markdown content */
  :global(.markdown-content) {
    line-height: 1.6;
  }

  :global(.markdown-content p) {
    margin: 0.5rem 0;
  }

  :global(.markdown-content p:first-child) {
    margin-top: 0;
  }

  :global(.markdown-content p:last-child) {
    margin-bottom: 0;
  }

  :global(.markdown-content strong) {
    font-weight: 600;
  }

  :global(.markdown-content em) {
    font-style: italic;
  }

  :global(.markdown-content hr) {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1rem 0;
  }

  :global(.dark .markdown-content hr) {
    border-top-color: #374151;
  }

  /* Code syntax highlighting placeholder */
  :global(.markdown-content pre code) {
    background: none !important;
    padding: 0 !important;
  }
</style>
