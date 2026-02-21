import { useEffect } from "react";

interface HotkeyOptions {
  metaKey?: boolean;
}

export function useHotkey(
  key: string,
  callback: () => void,
  options?: HotkeyOptions,
) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip when focus is in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (options?.metaKey && !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      e.preventDefault();
      callback();
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, options?.metaKey]);
}
