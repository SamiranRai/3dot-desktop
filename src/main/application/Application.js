const { BrowserWindow, BaseWindow } = require("electron");
const path = require("path");

const AppError = require("../errors/AppError");
const ErrorCodes = require("../errors/ErrorCodes");
const ErrorHandler = require("../errors/ErrorHandler");
const BrowserManager = require("../domains/browser/runtime/BrowserManager");
const BrowserCapabilities = require("../domains/browser/capabilities/BrowserCapabilities");
const PresentationManager = require("../presentations/PresentationManager");
const BrowserIPCAdapter = require("../adapters/ipc/BrowserIPCAdapter");
const SurfaceManager = require("../presentations/surfaces/SurfaceManager");
const DEFAULT_WINDOW_OPTIONS = { width: 800, height: 600 };
const BASE_URL = "http://localhost:5173";

const Z_ORDER = ["react-shell", "tab", "overlay-host"];

/**
 * Top-level application composition root. Owns the native window and the
 * lifecycle of the browser subsystem (runtime, presentation, IPC), and is
 * the single place that knows the correct create/teardown order for both.
 *
 * Lifecycle states: created -> starting -> ready -> shutting-down -> destroyed
 *                                       \-> error
 */
class Application {
  /**
   * @param {{ logger?: { log?: Function, error?: Function } }} [deps]
   */
  constructor({ logger } = {}) {
    this.logger = logger || console;

    this.window = null;
    this.browserManager = null;
    this.presentationManager = null;
    this.surfaceManager = null;
    this.browserIPCAdapter = null;

    this.lifecycleState = "created";
  }

  /**
   * Boots the application: window -> browser runtime -> presentation -> IPC.
   * If any step fails, everything created so far is torn down (reverse
   * order) before the error is re-thrown, so a failed start() never
   * leaves the instance half-initialized.
   *
   * @throws {AppError} APPLICATION_NOT_READY if not in the "created" state;
   *   otherwise the normalized error from whichever step failed.
   **/

  start() {
    this.assertLifecycleState("created", ErrorCodes.APPLICATION_NOT_READY);

    this.lifecycleState = "starting";

    try {
      this.createWindow();
      this.createSurfaceManager();
      this.createBrowserRuntime();
      this.createBrowserPresentation();
      this.createIPCAdapter();

      this.lifecycleState = "ready";
      this.logger.log?.("APPLICATION: ready");
    } catch (error) {
      const appError = ErrorHandler.normalizeError(error);
      this.logger.error?.(
        "APPLICATION: failed to start",
        ErrorHandler.toResponse(appError),
      );

      this.teardown();
      this.lifecycleState = "error";
      throw appError;
    }
  }

  /**
   * Tears down a running (or partially-started) application: unregisters
   * IPC, destroys the presentation layer, destroys the browser runtime,
   * then destroys the native window. Idempotent — safe to call from any
   * state, including after a failed start() or a repeat call.
   */

  shutdown() {
    if (this.lifecycleState === "destroyed") {
      this.logger.log?.("APPLICATION: already destroyed, skipping shutdown");
      return;
    }

    this.logger.log?.("APPLICATION: shutting down");
    this.teardown();

    this.lifecycleState = "destroyed";
    this.logger.log?.("APPLICATION: destroyed");
  }

  // Construction steps (each independently guarded by start()'s try/catch)
  /** @private */
  createWindow() {
    this.window = new BrowserWindow({
      ...DEFAULT_WINDOW_OPTIONS,
      webPreferences: {
        preload: path.join(__dirname, "../../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
  }

  /** @private */
  createSurfaceManager() {
    this.surfaceManager = new SurfaceManager(this.window.contentView, Z_ORDER);
  }

  /** @private */
  createBrowserRuntime() {
    this.browserManager = new BrowserManager({
      window: this.window,
      surfaceManager: this.surfaceManager,
    });
    this.browserManager.initialize();
  }

  /**
   * Creates and shows the visual composition of the browser screen:
   * PresentationManager -> BrowserTopBar + BrowserContent -> active tab view.
   * @private
   */
  createBrowserPresentation() {
    this.presentationManager = new PresentationManager({
      window: this.window,
      baseURL: BASE_URL,
      preload: path.join(__dirname, "../../preload/index.js"),
      browserManager: this.browserManager,
      surfaceManager: this.surfaceManager,
    });

    this.presentationManager.initialize();
  }

  /** @private */
  createIPCAdapter() {
    const browserCapabilities = new BrowserCapabilities(this.browserManager);

    this.browserIPCAdapter = new BrowserIPCAdapter(
      browserCapabilities,
      this.browserManager,
      this.window,
      this.logger,
    );

    this.browserIPCAdapter.register();
  }

  // Teardown (shared by start()'s failure path and shutdown())
  /**
   * Best-effort teardown of whatever currently exists, in reverse
   * creation order. Each step is independently guarded so one failure
   * doesn't block the rest, and every step is safe to call even if the
   * corresponding resource was never created (still null).
   * @private
   */
  teardown() {
    this.safeStep("unregister IPC adapter", () => {
      this.browserIPCAdapter?.unregister?.();
    });
    this.browserIPCAdapter = null;

    this.safeStep("destroy browser presentation", () => {
      this.presentationManager?.destroy?.();
    });
    this.presentationManager = null;

    this.safeStep("destroy browser runtime", () => {
      this.browserManager?.destroy?.();
    });
    this.browserManager = null;

    this.safeStep("destroy window", () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.destroy();
      }
    });
    this.window = null;
    this.surfaceManager = null;
  }

  /**
   * Runs a teardown step, catching and logging any failure instead of
   * letting it abort the rest of teardown.
   * @private
   * @param {string} label - Human-readable step name for logging.
   * @param {Function} fn
   */
  safeStep(label, fn) {
    try {
      fn();
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.SURFACE_TEARDOWN_FAILED,
        message: `APPLICATION: failed to ${label}`,
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
    }
  }

  // Guards
  /** @private */
  assertLifecycleState(expected, code) {
    if (this.lifecycleState !== expected) {
      throw new AppError({
        code,
        message: `Application is not in the required "${expected}" state (current: ${this.lifecycleState})`,
        details: { expected, actual: this.lifecycleState },
      });
    }
  }
}

module.exports = Application;
