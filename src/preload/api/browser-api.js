const { CHANNELS, EVENTS } = require("../channels");
const { invoke, subscribe } = require("../ipc");

// Validator
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Browser API
function browserAPI() {
  return Object.freeze({
    navigate(url) {
      if (!isNonEmptyString(url)) {
        return Promise.reject(
          new TypeError("navigate() requires a non-empty url string."),
        );
      }
      return invoke(CHANNELS.NAVIGATE, url);
    },

    goBack() {
      return invoke(CHANNELS.BACK);
    },

    goForward() {
      return invoke(CHANNELS.FORWARD);
    },

    reload() {
      return invoke(CHANNELS.RELOAD);
    },

    createTab(url) {
      if (url !== undefined && !isNonEmptyString(url)) {
        return Promise.reject(
          new TypeError(
            "createTab() url must be a non-empty string when provided.",
          ),
        );
      }
      return invoke(CHANNELS.CREATE_TAB, url);
    },

    closeTab(tabId) {
      if (!isNonEmptyString(tabId)) {
        return Promise.reject(
          new TypeError("closeTab() requires a non-empty tabId string."),
        );
      }
      return invoke(CHANNELS.CLOSE_TAB, tabId);
    },

    activateTab(tabId) {
      if (!isNonEmptyString(tabId)) {
        return Promise.reject(
          new TypeError("activateTab() requires a non-empty tabId string."),
        );
      }
      return invoke(CHANNELS.ACTIVATE_TAB, tabId);
    },

    getTabs() {
      return invoke(CHANNELS.GET_TABS);
    },

    onTabCreated(callback) {
      return subscribe(EVENTS.TAB_CREATED, callback);
    },

    onTabClosed(callback) {
      return subscribe(EVENTS.TAB_CLOSED, callback);
    },

    onTabActivated(callback) {
      return subscribe(EVENTS.TAB_ACTIVATED, callback);
    },

    onTabStateChanged(callback) {
      return subscribe(EVENTS.TAB_STATE_CHANGED, callback);
    },

    onTabLoadError(callback) {
      return subscribe(EVENTS.TAB_LOAD_ERROR, callback);
    },
  });
}

module.exports = browserAPI;
