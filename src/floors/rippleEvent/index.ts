// the "Ripple" event: it covers its crit, whose click freezes the screen
// while coins and bills burst out of the button in round ripples like a
// stone dropped in a pond: a wide band of coins, then a thin ring or two
// close behind it, then the next wide band after a longer gap. Every ring
// keeps rolling outward the whole time at its own pace, the first ones
// fastest so the gaps open up, its coins bobbing and swelling on the crest
// and settling as the ring weakens, behind its own fading white wave line.
// Then the coins sweep from wherever they are into the total. Pays once per
// ring (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import type { CoinPath } from "../coins";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";

const KEY = "ripple";
// the first ring rolls out this far by the end, of the screen's longer side
const REACH = 0.6;
// a wide band: ROWS rows of coins BAND px apart, SPACING px along each; a
// thin ring: one sparser row of smaller coins
const WIDE = { rows: 3, band: 34, spacing: 70, scale: 1, wave: 16 };
const THIN = { rows: 1, band: 0, spacing: 100, scale: 0.7, wave: 5 };
const ROW_JITTER = 8;
const MIN_RING_COINS = 10;
// each ring gets this share of the one before it's reach: a thin ring hugs
// the band it trails, a new wide band lags well behind
const THIN_REACH: [number, number] = [0.8, 0.93];
const WIDE_REACH: [number, number] = [0.55, 0.78];
// how much each ring slows as it goes: low keeps rolling, high eases off
const EASE: [number, number] = [1.2, 2];
// coins bob in and out and swell on their crest, out of step with each
// other, a wide band breathing thicker and thinner with them; it all calms
// as the ring weakens
const BOB_MS: [number, number] = [300, 520];
const BOB = { wide: 12, thin: 7 };
const SWELL = 0.35;
const BREATHE = 0.35;
const CALM = 0.6;
const WAVE_ALPHA = 0.35;
// the water's crests under each ring: how far they refract the screen (px),
// their wavelength, and how far either side of the ring they reach
const WATER = {
  wide: { amp: 18, wavelength: 90, reach: 150 },
  thin: { amp: 10, wavelength: 55, reach: 80 },
};
// a wave line runs this far ahead of its ring's outer row
const WAVE_LEAD = 30;
// the rows open up over this far as a ring leaves the button
const OPEN = 80;

type Point = { x: number; y: number };

interface Ring {
  // ms from the start it bursts out
  at: number;
  wide: boolean;
  // how far it rolls by the end (of the first ring's), and how it slows
  reach: number;
  ease: number;
  bobMs: number;
  bobPhase: number;
}

const between = ([min, max]: [number, number]) =>
  min + Math.random() * (max - min);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// a wide band, then one or two thin rings close behind, then the next wide
// one; each rolling its own way
function planRings(): Ring[] {
  const { rings, wideGapMs, thinGapMs } = CONFIG.rippleEvent;
  const ring = (at: number, wide: boolean, reach: number): Ring => ({
    at,
    wide,
    reach,
    ease: between(EASE),
    bobMs: between(BOB_MS),
    bobPhase: Math.random() * Math.PI * 2,
  });
  const plan: Ring[] = [ring(0, true, 1)];
  let thinLeft = 1 + Math.round(Math.random());
  while (plan.length < rings) {
    const last = plan[plan.length - 1];
    const wide = thinLeft === 0;
    plan.push(
      ring(
        last.at + between(wide ? wideGapMs : thinGapMs),
        wide,
        last.reach * between(wide ? WIDE_REACH : THIN_REACH),
      ),
    );
    thinLeft = wide ? 1 + Math.round(Math.random()) : thinLeft - 1;
  }
  return plan;
}

// ring's radius ms after the event started, and how far through its roll
// (0..1) it is: it keeps rolling, slowing its own way, right up to the end
function ringAt(
  ring: Ring,
  outer: number,
  ms: number,
  rippleMs: number,
): { r: number; p: number } {
  const p = clamp01((ms - ring.at) / (rippleMs - ring.at));
  return { r: outer * ring.reach * (1 - (1 - p) ** ring.ease), p };
}

function coinPath(
  center: Point,
  ring: Ring,
  outer: number,
  angle: number,
  offset: number,
  scale: number,
  rippleMs: number,
): CoinPath {
  const phase = Math.random() * Math.PI * 2;
  const bob = ring.wide ? BOB.wide : BOB.thin;
  return (f) => {
    const ms = ring.at + f * (rippleMs - ring.at);
    const { r, p } = ringAt(ring, outer, ms, rippleMs);
    const wave = (ms / ring.bobMs) * Math.PI * 2;
    const strength = Math.min(1, r / OPEN) * (1 - CALM * p);
    const at = Math.max(
      0,
      r +
        (offset * (1 + BREATHE * Math.sin(wave + ring.bobPhase)) +
          bob * Math.sin(wave + phase)) *
          strength,
    );
    return {
      x: center.x + Math.cos(angle) * at,
      y: center.y + Math.sin(angle) * at,
      scale: scale * (1 + SWELL * strength * Math.sin(wave + phase + 1)),
    };
  };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.rippleEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { rippleMs, mergeMs } = CONFIG.rippleEvent;
      const rings = planRings();
      const startedAt = performance.now();
      let center: Point = { x: 0, y: 0 };
      let outer = 0;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: rippleMs + mergeMs, mergeMs },
        {
          rewardMultiplier: rings.length,
          // the screen under each ring refracts like water: a short train of
          // crests round it, weakening as it spreads
          frameRipple: (getFloorRect) => {
            const rect = getFloorRect(floor);
            const ms = performance.now() - startedAt;
            if (!rect || ms >= rippleMs) return null;
            const waves = rings
              .filter((ring) => ms > ring.at)
              .map((ring) => {
                const { r, p } = ringAt(ring, outer, ms, rippleMs);
                const water = ring.wide ? WATER.wide : WATER.thin;
                return {
                  r,
                  ...water,
                  amp: water.amp * Math.min(1, r / OPEN) * (1 - p),
                };
              });
            return {
              center: { x: rect.left + center.x, y: rect.top + center.y },
              bands: waves.map((w) => [
                Math.max(0, w.r - w.reach),
                w.r + w.reach,
              ]),
              offset: (r) => {
                let d = 0;
                for (const w of waves) {
                  const x = r - w.r;
                  if (Math.abs(x) >= w.reach) continue;
                  d +=
                    w.amp *
                    Math.sin((x / w.wavelength) * Math.PI * 2) *
                    Math.exp(-((x / (w.reach / 2)) ** 2));
                }
                return d;
              },
            };
          },
          // each ring's wave line, as wide as its band, fading as it weakens
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const ms = performance.now() - startedAt;
            if (ms >= rippleMs) return;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            ctx.strokeStyle = COLOR.white;
            for (const ring of rings) {
              if (ms <= ring.at) continue;
              const { r, p } = ringAt(ring, outer, ms, rippleMs);
              const style = ring.wide ? WIDE : THIN;
              ctx.globalAlpha = WAVE_ALPHA * (1 - p);
              ctx.lineWidth = style.wave * (1 - CALM * p);
              ctx.beginPath();
              ctx.arc(
                center.x,
                center.y,
                r + style.band + WAVE_LEAD,
                0,
                Math.PI * 2,
              );
              ctx.stroke();
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const { area } = cover;
      center = cover.button;
      outer = Math.max(area.right - area.left, area.bottom - area.top) * REACH;
      for (const ring of rings)
        setTimeout(() => {
          if (!cover.isLive()) return;
          const style = ring.wide ? WIDE : THIN;
          const count = Math.max(
            MIN_RING_COINS,
            Math.round((2 * Math.PI * outer * ring.reach) / style.spacing),
          );
          const paths: CoinPath[] = [];
          for (let row = 0; row < style.rows; row++) {
            const offset =
              (row - (style.rows - 1) / 2) * style.band +
              (Math.random() - 0.5) * 2 * ROW_JITTER;
            const start = Math.random() * Math.PI * 2;
            for (let j = 0; j < count; j++)
              paths.push(
                coinPath(
                  center,
                  ring,
                  outer,
                  start + (j / count) * Math.PI * 2,
                  offset,
                  style.scale,
                  rippleMs,
                ),
              );
          }
          cover.trace(paths, rippleMs - ring.at);
          playBloop();
        }, ring.at);
      playBoostEventStream();
    },
  },
  { label: "Ripple", color: COLOR.tideShallow },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ripple
export function forceRippleEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
