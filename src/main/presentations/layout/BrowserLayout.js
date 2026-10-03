const TOP_BAR_HEIGHT = 76;
const OVERLAY_WIDTH = 187;
const OVERLAY_HEIGHT = 40;
const OVERLAY_MARGIN_TOP = 12;

module.exports = Object.freeze({
  calculate({ width, height }) {
    const contentHeight = Math.max(0, height - TOP_BAR_HEIGHT);

    return {
      shell: { x: 0, y: 0, width, height: TOP_BAR_HEIGHT },
      tab: { x: 0, y: TOP_BAR_HEIGHT, width, height: contentHeight },
      overlayHost: {
        x: Math.max(0, Math.round((width - OVERLAY_WIDTH) / 2)),
        y: TOP_BAR_HEIGHT + OVERLAY_MARGIN_TOP,
        width: Math.min(OVERLAY_WIDTH, Math.max(0, width)),
        height: OVERLAY_HEIGHT,
      },
    };
  },
});
