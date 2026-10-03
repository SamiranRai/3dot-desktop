// src/main/application/Application.js

const { BaseWindow } = require("electron");
const path = require("path");

const AppError = require("../errors/AppError");
const ErrorCodes = require("../errors/ErrorCodes");
const ErrorHandler = require("../errors/ErrorHandler");
const EventBus = require("../infrastructure/events/EventBus");

const BrowserManager = require("../domains/browser/runtime/BrowserManager");
const BrowserCapabilities = require("../domains/browser/capabilities/BrowserCapabilities");
const BrowserIPCAdapter = require("../adapters/ipc/BrowserIPCAdapter");

const PresentationManager = require("../presentations/PresentationManager");
const SurfaceManager = require("../presentations/surfaces/SurfaceManager");

const DEFAULT_WINDOW_OPTIONS = Object.freeze({
  width: 1200,
  height: 800,
  minWidth: 900,
  minHeight: 600,
  show: false,
});

const BASE_URL = process.env.RENDERER_URL || "http://localhost:5173";
const PRELOAD_PATH = path.join(__dirname, "../../preload/index.js");
const Z_ORDER = Object.freeze(["react-shell", "tab", "overlay-host"]);

class Application {
  constructor({ logger = console } = {}) {
    this.logger = logger;

    this.eventBus = new EventBus({ logger });

    this.window = null;
    this.surfaceManager = null;
    this.browserManager = null;
    this.presentationManager = null;
    this.browserIPCAdapter = null;

    this.lifecycleState = "created";

    this.handleWindowClosed = this.handleWindowClosed.bind(this);
  }

  // ======================LIFECYCLE======================

  async start() {
    this._assertState("created", ErrorCodes.APPLICATION_NOT_READY);

    this.lifecycleState = "starting";

    try {
      // 1. Native window.
      this._createWindow();

      // 2. Native surface management.
      this._createSurfaceManager();

      // 3. Browser domain/runtime.
      this._createBrowserRuntime();

      // 4. Create native renderer surfaces.
      //
      // IMPORTANT:
      // This does NOT load React yet.
      this._createPresentation();

      // 5. Register IPC before renderer JavaScript executes.
      this._createIPCAdapter();

      // 6. Now it is safe to load React/overlay renderers.
      await this.presentationManager.loadSurfaces();

      // 7. Create initial browser tab after IPC and renderer exist.
      await this.browserManager.createInitialTab();

      // 8. Everything is ready.
      this.window.show();

      this.lifecycleState = "ready";

      this.logger.log?.("APPLICATION: ready");
    } catch (error) {
      const normalized = ErrorHandler.normalizeError(error, {
        code: ErrorCodes.APPLICATION_START_FAILED,
        message: "Application failed to start.",
      });

      this.logger.error?.("APPLICATION: failed to start", normalized);

      this._teardown(true);

      this.lifecycleState = "error";

      throw normalized;
    }
  }

  shutdown() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    this.logger.log?.("APPLICATION: shutting down");

    this._teardown(true);
    this.lifecycleState = "destroyed";

    this.logger.log?.("APPLICATION: destroyed");
  }

  // ======================CREATION======================

  _createWindow() {
    this.window = new BaseWindow(DEFAULT_WINDOW_OPTIONS);
    this.window.on("closed", this.handleWindowClosed);
  }

  _createSurfaceManager() {
    this.surfaceManager = new SurfaceManager(this.window.contentView, Z_ORDER);
  }

  _createBrowserRuntime() {
    this.browserManager = new BrowserManager({
      surfaceManager: this.surfaceManager,
      eventBus: this.eventBus,
      logger: this.logger,
      newTabURL: `${BASE_URL}/start`,
    });

    this.browserManager.initialize();
  }

  _createPresentation() {
    this.presentationManager = new PresentationManager({
      window: this.window,
      baseURL: BASE_URL,
      preload: PRELOAD_PATH,
      browserManager: this.browserManager,
      surfaceManager: this.surfaceManager,
      eventBus: this.eventBus,
      logger: this.logger,
    });

    /*
     * initialize() creates native WebContentsViews
     * and attaches them to the window.
     *
     * It deliberately does NOT load React yet.
     */
    this.presentationManager.initialize();
  }

  _createIPCAdapter() {
    const capabilities = new BrowserCapabilities(this.browserManager);

    this.browserIPCAdapter = new BrowserIPCAdapter({
      capabilities,
      window: this.window,
      surfaceManager: this.surfaceManager,
      eventBus: this.eventBus,
      logger: this.logger,
    });

    this.browserIPCAdapter.register();
  }

  // ======================WINDOW-EVENTS======================

  handleWindowClosed() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    this._teardown(false);
    this.lifecycleState = "destroyed";

    this.logger.log?.("APPLICATION: window closed");
  }

  // ======================TEARDOWN======================

  _teardown(destroyWindow) {
    try {
      this.browserIPCAdapter?.unregister();
    } catch (error) {
      this.logger.error?.("APPLICATION: failed to unregister IPC", error);
    }

    this.browserIPCAdapter = null;

    try {
      this.presentationManager?.destroy();
    } catch (error) {
      this.logger.error?.("APPLICATION: failed to destroy presentation", error);
    }

    this.presentationManager = null;

    try {
      this.browserManager?.destroy();
    } catch (error) {
      this.logger.error?.(
        "APPLICATION: failed to destroy browser runtime",
        error,
      );
    }

    this.browserManager = null;

    try {
      this.surfaceManager?.detachAll();
    } catch (error) {
      this.logger.error?.("APPLICATION: failed to detach surfaces", error);
    }

    this.surfaceManager = null;

    if (this.window) {
      this.window.removeListener("closed", this.handleWindowClosed);

      if (destroyWindow && !this.window.isDestroyed()) {
        try {
          this.window.destroy();
        } catch (error) {
          this.logger.error?.("APPLICATION: failed to destroy window", error);
        }
      }
    }

    this.window = null;

    this.eventBus.destroy();
  }

  // ======================GUARDS======================

  _assertState(expected, code) {
    if (this.lifecycleState !== expected) {
      throw new AppError({
        code,

        message:
          `Application must be in "${expected}" ` +
          `state; current state is ` +
          `"${this.lifecycleState}".`,

        details: {
          expected,
          actual: this.lifecycleState,
        },
      });
    }
  }
}

Application.BASE_URL = BASE_URL;

module.exports = Application;
