import type { ReactNode } from "react";
import type { TabDTO } from "@/features/browser/api/browser.types";

export interface BrowserContextValue {
  tabs: TabDTO[];
  activeTabId: string | null;
  activeTab: TabDTO | null;
  createTab: () => Promise<boolean>;
  activateTab: (tabId: string) => Promise<boolean>;
  closeTab: (tabId: string) => Promise<boolean>;
  navigate: (url: string) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goForward: () => Promise<boolean>;
  reload: () => Promise<boolean>;
}

export interface BrowserProviderProps {
  children: ReactNode;
  onError?: (error: Error) => void;
}
