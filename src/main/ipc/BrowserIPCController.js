const { ipcMain } = require("electron");

// All Imports
const AppError = require("./../errors/AppError");
const ErrorCodes = require("./../errors/ErrorCodes");
const ErrorHandler = require("./../errors/ErrorHandler");

class BrowserIPCController {
  constructor(browserManager, window) {
    this.window = window;
    this.browserManager = browserManager;
    this.registered = false;

    // Browser State Change Handler Binding
    this.handleBrowserStateChanged = this.handleBrowserStateChanged.bind(this);
  }

  // IPC Handlers Registration
  register() {
    if (this.registered) {
      console.warn("BrowserIPCController: IPC handlers already registered");
      return;
    }

    ipcMain.handle("browser:navigate", this.navigate);
    ipcMain.handle("browser:navigation:back", this.goBack);
    ipcMain.handle("browser:navigation:forward", this.goForward);
    ipcMain.handle("browser:navigation:reload", this.reload);

    // Register the listener for browser:state-changed events
    this.browserManager.on(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );

    this.registered = true;
    console.log("BrowserIPCController: IPC handlers registered");
  }

  // IPC Handlers Unregistration
  unRegister() {
    if (!this.registered) {
      console.warn("BrowserIPCController: IPC handlers not registered");
      return;
    }

    ipcMain.removeHandler("browser:navigate");
    ipcMain.removeHandler("browser:navigation:back");
    ipcMain.removeHandler("browser:navigation:forward");
    ipcMain.removeHandler("browser:navigation:reload");

    // Remove the listener for browser:state-changed events
    this.browserManager.off(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );

    this.registered = false;
    console.log("BrowserIPCController: IPC handlers unregistered");
  }

  // browser:state-changed Event Listener
  handleBrowserStateChanged = (state) => {
    if (this.window && !this.window.isDestroyed()) {
      console.log(
        "BrowserIPCController: Sending browser:state-changed event to renderer",
        state,
      );
      this.window.webContents.send("browser:state-changed", state);
    } else {
      console.warn(
        "BrowserIPCController: Cannot send browser:state-changed event, window is not available or destroyed",
      );
    }
  };

  navigate = (event, url) => {
    console.log("BrowserIPCController: browser:navigate called", url);

    return this.execute("browser:navigate", () => {
      console.log("BrowserIPCController: Validating sender and URL");
      this.validateSender(event);
      const validatedUrl = this.validateNavigationUrl(url);
      return this.browserManager.navigate(validatedUrl);
    });
  };

  goBack = (event) => {
    console.log("BrowserIPCController: browser:navigation:back called");

    return this.execute("browser:navigation:back", () => {
      this.validateSender(event);
      return this.browserManager.goBack();
    });
  };

  goForward = (event) => {
    console.log("BrowserIPCController: browser:navigation:forward called");

    return this.execute("browser:navigation:forward", () => {
      this.validateSender(event);
      return this.browserManager.goForward();
    });
  };

  reload = (event) => {
    console.log("BrowserIPCController: browser:navigation:reload called");

    return this.execute("browser:navigation:reload", () => {
      this.validateSender(event);
      return this.browserManager.reload();
    });
  };

  // Validation Methods
  validateSender(event) {
    if (!event?.sender) {
      throw new AppError({
        code: ErrorCodes.UNAUTHORIZED_REQUEST,
        message: "Unauthorized IPC request.",
      });
    }

    // We will make this stricter when
    // Application / BrowserWindow ownership
    // is finalized.
  }

  validateNavigationUrl(url) {
    if (typeof url !== "string") {
      throw new AppError({
        code: ErrorCodes.INVALID_URL,
        message: "URL must be a string.",
      });
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      throw new AppError({
        code: ErrorCodes.INVALID_URL,
        message: "URL cannot be empty.",
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(trimmedUrl);
    } catch (error) {
      throw new AppError({
        code: ErrorCodes.INVALID_URL,
        message: "Invalid URL.",
        cause: error,
      });
    }

    const allowedProtocols = ["http:", "https:"];

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      throw new AppError({
        code: ErrorCodes.UNSUPPORTED_PROTOCOL,
        message: "Only HTTP and HTTPS URLs are allowed.",
        details: {
          protocol: parsedUrl.protocol,
        },
      });
    }

    // Return the validated URL as a string
    return parsedUrl.toString();
  }

  async execute(operation, callback) {
    try {
      const data = await callback();

      return {
        success: true,
        operation,
        data: data ?? null,
      };
    } catch (error) {
      // Normalize the error
      const normalizedError = ErrorHandler.normalizeError(error);

      // Log the error
      console.error(
        `BrowserIPCController: ${operation} failed`,
        normalizedError,
      );
      return {
        success: false,
        operation,
        error: ErrorHandler.toResponse(normalizedError),
      };
    }
  }
}

module.exports = BrowserIPCController;
