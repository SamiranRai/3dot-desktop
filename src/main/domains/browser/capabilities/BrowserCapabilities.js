const TabsCapabilities = require("./tabs/TabsCapabilities");
const NavigationCapabilities = require("./navigation/NavigationCapabilities");
const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");
const ErrorHandler = require("../../../errors/ErrorHandler");

class BrowserCapabilities {
  constructor(browserManager) {
    if (!browserManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserCapabilities requires a browserManager",
      });
    }

    try {
      this.tabs = new TabsCapabilities(browserManager);
      this.navigation = new NavigationCapabilities(browserManager);
    } catch (cause) {
      throw ErrorHandler.normalizeError(cause);
    }
  }
}

module.exports = BrowserCapabilities;
