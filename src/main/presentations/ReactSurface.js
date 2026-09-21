const { WebContentsView } = require("electron");
const AppError = require("../errors/AppError");
const ErrorCodes = require("../errors/ErrorCodes");
const ErrorHandler = require("../errors/ErrorHandler");

class ReactSurface {
  /**
   * @param {object} opts
   * @param {string} opts.url - URL to load into the surface.
   * @param {string} opts.preload - Absolute path to the preload script.
   * @param {{ log?: Function, error?: Function }} [opts.logger]
   */
  constructor({ url, preload, logger } = {}) {
    if (typeof url !== "string" || url.length === 0) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "ReactSurface requires a non-empty url.",
      });
    }

    if (typeof preload !== "string" || preload.length === 0) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "ReactSurface requires a preload script path.",
      });
    }

    this.url = url;
    this.preload = preload;
    this.logger = logger || console;

    this.destroyed = false;
    this.loaded = false;
    this.loadError = null;

    try {
      this.view = new WebContentsView({
        webPreferences: {
          preload,
          sandbox: true,
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: "Failed to create WebContentsView",
        cause,
      });
    }

    this.loadPromise = this.load().catch((cause) => {
      const appError = ErrorHandler.normalizeError(cause);
      this.loadError = appError;
      this.logger.error?.(
        `ReactSurface failed to load "${this.url}"`,
        ErrorHandler.toResponse(appError),
      );
    });
  }

  /**
   * @returns {import('electron').WebContentsView | null}
   */
  getView() {
    return this.view;
  }

  /**
   * @returns {import('electron').WebContents | null}
   */
  getWebContents() {
    if (!this.view || this.destroyed) return null;
    return this.view.webContents || null;
  }

  /**
   * Resolves once the initial load has settled (successfully or not).
   * Check `loadError` afterward to distinguish the two.
   * @returns {Promise<void>}
   */
  whenLoaded() {
    return this.loadPromise;
  }

  async load() {
    if (!this.view || this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot load(): surface has been destroyed.",
      });
    }

    try {
      await this.view.webContents.loadURL(this.url);
      this.loaded = true;
      this.loadError = null;
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Failed to load URL "${this.url}"`,
        details: { url: this.url },
        cause,
      });
    }
  }

  /**
   * @param {{ x: number, y: number, width: number, height: number }} bounds
   */
  setBounds(bounds) {
    if (!this.view || this.destroyed) return;

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

    try {
      this.view.setBounds(bounds);
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.BROWSER_OPERATION_FAILED,
        message: "Failed to set ReactSurface bounds",
        details: { bounds },
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
      throw appError;
    }
  }

  /**
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (!this.view || this.destroyed) return;

    try {
      this.view.setVisible(Boolean(visible));
    } catch (cause) {
      const appError = new AppError({
        code: ErrorCodes.BROWSER_OPERATION_FAILED,
        message: "Failed to set ReactSurface visibility",
        cause,
      });
      this.logger.error?.(ErrorHandler.toResponse(appError));
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }

  destroy() {
    if (this.destroyed) return;

    try {
      const webContents = this.view?.webContents;
      if (webContents && !webContents.isDestroyed()) {
        webContents.close();
      }
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.SURFACE_TEARDOWN_FAILED,
            message: "Failed to close ReactSurface webContents",
            cause,
          }),
        ),
      );
    } finally {
      this.view = null;
      this.destroyed = true;
    }
  }
}

module.exports = ReactSurface;
