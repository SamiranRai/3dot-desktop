const BaseCapabilities = require("../BaseCapabilities");
const ErrorCodes = require("../../../../errors/ErrorCodes");

const REQUIRED_METHODS = ["navigate", "goBack", "goForward", "reload"];

class NavigationCapabilities extends BaseCapabilities {
  constructor(browserManager) {
    super(browserManager, REQUIRED_METHODS, "NavigationCapabilities");
  }

  navigate(url) {
    this.assertNonEmptyString(url, "url", "navigate");
    return this.runOperation(
      "navigate",
      () => this.browserManager.navigate(url),
      ErrorCodes.NAVIGATION_FAILED,
    );
  }

  goBack() {
    return this.runOperation(
      "goBack",
      () => this.browserManager.goBack(),
      ErrorCodes.NAVIGATION_FAILED,
    );
  }

  goForward() {
    return this.runOperation(
      "goForward",
      () => this.browserManager.goForward(),
      ErrorCodes.NAVIGATION_FAILED,
    );
  }

  reload() {
    return this.runOperation(
      "reload",
      () => this.browserManager.reload(),
      ErrorCodes.NAVIGATION_FAILED,
    );
  }
}

module.exports = NavigationCapabilities;
