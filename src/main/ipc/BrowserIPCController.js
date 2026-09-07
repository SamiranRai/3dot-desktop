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

    this.handleTabCreated = this.handleTabCreated.bind(this);
    this.handleTabClosed = this.handleTabClosed.bind(this);
    this.handleTabActivated = this.handleTabActivated.bind(this);
    this.handleTabStateChanged = this.handleTabStateChanged.bind(this);
  }

  // IPC Handlers Registration
  register() {
    if (this.registered) {
      console.warn("BrowserIPCController: IPC handlers already registered");
      return;
    }

    // Navigation Handlers
    ipcMain.handle("browser:navigate", this.navigate);
    ipcMain.handle("browser:navigation:back", this.goBack);
    ipcMain.handle("browser:navigation:forward", this.goForward);
    ipcMain.handle("browser:navigation:reload", this.reload);

    // Tab Management Handlers
    ipcMain.handle("browser:tab:create", this.createTab);
    ipcMain.handle("browser:tab:close", this.closeTab);
    ipcMain.handle("browser:tab:activate", this.activateTab);
    ipcMain.handle("browser:tabs:get", this.getTabs);

    // Register the listener for browser:state-changed events
    this.browserManager.on(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );

    this.setupBrowserEvents();

    this.registered = true;
    console.log("BrowserIPCController: IPC handlers registered");
  }

  // IPC Handlers Unregistration
  unRegister() {
    if (!this.registered) {
      console.warn("BrowserIPCController: IPC handlers not registered");
      return;
    }

    // Navigation Handlers
    ipcMain.removeHandler("browser:navigate");
    ipcMain.removeHandler("browser:navigation:back");
    ipcMain.removeHandler("browser:navigation:forward");
    ipcMain.removeHandler("browser:navigation:reload");

    // Tab Management Handlers
    ipcMain.removeHandler("browser:tab:create");
    ipcMain.removeHandler("browser:tab:close");
    ipcMain.removeHandler("browser:tab:activate");
    ipcMain.removeHandler("browser:tabs:get");

    // Remove the listener for browser:state-changed events
    this.browserManager.off(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );

    this.setOffBrowserEvents();

    this.registered = false;
    console.log("BrowserIPCController: IPC handlers unregistered");
  }

  setupBrowserEvents() {
    this.browserManager.on("tab-created", this.handleTabCreated);
    this.browserManager.on("tab-closed", this.handleTabClosed);
    this.browserManager.on("tab-activated", this.handleTabActivated);
    this.browserManager.on("tab-state-changed", this.handleTabStateChanged);
  }

  setOffBrowserEvents() {
    this.browserManager.off("tab-created", this.handleTabCreated);
    this.browserManager.off("tab-closed", this.handleTabClosed);
    this.browserManager.off("tab-activated", this.handleTabActivated);
    this.browserManager.off("tab-state-changed", this.handleTabStateChanged);
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

  handleTabCreated(tabState) {
    this.sendToRenderer("browser:tab-created", tabState);
  }

  handleTabClosed(data) {
    this.sendToRenderer("browser:tab-closed", data);
  }

  handleTabActivated(data) {
    this.sendToRenderer("browser:tab-activated", data);
  }

  handleTabStateChanged(data) {
    this.sendToRenderer("browser:tab-state-changed", data);
  }

  sendToRenderer(channel, data) {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    this.window.webContents.send(channel, data);
  }

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

  // ----------

  createTab = (ipcEvent, url) => {
    return this.execute("tab:create", () => {
      this.validateSender(ipcEvent);

      return this.browserManager.createTab(url);
    });
  };

  closeTab = (ipcEvent, tabId) => {
    return this.execute("tab:close", () => {
      this.validateSender(ipcEvent);

      if (typeof tabId !== "string" || !tabId.trim()) {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid tab ID.",
        });
      }

      return this.browserManager.closeTab(tabId);
    });
  };

  activateTab = (ipcEvent, tabId) => {
    return this.execute("tab:activate", () => {
      this.validateSender(ipcEvent);

      if (typeof tabId !== "string" || !tabId.trim()) {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid tab ID.",
        });
      }

      return this.browserManager.activateTab(tabId);
    });
  };

  getTabs = (ipcEvent) => {
    return this.execute("tabs:get", () => {
      this.validateSender(ipcEvent);

      return this.browserManager.getAllTabs();
    });
  };

  // ---------

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
