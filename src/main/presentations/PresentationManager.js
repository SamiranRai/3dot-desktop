const LayoutEngine = require("./layout/LayoutEngine");
const BrowserLayout = require("./layout/BrowserLayout");
const Surface = require("./surfaces/Surface");
const SurfaceRegistry = require("./surfaces/SurfaceRegistry");
const ReactShellSurface = require("./surfaces/ReactShellSurface");
const OverlayHostSurface = require("./surfaces/OverlayHostSurface");
const TabSurfaceAdapter = require("./surfaces/TabSurfaceAdapter");
const AppError = require("../errors/AppError");
const ErrorCodes = require("../errors/ErrorCodes");

const RESIZE_DEBOUNCE_MS = 16;

class PresentationManager {
  constructor({ window, baseURL, preload, browserManager, surfaceManager }) {
    this.window = window;
    this.baseURL = baseURL;
    this.preload = preload;
    this.browserManager = browserManager;
    this.surfaceManager = surfaceManager;
    this.layoutEngine = new LayoutEngine();
    this.surfaceRegistry = new SurfaceRegistry();

    this.handleResize = this.handleResize.bind(this);
    this._resizeTimer = null;

    this.currentLayout = null;
    this.initialized = false;
    this.destroyed = false;
  }

  initialize() {
    if (this.initialized) return;

    this.createSurfaces();
    this.attachWindowListeners();
    this.mountSurfaces();

    const [width, height] = this.window.getContentSize();
    this.layoutEngine.setWindowSize(width, height);

    this.currentLayout = BrowserLayout;
    this.recalculate();

    this.initialized = true;
  }

  createSurfaces() {
    const reactShell = new Surface({
      id: "react-shell",
      renderer: new ReactShellSurface({
        id: "react-shell",
        window: this.window,
        url: `${this.baseURL}/browser`, // Later add full App
        preload: this.preload,
      }),
    });

    const tab = new Surface({
      id: "tab",
      renderer: new TabSurfaceAdapter({
        browserManager: this.browserManager,
      }),
    });

    const overlayHost = new Surface({
      id: "overlay-host",
      renderer: new OverlayHostSurface({
        id: "overlay-host",
        window: this.window,
        url: `${this.baseURL}/overlay`, // Later add a method to redner dynamic content popup
        preload: this.preload,
      }),
    });

    // Register surfaces: Map <SurfaceId, Surface>
    // Map <"react-shell", Surface>,
    // <"tab", Surface>,
    // <"overlay-host", Surface>
    this.surfaceRegistry.register(reactShell);
    this.surfaceRegistry.register(tab);
    this.surfaceRegistry.register(overlayHost);
  }

  // Mount all registered surfaces concurrently And attach them to the surface manager.
  mountSurfaces() {
    this.surfaceRegistry.getAll().forEach((surface) => {
      try {
        surface.mount();
        const view = surface.getView();
        if (view) {
          // Attach the surface's view to the surface manager for rendering.
          this.surfaceManager.attach(surface.id, view);
        }
      } catch (error) {
        console.error(
          `[PresentationManager] Failed to mount surface "${surface.id}"`,
          error,
        );
      }
    });
  }

  setWindowSize(width, height) {
    this.layoutEngine.setWindowSize(width, height);
    this.recalculate();
  }

  // Set the current layout mode and recalculate the layout.
  setMode(mode) {
    switch (mode) {
      case "browser":
        this.currentLayout = BrowserLayout;
        break;

      default:
        throw new AppError({
          code: ErrorCodes.PRESENTATION_MANAGER_INVALID_MODE,
          message: `Invalid mode: ${mode}`,
        });
    }

    this.recalculate();
  }

  recalculate() {
    if (!this.currentLayout) return;

    const layout = this.layoutEngine.calculate(this.currentLayout);
    this.applyLayout(layout);
  }

  applyLayout(layout) {
    const shell = this.surfaceRegistry.get("react-shell");
    if (shell) {
      shell.setBounds(layout.shell);
    }

    const tab = this.surfaceRegistry.get("tab");
    if (tab) {
      tab.setBounds(layout.tab);
    }

    const overlayHost = this.surfaceRegistry.get("overlay-host");
    if (overlayHost) {
      overlayHost.setBounds(layout.overlayHost);
    }
  }

  attachWindowListeners() {
    this.window.on("resize", this.handleResize);
  }

  handleResize() {
    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
    }

    this._resizeTimer = setTimeout(() => {
      this._resizeTimer = null;
      const [width, height] = this.window.getContentSize();
      this.setWindowSize(width, height);
    }, RESIZE_DEBOUNCE_MS);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this._resizeTimer) {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }

    this.window.removeListener("resize", this.handleResize);

    this.surfaceRegistry.getAll().forEach((surface) => {
      this.surfaceManager.detach(surface.id);
    });

    this.surfaceRegistry.destroyAll();
  }
}

module.exports = PresentationManager;
