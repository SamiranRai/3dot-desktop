const crypto = require("crypto");

const Tab = require("./Tab");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

// Constants
const NEW_TAB_URL = "http://localhost:5173/start"; // TODO: make configurable
const TAB_EVENTS = Object.freeze({
  STATE_CHANGED: "tab-state-changed",
  CREATED: "tab-created",
  CLOSED: "tab-closed",
  ACTIVATED: "tab-activated",
});

class TabManager {
  constructor({ window, surfaceManager, eventBus, logger = console }) {
    this._validateConstructorParams({
      window,
      surfaceManager,
      eventBus,
    });

    // TabManager Objects Internal State
    this.window = window;
    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;
    this.logger = logger;

    // tabs<MAP<TabId, Tab>>
    this.tabs = new Map();
    
    this.activeTabId = null;
    this.lifecycleState = "created";
    this._unsubscribeEventBus = null;

    this._handleEventBusEvent = this._handleEventBusEvent.bind(this);
  }

  // ---------- Lifecycle ----------

  initialize() {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Cannot initialize TabManager from state: ${this.lifecycleState}`,
      });
    }

    try {
      this._unsubscribeEventBus = this.eventBus.subscribe(
        this._handleEventBusEvent,
      );
      this.lifecycleState = "ready";
      this._log("ready");
    } catch (error) {
      this.lifecycleState = "error";
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: "Failed to initialize TabManager.",
        cause: error,
      });
    }
  }

  destroy() {
    if (this.lifecycleState === "destroyed") return;
    this.lifecycleState = "destroyed";

    try {
      this._unsubscribeEventBus?.();
    } catch (error) {
      this._logError("Failed to unsubscribe from EventBus", error);
    }
    this._unsubscribeEventBus = null;

    const tabs = [...this.tabs.values()];
    this.tabs.clear();
    this.activeTabId = null;

    for (const tab of tabs) {
      try {
        tab.destroy();
      } catch (error) {
        this._logError("Failed to destroy Tab during shutdown", error);
      }
    }

    this.window = null;
    this.surfaceManager = null;
    this.eventBus = null;

    this._log("destroyed");
  }

  // Best-effort: state has already changed, a delivery failure must not roll it back.
  publishEvent(type, payload = null, tabId = null) {
    if (!this.eventBus) return false;

    try {
      this.eventBus.publish({ type, tabId, payload });
      return true;
    } catch (error) {
      this._logError(`Failed to publish "${type}" event`, error);
      return false;
    }
  }

  // ---------- Commands ----------

  async createTab(url = NEW_TAB_URL) {
    this._assertReady();

    const tabId = crypto.randomUUID();
    const tab = new Tab({
      id: tabId,
      window: this.window,
      surfaceManager: this.surfaceManager,
      eventBus: this.eventBus,
    });

    let registered = false;

    try {
      tab.attachToWindow();
      this.tabs.set(tabId, tab);
      registered = true;

      this.publishEvent(TAB_EVENTS.CREATED, { state: tab.getState() }, tabId);
      this.activateTab(tabId);
    } catch (error) {
      this._rollbackTabCreation(tabId, tab, registered);
      throw error;
    }

    // Past this point the tab is real: a load failure keeps it alive in an error state.
    await tab.initialize(url);

    // Tab may have been closed while loading.
    if (this.lifecycleState !== "ready" || this.tabs.get(tabId) !== tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_NOT_FOUND,
        message: `Tab ${tabId} is no longer managed by TabManager.`,
      });
    }

    this._log(`created tab ${tabId}`);
    return tab.getState();
  }

  closeTab(tabId) {
    this._assertReady();

    const tab = this.getTabById(tabId);
    const wasActive = this.activeTabId === tabId;

    // Remove ownership first so the destroyed-state event is ignored as already handled.
    this.tabs.delete(tabId);

    try {
      tab.destroy();
    } catch (error) {
      this._logError(`Failed to destroy tab ${tabId}`, error);
    }

    this.publishEvent(TAB_EVENTS.CLOSED, { reason: "user" }, tabId);

    if (wasActive) {
      this.activeTabId = null;
      this._activateReplacementTab();
    }

    this._log(`closed tab ${tabId}`);
  }

  activateTab(tabId) {
    this._assertReady();

    const target = this.getTabById(tabId);
    if (this.activeTabId === tabId) return target.getState();

    const previous = this.tabs.get(this.activeTabId) ?? null;

    try {
      previous?.hide();
      target.show();
      this.activeTabId = tabId;
    } catch (error) {
      try {
        previous?.show();
      } catch (restoreError) {
        this.activeTabId = null;
        this._logError("Failed to restore previous active Tab", restoreError);
      }
      throw error;
    }

    this.publishEvent(
      TAB_EVENTS.ACTIVATED,
      { state: target.getState() },
      tabId,
    );
    this._log(`activated tab ${tabId}`);

    return target.getState();
  }

  // ---------- Internal ----------

  _handleEventBusEvent(event) {
    if (this.lifecycleState === "destroyed" || !event?.tabId) return;
    if (event.type !== TAB_EVENTS.STATE_CHANGED) return;
    if (event.payload?.state?.lifecycleState !== "destroyed") return;

    const { tabId } = event;

    // Not in the map means closeTab()/rollback already handled it.
    if (!this.tabs.has(tabId)) return;

    const wasActive = this.activeTabId === tabId;
    this.tabs.delete(tabId);
    this.publishEvent(
      TAB_EVENTS.CLOSED,
      { reason: "unexpected-destruction" },
      tabId,
    );

    if (wasActive) {
      this.activeTabId = null;
      this._activateReplacementTab();
    }

    this._log(`reconciled unexpectedly destroyed tab ${tabId}`);
  }

  // Most recently created remaining tab wins.
  _activateReplacementTab() {
    for (const tabId of [...this.tabs.keys()].reverse()) {
      try {
        this.activateTab(tabId);
        return;
      } catch (error) {
        this._logError(`Failed to activate replacement tab ${tabId}`, error);
      }
    }
    this.activeTabId = null;
  }

  _rollbackTabCreation(tabId, tab, registered) {
    if (registered) {
      this.tabs.delete(tabId);
      if (this.activeTabId === tabId) this.activeTabId = null;
    }

    try {
      tab.destroy();
    } catch (error) {
      this._logError(
        `Failed to clean up partially created tab ${tabId}`,
        error,
      );
    }

    if (registered) {
      this.publishEvent(
        TAB_EVENTS.CLOSED,
        { reason: "creation-failed" },
        tabId,
      );
    }
  }

  _assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `TabManager is not ready. Current state: ${this.lifecycleState}`,
      });
    }
  }

  _validateConstructorParams({ window, surfaceManager, eventBus }) {
    if (!window) {
      throw new TypeError("TabManager: window is required.");
    }
    if (
      typeof surfaceManager?.attach !== "function" ||
      typeof surfaceManager?.detach !== "function"
    ) {
      throw new TypeError(
        "TabManager: surfaceManager must provide attach() and detach().",
      );
    }
    if (
      typeof eventBus?.publish !== "function" ||
      typeof eventBus?.subscribe !== "function"
    ) {
      throw new TypeError(
        "TabManager: eventBus must provide publish() and subscribe().",
      );
    }
  }

  // ---------- Queries ----------

  getTabById(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_NOT_FOUND,
        message: `Tab with ID ${tabId} not found.`,
      });
    }
    return tab;
  }

  getActiveTab() {
    return this.activeTabId === null ? null : this.getTabById(this.activeTabId);
  }

  getActiveTabState() {
    return this.getActiveTab()?.getState() ?? null;
  }

  getAllTabs() {
    return [...this.tabs.values()].map((tab) => tab.getState());
  }

  hasTab(tabId) {
    return this.tabs.has(tabId);
  }

  _log(message) {
    this.logger.log?.(`TAB MANAGER: ${message}`);
  }

  _logError(message, error) {
    this.logger.error?.(`TAB MANAGER: ${message}`, error);
  }
}

module.exports = TabManager;
