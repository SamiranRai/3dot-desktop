const BrowserTopBar = require("./BrowserTopBar");
const BrowserContent = require("./BrowserContent");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");
const ErrorHandler = require("../../errors/ErrorHandler");

const DEFAULT_TOPBAR_HEIGHT = 80;

/**
 * Composes the browser window's chrome (top bar) and content region into
 * one layout unit, keeping their bounds in sync with window resizes.
 */
class BrowserPresentation {
  /**
   * @param {object} deps
   * @param {import('electron').BrowserWindow} deps.window - Host window.
   * @param {object} deps.browserManager
   * @param {number} [deps.topBarHeight]
   * @param {{ log?: Function, error?: Function }} [deps.logger]
   */
  constructor({ window, browserManager, topBarHeight, logger } = {}) {
    if (!window || !window.contentView) {
      throw new AppError({
        code: ErrorCodes.WINDOW_UNAVAILABLE,
        message: "BrowserPresentation requires a window with a contentView",
      });
    }
    if (!browserManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserPresentation requires a browserManager",
      });
    }

    this.window = window;
    this.browserManager = browserManager;
    this.logger = logger || console;
    this.topBarHeight =
      typeof topBarHeight === "number" ? topBarHeight : DEFAULT_TOPBAR_HEIGHT;

    this.visible = false;
    this.destroyed = false;
    this.initialized = false;

    this.handleResize = this.handleResize.bind(this);

    // Build child surfaces defensively: if content construction fails
    // after topBar succeeded, don't leak the topBar.
    this.topBar = new BrowserTopBar({ window, browserManager, logger });

    try {
      this.content = new BrowserContent({ window, browserManager, logger });
    } catch (cause) {
      try {
        this.topBar.destroy();
      } catch (destroyCause) {
        this.logger.error?.(
          ErrorHandler.toResponse(ErrorHandler.normalizeError(destroyCause)),
        );
      }
      throw ErrorHandler.normalizeError(cause);
    }
  }

  /**
   * Initializes both child surfaces, subscribes to window resize, and
   * performs the first layout pass. Idempotent.
   * @throws {AppError} SURFACE_DESTROYED if called post-destroy.
   */
  initialize() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot initialize a destroyed BrowserPresentation",
      });
    }
    if (this.initialized) {
      this.logger.log?.("BrowserPresentation: already initialized, skipping");
      return;
    }

    try {
      this.topBar.initialize();
      this.content.initialize();
    } catch (cause) {
      throw ErrorHandler.normalizeError(cause);
    }

    this.window.on("resize", this.handleResize);

    this.initialized = true;
    this.layout();

    this.logger.log?.("BrowserPresentation: initialized");
  }

  /**
   * Shows both child surfaces and relayouts.
   * @throws {AppError} SURFACE_DESTROYED if called post-destroy.
   */
  show() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot show a destroyed BrowserPresentation",
      });
    }

    this.visible = true;

    this.safeCall(this.topBar, "show");
    this.safeCall(this.content, "show");

    this.layout();

    this.logger.log?.("BrowserPresentation: shown");
  }

  /**
   * Hides both child surfaces. No-ops if already destroyed.
   */
  hide() {
    if (this.destroyed) return;

    this.visible = false;

    this.safeCall(this.topBar, "hide");
    this.safeCall(this.content, "hide");

    this.logger.log?.("BrowserPresentation: hidden");
  }

  /**
   * Recomputes and applies bounds for the top bar and content region
   * based on the window's current content size. Silently no-ops if the
   * window size can't be read (e.g. window mid-teardown).
   */
  layout() {
    if (this.destroyed || !this.window) return;

    let width, height;
    try {
      [width, height] = this.window.getContentSize();
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.WINDOW_OPERATION_FAILED,
            message: "Failed to read window content size during layout",
            cause,
          }),
        ),
      );
      return;
    }

    if (typeof width !== "number" || typeof height !== "number") {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.WINDOW_OPERATION_FAILED,
            message: "getContentSize() returned invalid dimensions",
            details: { width, height },
          }),
        ),
      );
      return;
    }

    const topBarHeight = this.topBarHeight;

    this.safeCall(this.topBar, "setBounds", {
      x: 0,
      y: 0,
      width,
      height: topBarHeight,
    });

    this.safeCall(this.content, "setBounds", {
      x: 0,
      y: topBarHeight,
      width,
      height: Math.max(0, height - topBarHeight),
    });
  }

  /**
   * Window "resize" event handler. Never throws — event listeners that
   * throw can crash the process.
   */
  handleResize() {
    try {
      this.layout();
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(ErrorHandler.normalizeError(cause)),
      );
    }
  }

  /**
   * Invokes a method on a child surface, catching and logging any
   * failure so one broken surface can't take down the other or the
   * caller.
   * @param {object} target
   * @param {string} method
   * @param {...any} args
   */
  safeCall(target, method, ...args) {
    try {
      target?.[method]?.(...args);
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.SURFACE_OPERATION_FAILED
              ? ErrorCodes.SURFACE_OPERATION_FAILED
              : ErrorCodes.BROWSER_OPERATION_FAILED,
            message: `${target?.constructor?.name || "surface"} failed during ${method}()`,
            cause,
          }),
        ),
      );
    }
  }

  /**
   * Unsubscribes from resize, destroys both child surfaces, and clears
   * state. Idempotent. Child destroy failures are logged but don't stop
   * teardown from completing.
   */
  destroy() {
    if (this.destroyed) return;

    try {
      this.window?.removeListener("resize", this.handleResize);
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.SURFACE_TEARDOWN_FAILED,
            message: "Failed to remove resize listener",
            cause,
          }),
        ),
      );
    }

    this.safeCall(this.topBar, "destroy");
    this.safeCall(this.content, "destroy");

    this.window = null;
    this.browserManager = null;
    this.destroyed = true;

    this.logger.log?.("BrowserPresentation: destroyed");
  }
}

module.exports = BrowserPresentation;
