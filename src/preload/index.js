const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("browser", {
  navigate: (url) => {
    console.log("PRELOAD: navigate called:", url);
    ipcRenderer.send("browser:navigate", url);
  },

  back: () => {
    console.log("PRELOAD: back called");
    ipcRenderer.send("browser:back");
  },

  forward: () => {
    console.log("PRELOAD: forward called");
    ipcRenderer.send("browser:forward");
  },

  reload: () => {
    console.log("PRELOAD: reload called");
    ipcRenderer.send("browser:reload");
  },
});
