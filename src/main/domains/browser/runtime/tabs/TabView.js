const { WebContentsView } = require("electron");

class TabView {
  constructor() {
    this.view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
  }

  getView() {
    return this.view;
  }

  getWebContents() {
    return this.view.webContents;
  }

  loadURL(url) {
    return this.view.webContents.loadURL(url);
  }

  setBounds(bounds) {
    this.view.setBounds(bounds);
  }

  show() {
    this.view.setVisible(true);
  }

  hide() {
    this.view.setVisible(false);
  }

  destroy() {
    if (!this.view) {
      return;
    }
    if (!this.view.webContents.isDestroyed()) {
      this.view.webContents.destroy();
    }

    this.view = null;
  }
}

module.exports = TabView;
