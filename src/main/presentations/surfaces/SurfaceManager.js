const AppError = require("../../errors/AppError");
const ErrorCodes = require("../../errors/ErrorCodes");

class SurfaceManager {
  constructor(contentView, zOrder) {
    if (!contentView || typeof contentView.addChildView !== "function") {
      throw new TypeError("SurfaceManager requires a valid contentView.");
    }
    if (!Array.isArray(zOrder) || zOrder.length === 0) {
      throw new TypeError("SurfaceManager requires a non-empty zOrder.");
    }

    this.contentView = contentView;
    this.zOrder = Object.freeze([...zOrder]);
    this.attached = new Map();
  }

  attach(id, view, role = id) {
    this._validateId(id);

    if (!view) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACH_FAILED,
        message: `Surface "${id}" has no view.`,
      });
    }

    if (this.attached.has(id)) return false;

    const rank = this._rank(role);
    const index = this._findInsertIndex(rank);

    try {
      this.contentView.addChildView(view, index);
      this.attached.set(id, { view, role, rank });
      return true;
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_ATTACH_FAILED,
        message: `Failed to attach surface "${id}".`,
        cause,
      });
    }
  }

  detach(id) {
    const entry = this.attached.get(id);
    if (!entry) return false;

    try {
      this.contentView.removeChildView(entry.view);
    } catch (cause) {
      throw new AppError({
        code: ErrorCodes.SURFACE_DETACH_FAILED,
        message: `Failed to detach surface "${id}".`,
        cause,
      });
    } finally {
      this.attached.delete(id);
    }

    return true;
  }

  has(id) {
    return this.attached.has(id);
  }

  get(id) {
    return this.attached.get(id)?.view;
  }

  detachAll() {
    for (const id of [...this.attached.keys()]) this.detach(id);
  }

  _findInsertIndex(rank) {
    let index = 0;
    for (const entry of this.attached.values()) {
      if (entry.rank <= rank) index += 1;
    }
    return index;
  }

  _rank(role) {
    const rank = this.zOrder.indexOf(role);
    if (rank === -1) {
      throw new AppError({
        code: ErrorCodes.SURFACE_INVALID,
        message: `Unknown surface role "${role}".`,
        details: { role, zOrder: this.zOrder },
      });
    }
    return rank;
  }

  _requireAttached(id) {
    const entry = this.attached.get(id);
    if (!entry) {
      throw new AppError({
        code: ErrorCodes.SURFACE_NOT_FOUND,
        message: `Surface "${id}" is not attached.`,
      });
    }
    return entry;
  }

  _validateId(id) {
    if (typeof id !== "string" || !id.trim()) {
      throw new AppError({
        code: ErrorCodes.INVALID_ARGUMENT,
        message: "surface id must be a non-empty string.",
      });
    }
  }
}

module.exports = SurfaceManager;
