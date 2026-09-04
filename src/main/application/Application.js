const { BrowserWindow } = require("electron");
const path = require("path");

// All Imports
const BrowserManager = require("../browser/BrowserManager");
const BrowserIPCController = require("../ipc/BrowserIPCController");

class Application {
  constructor() {
    this.window = null;
    this.browserManager = null;
    this.browserIPCController = null;

    // Application State: "created"
    this.state = "created";
  }

  start() {
    if (this.state !== "created") {
      throw new Error(`Cannot start application from state: ${this.state}`);
    }

    // Application State: "starting"
    this.state = "starting";

    try {
      // 1) Create Application Window
      this.createWindow();

      // 2) Create Browser subsystem
      this.browserManager = new BrowserManager(this.window);

      // 3) Initialize Browser subsystem
      this.browserManager.initialize();

      // 4) Create Browser IPC Controller
      this.browserIPCController = new BrowserIPCController(this.browserManager);

      // 5) Register Browser IPC Handlers
      this.browserIPCController.register();

      // Application State: "ready"
      this.state = "ready";

      console.log("APPLICATION: ready");
    } catch (error) {
      console.error("APPLICATION: failed to start");
      this.state = "error";

      // this.shutdown();

      throw error;
    }
  }

  // shutdown() {
  //   if (this.state === "destroyed") {
  //     console.warn("APPLICATION: already destroyed");
  //     return;
  //   }

  //   console.log("APPLICATION: shutting down");

  //   // 1) Unregister Browser IPC Handlers
  //   this.browserIPCController?.unRegister();

  //   // 2) Destroy Browser subsystem
  //   this.browserManager?.destroy();

  //   // 3) Destroy window
  //   if (this.window && !this.window.isDestroyed()) {
  //     this.window.destroy();
  //   }

  //   // 4) Clear refrences
  //   this.window = null;
  //   this.browserManager = null;
  //   this.browserIPCController = null;

  //   // Application State: "destroyed"
  //   this.state = "destroyed";

  //   console.log("APPLICATION: destroyed");
  // }

  createWindow() {
    this.window = new BrowserWindow({
      // Window options
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "../../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Load the Vite development server URL
    this.window.loadURL("http://localhost:5173");

    // Event: Window resize
    this.window.on("resize", () => {
      this.browserManager?.resize();
    });
  }
}

module.exports = Application;
