const { ipcMain } = require("electron");
const BrowserManager = require("../../domains/browser/runtime/BrowserManager");
const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");
const ErrorHandler = require("../../errors/ErrorHandler");

const CHANNELS = Object.freeze({
  NAVIGATE: "browser:navigate",
  BACK: "browser:navigation:back",
  FORWARD: "browser:navigation:forward",
  RELOAD: "browser:navigation:reload",
  CREATE_TAB: "browser:tab:create",
  CLOSE_TAB: "browser:tab:close",
  ACTIVATE_TAB: "browser:tab:activate",
  GET_TABS: "browser:tabs:get",
});

const EVENT_TYPES = Object.freeze([
  BrowserManager.EVENTS.TAB_CREATED,
  BrowserManager.EVENTS.TAB_CLOSED,
  BrowserManager.EVENTS.TAB_ACTIVATED,
  BrowserManager.EVENTS.TAB_STATE_CHANGED,
  BrowserManager.EVENTS.TAB_LOAD_ERROR,
]);

class BrowserIPCAdapter {
  constructor({ capabilities, window, surfaceManager, eventBus, logger = console }) {
    if (!capabilities || !window || !surfaceManager || !eventBus) {
      throw new TypeError("BrowserIPCAdapter is missing required dependencies.");
    }

    this.capabilities = capabilities;
    this.window = window;
    this.surfaceManager = surfaceManager;
    this.eventBus = eventBus;
    this.logger = logger;
    this.registered = false;
    this.unsubscribers = [];

    this.handlers = {
      [CHANNELS.NAVIGATE]: (_event, url) => this.capabilities.navigation.navigate(url),
      [CHANNELS.BACK]: () => this.capabilities.navigation.goBack(),
      [CHANNELS.FORWARD]: () => this.capabilities.navigation.goForward(),
      [CHANNELS.RELOAD]: () => this.capabilities.navigation.reload(),
      [CHANNELS.CREATE_TAB]: (_event, url) => this.capabilities.tabs.createTab(url),
      [CHANNELS.CLOSE_TAB]: (_event, tabId) => this.capabilities.tabs.closeTab(tabId),
      [CHANNELS.ACTIVATE_TAB]: (_event, tabId) => this.capabilities.tabs.activateTab(tabId),
      [CHANNELS.GET_TABS]: () => this.capabilities.tabs.getAllTabs(),
    };
  }

  register() {
    if (this.registered) return;

    try {
      for (const [channel, operation] of Object.entries(this.handlers)) {
        ipcMain.handle(channel, async (event, ...args) => {
          try {
            this.assertTrustedSender(event.sender);
            const data = await operation(event, ...args);
            return { ok: true, data };
          } catch (error) {
            const normalized = ErrorHandler.normalizeError(error, {
              code: ErrorCodes.IPC_HANDLER_FAILED,
              message: "IPC operation failed.",
            });

            this.logger.error?.(`IPC: ${channel} failed`, normalized);
            return ErrorHandler.toResponse(normalized);
          }
        });
      }

      for (const eventType of EVENT_TYPES) {
        this.unsubscribers.push(
          this.eventBus.subscribe(eventType, (payload) => {
            this.broadcast(eventType, payload);
          }),
        );
      }

      this.registered = true;
    } catch (error) {
      this.unregister();
      throw error;
    }
  }

  unregister() {
    if (!this.registered && this.unsubscribers.length === 0) return;

    for (const channel of Object.keys(this.handlers)) {
      try {
        ipcMain.removeHandler(channel);
      } catch (error) {
        this.logger.error?.(`IPC: failed to remove handler "${channel}"`, error);
      }
    }

    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
    this.registered = false;
  }

  assertTrustedSender(sender) {
    if (this.window.isDestroyed()) {
      throw new AppError({
        code: ErrorCodes.IPC_NOT_READY,
        message: "Browser window is destroyed.",
      });
    }

    const trustedIds = new Set();

    for (const surfaceId of ["react-shell", "overlay-host"]) {
      const view = this.surfaceManager.get(surfaceId);
      const webContents = view?.webContents;
      if (webContents && !webContents.isDestroyed()) trustedIds.add(webContents.id);
    }

    if (!sender || !trustedIds.has(sender.id)) {
      throw new AppError({
        code: ErrorCodes.IPC_UNAUTHORIZED,
        message: "IPC request came from an untrusted renderer.",
      });
    }
  }

  broadcast(channel, payload) {
    for (const surfaceId of ["react-shell", "overlay-host"]) {
      const view = this.surfaceManager.get(surfaceId);
      const webContents = view?.webContents;

      if (!webContents || webContents.isDestroyed()) continue;

      try {
        webContents.send(channel, payload);
      } catch (error) {
        this.logger.error?.(`IPC: failed to send "${channel}" to ${surfaceId}`, error);
      }
    }
  }
}

BrowserIPCAdapter.CHANNELS = CHANNELS;
BrowserIPCAdapter.EVENT_TYPES = EVENT_TYPES;

module.exports = BrowserIPCAdapter;
