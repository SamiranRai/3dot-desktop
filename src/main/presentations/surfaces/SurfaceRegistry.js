const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class SurfaceRegistry {
  constructor() {
    this.surfaces = new Map();
  }

  register(surface) {
    if (!surface?.id) {
      throw new AppError({ code: ErrorCodes.SURFACE_INVALID, message: "Cannot register invalid surface." });
    }
    if (this.surfaces.has(surface.id)) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ALREADY_REGISTERED,
        message: `Surface "${surface.id}" is already registered.`,
      });
    }
    this.surfaces.set(surface.id, surface);
  }

  get(id) {
    return this.surfaces.get(id);
  }

  getAll() {
    return [...this.surfaces.values()];
  }

  destroyAll(logger = console) {
    for (const surface of this.surfaces.values()) {
      try {
        surface.destroy();
      } catch (error) {
        logger.error?.(`SURFACE REGISTRY: failed to destroy "${surface.id}"`, error);
      }
    }
    this.surfaces.clear();
  }
}

module.exports = SurfaceRegistry;
