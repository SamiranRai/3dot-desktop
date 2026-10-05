import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { IPCResult, TabDTO } from "@/features/browser/api/browser.types";
import * as browserApi from "@/features/browser/api/browserApi";
import type {
  BrowserContextValue,
  BrowserProviderProps,
} from "./browserProvider.types";

// Create a context for the browser state.
const BrowserContext = createContext<BrowserContextValue | null>(null);

// Live events win over the snapshot; snapshot fills in the rest.
function mergeSnapshot(live: TabDTO[], snapshot: TabDTO[]): TabDTO[] {
  const liveById = new Map(live.map((t) => [t.id, t]));
  const snapshotIds = new Set(snapshot.map((t) => t.id));
  return [
    ...snapshot.map((t) => liveById.get(t.id) ?? t),
    ...live.filter((t) => !snapshotIds.has(t.id)),
  ];
}

// The BrowserProvider is responsible for managing the state of browser tabs
// and providing it to the rest of the application via context.
// It listens for tab events from the browser API and updates its state accordingly.
// It also provides functions to activate and close tabs, handling errors through a provided callback.
export function BrowserProvider({ children, onError }: BrowserProviderProps) {
  const [tabs, setTabs] = useState<TabDTO[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((error: unknown) => {
    onErrorRef.current?.(
      error instanceof Error ? error : new Error(String(error)),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Subscribe to browser tab events and update state accordingly.
    const unsubscribers = [
      // On Tab Created Event
      browserApi.onTabCreated(({ tabId, tab }) =>
        setTabs((prev) =>
          prev.some((t) => t.id === tabId) ? prev : [...prev, tab],
        ),
      ),

      // On Tab State Changed Event
      browserApi.onTabStateChanged(({ tabId, tab }) =>
        setTabs((prev) => prev.map((t) => (t.id === tabId ? tab : t))),
      ),

      // On Tab Activated Event
      browserApi.onTabActivated(({ tabId }) => setActiveTabId(tabId)),

      // On Tab Closed Event
      browserApi.onTabClosed(({ tabId }) => {
        setTabs((prev) => prev.filter((t) => t.id !== tabId));
        setActiveTabId((cur) => (cur === tabId ? null : cur));
      }),
    ];

    // Fetch the initial snapshot of tabs and the active tab ID
    // from the browser API.
    (async () => {
      try {
        const result = await browserApi.getTabs();
        if (cancelled) return;
        if (!result.success) {
          reportError(new Error(result.error.message || "Failed to load tabs"));
          return;
        }
        const { tabs: snapshot, activeTabId: snapshotActiveId } = result.data;
        setTabs((prev) => mergeSnapshot(prev, snapshot));
        setActiveTabId((prev) => prev ?? snapshotActiveId);
      } catch (error) {
        if (!cancelled) reportError(error);
      }
    })();

    // Cleanup function to unsubscribe from events
    // when the component unmounts or dependencies change.
    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [reportError]);

  // Get the currently active tab based on the activeTabId.
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  // A utility function to run asynchronous calls to the browser API Commands,
  const run = useCallback(
    async (call: () => Promise<IPCResult<unknown>>, fallback: string) => {
      try {
        const result = await call();
        if (!result.success) {
          reportError(new Error(result.error.message || fallback));
        }
      } catch (error) {
        reportError(error);
      }
    },
    [reportError],
  );

  // Tab activation command
  const activateTab = useCallback(
    (tabId: string) =>
      run(() => browserApi.activateTab(tabId), "Failed to activate tab"),
    [run],
  );

  // Tab Closing command
  const closeTab = useCallback(
    (tabId: string) =>
      run(() => browserApi.closeTab(tabId), "Failed to close tab"),
    [run],
  );

  // Memoize the context value to prevent unnecessary re-renders of consumers.
  const value = useMemo(
    () => ({ tabs, activeTabId, activeTab, activateTab, closeTab }),
    [tabs, activeTabId, activeTab, activateTab, closeTab],
  );

  return (
    <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>
  );
}

// Custom hook to access the BrowserContext.
export function useBrowser() {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error("useBrowser must be used within BrowserProvider");
  }
  return context;
}
