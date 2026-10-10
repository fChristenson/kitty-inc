// the fixed action bar overlaying the bottom of the viewport, independent of any
// floor/scroll position — its own DOM controls, styled via .action-bar in style.css
import { onTapOrClick, onTapOrHold } from "../../shared/tapEvents";

export interface ActionBarHandlers {
  onScrollTop: () => void;
  onScrollBottom: () => void;
  // held (not tapped) scroll-top/bottom — while the map is open this jumps
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

// wires a plain tap button using the shared onTapOrClick dedupe (see
// shared/tapEvents) instead of a raw "click" listener
function wireTapButton(button: HTMLButtonElement, onTap: () => void): void {
  onTapOrClick(button, onTap);
}

export function wireActionBar(
  container: HTMLElement,
  handlers: ActionBarHandlers,
): void {
  onTapOrHold(
    container.querySelector<HTMLButtonElement>("#action-bar-scroll-top")!,
    handlers.onScrollTop,
    handlers.onHoldScrollTop,
    SCROLL_HOLD_MS,
  );
  onTapOrHold(
    container.querySelector<HTMLButtonElement>("#action-bar-scroll-bottom")!,
    handlers.onScrollBottom,
    handlers.onHoldScrollBottom,
    SCROLL_HOLD_MS,
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
