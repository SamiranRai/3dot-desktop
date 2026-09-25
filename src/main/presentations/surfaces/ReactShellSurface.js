const { WebContentsView } = require("electron");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class ReactShellSurface {
  constructor({ id, window, url, preload }) {
    this.id = id;
    this.window = window;
    this.url = url;
    this.preload = preload;

    this.view = null;
    this.destroyed = false;
  }

  // Create WCV and Load Url and then Add to Ref Window.
  mount() {
    if (this.view) {
      return;
    }

    this.view = new WebContentsView({
      webPreferences: {
        preload: this.preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.view.webContents.loadURL(this.url);
  }

  getView() {
    return this.view;
  }

  // Set WCV Position in Ref Window.
  setBounds(bounds) {
    if (!this.view || this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DETACHMENT_FAILED,
        message: "ReactShellSurface is not mounted",
      });
    }

    this.view.setBounds(bounds);
  }

  show() {
    if (!this.view || this.destroyed) return;
    this.view.setVisible(true);
  }

  hide() {
    if (!this.view || this.destroyed) return;
    this.view.setVisible(false);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.view) {

      if (!this.view.webContents.isDestroyed()) {
        this.view.webContents.close();
      }

      this.view = null;
    }
  }
}

module.exports = ReactShellSurface;
