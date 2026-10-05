import type { BrowserAPI, TabClosedEvent, TabEvent } from "./browser.types";

function bridge(): BrowserAPI {
  if (!window.browser) {
    throw new Error(
      "window.browser is unavailable — preload bridge not initialized",
    );
  }
  return window.browser;
}

// async: a missing bridge becomes a rejection, not a sync throw
export const navigate = async (url: string) => bridge().navigate(url);
export const goBack = async () => bridge().goBack();
export const goForward = async () => bridge().goForward();
export const reload = async () => bridge().reload();
export const createTab = async (url: string) => bridge().createTab(url);
export const closeTab = async (tabId: string) => bridge().closeTab(tabId);
export const activateTab = async (tabId: string) => bridge().activateTab(tabId);
export const getTabs = async () => bridge().getTabs();

export const onTabCreated = (cb: (e: TabEvent) => void) =>
  bridge().onTabCreated(cb);
export const onTabClosed = (cb: (e: TabClosedEvent) => void) =>
  bridge().onTabClosed(cb);
export const onTabActivated = (cb: (e: TabEvent) => void) =>
  bridge().onTabActivated(cb);
export const onTabStateChanged = (cb: (e: TabEvent) => void) =>
  bridge().onTabStateChanged(cb);
