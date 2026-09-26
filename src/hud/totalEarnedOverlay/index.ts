import { formatTotalIncomeParts } from "../../utils";
import type { BigNumber } from "../../shared/bigNumber";
import { onTapOrClick } from "../../shared/tapEvents";

// one-shot "You have earned..." splash — a pure celebratory reveal of the idle
// income collected while the tab was closed/away. main.ts only calls show()
// when that idle income is > 0 (nothing to celebrate on a quick reload with no
// away time), dismissed by tapping anywhere on it.

export function createTotalEarnedOverlayMarkup(): string {
  return `
    <div class="earned-overlay" id="earned-overlay" hidden>
      <div class="earned-overlay__backdrop"></div>
      <div class="earned-overlay__content">
        <p class="earned-overlay__label">You have earned</p>
        <span class="worker-menu__total-income earned-overlay__amount"></span>
        <span class="worker-menu__total-income earned-overlay__unit-name"></span>
      </div>
    </div>
  `;
}

export interface TotalEarnedOverlay {
  // resolves once the spin-in animation has finished (or the overlay was dismissed)
  show(totalIncome: BigNumber): Promise<void>;
}

export function wireTotalEarnedOverlay(
  container: HTMLElement,
): TotalEarnedOverlay {
  const overlay = container.querySelector<HTMLDivElement>("#earned-overlay")!;
  const amountEl = overlay.querySelector<HTMLSpanElement>(
    ".earned-overlay__amount",
  )!;
  const unitNameEl = overlay.querySelector<HTMLSpanElement>(
    ".earned-overlay__unit-name",
  )!;
  const contentEl = overlay.querySelector<HTMLDivElement>(
    ".earned-overlay__content",
  )!;
  let settleIntro: (() => void) | null = null;

  onTapOrClick(overlay, () => {
    overlay.hidden = true;
    settleIntro?.();
  });

  function show(totalIncome: BigNumber): Promise<void> {
    // same split-onto-two-lines shape as the HUD/map's own total-income readout
    // (see shared/totalIncomeReadout) instead of one glued-together string
    const { amount, unitName } = formatTotalIncomeParts(totalIncome);
    amountEl.textContent = amount;
    unitNameEl.textContent = unitName;
    unitNameEl.hidden = !unitName;
    // main.ts calls show() with plenty of its own synchronous work still left
    // to run right after (gameCanvas.redraw(), starting tickers) — un-hiding
    // synchronously here let that work eat into the CSS spin-in animation's own
    // clock before the browser ever got to paint a frame, so by the time
    // anything actually rendered the animation had already finished, and the
    // overlay just silently popped in at rest. A 0ms setTimeout defers the
    // actual reveal until after that synchronous work has fully returned
    // control to the event loop (setTimeout over requestAnimationFrame since
    // rAF can be paused/throttled in backgrounded tabs — see
    // playwright-raf-throttling notes — this must still fire either way)
    setTimeout(() => {
      overlay.hidden = false;
    }, 0);
    return new Promise<void>((resolve) => {
      // fallback for when animationend never fires (backgrounded tab, reduced motion)
      const fallback = window.setTimeout(() => settleIntro?.(), 1500);
      const onEnd = (event: AnimationEvent): void => {
        if (event.target === contentEl) settleIntro?.();
      };
      settleIntro = () => {
        settleIntro = null;
        window.clearTimeout(fallback);
        contentEl.removeEventListener("animationend", onEnd);
        resolve();
      };
      contentEl.addEventListener("animationend", onEnd);
    });
  }

  return { show };
}
