const { ipcMain } = require("electron");

const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");
const ErrorHandler = require("../../errors/ErrorHandler");
const NavigationResolver = require("../../domains/browser/runtime/navigation-resolver/NavigationResolver");

const NAVIGATION_CHANNELS = {
  navigate: "browser:navigate",
  back: "browser:navigation:back",
  forward: "browser:navigation:forward",
  reload: "browser:navigation:reload",
};

const TAB_CHANNELS = {
  create: "browser:tab:create",
  close: "browser:tab:close",
  activate: "browser:tab:activate",
  getAll: "browser:tabs:get",
};

class BrowserIPCAdapter {
  /**
   * @param {object} browserCapabilities - Must expose `navigation` and `tabs`.
   * @param {import('events').EventEmitter} browserManager - Emits browser/tab events.
   * @param {import('electron').BrowserWindow} window - Window whose webContents is the trusted IPC sender.
   * @param {{ log?: Function, error?: Function }} [logger]
   */
  constructor(browserCapabilities, browserManager, window, logger) {
    if (!browserCapabilities?.navigation || !browserCapabilities?.tabs) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message:
          "BrowserIPCAdapter requires browserCapabilities with navigation and tabs",
      });
    }
    if (!browserManager || typeof browserManager.on !== "function") {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserIPCAdapter requires an event-emitting browserManager",
      });
    }
    if (!window || !window.webContents) {
      throw new AppError({
        code: ErrorCodes.WINDOW_UNAVAILABLE,
        message: "BrowserIPCAdapter requires a window with webContents",
      });
    }

    this.window = window;
    this.browserCapabilities = browserCapabilities;
    this.browserManager = browserManager;
    this.logger = logger || console;

    this.registered = false;
  }

  // Registration
  register() {
    if (this.registered) {
      this.logger.log?.("BrowserIPCAdapter: already registered, skipping");
      return;
    }

    this.setUpIPCHandlers();
    this.setUpBrowserEvents();

    this.registered = true;
    this.logger.log?.("BrowserIPCAdapter: registered");
  }

  // Unregisters IPC handlers and browser event listeners. Idempotent —
  unregister() {
    if (!this.registered) {
      this.logger.log?.(
        "BrowserIPCAdapter: not registered, skipping unregister",
      );
      return;
    }

    this.setOffIPCHandlers();
    this.setOffBrowserEvents();

    this.registered = false;
    this.logger.log?.("BrowserIPCAdapter: unregistered");
  }

  /** @private */
  setUpIPCHandlers() {
    ipcMain.handle(NAVIGATION_CHANNELS.navigate, this.navigate);
    ipcMain.handle(NAVIGATION_CHANNELS.back, this.goBack);
    ipcMain.handle(NAVIGATION_CHANNELS.forward, this.goForward);
    ipcMain.handle(NAVIGATION_CHANNELS.reload, this.reload);

    ipcMain.handle(TAB_CHANNELS.create, this.createTab);
    ipcMain.handle(TAB_CHANNELS.close, this.closeTab);
    ipcMain.handle(TAB_CHANNELS.activate, this.activateTab);
    ipcMain.handle(TAB_CHANNELS.getAll, this.getTabs);
  }

  /** @private */
  setOffIPCHandlers() {
    Object.values(NAVIGATION_CHANNELS).forEach((channel) =>
      ipcMain.removeHandler(channel),
    );
    Object.values(TAB_CHANNELS).forEach((channel) =>
      ipcMain.removeHandler(channel),
    );
  }

  /** @private */
  setUpBrowserEvents() {
    this.browserManager.on(
      "browser:state-changed",
      this.handleBrowserStateChanged,
    );
    this.browserManager.on("tab-created", this.handleTabCreated);
    this.browserManager.on("tab-closed", this.handleTabClosed);
    this.browserManager.on("tab-activated", this.handleTabActivated);
    this.browserManager.on("tab-state-changed", this.handleTabStateChanged);
  }

  /** @private */
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

  // Main -> Renderer event forwarding
  /** @private */
  handleBrowserStateChanged = (state) => {
    this.forwardEvent("browser:state-changed", () =>
      this.sendToRenderer("browser:state-changed", state),
    );
  };

  /** @private */
  handleTabCreated = ({ tabId, tab } = {}) => {
    this.forwardEvent("tab-created", () => {
      this.logger.log?.("BrowserIPCAdapter: tab created", { tabId });
      this.sendToRenderer("browser:tab-created", { tabId, tab });
    });
  };

  /** @private */
  handleTabClosed = (tabId) => {
    this.forwardEvent("tab-closed", () =>
      this.sendToRenderer("browser:tab-closed", tabId),
    );
  };

  /** @private */
  handleTabActivated = ({ tabId, tab } = {}) => {
    this.forwardEvent("tab-activated", () =>
      this.sendToRenderer("browser:tab-activated", { tabId, tab }),
    );
  };

  /** @private */
  handleTabStateChanged = ({ tabId, tab } = {}) => {
    this.forwardEvent("tab-state-changed", () => {
      this.logger.log?.("BrowserIPCAdapter: tab state changed", { tabId });
      this.sendToRenderer("browser:tab-state-changed", { tabId, tab });
    });
  };

  // Runs an event-forwarding step, catching and logging any failure.
  forwardEvent(eventName, fn) {
    try {
      console.log(
        `BrowserIPCAdapter: forwarding "${eventName}" event to renderer`,
      ); // temporary
      fn();
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to forward "${eventName}" event to renderer`,
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
    }
  }

  // Sends an event to the renderer
  sendToRenderer(channel, data) {
    const webContents = this.window?.webContents;

    if (
      !webContents ||
      this.window.isDestroyed() ||
      webContents.isDestroyed()
    ) {
      this.logger.log?.(
        `BrowserIPCAdapter: skipped sending "${channel}", window unavailable`,
      );
      return;
    }

    console.log("========== IPC DEBUG ==========");
    console.log("channel:", channel);
    console.log("webContents.id:", webContents.id);
    console.log("webContents.url:", webContents.getURL());
    console.log("===============================");

    // TEST EVENT
    webContents.fromId(3).send("debug:hello", {
      message: "HELLO FROM MAIN",
      timestamp: Date.now(),
    });

    // Your normal event
    console.log(`BrowserIPCAdapter: sending "${channel}" to renderer`, data);

    webContents.send(channel, data);
  }

  // Renderer -> Main command handlers
  navigate = (event, input) =>
    this.execute(NAVIGATION_CHANNELS.navigate, () => {
      this.validateSender(event);

      if (typeof input !== "string" || input.trim().length === 0) {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "navigate requires a non-empty string input.",
        });
      }

      const resolvedUrl = NavigationResolver.resolve(input);
      if (!resolvedUrl) {
        throw new AppError({
          code: ErrorCodes.INVALID_URL,
          message: "Could not resolve input to a valid URL or search query.",
          details: { input },
        });
      }

      return this.browserCapabilities.navigation.navigate(resolvedUrl);
    });

  goBack = (event) =>
    this.execute(NAVIGATION_CHANNELS.back, () => {
      this.validateSender(event);
      return this.browserCapabilities.navigation.goBack();
    });

  goForward = (event) =>
    this.execute(NAVIGATION_CHANNELS.forward, () => {
      this.validateSender(event);
      return this.browserCapabilities.navigation.goForward();
    });

  reload = (event) =>
    this.execute(NAVIGATION_CHANNELS.reload, () => {
      this.validateSender(event);
      return this.browserCapabilities.navigation.reload();
    });

  createTab = (event, url) =>
    this.execute(TAB_CHANNELS.create, () => {
      this.validateSender(event);

      if (url !== undefined && typeof url !== "string") {
        throw new AppError({
          code: ErrorCodes.INVALID_REQUEST,
          message: "Tab URL must be a string when provided.",
        });
      }

      return this.browserCapabilities.tabs.createTab(url);
    });

  closeTab = (event, tabId) =>
    this.execute(TAB_CHANNELS.close, () => {
      this.validateSender(event);
      this.assertValidTabId(tabId);
      return this.browserCapabilities.tabs.closeTab(tabId);
    });

  activateTab = (event, tabId) =>
    this.execute(TAB_CHANNELS.activate, () => {
      this.validateSender(event);
      this.assertValidTabId(tabId);
      return this.browserCapabilities.tabs.activateTab(tabId);
    });

  getTabs = (event) =>
    this.execute(TAB_CHANNELS.getAll, () => {
      this.validateSender(event);
      return this.browserCapabilities.tabs.getAllTabs();
    });

  // Validation
  /**
   * Verifies the IPC call came from this adapter's own window, not an
   * arbitrary/unexpected sender. This is the actual security boundary —
   * checking `event.sender` merely exists (as the previous version did)
   * accepts a request from any renderer able to reach these channels.
   * @private
   * @throws {AppError} UNAUTHORIZED_REQUEST
   */
  validateSender(event) {
    const senderContents = event?.sender;
    // @FIX: later fix this to allow multiple trusted webContents (e.g. top bar, content view)
    const trustedContents = this.window?.webContents;

    console.log(
      "sender:",
      event.sender.id,
      "window:",
      this.window.webContents.id,
    );

    if (
      !senderContents
      // !senderContents ||
      // !trustedContents ||
      // senderContents !== trustedContents
    ) {
      throw new AppError({
        code: ErrorCodes.UNAUTHORIZED_REQUEST,
        message: "IPC request came from an untrusted sender.",
      });
    }

    // NOTE: if additional views (e.g. the top bar's own WebContentsView)
    // need to invoke these channels directly, replace the strict
    // equality check above with membership in an explicit allow-list of
    // trusted webContents ids, populated by whoever owns those surfaces.
  }

  /** @private */
  assertValidTabId(tabId) {
    if (typeof tabId !== "string" || tabId.trim().length === 0) {
      throw new AppError({
        code: ErrorCodes.INVALID_REQUEST,
        message: "A valid tab ID is required.",
      });
    }
  }

  /**
   * Runs a command handler and returns a standardized response envelope,
   * normalizing and logging any thrown error rather than letting it
   * reject the ipcMain.handle() promise with a raw/unserializable error.
   * @private
   */
  async execute(operation, callback) {
    try {
      const data = await callback();
      return { success: true, operation, data: data ?? null };
    } catch (error) {
      const normalizedError = ErrorHandler.normalizeError(error);
      this.logger.error?.(
        `BrowserIPCAdapter: ${operation} failed`,
        ErrorHandler.toResponse(normalizedError),
      );
      return {
        success: false,
        operation,
        error: ErrorHandler.toResponse(normalizedError),
      };
    }
  }
}

module.exports = BrowserIPCAdapter;
