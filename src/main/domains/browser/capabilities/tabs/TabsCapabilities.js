const BaseCapabilities = require("../BaseCapabilities");

class TabsCapabilities extends BaseCapabilities {
  constructor(browserManager) {
    super(
      browserManager,
      ["createTab", "closeTab", "activateTab", "getTabById", "getActiveTab", "getAllTabs"],
      "TabsCapabilities",
    );
  }

  createTab(url) {
    this.assertOptionalString(url, "url", "createTab");
    return this.runOperation("createTab", () => this.browserManager.createTab(url));
  }

  closeTab(tabId) {
    this.assertNonEmptyString(tabId, "tabId", "closeTab");
    return this.runOperation("closeTab", () => this.browserManager.closeTab(tabId));
  }

  activateTab(tabId) {
    this.assertNonEmptyString(tabId, "tabId", "activateTab");
    return this.runOperation("activateTab", () => this.browserManager.activateTab(tabId));
  }

  getTabById(tabId) {
    this.assertNonEmptyString(tabId, "tabId", "getTabById");
    return this.runOperation("getTabById", () => this.browserManager.getTabById(tabId));
  }

  getActiveTab() {
    return this.runOperation("getActiveTab", () => this.browserManager.getActiveTab());
  }

  getAllTabs() {
    return this.runOperation("getAllTabs", () => this.browserManager.getAllTabs());
  }
}

module.exports = TabsCapabilities;
