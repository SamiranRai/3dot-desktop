const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class SurfaceRegistry {
  constructor() {
    // surfaces: Map<SurfaceId, Surface>
    this.surfaces = new Map();
  }

  register(surface) {
    if (this.surfaces.has(surface.id)) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ALREADY_REGISTERED,
        message: `Surface "${surface.id}" already registered`,
      });
    }

    // Register the surface in the registry.
    this.surfaces.set(surface.id, surface);
  }

  // Get a surface by its ID. Returns undefined if not found.
  get(id) {
    return this.surfaces.get(id);
  }

  // Get all registered surfaces as an array.
  getAll() {
    return Array.from(this.surfaces.values());
  }

  // Destroy all registered surfaces.
  destroyAll() {
    for (const surface of this.surfaces.values()) {
      try {
        surface.destroy();
      } catch (error) {
        console.error(
          `[SurfaceRegistry] Failed to destroy "${surface.id}"`,
          error,
        );
      }
    }

    // Clear the registry after destroying all surfaces.
    this.surfaces.clear();
  }
}

module.exports = SurfaceRegistry;
