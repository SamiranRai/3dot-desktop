const AppError = require("../../../errors/AppError");
const ErrorCodes = require("../../../errors/ErrorCodes");
const TabsCapabilities = require("./tabs/TabsCapabilities");
const NavigationCapabilities = require("./navigation/NavigationCapabilities");

class BrowserCapabilities {
  constructor(browserManager) {
    if (!browserManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserCapabilities requires a browserManager.",
      });
    }

    this.tabs = new TabsCapabilities(browserManager);
    this.navigation = new NavigationCapabilities(browserManager);
  }
}

module.exports = BrowserCapabilities;
