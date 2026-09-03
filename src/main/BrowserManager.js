const { WebContentsView } = require("electron");

class BrowserManager {
  constructor(window) {
    this.window = window;

    // Create a WebContentsView to manage the web content
    this.view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Add the WebContentsView to the main window
    this.window.contentView.addChildView(this.view);

    // Initialize
    this.resize();

    // Load the initial URL (Google in this case)
    this.view.webContents.loadURL("https://www.google.com");
  }

  // Resize Method
  resize() {
    // Get the current size of the main window
    const [width, height] = this.window.getContentSize();

    // Fixed toolbar height
    const toolbarHeight = 70;

    this.view.setBounds({
      x: 0,
      y: toolbarHeight,
      width,
      height: height - toolbarHeight,
    });
  }

  // ---Navigation Methods---
  navigate(url) {
    console.log("BROWSER MANAGER: navigating to:", url);
    this.view.webContents.loadURL(url);
  }

  back() {
    console.log("BROWSER MANAGER: navigating back");
    if (this.view.webContents.navigationHistory.canGoBack()) {
      this.view.webContents.navigationHistory.goBack();
    }
  }

  forward() {
    console.log("BROWSER MANAGER: navigating forward");
    if (this.view.webContents.navigationHistory.canGoForward()) {
      this.view.webContents.navigationHistory.goForward();
    }
  }

  // Reload Method
  reload() {
    console.log("BROWSER MANAGER: reloading page");
    this.view.webContents.reload();
  }
}

module.exports = BrowserManager;
