// Keyboard shortcuts service for ClipChat extension

export interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, ShortcutAction> = new Map();
  private isListening = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: ShortcutAction): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(shortcut: Partial<ShortcutAction>): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  /**
   * Start listening for keyboard shortcuts
   */
  startListening(): void {
    if (!this.isListening) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
    }
  }

  /**
   * Stop listening for keyboard shortcuts
   */
  stopListening(): void {
    if (this.isListening) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.isListening = false;
    }
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): ShortcutAction[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Generate a unique key for a shortcut combination
   */
  private getShortcutKey(shortcut: Partial<ShortcutAction>): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.metaKey) parts.push('meta');
    if (shortcut.key) parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const shortcutKey = this.getShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    });

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }

  /**
   * Format shortcut for display
   */
  static formatShortcut(shortcut: ShortcutAction): string {
    const parts = [];
    
    // Use platform-specific modifier keys
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (shortcut.ctrlKey) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.altKey) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (shortcut.shiftKey) {
      parts.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.metaKey && !isMac) {
      parts.push('Meta');
    }
    
    // Format key name
    let keyName = shortcut.key;
    switch (shortcut.key.toLowerCase()) {
      case 'enter':
        keyName = '↵';
        break;
      case 'escape':
        keyName = 'Esc';
        break;
      case 'arrowup':
        keyName = '↑';
        break;
      case 'arrowdown':
        keyName = '↓';
        break;
      case 'arrowleft':
        keyName = '←';
        break;
      case 'arrowright':
        keyName = '→';
        break;
      case ' ':
        keyName = 'Space';
        break;
      default:
        keyName = shortcut.key.toUpperCase();
    }
    
    parts.push(keyName);
    return parts.join(isMac ? '' : '+');
  }
}

// Create a global instance
export const keyboardShortcuts = new KeyboardShortcutManager();

// Default shortcuts configuration
export const DEFAULT_SHORTCUTS = {
  TAKE_SCREENSHOT: {
    key: 's',
    ctrlKey: true,
    description: 'Take full page screenshot'
  },
  SELECT_REGION: {
    key: 's',
    ctrlKey: true,
    shiftKey: true,
    description: 'Select region for screenshot'
  },
  SEND_MESSAGE: {
    key: 'Enter',
    description: 'Send message'
  },
  NEW_CHAT: {
    key: 'n',
    ctrlKey: true,
    description: 'Start new chat'
  },
  FOCUS_INPUT: {
    key: '/',
    description: 'Focus message input'
  },
  TOGGLE_SETTINGS: {
    key: ',',
    ctrlKey: true,
    description: 'Toggle settings panel'
  },
  ESCAPE: {
    key: 'Escape',
    description: 'Cancel current action'
  }
} as const;
