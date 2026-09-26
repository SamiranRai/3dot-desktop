const TabView = require("./TabView");
const TabState = require("./TabState");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

class Tab {
  constructor({ id, window, surfaceManager, eventBus }) {
    // Validate constructor parameters
    this._validateConstructorParams({ id, window, surfaceManager, eventBus });

    this.id = id;
    this.window = window;
    this.view = new TabView();
    this.tabState = new TabState();
    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;

    // Initialize WebContents reference
    this._webContents = this.view.getWebContents();

    // Tab Lifecycle State: "Created"
    this.lifecycleState = "created";

    this._eventsBound = false;
    this._surfaceAttached = false;

    this._initializationPromise = null;

    this._onDidStartLoading = () => {
      this._handleWebContentsEvent(() => {
        this.updateTabState({
          isLoading: true,
        });
      });
    };

    this._onDidStopLoading = () => {
      this._handleWebContentsEvent(() => {
        this._updateNavigationState({
          isLoading: false,
        });
      });
    };

    this._onDidNavigate = (_event, url) => {
      this._handleWebContentsEvent(() => {
        this._updateNavigationState({
          url,
        });
      });
    };

    this._onDidNavigateInPage = (_event, url, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }

      this._handleWebContentsEvent(() => {
        this.updateTabState({
          url,
        });
      });
    };

    this._onPageTitleUpdated = (_event, title) => {
      this._handleWebContentsEvent(() => {
        this.updateTabState({
          title,
        });
      });
    };

    this._onDidFailLoad = (
      _event,
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame,
    ) => {
      if (!isMainFrame) {
        return;
      }

      this._handleWebContentsEvent(() => {
        this.updateTabState({
          isLoading: false,
        });

        this.publishEvent("tab:navigation-failed", {
          errorCode,
          errorDescription,
          validatedURL,
        });
      });
    };

    this._onRenderProcessGone = (_event, details) => {
      this._handleWebContentsEvent(() => {
        this.publishEvent("tab:renderer-gone", {
          details,
        });
      });
    };

    this._onUnresponsive = () => {
      this._handleWebContentsEvent(() => {
        this.publishEvent("tab:unresponsive");
      });
    };

    this._onResponsive = () => {
      this._handleWebContentsEvent(() => {
        this.publishEvent("tab:responsive");
      });
    };

    this._onWebContentsDestroyed = () => {
      this._handleUnexpectedWebContentsDestruction();
    };
  }

  async initialize(url) {
    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: `Cannot initialize Tab from lifecycle state: ${this.lifecycleState}`,
      });
    }

    this._setLifecycleState("initializing");

    // Listen BEFORE loading URL
    // so we don't miss any Chromium events
    this.setupWebContentsEvents();

    const initializationPromise = this._initialize(url);
    this._initializationPromise = initializationPromise;

    try {
      return await initializationPromise;
    } finally {
      if (this._initializationPromise === initializationPromise) {
        this._initializationPromise = null;
      }
    }
  }

  async _initialize(url) {
    try {
      await this.view.loadURL(url);

      // Tab may be destroyed while loadURL() is waiting.
      // Never allow destroyed tabs to become "ready"
      if (this.lifecycleState === "destroyed") {
        throw this._createDestroyedError(
          "Tab was destroyed during initialization.",
        );
      }

      this._setLifecycleState("ready");

      this._syncCurrentState();

      console.log(`TAB [${this.id}]: initialized and ready`);
      return this.getState();
    } catch (error) {
      if (this.lifecycleState === "destroyed") {
        throw error;
      }

      this._setLifecycleState("error");

      const appError = new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message: `Failed to initialize Tab: ${
          error?.message || "Unknown error"
        }`,
        cause: error,
      });

      console.error(`TAB [${this.id}]: initialization failed`, appError);

      throw appError;
    }
  }

  // Setup WebContents Events
  setupWebContentsEvents() {
    if (this._eventsBound) {
      return; // Prevent multiple bindings
    }

    this._assertAlive();

    const webContents = this._webContents;

    if (!webContents || webContents.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();

      throw this._createDestroyedError(
        "Cannot setup WebContents events: WebContents is destroyed.",
      );
    }

    // Listening Chromium WebContents events to
    // update tab state and emit events
    webContents.on("did-start-loading", this._onDidStartLoading);
    webContents.on("did-stop-loading", this._onDidStopLoading);
    webContents.on("did-navigate", this._onDidNavigate);
    webContents.on("did-navigate-in-page", this._onDidNavigateInPage);
    webContents.on("page-title-updated", this._onPageTitleUpdated);
    webContents.on("did-fail-load", this._onDidFailLoad);
    webContents.on("render-process-gone", this._onRenderProcessGone);
    webContents.on("unresponsive", this._onUnresponsive);
    webContents.on("responsive", this._onResponsive);
    webContents.once("destroyed", this._onWebContentsDestroyed);

    // Mark events as bound
    this._eventsBound = true;
  }

  // Remove WebContents Events
  _removeWebContentsEvents() {
    if (!this._eventsBound) {
      return;
    }

    const webContents = this._webContents;

    if (!webContents || typeof webContents.removeListener !== "function") {
      this._eventsBound = false;
      return;
    }

    webContents.removeListener("did-start-loading", this._onDidStartLoading);
    webContents.removeListener("did-stop-loading", this._onDidStopLoading);
    webContents.removeListener("did-navigate", this._onDidNavigate);
    webContents.removeListener(
      "did-navigate-in-page",
      this._onDidNavigateInPage,
    );
    webContents.removeListener("page-title-updated", this._onPageTitleUpdated);
    webContents.removeListener("did-fail-load", this._onDidFailLoad);
    webContents.removeListener(
      "render-process-gone",
      this._onRenderProcessGone,
    );
    webContents.removeListener("unresponsive", this._onUnresponsive);
    webContents.removeListener("responsive", this._onResponsive);
    webContents.removeListener("destroyed", this._onWebContentsDestroyed);

    this._eventsBound = false;
  }

  // Update the tab state and emit a tab-state-changed event
  updateTabState(patch) {
    if (this.lifecycleState === "destroyed") {
      return false;
    }

    if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
      throw new TypeError(
        "Tab.updateTabState(patch): patch must be an object.",
      );
    }

    // Do not publish an event when nothing actually changed.
    let changed = false;

    for (const [key, value] of Object.entries(patch)) {
      if (!Object.is(this.tabState[key], value)) {
        changed = true;
        break;
      }
    }

    if (!changed) {
      return false;
    }

    Object.assign(this.tabState, patch);
    this.publishEvent("tab.state-changed", {
      state: this.getState(),
    });

    return true;
  }

  // Update navigation state (canGoBack, canGoForward) and optionally other properties
  _updateNavigationState(patch = {}) {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    const webContents = this._webContents;

    if (!webContents || webContents.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();
      return;
    }

    try {
      const history = webContents.navigationHistory;

      this.updateTabState({
        ...patch,
        canGoBack: history.canGoBack(),
        canGoForward: history.canGoForward(),
      });
    } catch (error) {
      if (webContents.isDestroyed()) {
        this._handleUnexpectedWebContentsDestruction();
        return;
      }

      throw error;
    }
  }

  _updateNavigationState(patch = {}) {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    const webContents = this._webContents;

    if (!webContents || webContents.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();
      return;
    }

    try {
      const history = webContents.navigationHistory;

      this.updateTabState({
        ...patch,
        canGoBack: history.canGoBack(),
        canGoForward: history.canGoForward(),
      });
    } catch (error) {
      /*
       * Native WebContents can disappear between the checks above
       * and the navigationHistory call.
       */
      if (webContents.isDestroyed()) {
        this._handleUnexpectedWebContentsDestruction();
        return;
      }

      throw error;
    }
  }

  _syncCurrentState() {
    this._assertAlive();

    const webContents = this._webContents;

    if (!webContents || webContents.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();

      throw this._createDestroyedError(
        "Cannot synchronize state: WebContents is destroyed.",
      );
    }

    this._updateNavigationState({
      url: webContents.getURL(),
      title: webContents.getTitle(),
      isLoading: webContents.isLoadingMainFrame(),
    });
  }

  // Get the current state of the tab
  getState() {
    return {
      id: this.id,
      ...this.tabState.getSnapshot(),
      lifecycleState: this.lifecycleState,
    };
  }

  // Publish an event to the event bus
  publishEvent(type, payload = null) {
    if (!this.eventBus) {
      return false;
    }

    try {
      this.eventBus.publish({
        type,
        tabId: this.id,
        payload,
      });

      return true;
    } catch (error) {
      console.error(
        `TAB [${this.id}]: failed to publish "${type}" event`,
        error,
      );

      return false;
    }
  }

  // ---Navigation---

  navigate(url) {
    this.assertReady();
    console.log(`TAB [${this.id}]: navigating to`, url);

    return this.view.loadURL(url);
  }

  goBack() {
    this.assertReady();

    const webContents = this._webContents;
    const history = webContents.navigationHistory;

    if (!history.canGoBack()) {
      return false;
    }

    console.log(`TAB [${this.id}]: navigating back`);

    history.goBack();

    return true;
  }

  goForward() {
    this.assertReady();

    const webContents = this._webContents;
    const history = webContents.navigationHistory;

    if (!history.canGoForward()) {
      return false;
    }

    console.log(`TAB [${this.id}]: navigating forward`);

    history.goForward();

    return true;
  }

  reload() {
    this.assertReady();

    console.log(`TAB [${this.id}]: reloading page`);

    return this._webContents.reload();
  }

  // ---Presentation---

  getView() {
    this._assertAlive();
    return this.view.getView();
  }

  attachToWindow() {
    this._assertAlive();

    if (!this.surfaceManager) {
      throw new AppError({
        code: ErrorCodes.BROWSER_WINDOW_NOT_FOUND,
        message: "Cannot attach tab: surfaceManager is unavailable.",
      });
    }

    if (this._surfaceAttached) {
      return;
    }

    this.surfaceManager.attach(this.id, this.getView(), "tab");
    this._surfaceAttached = true;
  }

  setBounds(bounds) {
    this._assertAlive();
    this.view.setBounds(bounds);
  }

  show() {
    this._assertAlive();
    this.view.show();
  }

  hide() {
    this._assertAlive();
    this.view.hide();
  }

  // ---Lifecycle---

  assertReady() {
    this._assertAlive();

    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.BROWSER_NOT_READY,
        message: `Tab is not ready. Current state: ${this.lifecycleState}`,
      });
    }
  }

  _assertAlive() {
    if (this.lifecycleState === "destroyed") {
      throw this._createDestroyedError(
        "Cannot perform operation: Tab is destroyed.",
      );
    }

    if (!this.view || this.view.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();

      throw this._createDestroyedError(
        "Cannot perform operation: TabView is destroyed.",
      );
    }
  }

  _validateConstructorParams({ id, window, surfaceManager, eventBus }) {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new TypeError("Tab constructor: id must be a non-empty string.");
    }

    if (!window) {
      throw new TypeError("Tab constructor: window is required.");
    }

    if (
      !surfaceManager ||
      typeof surfaceManager.attach !== "function" ||
      typeof surfaceManager.detach !== "function"
    ) {
      throw new TypeError(
        "Tab constructor: surfaceManager must provide attach() and detach().",
      );
    }

    if (!eventBus || typeof eventBus.publish !== "function") {
      throw new TypeError("Tab constructor: eventBus must provide publish().");
    }
  }

  isDestroyed() {
    if (this.lifecycleState === "destroyed") {
      return true;
    }

    if (!this.view || this.view.isDestroyed()) {
      this._handleUnexpectedWebContentsDestruction();
      return true;
    }

    return false;
  }

  _setLifecycleState(nextState, { publish = true } = {}) {
    const currentState = this.lifecycleState;

    if (currentState === nextState) {
      return false;
    }

    const allowedTransitions = {
      created: new Set(["initializing", "destroyed"]),
      initializing: new Set(["ready", "error", "destroyed"]),
      ready: new Set(["destroyed"]),
      error: new Set(["destroyed"]),
      destroyed: new Set(),
    };

    const allowed = allowedTransitions[currentState];

    if (!allowed || !allowed.has(nextState)) {
      throw new AppError({
        code: ErrorCodes.BROWSER_INITIALIZATION_FAILED,
        message:
          `Invalid Tab lifecycle transition: ` +
          `${currentState} -> ${nextState}`,
      });
    }

    this.lifecycleState = nextState;

    if (publish) {
      this.publishEvent("tab.state-changed", {
        state: this.getState(),
      });
    }

    return true;
  }

  // ---Native WebContents destruction--

  _handleUnexpectedWebContentsDestruction() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    console.warn(`TAB [${this.id}]: WebContents was destroyed independently.`);

    this._setLifecycleState("destroyed", { publish: false });
    this._removeWebContentsEvents();
    this._detachFromSurfaceSafely();

    this.publishEvent("tab.state-changed", {
      state: this.getState(),
    });

    this.view = null;
    this._webContents = null;
    this.window = null;
    this.surfaceManager = null;
    this._initializationPromise = null;
    this.eventBus = null;
  }

  // ---Destruction---

  destroy() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    const view = this.view;

    this._setLifecycleState("destroyed", { publish: false });

    try {
      this._detachFromSurfaceSafely();
      this._removeWebContentsEvents();

      if (view) {
        view.destroy();
      }
    } catch (error) {
      console.error(`TAB [${this.id}]: destruction cleanup failed`, error);
    } finally {
      this.publishEvent("tab.state-changed", {
        state: this.getState(),
      });

      this.view = null;
      this._webContents = null;
      this.window = null;
      this.surfaceManager = null;
      this._initializationPromise = null;
      this._surfaceAttached = false;
      this.eventBus = null;

      console.log(`TAB [${this.id}]: destroyed`);
    }
  }

  // ---Surface cleanup---

  _detachFromSurfaceSafely() {
    if (!this._surfaceAttached) {
      return;
    }

    const surfaceManager = this.surfaceManager;

    if (!surfaceManager || typeof surfaceManager.detach !== "function") {
      this._surfaceAttached = false;
      return;
    }

    try {
      surfaceManager.detach(this.id);
    } catch (error) {
      console.error(
        `TAB [${this.id}]: failed to detach from SurfaceManager`,
        error,
      );
    } finally {
      this._surfaceAttached = false;
    }
  }

  //---WebContents-event-safety---

  _handleWebContentsEvent(callback) {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    try {
      callback();
    } catch (error) {
      console.error(
        `TAB [${this.id}]: WebContents event handler failed`,
        error,
      );
    }
  }

  //---Errors---

  _createDestroyedError(message) {
    return new AppError({
      code: ErrorCodes.BROWSER_TAB_DESTROYED,
      message,
    });
  }
}

module.exports = Tab;
