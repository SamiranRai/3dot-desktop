// SurfaceManager: the ONLY code allowed to call contentView.addChildView / removeChildView.
// Every other manager (TabManager, ReactSurface, OverlayHost, Tab) must call
// surfaceManager.attach()/detach()/reposition()/swap() instead of touching contentView directly.
//
// v2: added a `role` concept separate from `surfaceId`. This is needed because multiple
// Tab instances (each with a unique id/uuid) all need to share ONE rank ("tab") in Z_ORDER,
// while still being tracked individually so inactive tabs can stay attached (hidden, not
// destroyed) without colliding with each other in the registry.

class SurfaceManager {
  /**
   * @param {Electron.View} contentView - window.contentView
   * @param {string[]} zOrder - fixed list, bottom -> top, e.g.
   *   ['react-shell', 'tab', 'overlay-host', 'agent-view', 'sidebar']
   */
  constructor(contentView, zOrder) {
    this.contentView = contentView;
    this.zOrder = zOrder;
    this.attached = new Map(); // surfaceId -> { view, role }
  }

  _rank(role) {
    const r = this.zOrder.indexOf(role);
    if (r === -1)
      throw new Error(
        `SurfaceManager: unknown role "${role}" — add it to Z_ORDER`,
      );
    return r;
  }

  /**
   * Attach a surface's view under `surfaceId`, ranked by `role` (defaults to surfaceId
   * for single-instance surfaces like 'react-shell'/'overlay-host'). Safe to call in
   * ANY order — result is always the same final stack. Idempotent per surfaceId.
   *
   * @param {string} surfaceId - unique identity (e.g. a tab's uuid, or 'react-shell')
   * @param {Electron.WebContentsView} view
   * @param {string} [role] - rank lookup key in Z_ORDER (e.g. 'tab'). Defaults to surfaceId.
   */
  attach(surfaceId, view, role = surfaceId) {
    if (this.attached.has(surfaceId)) return; // already mounted — never re-add to reorder

    const myRank = this._rank(role);

    // Insertion index = how many currently-attached surfaces sit below me in rank.
    let insertIndex = 0;
    for (const [, entry] of this.attached) {
      if (this._rank(entry.role) < myRank) insertIndex++;
    }

    this.contentView.addChildView(view, insertIndex);
    this.attached.set(surfaceId, { view, role });
  }

  /**
   * Remove a surface entirely (e.g. tab closed). Only path allowed to removeChildView.
   */
  detach(surfaceId) {
    const entry = this.attached.get(surfaceId);
    if (!entry) return;
    this.contentView.removeChildView(entry.view);
    this.attached.delete(surfaceId);
  }

  /**
   * Move/resize an already-attached surface. NEVER calls addChildView —
   * this is what stops "margin/pos" logic from accidentally re-stacking things.
   */
  reposition(surfaceId, bounds) {
    const entry = this.attached.get(surfaceId);
    if (!entry) return;
    entry.view.setBounds(bounds);
  }

  /**
   * Swap out the view under an existing surfaceId slot (e.g. replacing a single-instance
   * surface's view). NOT what you use for tab switching — tabs each get their own
   * surfaceId (their uuid) and stay attached; use show()/hide() on the Tab for switching.
   */
  swap(surfaceId, newView, role = surfaceId) {
    this.detach(surfaceId);
    this.attach(surfaceId, newView, role);
  }
}

module.exports = SurfaceManager;
