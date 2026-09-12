export interface IPCSuccess<T> {
  success: true;
  operation: string;
  data: T;
}

export interface IPCError {
  code: string;
  message: string;
  details: unknown;
}

export interface IPCFailure {
  success: false;
  operation: string;
  error: IPCError;
}

export type IPCResult<T> = IPCSuccess<T> | IPCFailure;

// ---------- Tab ----------

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

// ---------- Events ----------

export interface TabClosedEvent {
  tabId: string;
}

export interface TabEvent {
  tabId: string;
  tab: TabDTO;
}

// ---------- Browser API ----------

export interface BrowserAPI {
  // Navigation
  navigate: (url: string) => Promise<IPCResult<null>>;
  goBack: () => Promise<IPCResult<boolean>>;
  goForward: () => Promise<IPCResult<boolean>>;
  reload: () => Promise<IPCResult<null>>;

  // Tabs
  createTab: (url: string) => Promise<IPCResult<TabDTO>>;
  closeTab: (tabId: string) => Promise<IPCResult<null>>;
  activateTab: (tabId: string) => Promise<IPCResult<TabDTO>>;
  getTabs: () => Promise<IPCResult<TabDTO[]>>;

  // Events
  onTabCreated: (callback: (data: TabEvent) => void) => () => void;
  onTabClosed: (callback: (data: TabClosedEvent) => void) => () => void;
  onTabActivated: (callback: (data: TabEvent) => void) => () => void;
  onTabStateChanged: (callback: (data: TabEvent) => void) => () => void;
}

// ---------- Window ----------

declare global {
  interface Window {
    browser: BrowserAPI;
  }
}
