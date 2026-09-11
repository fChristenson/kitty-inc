import {
  hasActiveCoins,
  getActiveCoinsCount,
  getActiveFloatingCoinsCount,
  getActiveIncomeFloatTextCount,
  getSpecialCelebrationQueueLength,
} from "../../floors";
import { getActiveCoinBurstsCount } from "../../coinBurst";
import { getActiveFloatingTextsCount } from "../../shared/floatingText";
import { createPollingLoop } from "../../shared/pollingLoop";

// live particle-pool counts + FPS, so a reported "lag"/"leak" can be
// confirmed (or ruled out) directly from the numbers on screen instead of
// guessing. Always included/wired regardless of build mode (unlike the rest
// of hud/testButton) and defaults to visible in production too — a query
// param can't be relied on to enable it since an installed PWA launches from
// a fixed manifest start_url, not whatever URL the player happens to type.
// Every number here reads an already-exported count/length getter; this
// module owns no particle state of its own.
export function createPerfOverlayMarkup(): string {
  return `<div class="perf-overlay" id="perf-overlay" hidden></div>`;
}

export interface PerfOverlay {
  toggle(): void;
  setVisible(visible: boolean): void;
}

export function wirePerfOverlay(container: HTMLElement): PerfOverlay {
  const el = container.querySelector<HTMLDivElement>("#perf-overlay")!;

  let frameCount = 0;
  let fps = 0;
  let lastFpsSampleAt = 0;
  let fpsRafId: number | null = null;

  function fpsTick(now: number): void {
    frameCount++;
    if (now - lastFpsSampleAt >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsSampleAt));
      frameCount = 0;
      lastFpsSampleAt = now;
    }
    fpsRafId = requestAnimationFrame(fpsTick);
  }

  function render(): void {
    el.textContent =
      `FPS: ${fps}\n` +
      `coin bursts (floor): ${getActiveCoinsCount()}\n` +
      `coin bursts (flat/map): ${getActiveCoinBurstsCount()}\n` +
      `floating coins: ${getActiveFloatingCoinsCount()}\n` +
      `income float text: ${getActiveIncomeFloatTextCount()}\n` +
      `minigame float text: ${getActiveFloatingTextsCount()}\n` +
      `special celebration queue: ${getSpecialCelebrationQueueLength()}\n` +
      `(any active coin burst): ${hasActiveCoins()}`;
  }

  const polling = createPollingLoop(render, 500);

  function setVisible(visible: boolean): void {
    el.hidden = !visible;
    if (!visible) {
      polling.stop();
      if (fpsRafId !== null) {
        cancelAnimationFrame(fpsRafId);
        fpsRafId = null;
      }
    } else {
      render();
      polling.start();
      lastFpsSampleAt = performance.now();
      frameCount = 0;
      if (fpsRafId === null) fpsRafId = requestAnimationFrame(fpsTick);
    }
  }

  function toggle(): void {
    setVisible(el.hidden !== false);
  }

  return { toggle, setVisible };
}
