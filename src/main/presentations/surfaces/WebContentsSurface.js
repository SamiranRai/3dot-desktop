// src/main/presentations/surfaces/WebContentsSurface.js

const { WebContentsView } = require("electron");

const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class WebContentsSurface {
  constructor({
    id,
    url,
    preload,
    transparent = false,
    borderRadius = 0,
    logger = console,
  }) {
    if (!id || typeof id !== "string") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: "WebContentsSurface requires a valid id.",
      });
    }

    if (!url || typeof url !== "string") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Surface "${id}" requires a valid URL.`,
      });
    }

    if (!preload || typeof preload !== "string") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Surface "${id}" requires a preload path.`,
      });
    }

    let parsedURL;

    try {
      parsedURL = new URL(url);
    } catch {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Invalid surface URL for "${id}".`,
        details: { url },
      });
    }

    this.id = id;
    this.url = url;
    this.preload = preload;
    this.allowedOrigin = parsedURL.origin;

    this.transparent = transparent;
    this.borderRadius = borderRadius;
    this.logger = logger;

    this.view = null;
    this.lifecycleState = "created";

    this.handleWillNavigate = this.handleWillNavigate.bind(this);
    this.handleWillRedirect = this.handleWillRedirect.bind(this);
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  /**
   * Creates the native WebContentsView.
   *
   * Important:
   * This method does NOT load the URL.
   *
   * The application intentionally creates all renderer surfaces
   * before registering IPC, then calls load() afterward.
   */
  mount() {
    if (this.lifecycleState === "destroyed") {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROY_FAILED,
        message: `Surface "${this.id}" is destroyed.`,
      });
    }

    if (this.lifecycleState !== "created") {
      return;
    }

    const view = new WebContentsView({
      webPreferences: {
        preload: this.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    if (this.transparent) {
      view.setBackgroundColor("#00000000");
    }

    if (this.borderRadius > 0) {
      view.setBorderRadius(this.borderRadius);
    }

    const { webContents } = view;

    webContents.on("will-navigate", this.handleWillNavigate);
    webContents.on("will-redirect", this.handleWillRedirect);

    webContents.setWindowOpenHandler(() => ({
      action: "deny",
    }));

    this.view = view;
    this.lifecycleState = "mounted";
  }

  /**
   * Loads the renderer URL.
   *
   * This is deliberately separate from mount().
   */
  async load() {
    if (this.lifecycleState === "destroyed") {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROY_FAILED,
        message: `Surface "${this.id}" is destroyed.`,
      });
    }

    if (this.lifecycleState !== "mounted") {
      throw new AppError({
        code: ErrorCodes.SURFACE_NOT_MOUNTED,
        message: `Surface "${this.id}" must be mounted before loading.`,
      });
    }

    if (!this.view) {
      throw new AppError({
        code: ErrorCodes.SURFACE_NOT_MOUNTED,
        message: `Surface "${this.id}" has no native view.`,
      });
    }

    if (this.lifecycleState === "loaded") {
      return;
    }

    try {
      await this.view.webContents.loadURL(this.url);

      this.lifecycleState = "loaded";
    } catch (cause) {
      this.lifecycleState = "error";

      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACH_FAILED,
        message: `Failed to load surface "${this.id}".`,
        cause,
        details: {
          url: this.url,
        },
      });
    }
  }

  destroy() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    const view = this.view;

    this.view = null;
    this.lifecycleState = "destroyed";

    if (!view?.webContents) {
      return;
    }

    view.webContents.removeListener("will-navigate", this.handleWillNavigate);

    view.webContents.removeListener("will-redirect", this.handleWillRedirect);

    if (!view.webContents.isDestroyed()) {
      try {
        view.webContents.close({
          waitForBeforeUnload: false,
        });
      } catch (error) {
        this.logger.error?.(
          `SURFACE "${this.id}": failed to close WebContents`,
          error,
        );
      }
    }
  }

  // =========================================================
  // VIEW
  // =========================================================

  getView() {
    if (this.lifecycleState === "destroyed" || !this.view) {
      return null;
    }

    return this.view;
  }

  setBounds(bounds) {
    if (!this.view || this.lifecycleState === "destroyed") {
      throw new AppError({
        code: ErrorCodes.SURFACE_NOT_MOUNTED,
        message: `Surface "${this.id}" is not mounted.`,
      });
    }

    this.view.setBounds(bounds);
  }

  show() {
    if (!this.view || this.lifecycleState === "destroyed") {
      return;
    }

    this.view.setVisible(true);
  }

  hide() {
    if (!this.view || this.lifecycleState === "destroyed") {
      return;
    }

    this.view.setVisible(false);
  }

  // =========================================================
  // NAVIGATION SECURITY
  // =========================================================

  handleWillNavigate(event, targetURL) {
    if (!this._isAllowedURL(targetURL)) {
      event.preventDefault();

      this.logger.warn?.(`SURFACE "${this.id}": blocked navigation`, targetURL);
    }
  }

  handleWillRedirect(event, targetURL) {
    if (!this._isAllowedURL(targetURL)) {
      event.preventDefault();

      this.logger.warn?.(`SURFACE "${this.id}": blocked redirect`, targetURL);
    }
  }

  _isAllowedURL(targetURL) {
    try {
      return new URL(targetURL).origin === this.allowedOrigin;
    } catch {
      return false;
    }
  }
}

module.exports = WebContentsSurface;
