import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';

const DEFAULT_RESET_MS = 2000;

export function useCopyToClipboard(resetMs = DEFAULT_RESET_MS) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy(text: string, key = text) {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopiedKey(null);
    }, resetMs);
  }

  function isCopied(key: string) {
    return copiedKey === key;
  }

  return { copy, copiedKey, isCopied };
}
