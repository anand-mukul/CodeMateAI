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

