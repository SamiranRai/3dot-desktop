const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class EventBus {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.listeners = new Map();
    this.destroyed = false;
  }

  subscribe(type, listener) {
    this._assertUsable();

    if (typeof type !== "string" || !type.trim()) {
      throw new TypeError("EventBus.subscribe() requires a non-empty type.");
    }

    if (typeof listener !== "function") {
      throw new TypeError("EventBus.subscribe() requires a function listener.");
    }

    let listeners = this.listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }

    listeners.add(listener);

    return () => {
      const current = this.listeners.get(type);
      if (!current) return;

      current.delete(listener);
      if (current.size === 0) this.listeners.delete(type);
    };
  }

  publish(type, payload = null) {
    if (this.destroyed) return;

    const listeners = this.listeners.get(type);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      try {
        listener(payload);
      } catch (error) {
        this.logger.error?.(`EVENT BUS: listener failed for "${type}"`, error);
      }
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.listeners.clear();
  }

  _assertUsable() {
    if (this.destroyed) {
      throw new AppError({
        code: ErrorCodes.IPC_NOT_READY,
        message: "EventBus has been destroyed.",
      });
    }
  }
}

module.exports = EventBus;
