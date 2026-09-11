const { ipcMain } = require("electron");

const AppError = require("./../errors/AppError");
const ErrorCodes = require("./../errors/ErrorCodes");
const ErrorHandler = require("./../errors/ErrorHandler");

class BrowserIPCController {
  constructor(browserManager, window) {
    this.window = window;
    this.browserManager = browserManager;
    this.registered = false;

    this.handleBrowserStateChanged = this.handleBrowserStateChanged.bind(this);
    this.handleTabCreated = this.handleTabCreated.bind(this);
    this.handleTabClosed = this.handleTabClosed.bind(this);
    this.handleTabActivated = this.handleTabActivated.bind(this);
    this.handleTabStateChanged = this.handleTabStateChanged.bind(this);
  }

  // IPC Hnadlers & Event Listeners Registration
  register() {
    if (this.registered) {
      console.warn("BrowserIPCController: IPC handlers already registered");
      return;
    }

    // Register IPC Handler
    this.setUpIPCHandlers();

    // Register the listener
    this.setUpBrowserEvents();

    this.registered = true;
    console.log("BrowserIPCController: IPC handlers registered");
  }

  // IPC Handlers & Event Listeners Unregistration
  unRegister() {
    if (!this.registered) {
      console.warn("BrowserIPCController: IPC handlers not registered");
      return;
    }

    // Unregister IPC Handlers
    this.setOffIPCHandlers();

    // Remove the listener
    this.setOffBrowserEvents();

    this.registered = false;
    console.log("BrowserIPCController: IPC handlers unregistered");
  }

  // IPC Handlers Setup: React -> Electron (IPC Invokes)
  setUpIPCHandlers() {
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
  }

  // IPC Handlers Unregistration
  setOffIPCHandlers() {
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
  }

  // Browser Event Listeners Setup: Main Process -> Renderer Process (IPC Sends)
  setUpBrowserEvents() {
    // Register event listeners for browser events
    this.browserManager.on(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );
    this.browserManager.on("tab-created", this.handleTabCreated);
    this.browserManager.on("tab-closed", this.handleTabClosed);
    this.browserManager.on("tab-activated", this.handleTabActivated);
    this.browserManager.on("tab-state-changed", this.handleTabStateChanged);
  }

  // Browser Event Listeners Unregistration
  setOffBrowserEvents() {
    this.browserManager.off(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );
    this.browserManager.off("tab-created", this.handleTabCreated);
    this.browserManager.off("tab-closed", this.handleTabClosed);
    this.browserManager.off("tab-activated", this.handleTabActivated);
    this.browserManager.off("tab-state-changed", this.handleTabStateChanged);
  }

  // Event Handlers
  handleBrowserStateChanged = (state) => {
    this.sendToRenderer("browser:state-changed", state);
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

  // Helper Method for Sending Events to Renderer
  sendToRenderer(channel, data) {
    // @NEED_CHECK: need to check if this.window is valid and not destroyed before sending
    if (!this.window || this.window.isDestroyed()) {
      console.warn(
        "BrowserIPCController: Cannot send event to renderer, window is not available or destroyed",
      );
      return;
    }

    // Send the event to the renderer process
    this.window.webContents.send(channel, data);
  }

  // Command Handlers for IPC Requests
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

  createTab = (event, url) => {
    console.log("BrowserIPCController:tab:create called", url);
    return this.execute("tab:create", () => {
      this.validateSender(event);
      return this.browserManager.createTab(url);
    });
  };

  closeTab = (event, tabId) => {
    console.log("BrowserIPCController:tab:close called", tabId);
    return this.execute("tab:close", () => {
      this.validateSender(event);

      if (typeof tabId !== "string" || !tabId.trim()) {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid tab ID.",
        });
      }

      return this.browserManager.closeTab(tabId);
    });
  };

  activateTab = (event, tabId) => {
    console.log("BrowserIPCController:tab:activate called", tabId);
    return this.execute("tab:activate", () => {
      this.validateSender(event);

      if (typeof tabId !== "string" || !tabId.trim()) {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid tab ID.",
        });
      }

      return this.browserManager.activateTab(tabId);
    });
  };

  getTabs = (event) => {
    console.log("BrowserIPCController:tabs:get called");
    return this.execute("tabs:get", () => {
      this.validateSender(event);
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

  // Execute a callback and handle errors, returning a standardized response
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
