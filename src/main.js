const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const BrowserManager = require("./main/BrowserManager");

let mainWindow;
let browserManager;

ipcMain.on("browser:navigate", (_, url) => {
  console.log("MAIN: navigate received:", url);

  browserManager.navigate(url);
});

ipcMain.on("browser:back", () => {
  console.log("MAIN: back received");

  browserManager.back();
});

ipcMain.on("browser:forward", () => {
  console.log("MAIN: forward received");

  browserManager.forward();
});

ipcMain.on("browser:reload", () => {
  console.log("MAIN: reload received");

  browserManager.reload();
});

function createWindow() {
  // Main window
  mainWindow = new BrowserWindow({
    // Window options
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the Vite development server URL
  mainWindow.loadURL("http://localhost:5173");

  // Create an instance of BrowserManager
  browserManager = new BrowserManager(mainWindow);

  // Event: Window resize
  mainWindow.on("resize", () => {
    browserManager.resize();
  });
}

// Execute the createWindow function when the app is ready
app.whenReady().then(createWindow);
