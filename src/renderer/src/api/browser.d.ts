export interface BrowserIPCSuccess<T> {
  success: true;
  data: T;
}

export interface BrowserIPCError {
  code: string;
  message: string;
  details: unknown;
}

export interface BrowserIPCFailure {
  success: false;
  error: BrowserIPCError;
}

export type BrowserIPCResult<T> = BrowserIPCSuccess<T> | BrowserIPCFailure;

export interface BrowserAPI {
  goBack: () => Promise<BrowserIPCResult<boolean>>;
  goForward: () => Promise<BrowserIPCResult<boolean>>;
  reload: () => Promise<BrowserIPCResult<null>>;
  navigate: (url: string) => Promise<BrowserIPCResult<null>>;
  createTab: (url: string) => Promise<BrowserIPCResult<null>>;
  closeTab: (tabId: string) => Promise<BrowserIPCResult<null>>;
  onTabCreated: (callback: (tab: TabState) => void) => () => void;
  activateTab: (tabId: string) => Promise<BrowserIPCResult<null>>;
}

declare global {
  interface Window {
    browser: BrowserAPI;
  }
}
