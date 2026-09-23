const { WebContentsView } = require("electron");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

class TabView {
  constructor({ webPreferences = {} } = {}) {
    this._destroyed = false;
    this.view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
        ...webPreferences,
      },
    });
  }

  isDestroyed() {
    return this._destroyed;
  }

  _assertAlive() {
    if (this._destroyed) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: "Cannot perform operation: TabView is destroyed.",
      })
    }
  }

  getView() {
    this._assertAlive();
    return this.view;
  }

  getWebContents() {
    this._assertAlive();
    return this.view.webContents;
  }

  // Load a URL in the WebContents
  async loadURL(url) {
    this._assertAlive();
    return this.view.webContents.loadURL(url);
  }

  // Set the bounds of the WebContentsView
  setBounds(bounds) {
    if (this._destroyed) return;
    this.view.setBounds(bounds);
  }

  show() {
    if (this._destroyed) return;
    this.view.setVisible(true);
  }

  hide() {
    if (this._destroyed) return;
    this.view.setVisible(false);
  }

  destroy() {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    const webContents = this.view && this.view.webContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.close();
    }

    this.view = null;
  }
}

module.exports = TabView;
