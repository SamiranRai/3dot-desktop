const path = require("path");
const ReactSurface = require("../ReactSurface");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");
const ErrorHandler = require("../../errors/ErrorHandler");

const BROWSER_TOPBAR_URL =
  process.env.BROWSER_TOPBAR_URL || "http://localhost:5173/browser";
const PRELOAD_PATH = path.join(__dirname, "../../../preload/index.js");

/**
 * Renders the browser chrome's top bar as a native ReactSurface view,
 * attached to the host BrowserWindow's contentView.
 */
class BrowserTopBar extends ReactSurface {
  /**
   * @param {object} deps
   * @param {import('electron').BrowserWindow} deps.window - Host window; must expose `contentView`.
   * @param {object} deps.browserManager - Owning browser manager.
   * @param {{ log?: Function, error?: Function }} [deps.logger] - Optional logger; defaults to console.
   */
  constructor({ window, browserManager, logger } = {}) {
    if (!window || !window.contentView) {
      throw new AppError({
        code: ErrorCodes.WINDOW_UNAVAILABLE,
        message: "BrowserTopBar requires a window with a contentView",
      });
    }
    if (!browserManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserTopBar requires a browserManager",
      });
    }

    super({
      url: BROWSER_TOPBAR_URL,
      preload: PRELOAD_PATH,
    });

    this.window = window;
    this.browserManager = browserManager;
    this.logger = logger || console;

    this.attached = false;
    this.destroyed = false;
  }

  /**
   * Attaches the view to the window. Idempotent.
   * @throws {AppError} SURFACE_DESTROYED if called post-destroy;
   *   SURFACE_ATTACHMENT_FAILED if the native attach call throws.
   */
  initialize() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot initialize a destroyed BrowserTopBar",
      });
    }
    if (this.attached) {
      this.logger.log?.("BrowserTopBar: already initialized, skipping");
      return;
    }

    const view = this.getView();
    if (!view) {
      throw new AppError({
        code: ErrorCodes.VIEW_UNAVAILABLE,
        message: "BrowserTopBar view is unavailable",
      });
    }

    try {
      this.window.contentView.addChildView(view);
      this.attached = true;
      this.logger.log?.("BrowserTopBar: attached");
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACHMENT_FAILED,
        message: "Failed to attach BrowserTopBar to window",
        cause,
      });
    }
  }

  /**
   * Ensures the view is attached and visible, attaching lazily if needed.
   * @throws {AppError} propagated from initialize(), or VIEW_UNAVAILABLE.
   */
  show() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot show a destroyed BrowserTopBar",
      });
    }

    if (!this.attached) {
      this.initialize();
    }

    const view = this.getView();
    if (!view) {
      throw new AppError({
        code: ErrorCodes.VIEW_UNAVAILABLE,
        message: "BrowserTopBar view is unavailable",
      });
    }

    try {
      view.setVisible(true);
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_OPERATION_FAILED
          ? ErrorCodes.SURFACE_OPERATION_FAILED
          : ErrorCodes.BROWSER_OPERATION_FAILED,
        message: "Failed to show BrowserTopBar",
        cause,
      });
    }
  }

  /**
   * Hides the view without detaching it. No-ops quietly if already
   * destroyed or the view is gone — hide() is treated as best-effort.
   */
  hide() {
    if (this.destroyed) return;

    const view = this.getView();
    if (!view) return;

    try {
      view.setVisible(false);
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.BROWSER_OPERATION_FAILED,
            message: "Failed to hide BrowserTopBar",
            cause,
          }),
        ),
      );
    }
  }

  /**
   * @param {{ x: number, y: number, width: number, height: number }} bounds
   * @throws {AppError} INVALID_ARGUMENT for malformed bounds.
   */
  setBounds(bounds) {
    if (this.destroyed) return;

    if (
      !bounds ||
      typeof bounds.x !== "number" ||
      typeof bounds.y !== "number" ||
      typeof bounds.width !== "number" ||
      typeof bounds.height !== "number"
    ) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "setBounds() requires numeric x, y, width, height",
        details: { bounds },
      });
    }

    const view = this.getView();
    if (!view) return;

    try {
      view.setBounds(bounds);
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.BROWSER_OPERATION_FAILED,
        message: "Failed to set BrowserTopBar bounds",
        details: { bounds },
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
      throw appError;
    }
  }

  /**
   * Detaches and tears down the surface. Idempotent — safe to call more
   * than once. Failures during detach are logged (via ErrorHandler) but
   * do not prevent teardown from completing.
   */
  destroy() {
    if (this.destroyed) return;

    try {
      const view = this.getView?.();
      if (this.attached && view && this.window?.contentView) {
        this.window.contentView.removeChildView(view);
      }
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.SURFACE_TEARDOWN_FAILED,
        message: "Failed to detach BrowserTopBar during destroy",
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
    } finally {
      this.attached = false;
      this.destroyed = true;

      try {
        super.destroy();
      } catch (cause) {
        const appError = ErrorHandler.normalizeError(cause);
        this.logger.error?.(ErrorHandler.toResponse(appError));
      }

      this.window = null;
      this.browserManager = null;
    }
  }
}

module.exports = BrowserTopBar;
