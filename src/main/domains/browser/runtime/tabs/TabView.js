const { WebContentsView } = require("electron");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

class TabView {
  constructor({ webPreferences = {} } = {}) {
    if (!webPreferences || typeof webPreferences !== "object" || Array.isArray(webPreferences)) {
      throw new TypeError("TabView: webPreferences must be an object.");
    }

    this.destroyed = false;
    this.view = new WebContentsView({
      webPreferences: {
        ...webPreferences,
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.webContents = this.view.webContents;
    this.handleDestroyed = () => this._markDestroyed();
    this.webContents.once("destroyed", this.handleDestroyed);
  }

  getView() {
    this._assertAlive();
    return this.view;
  }

  getWebContents() {
    this._assertAlive();
    return this.webContents;
  }

  async loadURL(url, options) {
    this._assertAlive();

    if (typeof url !== "string" || !url.trim()) {
      throw new TypeError("TabView.loadURL() requires a non-empty URL.");
    }

    if (options !== undefined && (!options || typeof options !== "object" || Array.isArray(options))) {
      throw new TypeError("TabView.loadURL() options must be an object.");
    }

    return this.webContents.loadURL(url, options);
  }

  setBounds(bounds) {
    this._assertAlive();
    this._validateBounds(bounds);
    this.view.setBounds(bounds);
  }

  show() {
    this._assertAlive();
    this.view.setVisible(true);
  }

  hide() {
    if (this.isDestroyed()) return;
    this.view.setVisible(false);
  }

  isDestroyed() {
    if (this.destroyed) return true;

    if (!this.webContents || this.webContents.isDestroyed()) {
      this._markDestroyed();
      return true;
    }

    return false;
  }

  destroy() {
    if (this.destroyed) return;

    const webContents = this.webContents;
    this.destroyed = true;

    if (webContents) {
      webContents.removeListener("destroyed", this.handleDestroyed);
      if (!webContents.isDestroyed()) {
        try {
          webContents.close({ waitForBeforeUnload: false });
        } catch {
          // Native destruction is best-effort during teardown.
        }
      }
    }

    this.view = null;
    this.webContents = null;
  }

  _markDestroyed() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.webContents && !this.webContents.isDestroyed()) {
      this.webContents.removeListener("destroyed", this.handleDestroyed);
    }

    this.view = null;
    this.webContents = null;
  }

  _assertAlive() {
    if (this.isDestroyed()) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Tab view is destroyed.",
      });
    }
  }

  _validateBounds(bounds) {
    if (!bounds || typeof bounds !== "object" || Array.isArray(bounds)) {
      throw new TypeError("TabView.setBounds() requires a bounds object.");
    }

    for (const key of ["x", "y", "width", "height"]) {
      if (!Number.isFinite(bounds[key])) {
        throw new TypeError(`TabView.setBounds(): "${key}" must be a finite number.`);
      }
    }

    if (bounds.width < 0 || bounds.height < 0) {
      throw new RangeError("TabView.setBounds(): width and height cannot be negative.");
    }
  }
}

module.exports = TabView;
