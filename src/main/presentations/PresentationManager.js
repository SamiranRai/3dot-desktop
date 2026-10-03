// src/main/presentations/PresentationManager.js

const LayoutEngine = require("./layout/LayoutEngine");
const BrowserLayout = require("./layout/BrowserLayout");

const Surface = require("./surfaces/Surface");
const SurfaceRegistry = require("./surfaces/SurfaceRegistry");
const WebContentsSurface = require("./surfaces/WebContentsSurface");
const TabSurfaceAdapter = require("./surfaces/TabSurfaceAdapter");

const AppError = require("../errors/AppError");
const ErrorCodes = require("../errors/ErrorCodes");
const BrowserManager = require("../domains/browser/runtime/BrowserManager");

const RESIZE_DEBOUNCE_MS = 16;

class PresentationManager {
  constructor({
    window,
    baseURL,
    preload,
    browserManager,
    surfaceManager,
    eventBus,
    logger = console,
  }) {
    if (!window) {
      throw new TypeError("PresentationManager requires window.");
    }

    if (!baseURL) {
      throw new TypeError("PresentationManager requires baseURL.");
    }

    if (!preload) {
      throw new TypeError("PresentationManager requires preload.");
    }

    if (!browserManager) {
      throw new TypeError("PresentationManager requires browserManager.");
    }

    if (!surfaceManager) {
      throw new TypeError("PresentationManager requires surfaceManager.");
    }

    if (!eventBus) {
      throw new TypeError("PresentationManager requires eventBus.");
    }

    this.window = window;
    this.baseURL = baseURL;
    this.preload = preload;

    this.browserManager = browserManager;
    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;
    this.logger = logger;

    this.layoutEngine = new LayoutEngine();
    this.surfaceRegistry = new SurfaceRegistry();

    this.layout = BrowserLayout;

    this.width = 0;
    this.height = 0;

    this.resizeTimer = null;
    this.unsubscribers = [];

    this.lifecycleState = "created";

    this.handleResize = this.handleResize.bind(this);
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  /**
   * Creates and attaches all native surfaces.
   *
   * IMPORTANT:
   * Renderer URLs are NOT loaded here.
   *
   * This allows Application to register IPC before any renderer
   * can execute JavaScript and call the preload API.
   */
  initialize() {
    if (this.lifecycleState === "ready") {
      return;
    }

    if (this.lifecycleState !== "created") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message:
          `Cannot initialize PresentationManager from state ` +
          `"${this.lifecycleState}".`,
      });
    }

    try {
      this._createSurfaces();
      this._mountSurfaces();
      this._subscribeToBrowserEvents();
      this._attachWindowListeners();

      const [width, height] = this.window.getContentSize();

      this.width = width;
      this.height = height;

      this.lifecycleState = "ready";

      this._recalculate();
    } catch (cause) {
      this.destroy();

      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACH_FAILED,
        message: "Failed to initialize PresentationManager.",
        cause,
      });
    }
  }

  /**
   * Starts renderer execution.
   *
   * Application must call this AFTER IPC has been registered.
   */
  async loadSurfaces() {
    this._assertReady();

    const surfaces = this.surfaceRegistry.getAll();

    try {
      for (const surface of surfaces) {
        const renderer = surface.renderer;

        if (typeof renderer.load !== "function") {
          continue;
        }

        await renderer.load();
      }
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACH_FAILED,
        message: "Failed to load presentation surfaces.",
        cause,
      });
    }
  }

  destroy() {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    this.lifecycleState = "destroyed";

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    this.window?.removeListener("resize", this.handleResize);

    for (const unsubscribe of this.unsubscribers.splice(0)) {
      try {
        unsubscribe();
      } catch (error) {
        this.logger.error?.("PRESENTATION: failed to unsubscribe event", error);
      }
    }

    for (const surface of this.surfaceRegistry.getAll()) {
      if (!this.surfaceManager.has(surface.id)) {
        continue;
      }

      try {
        this.surfaceManager.detach(surface.id);
      } catch (error) {
        this.logger.error?.(
          `PRESENTATION: failed to detach "${surface.id}"`,
          error,
        );
      }
    }

    this.surfaceRegistry.destroyAll(this.logger);
  }

  // =========================================================
  // PRESENTATION
  // =========================================================

  setMode(mode) {
    if (mode !== "browser") {
      throw new AppError({
        code: ErrorCodes.PRESENTATION_INVALID_MODE,
        message: `Unsupported presentation mode "${mode}".`,
      });
    }

    this.layout = BrowserLayout;
    this._recalculate();
  }

  // =========================================================
  // SURFACES
  // =========================================================

  _createSurfaces() {
    this.surfaceRegistry.register(
      new Surface({
        id: "react-shell",

        renderer: new WebContentsSurface({
          id: "react-shell",
          url: `${this.baseURL}/browser`,
          preload: this.preload,
          logger: this.logger,
        }),
      }),
    );

    this.surfaceRegistry.register(
      new Surface({
        id: "tab",

        renderer: new TabSurfaceAdapter({
          browserManager: this.browserManager,
        }),
      }),
    );

    this.surfaceRegistry.register(
      new Surface({
        id: "overlay-host",

        renderer: new WebContentsSurface({
          id: "overlay-host",
          url: `${this.baseURL}/overlay`,
          preload: this.preload,
          transparent: true,
          borderRadius: 24,
          logger: this.logger,
        }),
      }),
    );
  }

  _mountSurfaces() {
    for (const surface of this.surfaceRegistry.getAll()) {
      surface.mount();

      const view = surface.getView();

      if (!view) {
        continue;
      }

      this.surfaceManager.attach(surface.id, view, surface.id);
    }
  }

  // =========================================================
  // BROWSER EVENTS
  // =========================================================

  _subscribeToBrowserEvents() {
    const events = [
      BrowserManager.EVENTS.TAB_CREATED,
      BrowserManager.EVENTS.TAB_ACTIVATED,
      BrowserManager.EVENTS.TAB_CLOSED,
    ];

    for (const eventType of events) {
      const unsubscribe = this.eventBus.subscribe(eventType, () =>
        this._recalculate(),
      );

      this.unsubscribers.push(unsubscribe);
    }
  }

  // =========================================================
  // LAYOUT
  // =========================================================

  _attachWindowListeners() {
    this.window.on("resize", this.handleResize);
  }

  handleResize() {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }

    this.resizeTimer = setTimeout(() => {
      this.resizeTimer = null;

      if (this.lifecycleState !== "ready" || this.window.isDestroyed()) {
        return;
      }

      const [width, height] = this.window.getContentSize();

      this.width = width;
      this.height = height;

      this._recalculate();
    }, RESIZE_DEBOUNCE_MS);
  }

  _recalculate() {
    if (this.lifecycleState !== "ready") {
      return;
    }

    const layout = this.layoutEngine.calculate(
      this.layout,
      this.width,
      this.height,
    );

    this.surfaceRegistry.get("react-shell")?.setBounds(layout.shell);

    this.surfaceRegistry.get("tab")?.setBounds(layout.tab);

    this.surfaceRegistry.get("overlay-host")?.setBounds(layout.overlayHost);
  }

  _assertReady() {
    if (this.lifecycleState !== "ready") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message:
          `PresentationManager is not ready. ` +
          `Current state: ${this.lifecycleState}.`,
      });
    }
  }
}

module.exports = PresentationManager;
