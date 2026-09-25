// runtime/BrowserManager.js
const { EventEmitter } = require("events");
const TabManager = require("./tabs/TabManager");

const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");

/*
lifecycleState: "created" | "initializing" | "ready" | "error" | "destroyed"
*/

class BrowserManager extends EventEmitter {
  constructor({ window, surfaceManager }) {
    super();

    this.window = window;
    this.surfaceManager = surfaceManager;
    this.tabManager = new TabManager({ window, surfaceManager });
    this.lifecycleState = "created";

    this.handleTabCreated = this.handleTabCreated.bind(this);
    this.handleTabClosed = this.handleTabClosed.bind(this);
    this.handleTabActivated = this.handleTabActivated.bind(this);
    this.handleTabStateChanged = this.handleTabStateChanged.bind(this);
  }

  // --------- LIFECYCLE ---------

  initialize() {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Cannot initialize BrowserManager from state: ${this.lifecycleState}`,
      });
    }

    // Browser Lifecycle State: "Initializing"
    this.lifecycleState = "initializing";

    try {
      this.tabManager.initialize();

      this.setUpTabEvents();

      // Create the first tab.
      this.tabManager.createTab().catch((error) => {
        console.error("BROWSER MANAGER: failed to create initial tab", error);
        this.emit("tab-load-error", { error });
      });

      this.lifecycleState = "ready";

      // Log the successful initialization
      console.log("BROWSER MANAGER: Initialized successfully");
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

    this.tabManager.off("tab-created", this.handleTabCreated);
    this.tabManager.off("tab-closed", this.handleTabClosed);
    this.tabManager.off("tab-activated", this.handleTabActivated);
    this.tabManager.off("tab-state-changed", this.handleTabStateChanged);

    this.tabManager.destroy();

    this.removeAllListeners();

    this.window = null;
    this.tabManager = null;

    this.lifecycleState = "destroyed";

    console.log("BROWSER MANAGER: destroyed");
  }

  // --------- EVENT HANDLERS ---------

  setUpTabEvents() {
    this.tabManager.on("tab-created", this.handleTabCreated);
    this.tabManager.on("tab-closed", this.handleTabClosed);
    this.tabManager.on("tab-activated", this.handleTabActivated);
    this.tabManager.on("tab-state-changed", this.handleTabStateChanged);
  }

  handleTabCreated({ tabId, tab }) {
    this.emit("tab-created", { tabId, tab });
  }

  handleTabClosed(tabId) {
    console.log("BROWSER MANAGER: tab closed", tabId);

    this.emit("tab-closed", tabId);
  }

  handleTabActivated({ tabId }) {
    console.log("BROWSER MANAGER: tab activated", tabId);

    const tab = this.tabManager.getTabById(tabId);

    this.emit("tab-activated", { tabId, tab: tab.getState() });
  }

  handleTabStateChanged({ tabId, tab }) {
    console.log("BROWSER MANAGER: tab state changed", { tabId, tab });
    this.emit("tab-state-changed", { tabId, tab });
  }

  // --------- TAB OPERATIONS ---------

  async createTab(url) {
    this.assertReady();

    return await this.tabManager.createTab(url);
  }

  closeTab(tabId) {
    this.assertReady();

    return this.tabManager.closeTab(tabId);
  }

  activateTab(tabId) {
    this.assertReady();

    return this.tabManager.activateTab(tabId);
  }

  getTabById(tabId) {
    this.assertReady();

    return this.tabManager.getTabById(tabId);
  }

  getActiveTab() {
    this.assertReady();

    return this.tabManager.getActiveTab();
  }

  getAllTabs() {
    this.assertReady();

    return this.tabManager.getAllTabs();
  }

  // --------- BROWSER OPERATIONS ---------

  navigate(url) {
    this.assertReady();

    console.log("BROWSER MANAGER: navigating to:", url);

    const activeTab = this.requireActiveTab();
    return activeTab.navigate(url);
  }

  goBack() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating back");

    const activeTab = this.requireActiveTab();
    return activeTab.goBack();
  }

  goForward() {
    this.assertReady();
    console.log("BROWSER MANAGER: navigating forward");

    const activeTab = this.requireActiveTab();
    return activeTab.goForward();
  }

  // Reload Method
  reload() {
    this.assertReady();
    console.log("BROWSER MANAGER: reloading page");

    const activeTab = this.requireActiveTab();
    return activeTab.reload();
  }

  // ---------- GUARDS ---------

  requireActiveTab() {
    const activeTab = this.getActiveTab();
    if (!activeTab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_NO_ACTIVE_TAB,
        message: "No active tab exists.",
      });
    } else {
      return activeTab;
    }
  }

  assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `BrowserManager is not ready. Current lifecycle state: ${this.lifecycleState}`,
      });
    }
  }
}

module.exports = BrowserManager;
