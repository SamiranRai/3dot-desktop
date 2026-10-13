const { CHANNELS, EVENTS } = require("../channels");
const { invoke, subscribe } = require("../ipc");

// PRESENTATION MODES
const MODES = Object.freeze({
  BROWSER: "browser",
  AGENT: "agent",
});

// Presentation API
function presentationAPI() {
  return Object.freeze({
    setMode(mode) {
      // If the mode is not "browser" or "agent", reject with a TypeError
      if (mode !== MODES.BROWSER && mode !== MODES.AGENT) {
        return Promise.reject(
          new TypeError('setMode() requires "browser" or "agent".'),
        );
      }
      // On Success, invoke the SET_MODE channel with the provided mode
      return invoke(CHANNELS.SET_MODE, mode);
    },

    getMode() {
      return invoke(CHANNELS.GET_MODE);
    },

    // Event subscription for mode changes
    onModeChanged(callback) {
      return subscribe(EVENTS.MODE_CHANGED, callback);
    },
  });
}

module.exports = presentationAPI;
