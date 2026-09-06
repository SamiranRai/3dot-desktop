class BrowserState {
  constructor() {
    this.url = "";
    this.title = "";
    this.isLoading = false;
    this.canGoBack = false;
    this.canGoForward = false;
  }

  getSnapshot() {
    return {
      url: this.url,
      title: this.title,
      isLoading: this.isLoading,
      canGoBack: this.canGoBack,
      canGoForward: this.canGoForward,
    };
  }
}


module.exports = BrowserState;