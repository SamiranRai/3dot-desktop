const CHANNELS = Object.freeze({
  // BROWSER-METHODS
  NAVIGATE: "browser:navigate",
  BACK: "browser:navigation:back",
  FORWARD: "browser:navigation:forward",
  RELOAD: "browser:navigation:reload",
  CREATE_TAB: "browser:tab:create",
  CLOSE_TAB: "browser:tab:close",
  ACTIVATE_TAB: "browser:tab:activate",
  GET_TABS: "browser:tabs:get",

  // PRESENTATION-METHODS
  SET_MODE: "presentation:mode:set",
  GET_MODE: "presentation:mode:get",
});

const EVENTS = Object.freeze({
  // BROWSER-EVENTS
  TAB_CREATED: "browser:tab-created",
  TAB_CLOSED: "browser:tab-closed",
  TAB_ACTIVATED: "browser:tab-activated",
  TAB_STATE_CHANGED: "browser:tab-state-changed",
  TAB_LOAD_ERROR: "browser:tab-load-error",

  // PRESENTATION-EVENTS
  MODE_CHANGED: "presentation:mode-changed",
});

module.exports = { CHANNELS, EVENTS };
