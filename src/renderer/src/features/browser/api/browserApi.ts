import type { IPCResult, TabDTO } from "./browser.types";

// Thin wrapper around the window.browser API,
// which is injected by the preload script.
// This is a convenience layer to make it easier
// to use the browser API in React components and other parts of the renderer process.

function assertBridgeMethod(name: keyof Window["browser"]) {
  if (typeof window.browser?.[name] !== "function") {
    throw new Error(
      `window.browser.${name} is unavailable — preload bridge not initialized`,
    );
  }
}

export async function goBack(): Promise<IPCResult<boolean>> {
  assertBridgeMethod("goBack");
  return window.browser.goBack();
}

export async function goForward(): Promise<IPCResult<boolean>> {
  assertBridgeMethod("goForward");
  return window.browser.goForward();
}

export async function reload(): Promise<IPCResult<null>> {
  assertBridgeMethod("reload");
  return window.browser.reload();
}

export async function navigate(url: string): Promise<IPCResult<null>> {
  assertBridgeMethod("navigate");
  return window.browser.navigate(url);
}

export async function createTab(url?: string): Promise<IPCResult<TabDTO>> {
  assertBridgeMethod("createTab");
  return window.browser.createTab(url as string);
}

export async function closeTab(tabId: string): Promise<IPCResult<null>> {
  assertBridgeMethod("closeTab");
  return window.browser.closeTab(tabId);
}

export async function activateTab(tabId: string): Promise<IPCResult<TabDTO>> {
  assertBridgeMethod("activateTab");
  return window.browser.activateTab(tabId);
}

export async function getTabs(): Promise<IPCResult<TabDTO[]>> {
  assertBridgeMethod("getTabs");
  return window.browser.getTabs();
}
