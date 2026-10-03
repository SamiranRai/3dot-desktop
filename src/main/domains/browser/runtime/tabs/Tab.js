// src/main/domains/browser/runtime/tabs/Tab.js

const EventEmitter = require("events");
const crypto = require("crypto");
const TabState = require("./TabState");
const TabView = require("./TabView");
const NavigationResolver = require("../navigation-resolver/NavigationResolver");
const AppError = require("../../../../errors/AppError");
const ErrorCodes = require("../../../../errors/ErrorCodes");

const EVENTS = Object.freeze({
  STATE_CHANGED: "state-changed",
  LOAD_ERROR: "load-error",
});

class Tab extends EventEmitter {
  constructor({ logger = console, webPreferences = {} } = {}) {
    super();

    this.id = crypto.randomUUID();

    this.logger = logger;
    this.state = new TabState();

    this.view = new TabView({
      webPreferences,
    });

    this.destroyed = false;
    this.handlers = null;

    this._bindWebContentsEvents();

    this.view.hide();
  }

  // ======================INITIALIZATION======================
  async initialize(url) {
    this._assertAlive();

    if (url !== undefined && (typeof url !== "string" || !url.trim())) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message:
          "Tab.initialize() url must be a non-empty string when provided.",
      });
    }

    if (url !== undefined) {
      await this.navigate(url);
    }

    return this;
  }

  // ======================NAVIGATION======================

  async navigate(input) {
    this._assertAlive();

    const resolvedURL = NavigationResolver.resolve(input);
    if (!resolvedURL) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "Navigation input could not be resolved.",
      });
    }

    this._updateState({
      url: resolvedURL,
      isLoading: true,
    });

    /*
     * Navigation itself is asynchronous.
     *
     * We intentionally don't make the IPC request wait for
     * the entire page load. Loading/error state is delivered
     * through the tab event stream.
     */
    this.view.loadURL(resolvedURL).catch((error) => {
      if (this.destroyed) {
        return;
      }

      this._updateState({
        isLoading: false,
      });

      this.emit(EVENTS.LOAD_ERROR, {
        tabId: this.id,
        error: new AppError({
          code: ErrorCodes.NAVIGATION_FAILED,
          message: error?.message || "Navigation failed.",
          cause: error,
          details: {
            url: resolvedURL,
          },
        }),
      });
    });

    return true;
  }

  goBack() {
    this._assertAlive();

    const navigationHistory = this.view.getWebContents().navigationHistory;
    if (!navigationHistory.canGoBack()) {
      return false;
    }

    navigationHistory.goBack();
    return true;
  }

  goForward() {
    this._assertAlive();

    const navigationHistory = this.view.getWebContents().navigationHistory;
    if (!navigationHistory.canGoForward()) {
      return false;
    }

    navigationHistory.goForward();
    return true;
  }

  reload() {
    this._assertAlive();
    this.view.getWebContents().reload();
    return true;
  }

  // ======================PRESENTATION======================

  activate() {
    this._assertAlive();
    this.view.show();
  }

  deactivate() {
    if (!this.destroyed) {
      this.view.hide();
    }
  }

  setBounds(bounds) {
    this._assertAlive();
    this.view.setBounds(bounds);
  }

  // ======================STATE======================

  getState() {
    return Object.freeze({
      id: this.id,
      ...this.state.getSnapshot(),
    });
  }

  // ======================DESTROY======================

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this._unbindWebContentsEvents();
    this.view.destroy();
    this.removeAllListeners();
  }

  // ======================WEB-CONTENT-EVENTS======================

  _bindWebContentsEvents() {
    const webContents = this.view.getWebContents();

    this.handlers = {
      startLoading: () => {
        this._updateState({
          isLoading: true,
        });
      },

      stopLoading: () => {
        if (this.destroyed) {
          return;
        }

        this._updateState({
          isLoading: false,
          url: webContents.getURL() || this.state.url,
          ...this._getNavigationState(webContents),
        });
      },

      navigated: (_event, url) => {
        this._updateState({
          url,
          ...this._getNavigationState(webContents),
        });
      },

      titleUpdated: (_event, title) => {
        this._updateState({
          title: title || "",
        });
      },

      failLoad: (
        _event,
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      ) => {
        // -3 = ERR_ABORTED, usually caused by a
        // navigation being replaced by another navigation.
        if (!isMainFrame || errorCode === -3 || this.destroyed) {
          return;
        }

        this._updateState({
          isLoading: false,
        });

        this.emit(EVENTS.LOAD_ERROR, {
          tabId: this.id,
          error: new AppError({
            code: ErrorCodes.NAVIGATION_FAILED,
            message: errorDescription || "Page failed to load.",
            details: {
              errorCode,
              url: validatedURL,
            },
          }),
        });
      },

      willNavigate: (event, url) => {
        this._guardNavigation(event, url);
      },

      willRedirect: (event, url) => {
        this._guardNavigation(event, url);
      },

      windowOpen: () => ({
        action: "deny",
      }),

      renderProcessGone: (_event, details) => {
        if (this.destroyed) {
          return;
        }

        this.emit(EVENTS.LOAD_ERROR, {
          tabId: this.id,
          error: new AppError({
            code: ErrorCodes.NAVIGATION_FAILED,
            message: "Tab renderer process exited.",
            details,
          }),
        });
      },
    };

    webContents.on("did-start-loading", this.handlers.startLoading);
    webContents.on("did-stop-loading", this.handlers.stopLoading);
    webContents.on("did-navigate", this.handlers.navigated);
    webContents.on("did-navigate-in-page", this.handlers.navigated);
    webContents.on("page-title-updated", this.handlers.titleUpdated);
    webContents.on("did-fail-load", this.handlers.failLoad);
    webContents.on("will-navigate", this.handlers.willNavigate);
    webContents.on("will-redirect", this.handlers.willRedirect);
    webContents.setWindowOpenHandler(this.handlers.windowOpen);
    webContents.on("render-process-gone", this.handlers.renderProcessGone);
  }

  _unbindWebContentsEvents() {
    if (!this.handlers || this.view.isDestroyed()) {
      return;
    }

    const webContents = this.view.getWebContents();

    webContents.removeListener("did-start-loading", this.handlers.startLoading);
    webContents.removeListener("did-stop-loading", this.handlers.stopLoading);
    webContents.removeListener("did-navigate", this.handlers.navigated);
    webContents.removeListener("did-navigate-in-page", this.handlers.navigated);
    webContents.removeListener(
      "page-title-updated",
      this.handlers.titleUpdated,
    );
    webContents.removeListener("did-fail-load", this.handlers.failLoad);
    webContents.removeListener("will-navigate", this.handlers.willNavigate);
    webContents.removeListener("will-redirect", this.handlers.willRedirect);
    webContents.removeListener(
      "render-process-gone",
      this.handlers.renderProcessGone,
    );

    this.handlers = null;
  }

  // ======================HELPERS======================

  _getNavigationState(webContents) {
    const history = webContents.navigationHistory;
    return {
      canGoBack: history.canGoBack(),
      canGoForward: history.canGoForward(),
    };
  }

  _guardNavigation(event, url) {
    if (!NavigationResolver.isSafeUrl(url)) {
      event.preventDefault();
      this.logger.warn?.(`TAB ${this.id}: blocked unsafe navigation`, url);
    }
  }

  _updateState(patch) {
    if (this.destroyed) {
      return;
    }

    Object.assign(this.state, patch);

    this.emit(EVENTS.STATE_CHANGED, {
      tabId: this.id,
      tab: this,
    });
  }

  _assertAlive() {
    if (this.destroyed || this.view.isDestroyed()) {
      throw new AppError({
        code: ErrorCodes.BROWSER_TAB_DESTROYED,
        message: `Tab "${this.id}" is destroyed.`,
      });
    }
  }
}

Tab.EVENTS = EVENTS;

module.exports = Tab;
