const TabManager = require("./tabs/TabManager");
const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");

const EVENTS = Object.freeze({
  TAB_CREATED: "browser:tab-created",
  TAB_CLOSED: "browser:tab-closed",
  TAB_ACTIVATED: "browser:tab-activated",
  TAB_STATE_CHANGED: "browser:tab-state-changed",
  TAB_LOAD_ERROR: "browser:tab-load-error",
});

class BrowserManager {
  constructor({ surfaceManager, eventBus, logger = console, newTabURL } = {}) {
    if (!surfaceManager) throw new TypeError("BrowserManager requires surfaceManager.");
    if (!eventBus || typeof eventBus.publish !== "function") {
      throw new TypeError("BrowserManager requires eventBus.publish().");
    }

    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;
    this.logger = logger;
    this.tabManager = new TabManager({ surfaceManager, logger, newTabURL });
    this.lifecycleState = "created";

    this.handlers = {
      created: ({ tabId, tab }) => this._publish(EVENTS.TAB_CREATED, { tabId, tab: tab.getState() }),
      closed: (payload) => this._publish(EVENTS.TAB_CLOSED, payload),
      activated: ({ tabId, tab }) => this._publish(EVENTS.TAB_ACTIVATED, { tabId, tab: tab.getState() }),
      stateChanged: ({ tabId, tab }) => this._publish(EVENTS.TAB_STATE_CHANGED, { tabId, tab: tab.getState() }),
      loadError: ({ tabId, error }) => this._publish(EVENTS.TAB_LOAD_ERROR, {
        tabId,
        error: this._serializeError(error),
      }),
    };
  }

  initialize() {
    this._assertState("created");

    try {
      this.tabManager.initialize();
      this._subscribeToTabManager();
      this.lifecycleState = "ready";
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

  createInitialTab() {
    this._assertReady();
    return this.createTab();
  }

  async createTab(url) {
    this._assertReady();
    const tab = await this.tabManager.createTab(url);
    return tab.getState();
  }

  async closeTab(tabId) {
    this._assertReady();
    return this.tabManager.closeTab(tabId);
  }

  activateTab(tabId) {
    this._assertReady();
    return this.tabManager.activateTab(tabId).getState();
  }

  getTabById(tabId) {
    this._assertReady();
    return this.tabManager.getTabById(tabId)?.getState() || null;
  }

  getActiveTab() {
    this._assertReady();
    return this.tabManager.getActiveTab()?.getState() || null;
  }

  getAllTabs() {
    this._assertReady();
    return this.tabManager.getAllTabs().map((tab) => tab.getState());
  }

  navigate(url) {
    this._assertReady();
    return this._requireActiveTab().navigate(url);
  }

  goBack() {
    this._assertReady();
    return this._requireActiveTab().goBack();
  }

  goForward() {
    this._assertReady();
    return this._requireActiveTab().goForward();
  }

  reload() {
    this._assertReady();
    return this._requireActiveTab().reload();
  }

  setActiveTabBounds(bounds) {
    this._assertReady();
    return this.tabManager.setActiveTabBounds(bounds);
  }

  destroy() {
    if (this.lifecycleState === "destroyed") return;
    this.lifecycleState = "destroying";

    this._unsubscribeFromTabManager();

    try {
      this.tabManager.destroy();
    } catch (error) {
      this._logError("Failed to destroy TabManager", error);
    }

    this.lifecycleState = "destroyed";
    this.tabManager = null;
    this.surfaceManager = null;
    this.eventBus = null;
    this._log("destroyed");
  }

  _requireActiveTab() {
    const tab = this.tabManager.getActiveTab();
    if (!tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_NO_ACTIVE_TAB,
        message: "No active tab exists.",
      });
    }
    return tab;
  }

  _subscribeToTabManager() {
    this.tabManager.on("tab-created", this.handlers.created);
    this.tabManager.on("tab-closed", this.handlers.closed);
    this.tabManager.on("tab-activated", this.handlers.activated);
    this.tabManager.on("tab-state-changed", this.handlers.stateChanged);
    this.tabManager.on("tab-load-error", this.handlers.loadError);
  }

  _unsubscribeFromTabManager() {
    if (!this.tabManager) return;
    this.tabManager.removeListener("tab-created", this.handlers.created);
    this.tabManager.removeListener("tab-closed", this.handlers.closed);
    this.tabManager.removeListener("tab-activated", this.handlers.activated);
    this.tabManager.removeListener("tab-state-changed", this.handlers.stateChanged);
    this.tabManager.removeListener("tab-load-error", this.handlers.loadError);
  }

  _publish(type, payload) {
    this.eventBus?.publish(type, payload);
  }

  _serializeError(error) {
    return {
      code: error?.code || ErrorCodes.BROWSER_OPERATION_FAILED,
      message: error?.message || "Unknown browser error.",
      details: error?.details,
    };
  }

  _assertState(expected) {
    if (this.lifecycleState !== expected) {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Cannot use BrowserManager from state "${this.lifecycleState}".`,
        details: { expected, actual: this.lifecycleState },
      });
    }
  }

  _assertReady() {
    this._assertState("ready");
  }

  _log(message) {
    this.logger.log?.(`BROWSER MANAGER: ${message}`);
  }

  _logError(message, error) {
    this.logger.error?.(`BROWSER MANAGER: ${message}`, error);
  }
}

BrowserManager.EVENTS = EVENTS;
module.exports = BrowserManager;
