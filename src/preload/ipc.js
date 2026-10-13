const { ipcRenderer } = require("electron");

// INVOKE: renderer process -> main process
// RETURNS: Promise
function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

// SUBSCRIBE: main process -> renderer process
// RETURNS: unsubscribe function
function subscribe(channel, callback) {
  // Check that the callback is a function
  if (typeof callback !== "function") {
    throw new TypeError(`browser.${channel} requires a callback.`);
  }

  // Define a listener function that wraps the callback and handles errors
  const listener = (_event, payload) => {
    try {
      callback(payload);
    } catch (error) {
      console.error(`[preload] listener failed for ${channel}`, error);
    }
  };

  // Register the listener for the specified channel
  ipcRenderer.on(channel, listener);

  // Return an unsubscribe function to remove the listener when no longer needed
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

module.exports = { invoke, subscribe };
