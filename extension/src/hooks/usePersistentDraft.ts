import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to persist transient user drafts across popup dismissals and reopens.
 * Uses chrome.storage.session when available (cleared when browser session ends),
 * falling back to localStorage in dev/mock environments.
 */
export function usePersistentDraft(key: string, initialValue: string = '') {
  const [value, setValue] = useState<string>(initialValue);
  const storageKey = `codemate_draft_${key}`;

  // Load persisted draft on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      chrome.storage.session.get([storageKey], (result) => {
        if (result && typeof result[storageKey] === 'string') {
          setValue(result[storageKey]);
        }
      });
    } else {
      try {
        const local = localStorage.getItem(storageKey);
        if (local !== null) {
          setValue(local);
        }
      } catch {}
    }
  }, [storageKey]);

  // Update value and save to session storage
  const setDraft = useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
        chrome.storage.session.set({ [storageKey]: newValue });
      } else {
        try {
          localStorage.setItem(storageKey, newValue);
        } catch {}
      }
    },
    [storageKey]
  );

  // Clear draft
  const clearDraft = useCallback(() => {
    setValue('');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
      chrome.storage.session.remove([storageKey]);
    } else {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  return [value, setDraft, clearDraft] as const;
}

