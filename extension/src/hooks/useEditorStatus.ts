import { useState, useEffect, useCallback } from 'react';
import { ExtensionMessagingService } from '../services/extension-messaging';
import { EditorStatus } from '../types/editor';
import { ProblemContext } from '../types/problem';

export function useEditorStatus() {
  const [editorStatus, setEditorStatus] = useState<EditorStatus | null>(null);
  const [problemContext, setProblemContext] = useState<ProblemContext | null>(null);
  const [isSupportedPage, setIsSupportedPage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await ExtensionMessagingService.getPageStatus();

    if (res.success && res.data) {
      setIsSupportedPage(res.data.supported);
      setProblemContext(res.data.problem);
      setEditorStatus(res.data.editor);
    } else {
      setError(res.error || 'Failed to connect to page');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();

    // Listen for runtime broadcasts from content script when SPA problem changes
    const messageListener = (msg: any) => {
      if (msg && msg.type === 'PAGE_PROBLEM_UPDATED') {
        if (msg.problem) {
          setProblemContext(msg.problem);
          setIsSupportedPage(true);
        }
        fetchStatus();
      }
    };

    // Listen for storage changes
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.codemate_active_problem_v1) {
        if (changes.codemate_active_problem_v1.newValue) {
          setProblemContext(changes.codemate_active_problem_v1.newValue);
        }
        fetchStatus();
      }
    };

    if (typeof chrome !== 'undefined') {
      if (chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener(messageListener);
      }
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener(storageListener);
      }
      if (chrome.tabs?.onActivated) {
        chrome.tabs.onActivated.addListener(fetchStatus);
      }
      if (chrome.tabs?.onUpdated) {
        chrome.tabs.onUpdated.addListener(fetchStatus);
      }
    }

    return () => {
      if (typeof chrome !== 'undefined') {
        if (chrome.runtime?.onMessage) {
          chrome.runtime.onMessage.removeListener(messageListener);
        }
        if (chrome.storage?.onChanged) {
          chrome.storage.onChanged.removeListener(storageListener);
        }
        if (chrome.tabs?.onActivated) {
          chrome.tabs.onActivated.removeListener(fetchStatus);
        }
        if (chrome.tabs?.onUpdated) {
          chrome.tabs.onUpdated.removeListener(fetchStatus);
        }
      }
    };
  }, [fetchStatus]);

  return {
    editorStatus,
    problemContext,
    isSupportedPage,
    loading,
    error,
    refreshStatus: fetchStatus,
  };
}

