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
};

try {
  contextBridge.exposeInMainWorld("browser", browserAPI);
} catch (error) {
  console.error("PRELOAD: Failed to expose browser API", error);
}
