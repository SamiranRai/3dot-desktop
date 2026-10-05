import type { ReactNode } from "react";
import type { TabDTO } from "@/features/browser/api/browser.types";

export interface BrowserContextValue {
  tabs: TabDTO[];
  activeTabId: string | null;
  activeTab: TabDTO | null;
  activateTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
}

export interface BrowserProviderProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}
