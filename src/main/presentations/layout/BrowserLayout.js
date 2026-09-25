const BrowserLayout = {
  calculate({ width, height }) {
    const topBarHeight = 76;

    const overlayWidth = 220;
    const overlayHeight = 48;
    const overlayMarginTop = 12;

    return {
      shell: {
        x: 0,
        y: 0,
        width,
        height: topBarHeight,
      },

      tab: {
        x: 0,
        y: topBarHeight,
        width,
        height: height - topBarHeight,
      },

      overlayHost: {
        x: Math.round((width - overlayWidth) / 2),
        y: topBarHeight + overlayMarginTop,
        width: overlayWidth,
        height: overlayHeight,
      },
    };
  },
};

module.exports = BrowserLayout;
