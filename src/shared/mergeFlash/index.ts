// soft white "coins merging in" flash shared by the total-income readout and
// the overtime tick bar: capped well short of pure white, and pulsing on the
// wall clock so a steady stream of coin hits reads as a beat, not a solid glow
import { LONG_PRESS_TICK_MS } from "../pressAndHold";

const WHITE_PEAK = 0.6;
const PULSE_HZ = 6;
const PULSE_FLOOR = 0.45;

// how much white to mix in (0..WHITE_PEAK) for a flash whose own fade-out
// envelope is currently `envelope` (1 = just hit, 0 = gone)
export function mergeFlashWhite(envelope: number, now: number): number {
  if (envelope <= 0) return 0;
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * PULSE_HZ * now) / 1000);
  return envelope * WHITE_PEAK * (PULSE_FLOOR + (1 - PULSE_FLOOR) * wave);
}

// one reused scratch canvas: the image washed toward white inside its own
// silhouette only ('source-atop' keeps the transparent padding untouched)
let whiteScratch: HTMLCanvasElement | null = null;
export function whitenImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  alpha: number,
): HTMLCanvasElement {
  whiteScratch ??= document.createElement("canvas");
  if (whiteScratch.width !== width) whiteScratch.width = width;
  if (whiteScratch.height !== height) whiteScratch.height = height;
  const ctx = whiteScratch.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return whiteScratch;
}

// "absorb" size bump when coins land in a target: one swell-and-settle per
// beat, where a beat is a few long-press ticks so a held button's stream of
// landings reads as a steady rhythm instead of a 30Hz jitter
const ABSORB_BEAT_MS = LONG_PRESS_TICK_MS * 4;
const ABSORB_SCALE = 0.08;

export interface AbsorbPulse {
  hit(now: number): void;
  scale(now: number): number;
}

export function createAbsorbPulse(): AbsorbPulse {
  let beatAt: number | null = null;
  return {
    hit(now) {
      // landings inside the current beat ride it instead of restarting it
      if (beatAt === null || now - beatAt >= ABSORB_BEAT_MS) beatAt = now;
    },
    scale(now) {
      if (beatAt === null) return 1;
      const t = (now - beatAt) / ABSORB_BEAT_MS;
      if (t >= 1) return 1;
      return 1 + ABSORB_SCALE * Math.sin(Math.PI * t);
    },
  };
}
