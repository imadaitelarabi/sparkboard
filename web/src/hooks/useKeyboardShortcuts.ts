import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      // Check both event.key and event.code for better keyboard layout compatibility
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase() ||
                        shortcut.key.toLowerCase() === event.code.toLowerCase();
      
      // Handle Ctrl/Cmd key properly for cross-platform compatibility
      const isMac = typeof navigator !== 'undefined' && 
                   (navigator.userAgent.includes('Mac') || navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad'));
      
      let ctrlMatches = true;
      if (shortcut.ctrlKey) {
        // On Mac, use metaKey (Cmd), on Windows/Linux use ctrlKey
        ctrlMatches = isMac ? event.metaKey : event.ctrlKey;
      } else if (shortcut.metaKey) {
        ctrlMatches = event.metaKey;
      } else {
        // If no modifier specified, ensure no Ctrl/Cmd is pressed
        ctrlMatches = !event.ctrlKey && !event.metaKey;
      }
      
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        shortcut.callback(event);
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

export function useGlobalKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  return useKeyboardShortcuts(shortcuts, true);
}