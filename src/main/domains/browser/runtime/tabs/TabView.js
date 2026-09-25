const { WebContentsView } = require("electron");

const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

// @TabView is a wrapper arounds Electron's WebContentsView (WCV)
// and Each TabView instance represents a single browser tab in the application.
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
      throw new TypeError(
        "TabView constructor: webPreferences must be an object.",
      );
    }

    // Enforce security-critical WebContents preferences.
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

    // Call this function when the native WebContents is destroyed
    this._onWebContentsDestroyed = () => {
      this._markDestroyed();
    };
    webContents.once("destroyed", this._onWebContentsDestroyed);

    // Store updated references
    this._view = view;
    this._webContents = webContents;
  }

  getView() {
    this._assertAlive();
    return this._view;
  }

  getWebContents() {
    this._assertAlive();
    return this._webContents;
  }

  // Load a URL in the TabView's WebContents
  // The url must be a non-empty string
  // The options, if provided, must be an object
  async loadURL(url, options = undefined) {
    this._assertAlive();

    if (typeof url !== "string" || url.trim().length === 0) {
      throw new TypeError(
        "TabView.loadURL(url, options): url must be a non-empty string.",
      );
    }

    if (
      options !== undefined &&
      (options === null ||
        typeof options !== "object" ||
        Array.isArray(options))
    ) {
      throw new TypeError(
        "TabView.loadURL(url, options): options must be an object if provided.",
      );
    }

    return this._webContents.loadURL(url, options);
  }

  // Set the bounds of the TabView (position and size)
  // The bounds object must have {x, y, width, height} properties
  setBounds(bounds) {
    this._assertAlive();
    this._validateBounds(bounds);

    this._view.setBounds(bounds);
  }

  // Show the TabView (make it visible)
  show() {
    this._assertAlive();
    this._view.setVisible(true);
  }

  // Hide the TabView (make it invisible)
  hide() {
    this._assertAlive();
    this._view.setVisible(false);
  }

  // Validate the bounds object to ensure it has the required properties
  _validateBounds(bounds) {
    if (
      bounds === null ||
      typeof bounds !== "object" ||
      Array.isArray(bounds)
    ) {
      throw new TypeError(
        "TabView.setBounds(bounds): bounds must be an object.",
      );
    }

    const requiredProperties = ["x", "y", "width", "height"];

    for (const property of requiredProperties) {
      if (!Object.prototype.hasOwnProperty.call(bounds, property)) {
        throw new TypeError(
          `TabView.setBounds(bounds): missing "${property}".`,
        );
      }

      if (!Number.isFinite(bounds[property])) {
        throw new TypeError(
          `TabView.setBounds(bounds): "${property}" must be a finite number.`,
        );
      }
    }

    if (bounds.width < 0) {
      throw new RangeError(
        'TabView.setBounds(bounds): "width" cannot be negative.',
      );
    }

    if (bounds.height < 0) {
      throw new RangeError(
        'TabView.setBounds(bounds): "height" cannot be negative.',
      );
    }
  }

  // Remove the destroyed listener and mark as destroyed
  // when the native WebContents is destroyed
  _markDestroyed() {
    // If already destroyed, do nothing
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;

    const webContents = this._webContents;
    if (webContents && !webContents.isDestroyed()) {
      // Remove the listener
      webContents.removeListener("destroyed", this._onWebContentsDestroyed);
    }

    // Clear references
    this._view = null;
    this._webContents = null;
  }

  // Assert that the TabView is alive (not destroyed)
  // before performing operations
  _assertAlive() {
    // If already destroyed, throw an error
    if (this._destroyed) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }

    // If the native WebContents is destroyed,
    // mark as destroyed and throw an error
    if (!this._webContents || this._webContents.isDestroyed()) {
      this._markDestroyed();

      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }

    // If the native WebContents is null,
    // mark as destroyed and throw an error
    if (!this._view) {
      this._markDestroyed();

      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      });
    }
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

  // Destroy the TabView and its underlying WebContents
  // This will also remove the "destroyed" listener
  // and clear references to the view and webContents
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
