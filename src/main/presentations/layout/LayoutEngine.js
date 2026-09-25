class LayoutEngine {
  constructor() {
    this.width = 0;
    this.height = 0;
  }

  setWindowSize(width, height) {
    this.width = width;
    this.height = height;
  }

  calculate(layoutDefinition) {
    return layoutDefinition.calculate({
      width: this.width,
      height: this.height,
    });
  }
}

module.exports = LayoutEngine;
