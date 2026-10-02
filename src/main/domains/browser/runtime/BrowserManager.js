// runtime/BrowserManager.js

const TabManager = require("./tabs/TabManager");
const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");

// Constants
const BROWSER_EVENTS = Object.freeze({
  INITIAL_TAB_LOAD_FAILED: "browser-initial-tab-load-failed",
});


class BrowserManager {
  constructor({ window, surfaceManager, eventBus, logger = console }) {
    this._validateConstructorParams({
      window,
      surfaceManager,
      eventBus,
    });

    // BrowserManager dependencies.
    this.window = window;
    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;
    this.logger = logger;

    // TabManager owns all tab-specific state and behavior.
    this.tabManager = new TabManager({
      window,
      surfaceManager,
      eventBus,
      logger,
    });

    this.lifecycleState = "created";
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  initialize() {
    this._assertCreated();

    this.lifecycleState = "initializing";

    try {
      /*
       * TabManager must be initialized before BrowserManager
       * starts accepting browser commands.
       */
      this.tabManager.initialize();

      /*
       * BrowserManager itself is now structurally ready.
       *
       * The initial tab is created asynchronously afterward.
       * A failure to load the initial tab does not mean the
       * entire browser manager failed to initialize.
       */
      this.lifecycleState = "ready";

      this._createInitialTab();

      this._log("initialized successfully");
    } catch (error) {
      this.lifecycleState = "error";

      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: "Failed to initialize BrowserManager.",
        cause: error,
      });
    }
  }

  destroy() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    /*
     * Mark the manager as destroyed before destroying dependencies.
     *
     * This prevents any later operation from treating this
     * BrowserManager as usable.
     */
    this.lifecycleState = "destroyed";

    try {
      this.tabManager?.destroy();
    } catch (error) {
      this._logError("Failed to destroy TabManager", error);
    }

    // Release references to external resources.
    this.window = null;
    this.surfaceManager = null;
    this.eventBus = null;
    this.tabManager = null;

    this._log("destroyed");
  }

  // =========================================================
  // TAB OPERATIONS
  // =========================================================

  async createTab(url) {
    this._assertReady();

    return this.tabManager.createTab(url);
  }

  closeTab(tabId) {
    this._assertReady();

    return this.tabManager.closeTab(tabId);
  }

  activateTab(tabId) {
    this._assertReady();

    return this.tabManager.activateTab(tabId);
  }

  // =========================================================
  // TAB QUERIES
  // =========================================================

  getTabById(tabId) {
    this._assertReady();

    return this.tabManager.getTabById(tabId);
  }

  getActiveTab() {
    this._assertReady();

    return this.tabManager.getActiveTab();
  }

  getAllTabs() {
    this._assertReady();

    return this.tabManager.getAllTabs();
  }

  // =========================================================
  // BROWSER OPERATIONS
  // =========================================================

  navigate(url) {
    this._assertReady();

    const activeTab = this._requireActiveTab();

    this._log(`navigating to: ${url}`);

    return activeTab.navigate(url);
  }

  goBack() {
    this._assertReady();

    const activeTab = this._requireActiveTab();

    this._log("navigating back");

    return activeTab.goBack();
  }

  goForward() {
    this._assertReady();

    const activeTab = this._requireActiveTab();

    this._log("navigating forward");

    return activeTab.goForward();
  }

  reload() {
    this._assertReady();

    const activeTab = this._requireActiveTab();

    this._log("reloading page");

    return activeTab.reload();
  }

  // =========================================================
  // INTERNAL
  // =========================================================

  _createInitialTab() {
    /*
     * Initial tab creation is intentionally not awaited here.
     *
     * BrowserManager itself can become ready while the first page
     * is still loading. TabManager owns the tab lifecycle.
     *
     * If the initial tab fails, the browser remains alive and the
     * failure is reported separately.
     */
    this.tabManager.createTab().catch((error) => {
      this._logError("Failed to create initial tab", error);

      this._publishEvent(BROWSER_EVENTS.INITIAL_TAB_LOAD_FAILED, {
        error,
      });
    });
  }

  _requireActiveTab() {
    const activeTab = this.tabManager.getActiveTab();

    if (!activeTab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_NO_ACTIVE_TAB,
        message: "No active tab exists.",
      });
    }

    return activeTab;
  }

  // =========================================================
  // GUARDS
  // =========================================================

  _assertCreated() {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message:
          `Cannot initialize BrowserManager from state: ` +
          `${this.lifecycleState}`,
      });
    }
  }

  _assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message:
          `BrowserManager is not ready. Current lifecycle state: ` +
          `${this.lifecycleState}`,
      });
    }
  }

  // =========================================================
  // EVENT BUS
  // =========================================================

  _publishEvent(type, payload = null) {
    /*
     * Event delivery should not make an already-completed browser
     * operation fail. The state transition has already happened;
     * event delivery is best-effort.
     */
    if (!this.eventBus) {
      return false;
    }

    try {
      this.eventBus.publish({
        type,
        payload,
      });

      return true;
    } catch (error) {
      this._logError(`Failed to publish "${type}" event`, error);

      return false;
    }
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  _validateConstructorParams({ window, surfaceManager, eventBus }) {
    if (!window) {
      throw new TypeError("BrowserManager: window is required.");
    }

    if (
      typeof surfaceManager?.attach !== "function" ||
      typeof surfaceManager?.detach !== "function"
    ) {
      throw new TypeError(
        "BrowserManager: surfaceManager must provide attach() and detach().",
      );
    }

    if (
      typeof eventBus?.publish !== "function" ||
      typeof eventBus?.subscribe !== "function"
    ) {
      throw new TypeError(
        "BrowserManager: eventBus must provide publish() and subscribe().",
      );
    }
  }

  // =========================================================
  // LOGGING
  // =========================================================

  _log(message) {
    this.logger.log?.(`BROWSER MANAGER: ${message}`);
  }

  _logError(message, error) {
    this.logger.error?.(`BROWSER MANAGER: ${message}`, error);
  }
}

module.exports = BrowserManager;
