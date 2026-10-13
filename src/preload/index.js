const { contextBridge } = require("electron");
const createBrowserAPI = require("./api/browser-api");
const createPresentationAPI = require("./api/presentation-api");

const browserAPI = Object.freeze({
  ...createBrowserAPI(),
  ...createPresentationAPI(),
});

// Expose the browser API to the renderer process
contextBridge.exposeInMainWorld("browser", browserAPI);
