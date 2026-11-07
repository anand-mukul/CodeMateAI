import { useState, useEffect } from 'react';
import { ExtensionMessagingService } from '../services/extension-messaging';

export function useActiveTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTab = async () => {
    setLoading(true);
    const activeTab = await ExtensionMessagingService.getActiveTab();
    setTab(activeTab);
    setLoading(false);
  };

  useEffect(() => {
    refreshTab();
  }, []);

  return { tab, loading, refreshTab };
}

