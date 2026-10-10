import { formatTotalIncomeParts } from "../../utils";
import type { BigNumber } from "../../shared/bigNumber";
import { onTapOrClick } from "../../shared/tapEvents";
import { whenFramesSmooth } from "../../shared/smoothFrames";

// one-shot "You have earned..." splash — a pure celebratory reveal of the idle
// income collected while the tab was closed/away. main.ts only calls show()
// when that idle income is > 0 (nothing to celebrate on a quick reload with no
// away time), dismissed by tapping anywhere on it.

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
    // revealed only once the browser can animate smoothly: shown right at
    // startup, the spin-in otherwise stutters through the first heavy frames
    return new Promise<void>((resolve) => {
      let fallback = 0;
      const onEnd = (event: AnimationEvent): void => {
        if (event.target === contentEl) settleIntro?.();
      };
      settleIntro = () => {
        settleIntro = null;
        window.clearTimeout(fallback);
        contentEl.removeEventListener("animationend", onEnd);
        resolve();
      };
      void whenFramesSmooth().then(() => {
        overlay.hidden = false;
        // for when animationend never fires (reduced motion)
        fallback = window.setTimeout(() => settleIntro?.(), 1500);
        contentEl.addEventListener("animationend", onEnd);
      });
    });
  }

  return { show };
}
