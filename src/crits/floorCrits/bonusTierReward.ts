// The hunted mouse's bonus tier reward (src/mouse): multiplies the active
// company's total income by a crit tier's multiplier and plays its
// celebration — a tier-sized screen shake, the coin burst sfx, and a tier-sized pattern
// of coin bursts whose coins freeze mid-air and then fly into the total-income
// readout.
import { addTotalIncome, getTotalIncome } from "../../totalIncome";
import { triggerScreenShake } from "../critFlash";
import { playCoinDrop, playSold } from "../../sound";
import { COLOR } from "../../palette";
import { multiply } from "../../shared/bigNumber";
import { CRIT_TIER_CONFIG, type CritTier } from "../critTypes";
import { pulseHudTotalFlash } from "../../shared/totalIncomeCoins";
import { GLOBAL_SLAM, triggerEventEndSlam } from "../../shared/eventEndSlam";

// the total slams this long after the last coin lands
const SLAM_AFTER_LAST_COIN_MS = 120;

// what a burst's coins call as they start flying and as they land in the total
export interface BurstArrival {
  onFirstFlight: () => void;
  onFirstArrive: () => void;
  onEachArrive: () => void;
}

export function tierColor(tier: CritTier): string {
  if (tier === "ultra") return COLOR.red;
  if (tier === "mega") return COLOR.amber;
  return COLOR.purple;
}

// adds (multiplier - 1)x the current total, same shape payday/gold standard use
export function applyBonusTierIncome(tier: CritTier): void {
  addTotalIncome(
    multiply(getTotalIncome(), CRIT_TIER_CONFIG[tier].multiplier - 1),
  );
}

const CENTER_BURST_OFFSET_PX = 200;
const CENTER_BURST_OFFSET_PY = 100;
const MEGA_BURST_OFFSET_PX = 260;
const MEGA_BURST_OFFSET_PY = 140;
const ULTRA_BURST_OFFSET_PX = 320;
const ULTRA_BURST_OFFSET_PY = 170;

// each tier up gets more bursts spread wider/longer, matching its bigger
// shake/flash; the first is always dead center at 0ms
const TIER_BURSTS: Record<
  CritTier,
  { offsetX: number; offsetY: number; delayMs: number }[]
> = {
  ultra: [
    { offsetX: 0, offsetY: 0, delayMs: 0 },
    { offsetX: 0, offsetY: -ULTRA_BURST_OFFSET_PY, delayMs: 90 },
    {
      offsetX: ULTRA_BURST_OFFSET_PX,
      offsetY: -ULTRA_BURST_OFFSET_PY / 2,
      delayMs: 180,
    },
    {
      offsetX: ULTRA_BURST_OFFSET_PX,
      offsetY: ULTRA_BURST_OFFSET_PY / 2,
      delayMs: 270,
    },
    { offsetX: 0, offsetY: ULTRA_BURST_OFFSET_PY, delayMs: 360 },
    {
      offsetX: -ULTRA_BURST_OFFSET_PX,
      offsetY: ULTRA_BURST_OFFSET_PY / 2,
      delayMs: 450,
    },
    {
      offsetX: -ULTRA_BURST_OFFSET_PX,
      offsetY: -ULTRA_BURST_OFFSET_PY / 2,
      delayMs: 540,
    },
  ],
  mega: [
    { offsetX: 0, offsetY: 0, delayMs: 0 },
    {
      offsetX: -MEGA_BURST_OFFSET_PX,
      offsetY: -MEGA_BURST_OFFSET_PY,
      delayMs: 120,
    },
    {
      offsetX: MEGA_BURST_OFFSET_PX,
      offsetY: -MEGA_BURST_OFFSET_PY,
      delayMs: 240,
    },
    {
      offsetX: -MEGA_BURST_OFFSET_PX,
      offsetY: MEGA_BURST_OFFSET_PY,
      delayMs: 360,
    },
    {
      offsetX: MEGA_BURST_OFFSET_PX,
      offsetY: MEGA_BURST_OFFSET_PY,
      delayMs: 480,
    },
  ],
  crit: [
    { offsetX: 0, offsetY: 0, delayMs: 0 },
    {
      offsetX: -CENTER_BURST_OFFSET_PX,
      offsetY: -CENTER_BURST_OFFSET_PY,
      delayMs: 100,
    },
    {
      offsetX: CENTER_BURST_OFFSET_PX,
      offsetY: CENTER_BURST_OFFSET_PY,
      delayMs: 200,
    },
  ],
};

// calls spawnBurst(offsetX, offsetY) for each of the tier's staggered bursts,
// jittered so repeated crits never erupt in the exact same pattern
export function spawnTierBurstPattern(
  tier: CritTier,
  spawnBurst: (offsetX: number, offsetY: number) => void,
): void {
  for (const { offsetX, offsetY, delayMs } of TIER_BURSTS[tier]) {
    const jitterX = offsetX + (Math.random() - 0.5) * 40;
    const jitterY = offsetY + (Math.random() - 0.5) * 40;
    const jitteredDelayMs = Math.max(0, delayMs + (Math.random() - 0.5) * 40);
    setTimeout(() => spawnBurst(jitterX, jitterY), jitteredDelayMs);
  }
}

// every bonus tier shakes, scaled up per tier (no flash text: the coins
// merging into the total are the whole show)
const BONUS_TIER_SHAKE: Record<
  CritTier,
  { intensity: number; holdMs: number; priority: number }
> = {
  crit: { intensity: 1.4, holdMs: 417, priority: 0 },
  mega: { intensity: 2, holdMs: 750, priority: 1 },
  ultra: { intensity: 2.6, holdMs: 1250, priority: 2 },
};

// spawnBurst spawns one freeze-and-absorb coin burst at the given offset
export function celebrateBonusTier(
  tier: CritTier,
  spawnBurst: (offsetX: number, offsetY: number, arrival: BurstArrival) => void,
): void {
  const { intensity, holdMs, priority } = BONUS_TIER_SHAKE[tier];
  triggerScreenShake({ intensity, label: "", holdMs, priority });
  playCoinDrop();
  let flew = false;
  let arrived = false;
  let slamTimer: ReturnType<typeof setTimeout> | undefined;
  const arrival: BurstArrival = {
    // once per celebration, not per burst: the coin burst sfx as the coins
    // start merging into the total, then the cash register as they land
    onFirstFlight: () => {
      if (flew) return;
      flew = true;
      playCoinDrop();
    },
    onFirstArrive: () => {
      if (arrived) return;
      arrived = true;
      playSold();
    },
    // the coin stream's end slam, once the last coin has landed
    onEachArrive: () => {
      pulseHudTotalFlash();
      clearTimeout(slamTimer);
      slamTimer = setTimeout(
        () => triggerEventEndSlam(GLOBAL_SLAM, "total"),
        SLAM_AFTER_LAST_COIN_MS,
      );
    },
  };
  spawnTierBurstPattern(tier, (offsetX, offsetY) =>
    spawnBurst(offsetX, offsetY, arrival),
  );
}
