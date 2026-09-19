import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { TabDTO } from '@/api/browser';

interface BrowserContextValue {
  tabs: TabDTO[];
  activeTabId: string | null;
  activeTab: TabDTO | null;
  activateTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

interface BrowserProviderProps {
  children: ReactNode;
}

export function BrowserProvider({ children }: BrowserProviderProps) {
  const [tabs, setTabs] = useState<TabDTO[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeTabCreated = window.browser.onTabCreated(({ tab }) => {
      setTabs((currentTabs) => [...currentTabs, tab]);
    });

    const unsubscribeTabStateChanged = window.browser.onTabStateChanged(
      ({ tabId, tab }) => {
        setTabs((currentTabs) =>
          currentTabs.map((currentTab) =>
            currentTab.id === tabId
              ? {
                  ...currentTab,
                  ...tab,
                }
              : currentTab
          )
        );
      }
    );

    const unsubscribeTabActivated = window.browser.onTabActivated(
      ({ tabId }) => {
        setActiveTabId(tabId);
      }
    );

    return () => {
      unsubscribeTabCreated();
      unsubscribeTabStateChanged();
      unsubscribeTabActivated();
    };
  }, []);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const activateTab = async (tabId: string) => {
    await window.browser.activateTab(tabId);

    // Update the active tab ID in the state after activating it
    setActiveTabId(tabId);
  };

  const closeTab = async (tabId: string) => {
    await window.browser.closeTab(tabId);

    // Remove the tab from the state after closing it
    setTabs((currentTabs) => currentTabs.filter((tab) => tab.id !== tabId));
  };

  return (
    <BrowserContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        activateTab,
        closeTab,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  const context = useContext(BrowserContext);

  if (!context) {
    throw new Error('useBrowser must be used within BrowserProvider');
  }

  return context;
}
