const { EventEmitter } = require("events");

const TabView = require("./TabView");

const TabState = require("./TabState");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

/*
############: Lifecycle States :############
#Lifecycle States: "created" | "initializing" | "ready" | "error" | "destroyed"
#Lifecycle State Transitions:
- Successful: created -> initializing -> ready
- Error: created -> initializing -> error
- Destroyed: ready -> destroyed

Note: "ready" means the page has finished loading (navigation history,
webContents state, etc. are valid). It does NOT gate whether the tab's
view can be positioned, shown, or hidden — that's possible from the
moment the Tab is constructed, same as a real browser shows a
blank/loading tab immediately rather than waiting for the page to load
before it's even visible. See setBounds()/show()/hide() vs.
navigate()/goBack()/goForward()/reload() below.

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
  constructor({ id, window, surfaceManager }) {
    super();

    // Tab Properties
    this.id = id;
    this.window = window;
    this.surfaceManager = surfaceManager;

    // Tab State
    this.tabState = new TabState();
    this.view = new TabView();

    // Tab Lifecycle State: "Created"
    this.lifecycleState = "created";
  }

  // Intializing Tab, Default URL=Google
  async initialize(url) {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: `Cannot initialize Tab from lifecycle state: ${this.lifecycleState}`,
      });
    }

    // Tab Lifecycle State: "Initializing"
    this.lifecycleState = "initializing";

    try {
      this.setupWebContentsEvents();

      await this.view.loadURL(url);

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

  // Setup WebContents Events
  setupWebContentsEvents() {
    const webContents = this.view.getWebContents();

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
    this.emit("tab-state-changed", this.getState());
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
  // These genuinely require the page to have finished loading (they touch
  // webContents.navigationHistory), so they keep the assertReady() guard.

  navigate(url) {
    this.assertReady();
    console.log(`TAB [${this.id}]: navigating to`, url);
    return this.view.loadURL(url);
  }

  goBack() {
    this.assertReady();
    console.log(`TAB [${this.id}]: navigating back`);
    if (!this.view.getWebContents().navigationHistory.canGoBack()) {
      return false;
    }

    this.view.getWebContents().navigationHistory.goBack();
    return true;
  }

  goForward() {
    this.assertReady();
    console.log(`TAB [${this.id}]: navigating forward`);
    if (!this.view.getWebContents().navigationHistory.canGoForward()) {
      return false;
    }
    this.view.getWebContents().navigationHistory.goForward();
    return true;
  }

  reload() {
    this.assertReady();
    console.log(`TAB [${this.id}]: reloading page`);
    this.view.getWebContents().reload();
  }

  getView() {
    return this.view.getView();
  }

  attachToWindow() {
    if (!this.surfaceManager) {
      throw new AppError({
        code: ErrorCodes.BROWSER_WINDOW_NOT_FOUND,
        message: "Cannot attach tab: surfaceManager reference is null.",
      });
    }

    this.surfaceManager.attach(this.id, this.getView(), "tab");
  }

  setBounds(bounds) {
    this.view.setBounds(bounds);
  }

  show() {
    this.view.show();
  }

  hide() {
    this.view.hide();
  }

  // Assert Ready Method — for navigation only, see above.
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
        if (this.surfaceManager) {
          this.surfaceManager.detach(this.id);
        }

        this.view.destroy();
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
