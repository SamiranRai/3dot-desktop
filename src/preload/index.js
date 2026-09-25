const { contextBridge, ipcRenderer } = require("electron");

const isDev = process.env.NODE_ENV !== "production";

/** Dev-only diagnostic logging — never runs in production builds. */
function devLog(...args) {
  if (isDev) {
    console.log("[preload]", ...args);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const browserAPI = {
  // React -> Electron (IPC Invokes)
  navigate: (url) => {
    if (!isNonEmptyString(url)) {
      return Promise.reject(
        new Error("navigate() requires a non-empty url string"),
      );
    }
    devLog("navigate called", url);
    return ipcRenderer.invoke("browser:navigate", url);
  },

  goBack: () => {
    devLog("goBack called");
    return ipcRenderer.invoke("browser:navigation:back");
  },

  goForward: () => {
    devLog("goForward called");
    return ipcRenderer.invoke("browser:navigation:forward");
  },

  reload: () => {
    devLog("reload called");
    return ipcRenderer.invoke("browser:navigation:reload");
  },

  createTab: (url) => {
    if (url !== undefined && !isNonEmptyString(url)) {
      return Promise.reject(
        new Error("createTab() url must be a non-empty string when provided"),
      );
    }
    devLog("createTab called");
    return ipcRenderer.invoke("browser:tab:create", url);
  },

  closeTab: (tabId) => {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new Error("closeTab() requires a non-empty tabId string"),
      );
    }
    devLog("closeTab called:", tabId);
    return ipcRenderer.invoke("browser:tab:close", tabId);
  },

  activateTab: (tabId) => {
    if (!isNonEmptyString(tabId)) {
      return Promise.reject(
        new Error("activateTab() requires a non-empty tabId string"),
      );
    }
    devLog("activateTab called:", tabId);
    return ipcRenderer.invoke("browser:tab:activate", tabId);
  },

  getTabs: () => {
    devLog("getTabs called");
    return ipcRenderer.invoke("browser:tabs:get");
  },

  // Electron -> React (IPC Listeners)
  onTabCreated: (callback) => subscribe("browser:tab-created", callback),
  onTabClosed: (callback) => subscribe("browser:tab-closed", callback),
  onTabActivated: (callback) => subscribe("browser:tab-activated", callback),
  onTabStateChanged: (callback) =>
    subscribe("browser:tab-state-changed", callback),
  onBrowserStateChanged: (callback) =>
    subscribe("browser:state-changed", callback),

};

/**
 * Subscribes to a main -> renderer event channel and returns an
 * unsubscribe function, matching React's useEffect cleanup contract.
 * @param {string} channel
 * @param {(data: unknown) => void} callback
 * @returns {() => void}
 */
function subscribe(channel, callback) {
  if (typeof callback !== "function") {
    throw new TypeError(`subscribe("${channel}") requires a function callback`);
  }

  console.log("PRELOAD: subscribing:", channel);

  const listener = (_event, data) => {
    console.log("PRELOAD: EVENT RECEIVED:", channel, data);

    callback(data);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    console.log("PRELOAD: unsubscribing:", channel);
    ipcRenderer.removeListener(channel, listener);
  };
}

try {
  contextBridge.exposeInMainWorld("browser", browserAPI);
} catch (error) {
  console.error("[preload] Failed to expose browser API", error);
}