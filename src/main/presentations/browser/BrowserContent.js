const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");
const ErrorHandler = require("../../errors/ErrorHandler");

/**
 * Owns the "content" region of the browser window — the area where the
 * active tab's view is displayed. Tracks visibility/bounds state and
 * keeps the attached view in sync with tab-activation events from the
 * TabManager.
 */
class BrowserContent {
  /**
   * @param {object} deps
   * @param {import('electron').BrowserWindow} deps.window - Host window; must expose `contentView`.
   * @param {object} deps.browserManager - Must expose `tabManager` (EventEmitter) and `getActiveTab()`.
   * @param {{ log?: Function, error?: Function }} [deps.logger]
   */
  constructor({ window, browserManager, logger } = {}) {
    if (!window || !window.contentView) {
      throw new AppError({
        code: ErrorCodes.WINDOW_UNAVAILABLE,
        message: "BrowserContent requires a window with a contentView",
      });
    }
    if (!browserManager || !browserManager.tabManager) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "BrowserContent requires a browserManager with a tabManager",
      });
    }

    this.window = window;
    this.browserManager = browserManager;
    this.logger = logger || console;

    this.activeTab = null;
    this.attachedTab = null;

    this.bounds = null;
    this.visible = false;
    this.destroyed = false;
    this.initialized = false;

    this.handleTabActivated = this.handleTabActivated.bind(this);
  }

  /**
   * Subscribes to tab-activation events and attaches the currently active
   * tab, if any. Idempotent.
   * @throws {AppError} SURFACE_DESTROYED if called post-destroy.
   */
  initialize() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROYED,
        message: "Cannot initialize a destroyed BrowserContent",
      });
    }
    if (this.initialized) {
      this.logger.log?.("BrowserContent: already initialized, skipping");
      return;
    }

    const tabManager = this.browserManager.tabManager;
    tabManager.on("tab-activated", this.handleTabActivated);

    let activeTab = null;
    try {
      activeTab = this.browserManager.getActiveTab();
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.BROWSER_OPERATION_FAILED,
            message: "Failed to read active tab during initialize",
            cause,
          }),
        ),
      );
    }

    if (activeTab) {
      this.attachTab(activeTab);
    }

    this.initialized = true;
    this.logger.log?.("BrowserContent: initialized");
  }

  /**
   * Marks the content region visible and shows the attached tab, if any.
   */
  show() {
    if (this.destroyed) return;

    this.visible = true;

    if (this.attachedTab) {
      this.safeTabCall(this.attachedTab, "show");
    }
  }

  /**
   * Marks the content region hidden and hides the attached tab, if any.
   */
  hide() {
    if (this.destroyed) return;

    this.visible = false;

    if (this.attachedTab) {
      this.safeTabCall(this.attachedTab, "hide");
    }
  }

  /**
   * @param {{ x: number, y: number, width: number, height: number }} bounds
   * @throws {AppError} INVALID_ARGUMENT for malformed bounds.
   */
  setBounds(bounds) {
    if (this.destroyed) return;

    if (
      !bounds ||
      typeof bounds.x !== "number" ||
      typeof bounds.y !== "number" ||
      typeof bounds.width !== "number" ||
      typeof bounds.height !== "number"
    ) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "setBounds() requires numeric x, y, width, height",
        details: { bounds },
      });
    }

    this.bounds = bounds;

    if (this.attachedTab) {
      this.safeTabCall(this.attachedTab, "setBounds", bounds);
    }
  }

  /**
   * TabManager event handler. Never throws — EventEmitter listeners that
   * throw can crash the process, so failures are normalized and logged.
   * @param {{ tabId: string }} event
   */
  handleTabActivated({ tabId } = {}) {
    if (this.destroyed) return;

    try {
      if (!tabId) {
        throw new AppError({
          code: ErrorCodes.INVALID_ARGUMENT,
          message: "tab-activated event fired without a tabId",
        });
      }

      const tab = this.browserManager.getTabById(tabId);
      if (!tab) {
        throw new AppError({
          code: ErrorCodes.TAB_UNAVAILABLE,
          message: `No tab found for id ${tabId}`,
          details: { tabId },
        });
      }

      this.attachTab(tab);
    } catch (cause) {
      const appError = ErrorHandler.normalizeError(cause);
      this.logger.error?.(ErrorHandler.toResponse(appError));
    }
  }

  /**
   * Attaches a tab's view into the content region, detaching the
   * previous tab first. Safe to call with the already-attached tab
   * (no-ops) or with a falsy tab (no-ops).
   * @param {object} tab - Must expose `id` and `getView()`.
   */
  attachTab(tab) {
    if (this.destroyed || !tab) return;

    if (this.attachedTab === tab) return;

    if (this.attachedTab) {
      this.detachTab(this.attachedTab);
    }

    let view;
    try {
      view = tab.getView();
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.VIEW_UNAVAILABLE,
            message: `Failed to get view for tab ${tab.id}`,
            cause,
          }),
        ),
      );
      return;
    }

    if (!view) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.VIEW_UNAVAILABLE,
            message: `Tab ${tab.id} returned no view`,
          }),
        ),
      );
      return;
    }

    try {
      this.window.contentView.addChildView(view);
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.SURFACE_ATTACHMENT_FAILED,
            message: `Failed to attach tab ${tab.id} to content view`,
            cause,
          }),
        ),
      );
      return;
    }

    this.activeTab = tab;
    this.attachedTab = tab;

    if (this.bounds) {
      this.safeTabCall(tab, "setBounds", this.bounds);
    }

    if (this.visible) {
      this.safeTabCall(tab, "show");
    }

    this.logger.log?.(`BrowserContent: attached tab ${tab.id}`);
  }

  /**
   * Detaches a tab's view from the content region and hides it.
   * @param {object} tab - Must expose `id` and `getView()`.
   */
  detachTab(tab) {
    if (!tab) return;

    let view = null;
    try {
      view = tab.getView();
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.VIEW_UNAVAILABLE,
            message: `Failed to get view for tab ${tab.id} during detach`,
            cause,
          }),
        ),
      );
    }

    if (view && this.window?.contentView) {
      try {
        this.window.contentView.removeChildView(view);
      } catch (cause) {
        this.logger.error?.(
          ErrorHandler.toResponse(
            new AppError({
              code: ErrorCodes.SURFACE_DETACHMENT_FAILED,
              message: `Failed to detach tab ${tab.id} from content view`,
              cause,
            }),
          ),
        );
      }
    }

    this.safeTabCall(tab, "hide");

    if (this.attachedTab === tab) {
      this.attachedTab = null;
    }

    this.logger.log?.(`BrowserContent: detached tab ${tab.id}`);
  }

  /**
   * Invokes a method on a tab, catching and logging any failure so a
   * misbehaving tab can't take down the caller.
   * @param {object} tab
   * @param {string} method
   * @param {...any} args
   */
  safeTabCall(tab, method, ...args) {
    try {
      tab[method]?.(...args);
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.BROWSER_OPERATION_FAILED,
            message: `Tab ${tab?.id} failed during ${method}()`,
            cause,
          }),
        ),
      );
    }
  }

  /**
   * Unsubscribes from events, detaches the active tab, and clears state.
   * Idempotent — safe to call more than once.
   */
  destroy() {
    if (this.destroyed) return;

    try {
      this.browserManager?.tabManager?.removeListener(
        "tab-activated",
        this.handleTabActivated,
      );
    } catch (cause) {
      this.logger.error?.(
        ErrorHandler.toResponse(
          new AppError({
            code: ErrorCodes.SURFACE_TEARDOWN_FAILED,
            message: "Failed to remove tab-activated listener",
            cause,
          }),
        ),
      );
    }

    if (this.attachedTab) {
      this.detachTab(this.attachedTab);
    }

    this.activeTab = null;
    this.attachedTab = null;
    this.window = null;
    this.browserManager = null;
    this.destroyed = true;

    this.logger.log?.("BrowserContent: destroyed");
  }
}

module.exports = BrowserContent;
