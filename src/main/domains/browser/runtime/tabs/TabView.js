const { WebContentsView } = require("electron");

const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

class TabView {
  constructor({ webPreferences = {} } = {}) {
    this._destroyed = false;
    this._view = null;
    this._webContents = null;

    if (
      webPreferences === null ||
      typeof webPreferences !== "object" ||
      Array.isArray(webPreferences)
    ) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_WEB_PREFERENCES,
        message: "TabView webPreferences must be an object.",
      });
    }

    const safeWebPreferences = {
      ...webPreferences,

      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
    };

    // Create WCV
    const view = new WebContentsView({
      webPreferences: safeWebPreferences,
    });
    const webContents = view.webContents;

    // Listen for native WebContents destruction
    this._onWebContentsDestroyed = () => {
      this._markDestroyed();
    };
    webContents.once("destroyed", this._onWebContentsDestroyed);

    // Store references
    this._view = view;
    this._webContents = webContents;
  }

  isDestroyed() {
    if (this._destroyed) {
      return true;
    }

    if (!this._webContents || this._webContents.isDestroyed()) {
      this._markDestroyed();
      return true;
    }

    return false;
  }

  _markDestroyed() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;

    const webContents = this._webContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.removeListener("destroyed", this._onWebContentsDestroyed);
    }

    this._view = null;
    this._webContents = null;
  }

  _assertAlive() {
    if (this._destroyed) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }

    if (!this._webContents || this._webContents.isDestroyed()) {
      this._markDestroyed();

      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }

    if (!this._view) {
      this._markDestroyed();

      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }
  }

  getView() {
    this._assertAlive();
    return this._view;
  }

  getWebContents() {
    this._assertAlive();
    return this._webContents;
  }

  async loadURL(url, options = undefined) {
    this._assertAlive();

    if (typeof url !== "string" || url.trim().length === 0) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_URL,
        message: "TabView.loadURL(url): url must be a non-empty string.",
      });
    }

    if (
      options !== undefined &&
      (options === null ||
        typeof options !== "object" ||
        Array.isArray(options))
    ) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_OPTIONS,
        message: "TabView.loadURL(url, options): options must be an object.",
      });
    }

    return this._webContents.loadURL(url, options);
  }

  setBounds(bounds) {
    this._assertAlive();
    this._validateBounds(bounds);

    this._view.setBounds(bounds);
  }

  show() {
    this._assertAlive();
    this._view.setVisible(true);
  }

  hide() {
    this._assertAlive();
    this._view.setVisible(false);
  }

  _validateBounds(bounds) {
    if (
      bounds === null ||
      typeof bounds !== "object" ||
      Array.isArray(bounds)
    ) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_BOUNDS,
        message: "TabView.setBounds(bounds): bounds must be an object.",
      });
    }

    const requiredProperties = ["x", "y", "width", "height"];

    for (const property of requiredProperties) {
      if (!Object.prototype.hasOwnProperty.call(bounds, property)) {
        throw new AppError({
          code: ErrorCodes.BROWSER_TAB_MISSING_BOUNDS_PROPERTY,
          message: `TabView.setBounds(bounds): missing "${property}".`,
        });
      }

      if (!Number.isFinite(bounds[property])) {
        throw new AppError({
          code: ErrorCodes.BROWSER_TAB_INVALID_BOUNDS_PROPERTY,
          message: `TabView.setBounds(bounds): "${property}" must be a finite number.`,
        });
      }
    }

    if (bounds.width < 0) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_BOUNDS,
        message: 'TabView.setBounds(bounds): "width" cannot be negative.',
      });
    }

    if (bounds.height < 0) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_INVALID_BOUNDS,
        message: 'TabView.setBounds(bounds): "height" cannot be negative.',
      });
    }
  }

  destroy() {
    if (this._destroyed) {
      return;
    }

    const webContents = this._webContents;

    this._destroyed = true;

    if (webContents) {
      webContents.removeListener("destroyed", this._onWebContentsDestroyed);

      if (!webContents.isDestroyed()) {
        try {
          webContents.close({
            waitForBeforeUnload: false,
          });
        } finally {
          this._view = null;
          this._webContents = null;
        }
        return;
      }
    }
    this._view = null;
    this._webContents = null;
  }
}

module.exports = TabView;
