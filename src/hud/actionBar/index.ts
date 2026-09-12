// the fixed action bar overlaying the bottom of the viewport, independent of any
// floor/scroll position — its own DOM controls, styled via .action-bar in style.css

export function createActionBarMarkup(): string {
  return `
    <div class="action-bar" id="action-bar">
      <div class="action-bar__panel">
        <button
          class="action-bar__button"
          id="action-bar-scroll-top"
          aria-label="Scroll to the top floor"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
        <button
          class="action-bar__button"
          id="action-bar-scroll-bottom"
          aria-label="Scroll to the ground floor"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12l7 7 7-7" />
          </svg>
        </button>
        <button
          class="action-bar__button action-bar__button--boost"
          id="action-bar-boost-all"
          aria-label="Boost every worker"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
            <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
          </svg>
        </button>
        <button
          class="action-bar__button action-bar__button--hire"
          id="action-bar-hire"
          aria-label="Open upgrades"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          class="action-bar__button action-bar__button--map"
          id="action-bar-map"
          aria-label="Open map"
        >
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" />
            <path d="M9 3v15" />
            <path d="M15 6v15" />
          </svg>
        </button>
      </div>
    </div>
  `;
}

export interface ActionBarHandlers {
  onScrollTop: () => void;
  onScrollBottom: () => void;
  // held (not tapped) scroll-top/bottom \u2014 while the map is open this jumps
  // straight to the top/bottommost company instead of rolling one at a time;
  // a no-op while the map is closed (a tap already scrolls floors instantly)
  onHoldScrollTop: () => void;
  onHoldScrollBottom: () => void;
  onBoostAll: () => void;
  onOpenUpgradeMenu: () => void;
  onOpenMapMenu: () => void;
}

// long enough that a normal tap never triggers the hold action, short enough
// that deliberately holding the button still feels immediate
const SCROLL_HOLD_MS = 400;

// fires onTap on whichever comes first, pointerup or the browser's own
// synthesized "click" \u2014 mobile browsers can silently swallow the click that
// would normally follow a tap right after a drag/swipe elsewhere on the page
// (confirmed via an on-screen debug log: pointerdown/pointerup always fired,
// "click" sometimes just never did), so pointerup alone can't be trusted;
// but relying on preventDefault to fully suppress the OTHER one turned out
// not to be reliable either. Listening for both and just ignoring whichever
// one shows up second (reset on the next pointerdown) is simpler and covers
// both failure modes at once, regardless of which one a given browser/
// gesture actually fires
function wireTapButton(button: HTMLButtonElement, onTap: () => void): void {
  let fired = false;
  function fireOnce(): void {
    if (fired) return;
    fired = true;
    onTap();
  }
  button.addEventListener("pointerdown", () => {
    fired = false;
  });
  button.addEventListener("pointerup", fireOnce);
  button.addEventListener("click", fireOnce);
  // an aborted gesture shouldn't fire at all \u2014 marking it "already fired"
  // blocks a click that might still trail a cancelled pointer
  button.addEventListener("pointercancel", () => {
    fired = true;
  });
}

// wires a scroll button to fire onClick on a normal tap, or onHold once the
// press is held past SCROLL_HOLD_MS \u2014 the tap side reuses wireTapButton's
// own "whichever of pointerup/click comes first" dedupe, gated by whether
// the hold already fired
function wireHoldableScrollButton(
  button: HTMLButtonElement,
  onClick: () => void,
  onHold: () => void,
): void {
  let holdTimeout: ReturnType<typeof setTimeout> | null = null;
  let holdFired = false;
  let tapFired = false;
  function clearHold(): void {
    if (holdTimeout !== null) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
  }
  function fireTapOnce(): void {
    if (tapFired || holdFired) return;
    tapFired = true;
    onClick();
  }
  button.addEventListener("pointerdown", () => {
    holdFired = false;
    tapFired = false;
    clearHold();
    holdTimeout = setTimeout(() => {
      holdTimeout = null;
      holdFired = true;
      onHold();
    }, SCROLL_HOLD_MS);
  });
  button.addEventListener("pointerup", () => {
    clearHold();
    fireTapOnce();
  });
  button.addEventListener("click", fireTapOnce);
  button.addEventListener("pointercancel", () => {
    clearHold();
    tapFired = true;
  });
}

export function wireActionBar(
  container: HTMLElement,
  handlers: ActionBarHandlers,
): void {
  wireHoldableScrollButton(
    container.querySelector<HTMLButtonElement>("#action-bar-scroll-top")!,
    handlers.onScrollTop,
    handlers.onHoldScrollTop,
  );
  wireHoldableScrollButton(
    container.querySelector<HTMLButtonElement>("#action-bar-scroll-bottom")!,
    handlers.onScrollBottom,
    handlers.onHoldScrollBottom,
  );
  wireTapButton(
    container.querySelector<HTMLButtonElement>("#action-bar-boost-all")!,
    handlers.onBoostAll,
  );
  wireTapButton(
    container.querySelector<HTMLButtonElement>("#action-bar-hire")!,
    handlers.onOpenUpgradeMenu,
  );
  wireTapButton(
    container.querySelector<HTMLButtonElement>("#action-bar-map")!,
    handlers.onOpenMapMenu,
  );
}
