class TabState {
  constructor() {
    this.url = "";
    this.title = "";
    this.isLoading = false;
    this.canGoBack = false;
    this.canGoForward = false;
  }

  // Return an immutable snapshot of the current tab state.
  getSnapshot() {
    return Object.freeze({
      url: this.url,
      title: this.title,
      isLoading: this.isLoading,
      canGoBack: this.canGoBack,
      canGoForward: this.canGoForward,
    });
  }
}

module.exports = TabState;
