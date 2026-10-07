// the one set of crit flash presets (text + shake + its sfx), shared by the
// floors' crit celebrations and the city map's building crits
import {
  SPECIAL_FLASH_STROKE_WIDTH,
  triggerScreenShake,
  warmCritFlashes,
} from "../../screenShake";
import {
  getExplosionDurationMs,
  getJackpotDurationMs,
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
} from "../../sound";
import { CRIT_TIER_CONFIG, CRIT_TIER_ORDER, type CritTier } from "../critTypes";
import { tierColor } from "../bonusTierReward";

// each tier's flash text outline width, at the flash's FLASH_FONT_SIZE
export const TIER_FLASH_STROKE_WIDTH: Record<CritTier, number> = {
  crit: 8,
  mega: 14,
  ultra: 16,
};

export const TIER_SHAKE_INTENSITY: Record<CritTier, number> = {
  crit: 1,
  mega: 1.8,
  ultra: 2.6,
};

// the plain x5/x25/x125 flashes, built at idle before the first crit lands
export function warmTierFlashes(): void {
  warmCritFlashes(
    CRIT_TIER_ORDER.map((tier) => ({
      label: CRIT_TIER_CONFIG[tier].label,
      color: tierColor(tier),
      strokeWidth: TIER_FLASH_STROKE_WIDTH[tier],
    })),
  );
}

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
      intensity: TIER_SHAKE_INTENSITY.ultra,
      label,
      color,
      strokeWidth: TIER_FLASH_STROKE_WIDTH.ultra,
      blinkHz: 6,
      holdMs: 1250,
      priority: 2,
    });
    playPayout();
  } else if (tier === "mega") {
    // priority 1: can interrupt a plain crit, never an ultra
    triggerScreenShake({
      intensity: TIER_SHAKE_INTENSITY.mega,
      label,
      color,
      strokeWidth: TIER_FLASH_STROKE_WIDTH.mega,
      priority: 1,
      minDurationMs: getJackpotDurationMs(),
    });
    playJackpot();
  } else {
    // priority 0: the only tier a still-playing bigger flash suppresses
    triggerScreenShake({
      intensity: TIER_SHAKE_INTENSITY.crit,
      label,
      color,
      strokeWidth: TIER_FLASH_STROKE_WIDTH.crit,
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
    strokeWidth: SPECIAL_FLASH_STROKE_WIDTH,
    priority: 1,
    holdMs: 600,
  });
  playSound();
}
