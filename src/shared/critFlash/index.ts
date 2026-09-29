// the one set of crit flash presets (text + shake + its sfx), shared by the
// floors' crit celebrations and the city map's building crits
import { triggerScreenShake } from "../../screenShake";
import {
  getExplosionDurationMs,
  getJackpotDurationMs,
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
} from "../../sound";
import type { CritTier } from "../critTypes";

// a landed tier's flash, tier-scaled; label/color let a piggyback proc show
// its own text in place of the tier's "x5"/"x25"/"x125"
export function playTierFlash(
  tier: CritTier,
  label: string,
  color: string,
): void {
  if (tier === "ultra") {
    // holdMs is an exact odd multiple of the blink's half-cycle (15 * 83.33ms
    // at 6Hz), so the strobe lands "on" as the fade begins; the whole flash
    // (~1.93s) matches playPayout's own capped length. Priority 2 can never
    // be cut off by a smaller crit landing right after
    triggerScreenShake({
      intensity: 2.6,
      label,
      color,
      strokeWidth: 16,
      blinkHz: 6,
      holdMs: 1250,
      priority: 2,
    });
    playPayout();
  } else if (tier === "mega") {
    // priority 1: can interrupt a plain crit, never an ultra
    triggerScreenShake({
      intensity: 1.8,
      label,
      color,
      strokeWidth: 14,
      priority: 1,
      minDurationMs: getJackpotDurationMs(),
    });
    playJackpot();
  } else {
    // priority 0: the only tier a still-playing bigger flash suppresses
    triggerScreenShake({
      label,
      color,
      minDurationMs: getExplosionDurationMs(),
    });
    playCoinDrop();
    playExplosion();
  }
}

// a flat, non-tier-scaled special crit flash; it holds a beat longer so its
// icon and text stay up once fully shown
export function playSpecialFlash(
  label: string,
  color: string,
  playSound: () => void = playExplosion,
): void {
  triggerScreenShake({
    intensity: 1.8,
    label,
    color,
    strokeWidth: 14,
    priority: 1,
    holdMs: 600,
  });
  playSound();
}
