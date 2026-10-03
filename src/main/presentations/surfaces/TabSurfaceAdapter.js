class TabSurfaceAdapter {
  constructor({ browserManager }) {
    if (!browserManager || typeof browserManager.setActiveTabBounds !== "function") {
      throw new TypeError("TabSurfaceAdapter requires browserManager.setActiveTabBounds().");
    }
    this.browserManager = browserManager;
  }

  setBounds(bounds) {
    this.browserManager.setActiveTabBounds(bounds);
  }

  destroy() {}
}

module.exports = TabSurfaceAdapter;
