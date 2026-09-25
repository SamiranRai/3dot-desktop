const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class Surface {
  constructor({ id, renderer }) {
    if (!id) {
      throw new AppError({
        code: ErrorCodes.SURFACE_MISSING_ID,
        message: "Surface must have an id",
      });
    }

    if (!renderer) {
      throw new AppError({
        code: ErrorCodes.SURFACE_MISSING_RENDERER,
        message: "Surface must have a renderer",
      });
    }

    this.id = id;
    this.renderer = renderer;
  }

  mount() {
    // If the renderer has a mount method, call it.
    if (typeof this.renderer.mount === "function") {
      this.renderer.mount();
    }
  }

  setBounds(bounds) {
    // If the renderer has a setBounds method, call it.
    if (typeof this.renderer.setBounds !== "function") {
      throw new AppError({
        code: ErrorCodes.SURFACE_DETACHMENT_FAILED,
        message: `Renderer for surface "${this.id}" does not support setBounds`,
      });
    }
    
    this.renderer.setBounds(bounds);
  }

  getView() {
    return typeof this.renderer.getView === "function"
      ? this.renderer.getView()
      : null;
  }
  
  show() {
    this.renderer.show?.();
  }

  hide() {
    this.renderer.hide?.();
  }

  destroy() {
    try {
      this.renderer.destroy?.();
    } catch (error) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROY_FAILED,
        message: `Failed to destroy surface "${this.id}"`,
        cause: error,
      });
    }
  }
}

module.exports = Surface;
