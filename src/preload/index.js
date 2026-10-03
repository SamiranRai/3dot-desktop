const { contextBridge, ipcRenderer } = require("electron");

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

const EVENTS = Object.freeze({
  TAB_CREATED: "browser:tab-created",
  TAB_CLOSED: "browser:tab-closed",
  TAB_ACTIVATED: "browser:tab-activated",
  TAB_STATE_CHANGED: "browser:tab-state-changed",
  TAB_LOAD_ERROR: "browser:tab-load-error",
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

function subscribe(channel, callback) {
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

const browserAPI = Object.freeze({
  navigate(url) {
    if (!isNonEmptyString(url)) {
      return Promise.reject(
        new TypeError("navigate() requires a non-empty url string."),
      );
    }
    return invoke(CHANNELS.NAVIGATE, url);
  },

  goBack() {
    return invoke(CHANNELS.BACK);
  },

  goForward() {
    return invoke(CHANNELS.FORWARD);
  },

  reload() {
    return invoke(CHANNELS.RELOAD);
  },

  createTab(url) {
    if (url !== undefined && !isNonEmptyString(url)) {
      return Promise.reject(
        new TypeError(
          "createTab() url must be a non-empty string when provided.",
        ),
      );
    }
    return invoke(CHANNELS.CREATE_TAB, url);
  },

  closeTab(tabId) {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new TypeError("closeTab() requires a non-empty tabId string."),
      );
    }
    return invoke(CHANNELS.CLOSE_TAB, tabId);
  },

  activateTab(tabId) {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new TypeError("activateTab() requires a non-empty tabId string."),
      );
    }
    return invoke(CHANNELS.ACTIVATE_TAB, tabId);
  },

  getTabs() {
    return invoke(CHANNELS.GET_TABS);
  },

  onTabCreated(callback) {
    return subscribe(EVENTS.TAB_CREATED, callback);
  },

  onTabClosed(callback) {
    return subscribe(EVENTS.TAB_CLOSED, callback);
  },

  onTabActivated(callback) {
    return subscribe(EVENTS.TAB_ACTIVATED, callback);
  },

  onTabStateChanged(callback) {
    return subscribe(EVENTS.TAB_STATE_CHANGED, callback);
  },

  onTabLoadError(callback) {
    return subscribe(EVENTS.TAB_LOAD_ERROR, callback);
  },
});

contextBridge.exposeInMainWorld("browser", browserAPI);
