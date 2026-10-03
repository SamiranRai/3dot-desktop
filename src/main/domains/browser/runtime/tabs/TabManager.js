const EventEmitter = require("events");
const Tab = require("./Tab");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

const DEFAULT_NEW_TAB_URL = "http://localhost:5173/start";

class TabManager extends EventEmitter {
  constructor({ surfaceManager, logger = console, newTabURL = DEFAULT_NEW_TAB_URL } = {}) {
    super();

    if (!surfaceManager) throw new TypeError("TabManager requires a surfaceManager.");
    if (typeof newTabURL !== "string" || !newTabURL.trim()) {
      throw new TypeError("TabManager requires a non-empty newTabURL.");
    }

    this.surfaceManager = surfaceManager;
    this.logger = logger;
    this.newTabURL = newTabURL;
    this.tabs = new Map();
    this.order = [];
    this.activeTabId = null;
    this.lifecycleState = "created";

    this.handleStateChanged = ({ tabId, tab }) => {
      this.emit("tab-state-changed", { tabId, tab });
    };

    this.handleLoadError = ({ tabId, error }) => {
      this.emit("tab-load-error", { tabId, error });
    };
  }

  initialize() {
    if (this.lifecycleState === "ready") return;
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Cannot initialize TabManager from state "${this.lifecycleState}".`,
      });
    }

    this.lifecycleState = "ready";
  }

  async createTab(url) {
    this._assertReady();

    const tab = new Tab({ logger: this.logger });

    this.tabs.set(tab.id, tab);
    this.order.push(tab.id);
    this._bindTab(tab);

    try {
      this.surfaceManager.attach(tab.id, tab.view.getView(), "tab");
      tab.deactivate();
      await tab.initialize(url === undefined ? this.newTabURL : url);
    } catch (error) {
      this._removeTabRecord(tab.id);
      this._unbindTab(tab);
      try {
        this.surfaceManager.detach(tab.id);
      } catch (detachError) {
        this.logger.error?.("TAB MANAGER: failed to detach failed tab", detachError);
      }
      tab.destroy();
      throw error;
    }

    this._activateInternal(tab.id);
    this.emit("tab-created", { tabId: tab.id, tab });
    return tab;
  }

  async closeTab(tabId) {
    this._assertReady();
    const tab = this._requireTab(tabId);
    const wasActive = tab.id === this.activeTabId;

    if (this.tabs.size === 1) {
      const replacement = await this.createTab();
      if (wasActive) this._activateInternal(replacement.id);
    }

    if (wasActive && this.tabs.has(tabId)) {
      const replacementId = this._findReplacementId(tabId);
      if (replacementId) this._activateInternal(replacementId);
    }

    this._unbindTab(tab);
    this._removeTabRecord(tab.id);

    try {
      this.surfaceManager.detach(tab.id);
    } finally {
      tab.destroy();
    }

    this.emit("tab-closed", {
      tabId,
      activeTabId: this.activeTabId,
    });

    return true;
  }

  activateTab(tabId) {
    this._assertReady();
    const tab = this._requireTab(tabId);
    this._activateInternal(tab.id);
    return tab;
  }

  getTabById(tabId) {
    this._assertReady();
    return this.tabs.get(tabId) || null;
  }

  getActiveTab() {
    this._assertReady();
    return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
  }

  getAllTabs() {
    this._assertReady();
    return this.order.map((id) => this.tabs.get(id)).filter(Boolean);
  }

  destroy() {
    if (this.lifecycleState === "destroyed") return;
    this.lifecycleState = "destroyed";

    for (const tab of this.tabs.values()) {
      try {
        this._unbindTab(tab);
        this.surfaceManager.detach(tab.id);
        tab.destroy();
      } catch (error) {
        this.logger.error?.(`TAB MANAGER: failed to destroy tab "${tab.id}"`, error);
      }
    }

    this.tabs.clear();
    this.order = [];
    this.activeTabId = null;
    this.removeAllListeners();
  }

  setActiveTabBounds(bounds) {
    this._assertReady();
    const activeTab = this.getActiveTab();
    if (!activeTab) return false;
    activeTab.setBounds(bounds);
    return true;
  }

  _bindTab(tab) {
    tab.on(Tab.EVENTS.STATE_CHANGED, this.handleStateChanged);
    tab.on(Tab.EVENTS.LOAD_ERROR, this.handleLoadError);
  }

  _unbindTab(tab) {
    tab.removeListener(Tab.EVENTS.STATE_CHANGED, this.handleStateChanged);
    tab.removeListener(Tab.EVENTS.LOAD_ERROR, this.handleLoadError);
  }

  _activateInternal(tabId) {
    const nextTab = this.tabs.get(tabId);
    if (!nextTab) return false;

    if (this.activeTabId === tabId) {
      nextTab.activate();
      return false;
    }

    if (this.activeTabId) {
      this.tabs.get(this.activeTabId)?.deactivate();
    }

    this.activeTabId = tabId;
    nextTab.activate();
    this.emit("tab-activated", { tabId, tab: nextTab });
    return true;
  }

  _findReplacementId(closingTabId) {
    const index = this.order.indexOf(closingTabId);
    if (index === -1) return null;
    return this.order[index + 1] || this.order[index - 1] || null;
  }

  _removeTabRecord(tabId) {
    this.tabs.delete(tabId);
    const index = this.order.indexOf(tabId);
    if (index !== -1) this.order.splice(index, 1);
    if (this.activeTabId === tabId) this.activeTabId = null;
  }

  _requireTab(tabId) {
    if (typeof tabId !== "string" || !tabId.trim()) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "tabId must be a non-empty string.",
      });
    }

    const tab = this.tabs.get(tabId);
    if (!tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_NOT_FOUND,
        message: `Tab "${tabId}" was not found.`,
      });
    }

    return tab;
  }

  _assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `TabManager is not ready. Current state: "${this.lifecycleState}".`,
      });
    }
  }
}

module.exports = TabManager;
