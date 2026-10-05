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
import { START_URL } from "@/features/browser/browser.constants";
import type {
  BrowserContextValue,
  BrowserProviderProps,
} from "./browserProvider.types";

const BrowserContext = createContext<BrowserContextValue | null>(null);

function mergeSnapshot(live: TabDTO[], snapshot: TabDTO[]): TabDTO[] {
  const liveById = new Map(live.map((t) => [t.id, t]));
  const snapshotIds = new Set(snapshot.map((t) => t.id));
  return [
    ...snapshot.map((t) => liveById.get(t.id) ?? t),
    ...live.filter((t) => !snapshotIds.has(t.id)),
  ];
}

export function BrowserProvider({ children, onError }: BrowserProviderProps) {
  const [tabs, setTabs] = useState<TabDTO[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((error: unknown) => {
    const handler = onErrorRef.current ?? console.error;
    handler(error instanceof Error ? error : new Error(String(error)));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribers = [
      browserApi.onTabCreated(({ tabId, tab }) =>
        setTabs((prev) =>
          prev.some((t) => t.id === tabId) ? prev : [...prev, tab],
        ),
      ),
      browserApi.onTabStateChanged(({ tabId, tab }) =>
        setTabs((prev) => prev.map((t) => (t.id === tabId ? tab : t))),
      ),
      browserApi.onTabActivated(({ tabId }) => setActiveTabId(tabId)),
      browserApi.onTabClosed(({ tabId }) => {
        setTabs((prev) => prev.filter((t) => t.id !== tabId));
        setActiveTabId((cur) => (cur === tabId ? null : cur));
      }),
    ];

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

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [reportError]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );

  const run = useCallback(
    async (call: () => Promise<IPCResult<unknown>>, fallback: string) => {
      try {
        const result = await call();
        if (result.success) return true;
        reportError(new Error(result.error.message || fallback));
      } catch (error) {
        reportError(error);
      }
      return false;
    },
    [reportError],
  );

  const actions = useMemo(
    () => ({
      createTab: () =>
        run(() => browserApi.createTab(START_URL), "Failed to create tab"),
      activateTab: (id: string) =>
        run(() => browserApi.activateTab(id), "Failed to activate tab"),
      closeTab: (id: string) =>
        run(() => browserApi.closeTab(id), "Failed to close tab"),
      navigate: (url: string) =>
        run(() => browserApi.navigate(url), "Failed to navigate"),
      goBack: () => run(() => browserApi.goBack(), "Failed to go back"),
      goForward: () =>
        run(() => browserApi.goForward(), "Failed to go forward"),
      reload: () => run(() => browserApi.reload(), "Failed to reload"),
    }),
    [run],
  );

  const value = useMemo(
    () => ({ tabs, activeTabId, activeTab, ...actions }),
    [tabs, activeTabId, activeTab, actions],
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
