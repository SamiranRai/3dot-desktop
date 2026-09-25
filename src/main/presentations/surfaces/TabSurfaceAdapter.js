class TabSurfaceAdapter {
  constructor({ browserManager }) {
    this.browserManager = browserManager;
  }

  setBounds(bounds) {
    const activeTab = this.browserManager.getActiveTab();
    if (!activeTab) return;
    
    // Set bounds on the active tab's view, which is managed by BrowserManager.
    activeTab.setBounds(bounds);
  }

  // No-op for TabSurfaceAdapter, as the active tab's view is managed by BrowserManager.
  destroy() {}
}

module.exports = TabSurfaceAdapter;
