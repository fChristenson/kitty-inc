// Any dialog opened by a tap directly on the canvas (not a normal DOM button)
// can have its own newly-shown backdrop catch a mobile browser's synthesized
// trailing "click" for that same touch, shortly after — instantly closing
// what was just opened. This exact `IGNORE_BACKDROP_CLICK_MS`/`openedAt` guard
// was independently hand-copied into floorUpgradeMenu and corporationStats
// (both opened via a canvas tap); any NEW canvas-tap-opened dialog must use
// this instead of re-declaring its own copy.

export interface GhostClickGuard {
  // call from open(), right as the dialog becomes visible
  markOpened(): void;
  // call from the backdrop's own click handler before treating it as a real
  // "close the dialog" click
  shouldIgnore(): boolean;
}

export function createGhostClickGuard(delayMs = 300): GhostClickGuard {
  let openedAt = 0;
  return {
    markOpened() {
      openedAt = Date.now();
    },
    shouldIgnore() {
      return Date.now() - openedAt < delayMs;
    },
  };
}
