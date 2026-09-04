const { WebContentsView } = require("electron");

/*
state: "created" | "initializing" | "ready" | "error"
*/

class BrowserManager {
  constructor(window) {
    this.window = window;
    this.view = null;
    // Browser State: "Created"
    this.state = "created";
  }

  initialize() {
    if (this.state !== "created") {
      throw new Error(
        `Cannot initialize BrowserManager from state: ${this.state}`,
      );
    }

    // Browser State: "Initializing"
    this.state = "initializing";

    try {
      // Create a new WebContentsView
      this.view = new WebContentsView({
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      // Add the WebContentsView to the main window
      this.window.contentView.addChildView(this.view);

      // Method Init
      this.resize();

      // Load the initial URL (Google in this case)
      this.view.webContents.loadURL("https://www.google.com");

      // Browser State: "ready"
      this.state = "ready";

      // Log the successful initialization
      console.log("BROWSER MANAGER: Initialized successfully");
    } catch (error) {
      this.state = "error";
      console.error("BROWSER MANAGER: Initialization failed:", error);
      throw error;
    }
  }

  // Resize Method
  resize() {
    if (!this.view) {
      console.warn("BROWSER MANAGER: Cannot resize, view is not initialized");
      return;
    }
    // Get the current size of the main window
    const [width, height] = this.window.getContentSize();

    // Fixed toolbar height
    const toolbarHeight = 70;

    this.view.setBounds({
      x: 0,
      y: toolbarHeight,
      width,
      height: height - toolbarHeight,
    });
  }

  // ---Navigation Methods---
  navigate(url) {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating to:", url);
    this.view.webContents.loadURL(url);
  }

  goBack() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating back");
    if (this.view.webContents.navigationHistory.canGoBack()) {
      this.view.webContents.navigationHistory.goBack();
    }
  }

  goForward() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating forward");
    if (this.view.webContents.navigationHistory.canGoForward()) {
      this.view.webContents.navigationHistory.goForward();
    }
  }

  // Reload Method
  reload() {
    this.assertReady();
    console.log("BROWSER MANAGER: reloading page");
    this.view.webContents.reload();
  }

  // Assert Ready Method
  assertReady() {
    if (this.state !== "ready") {
      throw new Error(
        `BrowserManager is not ready. Current state: ${this.state}`,
      );
    }
  } 
}

module.exports = BrowserManager;
