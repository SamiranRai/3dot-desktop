class LayoutEngine {
  calculate(definition, width, height) {
    if (!definition || typeof definition.calculate !== "function") {
      throw new TypeError("LayoutEngine requires a layout definition.");
    }
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new TypeError("LayoutEngine requires finite width and height.");
    }
    return definition.calculate({ width, height });
  }
}

module.exports = LayoutEngine;
