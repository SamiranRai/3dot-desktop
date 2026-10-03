const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class Surface {
  constructor({ id, renderer }) {
    if (typeof id !== "string" || !id.trim()) {
      throw new AppError({ code: ErrorCodes.SURFACE_INVALID, message: "Surface requires a non-empty id." });
    }
    if (!renderer || typeof renderer !== "object") {
      throw new AppError({ code: ErrorCodes.SURFACE_INVALID, message: `Surface "${id}" requires a renderer.` });
    }

    this.id = id;
    this.renderer = renderer;
  }

  mount() {
    return this.renderer.mount?.();
  }

  getView() {
    return this.renderer.getView?.() || null;
  }

  setBounds(bounds) {
    if (typeof this.renderer.setBounds !== "function") {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Surface "${this.id}" does not support setBounds().`,
      });
    }
    this.renderer.setBounds(bounds);
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
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DESTROY_FAILED,
        message: `Failed to destroy surface "${this.id}".`,
        cause,
      });
    }
  }
}

module.exports = Surface;
