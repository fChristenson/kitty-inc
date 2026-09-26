// The "special crit crit" bonus tier reward: multiplies the active company's
// total income by a crit tier's multiplier (5x/25x/125x) and plays its
// celebration — strobing tier flash, magicCoin.wav, a tier-sized pattern of
// coin bursts, and coins flying into the total-income readout. Shared by
// piggyback-proc bonus tiers (floors/) and the hunted mouse (src/mouse).
import { addTotalIncome, getTotalIncome } from "../../totalIncome";
import { triggerScreenShake } from "../../screenShake";
import { playBonusTierMagicCoin, playSold } from "../../sound";
import { COLOR } from "../../palette";
import { multiply } from "../bigNumber";
import { CRIT_TIER_CONFIG, type CritTier } from "../critTypes";
import {
  spawnTotalIncomeCoins,
  triggerHudTotalFlash,
  type TotalIncomeCoinOrigin,
} from "../totalIncomeCoins";

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

// every bonus tier strobes, scaled up per tier. Each holdMs is an exact odd
// multiple of the 6Hz blink's half-cycle (~83.33ms) so the strobe lands back
// "on" right as the fade-out begins
const BONUS_TIER_FLASH: Record<
  CritTier,
  { intensity: number; strokeWidth: number; holdMs: number; priority: number }
> = {
  crit: { intensity: 1.4, strokeWidth: 10, holdMs: 417, priority: 0 },
  mega: { intensity: 2, strokeWidth: 14, holdMs: 750, priority: 1 },
  ultra: { intensity: 2.6, strokeWidth: 16, holdMs: 1250, priority: 2 },
};

// coinOrigin: where the flying coins start (omitted = the screen-center flash)
export function celebrateBonusTier(
  tier: CritTier,
  spawnBurst: (offsetX: number, offsetY: number) => void,
  coinOrigin?: TotalIncomeCoinOrigin,
): void {
  const { intensity, strokeWidth, holdMs, priority } = BONUS_TIER_FLASH[tier];
  triggerScreenShake({
    intensity,
    label: CRIT_TIER_CONFIG[tier].label,
    color: tierColor(tier),
    strokeWidth,
    blinkHz: 6,
    holdMs,
    priority,
  });
  playBonusTierMagicCoin();
  spawnTierBurstPattern(tier, spawnBurst);
  spawnTotalIncomeCoins(() => {
    triggerHudTotalFlash();
    playSold();
  }, coinOrigin);
}
