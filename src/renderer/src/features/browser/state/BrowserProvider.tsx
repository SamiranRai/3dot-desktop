import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import type { TabDTO } from "@/features/browser/api/browser.types";
import * as browserApi from "@/features/browser/api/browserApi";

interface BrowserContextValue {
  tabs: TabDTO[];
  activeTabId: string | null;
  activeTab: TabDTO | null;
  activateTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
}

interface BrowserProviderProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

export function BrowserProvider({ children, onError }: BrowserProviderProps) {
  const [tabs, setTabs] = useState<TabDTO[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    browserApi.getTabs().then((result) => {
      if (cancelled) return;
      if (result.success) {
        console.log("RENDERER: initial tabs loaded", result.data); // temporary
        setTabs(result.data);
      } else {
        onError?.(new Error(result.error.message || "Failed to load tabs"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    console.log("RENDERER: setting up browser event listeners");

    const unsubscribeTabCreated = window.browser.onTabCreated((payload) => {
      console.log("🔥 TAB CREATED REACHED REACT:", payload);
    });

    const unsubscribeTabStateChanged = window.browser.onTabStateChanged(
      (payload) => {
        console.log("🔥 TAB STATE CHANGED REACHED REACT:", payload);
      },
    );

    const unsubscribeTabActivated = window.browser.onTabActivated((payload) => {
      console.log("🔥 TAB ACTIVATED REACHED REACT:", payload);
    });

    const unsubscribeTabClosed = window.browser.onTabClosed((payload) => {
      console.log("🔥 TAB CLOSED REACHED REACT:", payload);
    });

    return () => {
      console.log("RENDERER: cleaning up browser event listeners");

      unsubscribeTabCreated();
      unsubscribeTabStateChanged();
      unsubscribeTabActivated();
      unsubscribeTabClosed();
    };
  }, []);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const activateTab = useCallback(
    async (tabId: string) => {
      try {
        const result = await browserApi.activateTab(tabId);
        if (!result.success) {
          onError?.(
            new Error(result.error.message || "Failed to activate tab"),
          );
        }
        // No setActiveTabId here — the "tab-activated" event will fire
        // and update state, whether this call originated the change or
        // something else did.
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [onError],
  );

  const closeTab = useCallback(
    async (tabId: string) => {
      try {
        const result = await browserApi.closeTab(tabId);
        if (!result.success) {
          onError?.(new Error(result.error.message || "Failed to close tab"));
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    [onError],
  );

  const value = useMemo(
    () => ({ tabs, activeTabId, activeTab, activateTab, closeTab }),
    [tabs, activeTabId, activeTab, activateTab, closeTab],
  );

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
}

export function useBrowser() {
  const context = useContext(BrowserContext);

  if (!context) {
    throw new Error("useBrowser must be used within BrowserProvider");
  }

  return context;
}
