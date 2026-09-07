const { EventEmitter } = require("events");
const crypto = require("crypto");

const Tab = require("./Tab");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

const DEFAULT_NEW_TAB_URL = "https://www.google.com";

/*
@Class: TabManager
@Description: Manages a collection of tabs within a browser window.
*/

class TabManager extends EventEmitter {
  constructor(window) {
    super();

    this.window = window;
    this.tabs = new Map();
    this.activeTabId = null;
    this.lifecycleState = "created";
  }

  // --------- LIFECYCLE ---------

  initialize() {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Cannot initialize TabManager from state: ${this.lifecycleState}`,
      });
    }

    this.lifecycleState = "initializing";
    console.log("TAB MANAGER: initializing");

    try {
      this.lifecycleState = "ready";

      console.log("TAB MANAGER: ready");
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
    if (this.lifecycleState === "destroyed") {
      return;
    }

    for (const tab of this.tabs.values()) {
      tab.destroy();
    }

    this.tabs.clear();
    this.activeTabId = null;

    this.removeAllListeners();

    this.window = null;
    this.lifecycleState = "destroyed";

    console.log("TAB MANAGER: destroyed");
  }

  // --------- COMMANDS ---------

  createTab(url = DEFAULT_NEW_TAB_URL) {
    this.assertReady();

    const tabId = crypto.randomUUID();

    const tab = new Tab({ id: tabId, window: this.window });

    tab.on("tab-state-changed", (snapshot) => {
      this.emit("tab-state-changed", { tabId: tabId, state: snapshot });
    });

    tab.initialize(url);

    // Store Map<TabId, Tab>
    this.tabs.set(tabId, tab);

    this.emit("tab-created", tab.getState());

    // A newly created tab becomes active.
    this.activateTab(tabId);

    console.log(`TAB MANAGER: created tab ${tabId}`);

    return tab.getState();
  }

  closeTab(tabId) {
    this.assertReady();

    const tab = this.getTabById(tabId);
    if (!tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_NOT_FOUND,
        message: `Tab with ID ${tabId} not found.`,
      });
    }

    const wasActiveTab = this.activeTabId === tabId;

    tab.destroy();
    this.tabs.delete(tabId);

    this.emit("tab-closed", tabId);

    // If the closed tab was active, Set a new active tab
    if (wasActiveTab) {
      const remainingTabIds = [...this.tabs.keys()];

      if (remainingTabIds.length > 0) {
        this.activateTab(remainingTabIds[remainingTabIds.length - 1]);
      } else {
        this.activeTabId = null;
      }
    }

    console.log(`TAB MANAGER: closed tab ${tabId}`);
  }

  activateTab(tabId) {
    this.assertReady();

    const tab = this.getTabById(tabId);
    if (!tab) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_NOT_FOUND,
        message: `Tab with ID ${tabId} not found.`,
      });
    }

    // If the requested tab is already active, return its state
    if (this.activeTabId === tabId) {
      return tab.getState();
    }

    // Hide current active tab.
    if (this.activeTabId !== null) {
      const currentTab = this.tabs.get(this.activeTabId);

      if (currentTab) {
        currentTab.hide();
      }
    }

    // Show requested tab.
    tab.show();

    // Update the active tab ID
    this.activeTabId = tabId;

    this.emit("tab-activated", {
      tabId,
      state: tab.getState(),
    });

    console.log(`TAB MANAGER: activated tab ${tabId}`);

    return tab.getState();
  }

  // --------- QUERIES ---------

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
    if (!this.activeTabId) {
      return null;
    }

    // Return: Tab Instance
    return this.getTabById(this.activeTabId);
  }

  getActiveTabState() {
    const activeTab = this.getActiveTab();
    if (!activeTab) {
      return null;
    }

    // Return: TabState
    return activeTab.getState();
  }

  getAllTabs() {
    return [...this.tabs.values()].map((tab) => tab.getState());
  }

  hasTab(tabId) {
    return this.tabs.has(tabId);
  }

  // --------- GUARDS ---------

  // Assert that the TabManager is ready
  assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `TabManager is not ready. Current state: ${this.lifecycleState}`,
      });
    }
  }
}

module.exports = TabManager;
