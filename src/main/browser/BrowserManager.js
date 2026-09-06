const { WebContentsView } = require("electron");
const { EventEmitter } = require("events");
const BrowserState = require("./BrowserState");
/*
lifecycleState: "created" | "initializing" | "ready" | "error" | "destroyed"
*/

class BrowserManager extends EventEmitter {
  constructor(window) {
    super();

    this.window = window;
    this.view = null;

    // Browser State
    this.browserState = new BrowserState();

    // Browser Lifecycle State: "Created"
    this.lifecycleState = "created";
  }

  // Initialize Method
  initialize() {
    if (this.lifecycleState !== "created") {
      throw new Error(
        `Cannot initialize BrowserManager from lifecycle state: ${this.lifecycleState}`,
      );
    }

    // Browser Lifecycle State: "Initializing"
    this.lifecycleState = "initializing";

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

      // Setup WebContents Events
      this.setupWebContentsEvents();

      // Browser Lifecycle State: "ready"
      this.lifecycleState = "ready";

      // Log the successful initialization
      console.log("BROWSER MANAGER: Initialized successfully");
    } catch (error) {
      this.lifecycleState = "error";
      console.error("BROWSER MANAGER: Initialization failed:", error);
      throw error;
    }
  }

  // Setup Chromium Events Method
  setupWebContentsEvents() {
    const webContents = this.view.webContents;

    webContents.on("did-start-loading", () => {
      this.updateBrowserState({ isLoading: true });

      console.log("BROWSER MANAGER: loading started");
    });

    webContents.on("did-stop-loading", () => {
      this.updateBrowserState({ isLoading: false });

      console.log("BROWSER MANAGER: loading stopped");
    });

    webContents.on("did-navigate", (_, url) => {
      this.updateBrowserState({
        url,
        canGoBack: webContents.navigationHistory.canGoBack(),
        canGoForward: webContents.navigationHistory.canGoForward(),
      });

      console.log("BROWSER MANAGER: URL changed:", url);
    });

    webContents.on("page-title-updated", (_, title) => {
      this.updateBrowserState({ title });

      console.log("BROWSER MANAGER: title changed:", title);
    });
  }

  // Update Browser State Method
  updateBrowserState(patch) {
    Object.assign(this.browserState, patch);

    // Emit
    this.emit("browser:state-changed", this.browserState.getSnapshot());
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

  // Get Snapshot Method
  getSnapshot() {
    return this.browserState.getSnapshot();
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
    if (this.lifecycleState !== "ready") {
      throw new Error(
        `BrowserManager is not ready. Current lifecycle state: ${this.lifecycleState}`,
      );
    }
  }
}

module.exports = BrowserManager;
