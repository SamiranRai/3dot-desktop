const { contextBridge, ipcRenderer } = require("electron");

const browserAPI = {
  navigate: (url) => {
    console.log("PRELOAD: navigate called:", url);
    ipcRenderer.invoke("browser:navigate", url);
  },

  goBack: () => {
    console.log("PRELOAD: goBack called");
    ipcRenderer.invoke("browser:navigation:back");
  },

  goForward: () => {
    console.log("PRELOAD: goForward called");
    ipcRenderer.invoke("browser:navigation:forward");
  },

  reload: () => {
    console.log("PRELOAD: reload called");
    ipcRenderer.invoke("browser:navigation:reload");
  },

  createTab: (url) => {
    ipcRenderer.invoke("browser:tab:create", url);
  },

  closeTab: (tabId) => {
    ipcRenderer.invoke("browser:tab:close", tabId);
  },

  activateTab: (tabId) => {
    ipcRenderer.invoke("browser:tab:activate", tabId);
  },

  getTabs: () => {
    ipcRenderer.invoke("browser:tabs:get");
  },

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
    console.log("PRELOAD: onBrowserStateChanged called");

    const listener = (_event, state) => {
      console.log("PRELOAD: browser:state-changed event received:", state);
      callback(state);
    };

    ipcRenderer.on("browser:state-changed", listener);

    // Return a function to unsubscribe
    return () => {
      ipcRenderer.removeListener("browser:state-changed", listener);
    };
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
