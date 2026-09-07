const { WebContentsView } = require("electron");
const { EventEmitter } = require("events");

const TabState = require("./TabState");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

/*
############: Lifecycle States :############
#Lifecycle States: "created" | "initializing" | "ready" | "error" | "destroyed"
#Lifecycle State Transitions:
- Successful: created -> initializing -> ready
- Error: created -> initializing -> error
- Destroyed: ready -> destroyed

---------------------------------------

############: Event Handling :############
#Event Listeners:
- "did-start-loading": Triggered when the page starts loading.
- "did-stop-loading": Triggered when the page stops loading.
- "did-navigate": Triggered when navigation occurs.
- "page-title-updated": Triggered when the page title updates.

#Event Emissions:
- "tab-state-changed": Emitted when the tab's state changes, providing the updated state.

#Event Flow:
(chromium:Emit) -> (Listen) "did-start-loading" -> (updateTabState:Emit) "tab-state-changed"
(chromium:Emit) -> (Listen) "did-stop-loading" -> (updateTabState:Emit) "tab-state-changed"
(chromium:Emit) -> (Listen) "did-navigate" -> (updateTabState:Emit) "tab-state-changed"
(chromium:Emit) -> (Listen) "page-title-updated" -> (updateTabState:Emit) "tab-state-changed"
*/

class Tab extends EventEmitter {
  constructor({ id, window }) {
    super();

    // Tab Properties
    this.id = id;
    this.window = window;

    // Tab View
    this.view = null;

    // Tab State
    this.tabState = new TabState();

    // Tab Lifecycle State: "Created"
    this.lifecycleState = "created";
  }

  // Intializing Tab, Default URL=Google
  initialize(url = "https://www.google.com") {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: `Cannot initialize Tab from lifecycle state: ${this.lifecycleState}`,
      });
    }

    // Tab Lifecycle State: "Initializing"
    this.lifecycleState = "initializing";

    try {
      // Create a new WebContentsView
      this.createView();

      // Setup WebContents Events
      this.setupWebContentsEvents();

      this.view.webContents.loadURL(url);

      // Tab Lifecycle State: "Ready"
      this.lifecycleState = "ready";

      console.log(`TAB [${this.id}]: initialized`);
    } catch (error) {
      this.lifecycleState = "error";
      console.error(`TAB [${this.id}]: initialization failed`, error);
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: `Failed to initialize Tab: ${error.message}`,
        cause: error,
      });
    }
  }

  // Create a new WebContentsView
  createView() {
    this.view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.window.contentView.addChildView(this.view);
  }

  // Setup WebContents Events
  setupWebContentsEvents() {
    const webContents = this.view.webContents;

    // Event: Page starts loading
    webContents.on("did-start-loading", () => {
      this.updateTabState({
        isLoading: true,
      });
    });

    // Event: Page stops loading
    webContents.on("did-stop-loading", () => {
      this.updateTabState({
        isLoading: false,
        canGoBack: webContents.navigationHistory.canGoBack(),
        canGoForward: webContents.navigationHistory.canGoForward(),
      });
    });

    // Event: Navigation occurs
    webContents.on("did-navigate", (_event, url) => {
      this.updateTabState({
        url,
        canGoBack: webContents.navigationHistory.canGoBack(),
        canGoForward: webContents.navigationHistory.canGoForward(),
      });
    });

    // Event: Page title updates
    webContents.on("page-title-updated", (_event, title) => {
      this.updateTabState({
        title,
      });
    });
  }

  // Update the tab state and emit a tab-state-changed event
  updateTabState(patch) {
    Object.assign(this.tabState, patch);
    this.emit("tab-state-changed", this.tabState.getSnapshot());
  }

  // Get the current state of the tab
  getState() {
    return {
      id: this.id,
      ...this.tabState.getSnapshot(),
      lifecycleState: this.lifecycleState,
    };
  }

  // ---Navigation Methods---

  // Navigate to a new URL
  navigate(url) {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating to:", url);
    return this.view.webContents.loadURL(url);
  }

  // Go back in the navigation history
  goBack() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating back");
    if (!this.view.webContents.navigationHistory.canGoBack()) {
      return false;
    }

    this.view.webContents.navigationHistory.goBack();
    return true;
  }

  // Go forward in the navigation history
  goForward() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating forward");
    if (!this.view.webContents.navigationHistory.canGoForward()) {
      return false;
    }
    this.view.webContents.navigationHistory.goForward();
    return true;
  }

  // Reload Method
  reload() {
    this.assertReady();
    console.log("BROWSER MANAGER: reloading page");
    this.view.webContents.reload();
  }

  // Set Bounds Method
  setBounds(bounds) {
    this.assertReady();

    this.view.setBounds(bounds);
  }

  // Show and Hide Methods
  show() {
    this.assertReady();
    this.view.setVisible(true);
  }

  hide() {
    this.assertReady();
    this.view.setVisible(false);
  }

  // Assert Ready Method
  assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Tab is not ready. Current state: ${this.lifecycleState}`,
      });
    }
  }

  destroy() {
    if (this.lifecycleState === "destroyed") {
      console.warn(`TAB [${this.id}]: already destroyed`);
      return;
    }

    try {
      if (this.view) {
        const webContents = this.view.webContents;

        if (!webContents.isDestroyed()) {
          webContents.close();
        }

        if (this.window?.contentView) {
          this.window.contentView.removeChild(this.view);
        }
      }
    } finally {
      // Reset properties and remove event listeners
      this.view = null;
      this.window = null;

      this.removeAllListeners();

      this.lifecycleState = "destroyed";
      console.log(`TAB [${this.id}]: destroyed`);
    }
  }
}

module.exports = Tab;
