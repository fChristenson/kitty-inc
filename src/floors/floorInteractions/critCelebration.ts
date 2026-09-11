import type { Floor } from "../../gameState";
import {
  type CritTier,
  CRIT_TIER_CONFIG,
  BOOST_CRIT_COLOR,
  BOOST_CRIT_LABEL,
} from "../upgradeButton";
import { spawnCoinBurst } from "../coins";
import {
  playCoinDrop,
  playExplosion,
  playJackpot,
  playPayout,
} from "../../sound";
import { triggerScreenShake } from "../../screenShake";
import { COLOR } from "../../palette";

// the one shared "how does a crit tier celebrate" trigger — shake/flash/sfx/coin
// bursts, tier-scaled. Extracted out of the upgrade-button click branch so any
// OTHER click that can roll a crit tier (the Sale-boost click below, later a
// floor-unlock purchase) gets the exact same weighted celebration instead of each
// call site hand-rolling (and inevitably drifting from) its own copy. Deliberately
// does NOT decide what a crit actually REWARDS (extra upgrades vs a bigger sale
// payout vs whatever a future caller wants) — that stays the caller's own concern.
// Labels always come from CRIT_TIER_CONFIG (the one canonical source); the flash's
// own color intentionally does NOT always match CRIT_TIER_CONFIG[tier].color (that
// one's the upgrade BUTTON's color) — mega's button is gold but its flash text is
// amber/orange per an explicit earlier request, so the flash keeps its own colors
export function triggerCritCelebration(
  floor: Floor,
  tier: CritTier,
  getScreenCenterLocal: (floor: Floor) => { x: number; y: number },
  chain = false,
  boost = false,
): void {
  // chain crit (see upgradeButton.ts's isChainCrit/rollFloorBuyCrit's own chain
  // flag): the flash shows the word "Chain" instead of the tier's usual "x5"/
  // "x25"/"x125" number the instant the crit actually happens — this is a
  // celebration-moment-only swap, the upgrade button's own idle/armed label is
  // untouched and still always shows the plain tier label. A boost proc (see
  // isBoostCrit) rides the SAME crit moment the exact same way and wins over
  // chain if both land on this same click (rare, ~0.5%) — both used to also
  // fire their own second triggerScreenShake call, which either got silently
  // dropped or (worse, a later "fix") queued to play right after this one, so
  // the player had to sit through the plain tier flash first. Folding it into
  // this single flash instead means whichever proc landed IS the one flash we
  // show, immediately, in place of the plain tier appearance
  const label = (tierLabel: string) =>
    boost ? BOOST_CRIT_LABEL : chain ? "Chain" : tierLabel;
  // same swap for color — boost's own blue takes over the tier's usual color
  // (chain keeps the tier's own color; it has no dedicated color of its own)
  const color = (tierColor: string) => (boost ? BOOST_CRIT_COLOR : tierColor);
  if (tier === "ultra") {
    // blinkHz strobes the flash text on/off during its holdMs "stick" phase, on
    // top of its regular grow/fade animation. holdMs is deliberately an EXACT
    // odd multiple of the blink's own half-cycle (1000/(blinkHz*2) = 83.33ms
    // at blinkHz=6; 15 * 83.33 = 1250) — this makes the on/off pattern always
    // land back "on" (full alpha) exactly when the hold phase ends, so the
    // fade-out below (which always starts from alpha=1) never has to jump or
    // warp the blink's own timing to transition smoothly; every single blink
    // cycle stays a plain, identical-duration on/off toggle (see
    // screenShake.ts's own drawCritFlash). Total on-screen lifetime =
    // GROWTH_DURATION_MS(100) + holdMs(1250) + fadeDurationMs(intensity-scaled,
    // ~576ms at 2.6) ≈ 1.93s, matching playPayout's own fade window (see
    // sound/index.ts) closely enough that neither the flash nor the sound
    // outlasts the other.
    // priority 2 is the highest tier, so it can never be cut off early by a
    // mega/crit rolling moments later (see triggerScreenShake's own suppression)
    triggerScreenShake({
      intensity: 2.6,
      label: label(CRIT_TIER_CONFIG.ultra.label),
      color: color(COLOR.red),
      strokeWidth: 16,
      blinkHz: 6,
      holdMs: 1250,
      priority: 2,
    });
    playPayout();
  } else if (tier === "mega") {
    // priority 1: can interrupt a plain crit's flash, but never an in-progress
    // ultra celebration (priority 2)
    triggerScreenShake({
      intensity: 1.8,
      label: label(CRIT_TIER_CONFIG.mega.label),
      color: color(COLOR.amber),
      strokeWidth: 14,
      priority: 1,
    });
    playJackpot();
  } else {
    // priority 0 (the default): the only tier that can ever get suppressed by
    // a still-playing mega/ultra flash, so those bigger moments are never
    // stepped on by an immediately-following ordinary crit
    triggerScreenShake({
      label: label(CRIT_TIER_CONFIG.crit.label),
      color: color(COLOR.purple),
    });
    playCoinDrop();
    playExplosion();
  }

  // boost's own extra punch (the free-worker payout) on top of whatever the
  // tier already celebrates — previously its own separate flash, now folded
  // into the single flash above instead
  if (boost) {
    playCoinDrop();
    const p = getScreenCenterLocal(floor);
    spawnCoinBurst(floor, p.x, p.y, () => {});
  }

  // bursts on top of whatever the caller's own reward already spawned, so the
  // celebration keeps erupting for as long as the flash/shake animation plays
  // out. First one is dead center (matching the flash text) at 0s; the rest are
  // staggered outward so they read as separate pops, not one simultaneous burst.
  // Each tier up gets more bursts spread wider/longer, matching its bigger
  // shake/flash duration. Re-read fresh at each delayed spawn in case the user
  // scrolls in between
  const CENTER_BURST_OFFSET_PX = 200;
  const CENTER_BURST_OFFSET_PY = 100;
  const MEGA_BURST_OFFSET_PX = 260;
  const MEGA_BURST_OFFSET_PY = 140;
  const ULTRA_BURST_OFFSET_PX = 320;
  const ULTRA_BURST_OFFSET_PY = 170;
  const centerBursts: { offsetX: number; offsetY: number; delayMs: number }[] =
    tier === "ultra"
      ? [
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
        ]
      : tier === "mega"
        ? [
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
          ]
        : [
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
          ];
  for (const { offsetX, offsetY, delayMs } of centerBursts) {
    setTimeout(() => {
      const p = getScreenCenterLocal(floor);
      spawnCoinBurst(floor, p.x + offsetX, p.y + offsetY, () => {});
    }, delayMs);
  }
}
