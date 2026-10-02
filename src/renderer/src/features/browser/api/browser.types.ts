// Everything browser-specific
import type { IPCResult, Unsubscribe } from "@/api/ipc.types";
export type { IPCResult, Unsubscribe };

export type TabLifecycleState =
  | "created"
  | "initializing"
  | "ready"
  | "error"
  | "destroyed";

export interface TabDTO {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  lifecycleState: TabLifecycleState;
}

export interface TabClosedEvent {
  tabId: string;
}

export interface TabEvent {
  tabId: string;
  tab: TabDTO;
}

export interface BrowserAPI {
  // Renderer -> Electron (IPC Invokes)
  navigate: (url: string) => Promise<IPCResult<null>>;
  goBack: () => Promise<IPCResult<boolean>>;
  goForward: () => Promise<IPCResult<boolean>>;
  reload: () => Promise<IPCResult<null>>;

  createTab: (url: string) => Promise<IPCResult<TabDTO>>;
  closeTab: (tabId: string) => Promise<IPCResult<null>>;
  activateTab: (tabId: string) => Promise<IPCResult<TabDTO>>;
  getTabs: () => Promise<IPCResult<TabDTO[]>>;

  // Electron -> Renderer (IPC Listeners)
  onTabCreated: (callback: (data: TabEvent) => void) => Unsubscribe;
  onTabClosed: (callback: (data: TabClosedEvent) => void) => Unsubscribe;
  onTabActivated: (callback: (data: TabEvent) => void) => Unsubscribe;
  onTabStateChanged: (callback: (data: TabEvent) => void) => Unsubscribe;
}
