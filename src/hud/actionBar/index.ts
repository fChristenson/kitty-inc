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

// wires a scroll button to fire onClick on a normal tap, or onHold once the
// press is held past SCROLL_HOLD_MS \u2014 the browser still sends a trailing
// click when the button is finally released after a hold, so that click is
// swallowed (holdFired) instead of also firing onClick on top of the hold
function wireHoldableScrollButton(
  button: HTMLButtonElement,
  onClick: () => void,
  onHold: () => void,
): void {
  let holdTimeout: ReturnType<typeof setTimeout> | null = null;
  let holdFired = false;
  function clearHold(): void {
    if (holdTimeout !== null) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
  }
  button.addEventListener("pointerdown", () => {
    holdFired = false;
    clearHold();
    holdTimeout = setTimeout(() => {
      holdTimeout = null;
      holdFired = true;
      onHold();
    }, SCROLL_HOLD_MS);
  });
  button.addEventListener("pointerup", clearHold);
  button.addEventListener("pointercancel", clearHold);
  button.addEventListener("click", () => {
    if (holdFired) {
      holdFired = false;
      return;
    }
    onClick();
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
  container
    .querySelector<HTMLButtonElement>("#action-bar-boost-all")!
    .addEventListener("click", handlers.onBoostAll);
  container
    .querySelector<HTMLButtonElement>("#action-bar-hire")!
    .addEventListener("click", handlers.onOpenUpgradeMenu);
  container
    .querySelector<HTMLButtonElement>("#action-bar-map")!
    .addEventListener("click", handlers.onOpenMapMenu);
}
