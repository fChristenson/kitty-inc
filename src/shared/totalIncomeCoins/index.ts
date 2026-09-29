// the total-income readout's "coins merged in" flash: coins landing in the
// total (sale clicks, bonus-tier bursts) flash it white + wiggle it. Read by
// shared/totalIncomeReadout.
import { createAbsorbPulse, mergeFlashWhite } from "../mergeFlash";
import { hitTargetStream } from "../eventFx";
import { GLOBAL_SLAM } from "../eventEndSlam";

// --- total-income "merged in" flash, read by shared/totalIncomeReadout ---

let hudFlashStartedAt: number | null = null;
// sold.mp3 is ~3.19s total and playSold() skips its first 0.5s lead-in (see
// sound/index.ts), so this must last at least that ~2.69s remainder — otherwise
// the wiggle/flash visibly ends while the cash register sound is still playing.
// Cut 0.2s short of that per explicit request, so the wiggle settles a beat
// before the sound's own very last, already-quiet tail
const HUD_FLASH_DURATION_MS = 2300;

// call once the flying coins above have fully arrived
export function triggerHudTotalFlash(): void {
  hudFlashStartedAt = Date.now();
}

let hudPulseAt: number | null = null;
const HUD_PULSE_FADE_MS = 700;
const hudAbsorb = createAbsorbPulse();

// call per coin landing in the total (e.g. sale clicks) — keeps the flash
// alive while coins stream in, fading shortly after the last one
export function pulseHudTotalFlash(): void {
  hudPulseAt = Date.now();
  hudAbsorb.hit(hudPulseAt);
  hitTargetStream(GLOBAL_SLAM, "total");
}

// the readout's size bump as coins are absorbed into it
export function getHudTotalAbsorbScale(now: number): number {
  return hudAbsorb.scale(now);
}

// 1 (just triggered) fading linearly down to 0 (back to normal) — the
// readout scales its wiggle by this
export function getHudTotalFlashStrength(now: number): number {
  let strength = 0;
  if (hudFlashStartedAt !== null) {
    const elapsed = now - hudFlashStartedAt;
    if (elapsed >= HUD_FLASH_DURATION_MS) hudFlashStartedAt = null;
    else strength = 1 - elapsed / HUD_FLASH_DURATION_MS;
  }
  if (hudPulseAt !== null) {
    const elapsed = now - hudPulseAt;
    if (elapsed >= HUD_PULSE_FADE_MS) hudPulseAt = null;
    else strength = Math.max(strength, 1 - elapsed / HUD_PULSE_FADE_MS);
  }
  return strength;
}

// how far the readout's text blends toward white right now
export function getHudTotalWhiteMix(now: number): number {
  return mergeFlashWhite(getHudTotalFlashStrength(now), now);
}
