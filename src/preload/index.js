const { contextBridge, ipcRenderer } = require("electron");

// IPC channels for communication between
// the renderer and main processes.
const CHANNELS = Object.freeze({
  NAVIGATE: "browser:navigate",
  BACK: "browser:navigation:back",
  FORWARD: "browser:navigation:forward",
  RELOAD: "browser:navigation:reload",
  CREATE_TAB: "browser:tab:create",
  CLOSE_TAB: "browser:tab:close",
  ACTIVATE_TAB: "browser:tab:activate",
  GET_TABS: "browser:tabs:get",
});

// IPC events emitted by the main process
// to notify the renderer of tab-related changes.
const EVENTS = Object.freeze({
  TAB_CREATED: "browser:tab-created",
  TAB_CLOSED: "browser:tab-closed",
  TAB_ACTIVATED: "browser:tab-activated",
  TAB_STATE_CHANGED: "browser:tab-state-changed",
  TAB_LOAD_ERROR: "browser:tab-load-error",
});

// Utility function to check if a value is a non-empty string
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Helpers for invoking IPC channels and subscribing to events
// args: any arguments to pass to the IPC channel
function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

// Subscribes to an IPC event channel
// and returns a cleanup function
function subscribe(channel, callback) {
  // If callback is not a function, throw an error
  if (typeof callback !== "function") {
    throw new TypeError(`browser.${channel} requires a callback.`);
  }

  const listener = (_event, payload) => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`[preload] listener failed for ${channel}`, error);
    }
  };

  ipcRenderer.on(channel, listener);

  // This is the cleanup function. React useEffect calls it when the
  // component unmounts or before the effect is re-run.
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

// Expose the browser API to the renderer process
const browserAPI = Object.freeze({
  // Navigation methods
  // Navigate to a new URL in the current tab
  navigate(url) {
    if (!isNonEmptyString(url)) {
      return Promise.reject(
        new TypeError("navigate() requires a non-empty url string."),
      );
    }
    return invoke(CHANNELS.NAVIGATE, url);
  },

  // Go back to the previous page in the current tab's history
  goBack() {
    return invoke(CHANNELS.BACK);
  },

  // Go forward to the next page in the current tab's history
  goForward() {
    return invoke(CHANNELS.FORWARD);
  },

  // Reload the current page in the current tab
  reload() {
    return invoke(CHANNELS.RELOAD);
  },

  // Tab management methods

  // Create a new tab with an optional URL.
  // If no URL is provided, the new tab will open with a default page.
  createTab(url) {
    if (url !== undefined && !isNonEmptyString(url)) {
      return Promise.reject(
        new TypeError(
          "createTab() url must be a non-empty string when provided.",
        ),
      );
    }

    // On Success
    return invoke(CHANNELS.CREATE_TAB, url);
  },

  // Close the tab with the given tabId.
  closeTab(tabId) {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new TypeError("closeTab() requires a non-empty tabId string."),
      );
    }

    // On Success
    return invoke(CHANNELS.CLOSE_TAB, tabId);
  },

  // Activate the tab with the given tabId.
  activateTab(tabId) {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new TypeError("activateTab() requires a non-empty tabId string."),
      );
    }

    // On Success
    return invoke(CHANNELS.ACTIVATE_TAB, tabId);
  },

  // Get a list of all open tabs with their states.
  getTabs() {
    return invoke(CHANNELS.GET_TABS);
  },

  // Event subscription methods
  // These methods allow the renderer process to listen for tab-related events

  // Subscribe to the tab created event.
  // The callback will be called with the new tab's state.
  onTabCreated(callback) {
    return subscribe(EVENTS.TAB_CREATED, callback);
  },

  // Subscribe to the tab closed event.
  onTabClosed(callback) {
    return subscribe(EVENTS.TAB_CLOSED, callback);
  },

  // Subscribe to the tab activated event.
  onTabActivated(callback) {
    return subscribe(EVENTS.TAB_ACTIVATED, callback);
  },

  // Subscribe to the tab state changed event.
  onTabStateChanged(callback) {
    return subscribe(EVENTS.TAB_STATE_CHANGED, callback);
  },

  // Subscribe to the tab load error event.
  onTabLoadError(callback) {
    return subscribe(EVENTS.TAB_LOAD_ERROR, callback);
  },
});

// Expose the browser API to the renderer process
contextBridge.exposeInMainWorld("browser", browserAPI);
