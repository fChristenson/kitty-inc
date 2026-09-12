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

// fires onTap on pointerup, NOT the browser's synthesized "click" \u2014 mobile
// browsers can silently swallow the click that would normally follow a tap
// when it lands shortly after a drag/swipe gesture elsewhere on the page
// (confirmed via an on-screen debug log: pointerdown/pointerup always fired,
// "click" sometimes just never did, right after swiping the canvas to
// scroll). pointerup itself is never suppressed this way, so driving the
// action directly from it sidesteps the whole class of bug. preventDefault
// on pointerdown additionally stops the browser from ever synthesizing that
// trailing click at all — without it, the click still arrives ~50-100ms
// later and, once onTap already opened a full-screen dialog on pointerup,
// lands on that dialog's own backdrop (now covering the same screen point)
// and immediately closes it right back — the exact "opens then instantly
// closes" regression seen after switching this off "click" in the first place
function wireTapButton(button: HTMLButtonElement, onTap: () => void): void {
  let armedPointerId: number | null = null;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    armedPointerId = event.pointerId;
  });
  button.addEventListener("pointerup", (event) => {
    if (armedPointerId === event.pointerId) onTap();
    armedPointerId = null;
  });
  button.addEventListener("pointercancel", () => {
    armedPointerId = null;
  });
}

// wires a scroll button to fire onClick on a normal tap, or onHold once the
// press is held past SCROLL_HOLD_MS \u2014 both decided directly off
// pointerdown/pointerup (see wireTapButton's own comment on why: relying on
// the browser's synthesized "click" here had the exact same swallowed-after-
// a-swipe bug)
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
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    holdFired = false;
    clearHold();
    holdTimeout = setTimeout(() => {
      holdTimeout = null;
      holdFired = true;
      onHold();
    }, SCROLL_HOLD_MS);
  });
  button.addEventListener("pointerup", () => {
    clearHold();
    if (!holdFired) onClick();
  });
  button.addEventListener("pointercancel", clearHold);
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
