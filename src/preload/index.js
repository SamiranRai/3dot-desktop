const { contextBridge, ipcRenderer } = require("electron");

const browserAPI = {
  // React -> Electron (IPC Invokes)
  navigate: (url) => {
    console.log("PRELOAD: navigate called:", url);
    return ipcRenderer.invoke("browser:navigate", url);
  },

  goBack: () => {
    console.log("PRELOAD: goBack called");
    return ipcRenderer.invoke("browser:navigation:back");
  },

  goForward: () => {
    console.log("PRELOAD: goForward called");
    return ipcRenderer.invoke("browser:navigation:forward");
  },

  reload: () => {
    console.log("PRELOAD: reload called");
    return ipcRenderer.invoke("browser:navigation:reload");
  },

  createTab: (url) => {
    console.log("PRELOAD: Tab created with URL:", url);
    return ipcRenderer.invoke("browser:tab:create", url);
  },

  closeTab: (tabId) => {
    console.log("PRELOAD: Tab closed with ID:", tabId);
    return ipcRenderer.invoke("browser:tab:close", tabId);
  },

  activateTab: (tabId) => {
    console.log("PRELOAD: Tab activated with ID:", tabId);
    return ipcRenderer.invoke("browser:tab:activate", tabId);
  },

  getTabs: () => {
    console.log("PRELOAD: getTabs called");
    return ipcRenderer.invoke("browser:tabs:get");
  },

  // Electron -> React (IPC Listeners)

  onTabCreated: (callback) => {
    return subscribe("browser:tab-created", callback);
  },

  onTabClosed: (callback) => {
    return subscribe("browser:tab-closed", callback);
  },

  onTabActivated: (callback) => {
    return subscribe("browser:tab-activated", callback);
  },

  onTabStateChanged: (callback) => {
    return subscribe("browser:tab-state-changed", callback);
  },

  onBrowserStateChanged: (callback) => {
    return subscribe("browser:state-changed", callback);
  },
};

function subscribe(channel, callback) {
  const listener = (_event, data) => {
    callback(data);
  };

  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

try {
  contextBridge.exposeInMainWorld("browser", browserAPI);
} catch (error) {
  console.error("PRELOAD: Failed to expose browser API", error);
}
