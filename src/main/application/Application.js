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

    // Application lifecycle state: "created"
    this.lifecycleState = "created";
  }

  start() {
    if (this.lifecycleState !== "created") {
      throw new Error(
        `Cannot start application from lifecycle state: ${this.lifecycleState}`,
      );
    }

    // Application lifecycle state: "starting"
    this.lifecycleState = "starting";

    try {
      // 1) Create Application Window
      this.createWindow();

      // 2) Create Browser subsystem
      this.browserManager = new BrowserManager(this.window);

      // 3) Initialize Browser subsystem
      this.browserManager.initialize();

      // 4) Create Browser IPC Controller
      this.browserIPCController = new BrowserIPCController(
        this.browserManager,
        this.window,
      );

      // 5) Register Browser IPC Handlers
      this.browserIPCController.register();
      // Application lifecycle state: "ready"
      this.lifecycleState = "ready";

      console.log("APPLICATION: ready");
    } catch (error) {
      console.error("APPLICATION: failed to start");
      this.lifecycleState = "error";

      // this.shutdown();

      throw error;
    }
  }

  // shutdown() {
  //   if (this.lifecycleState === "destroyed") {
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

  //   // Application lifecycle state: "destroyed"
  //   this.lifecycleState = "destroyed";

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
