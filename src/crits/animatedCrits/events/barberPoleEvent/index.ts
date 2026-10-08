// the "Barber Pole" event (beam; crit tiers): it covers its crit, whose
// click freezes the screen while rails of light frame each income bar in
// turn and slanted stripes of beam light up across it like a barber's pole,
// scrolling along it faster and faster until they blur; then they snap
// together in a flash and a jolt and the bar jumps a crit tier, the bars
// finishing one after another, the last in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "barberPole";
const MAX_BARS = 4;
const STRIPES = 6;
const SLANT = 40;
const OVER = 8;
const STRIPE_W = 14;
const RAIL_W = 8;
// px per ms the stripes scroll at, from lighting up to snapping together
const SPEED: [number, number] = [0.15, 2.4];
const APPEAR_MS = 160;
const SNAP_MS = 120;
const FLARE_MS = 240;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Pole {
  bar: RewardBar;
  starts: number;
  snaps: number;
}

export const forceBarberPoleEvent = registerWispEvent(
  KEY,
  "Barber Pole",
  () => CONFIG.barberPoleEvent.chance,
  (floor, context) => {
    const { staggerMs, spinMs, holdMs, mergeMs } = CONFIG.barberPoleEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    // each pole spins a little shorter than the last
    const poles: Pole[] = bars.map((bar, k) => {
      const starts = k * staggerMs;
      return { bar, starts, snaps: starts + spinMs * (1 - 0.12 * k) };
    });
    const last = poles.reduce((a, b) => (b.snaps > a.snaps ? b : a));
    const endAt = last.snaps + SNAP_MS;
    const from: Point = { x: 0, y: 0 };
    const to: Point = { x: 0, y: 0 };

    const snapping = createBeats(
      poles.slice().sort((a, b) => a.snaps - b.snaps),
      (p) => p.snaps + SNAP_MS,
      (p, k) => {
        cover!.tierUp(p.bar, p.bar.center);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, poles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => snapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + FLARE_MS) return;
          for (const pole of poles) {
            const t = ms - pole.starts;
            if (t < 0) continue;
            const { box, center } = pole.bar;
            const spin = pole.snaps - pole.starts;
            const flare = (t - spin - SNAP_MS) / FLARE_MS;
            if (flare >= 0) {
              if (flare < 1)
                drawBeamFlare(ctx, center, box.height * 1.2, 1 - flare, now);
              continue;
            }
            const shown = easeOut(clamp01(t / APPEAR_MS));
            const run = Math.min(t, spin);
            const scroll =
              SPEED[0] * run + ((SPEED[1] - SPEED[0]) * run * run) / (2 * spin);
            const snap = easeIn(clamp01((t - spin) / SNAP_MS));
            const glow = 0.5 + 0.5 * clamp01(t / spin);
            const topY = box.y - OVER;
            const bottomY = box.y + box.height + OVER;
            from.x = box.x;
            to.x = box.x + box.width;
            from.y = to.y = topY;
            drawBeam(ctx, from, to, RAIL_W, shown);
            from.y = to.y = bottomY;
            drawBeam(ctx, from, to, RAIL_W, shown);
            const gap = box.width / STRIPES;
            for (let i = 0; i < STRIPES; i++) {
              const x =
                box.x +
                ((((i * gap + scroll) % box.width) + box.width) % box.width);
              const sx = lerp([x, center.x], snap);
              from.x = sx + SLANT * 0.5 * (1 - snap);
              from.y = topY;
              to.x = sx - SLANT * 0.5 * (1 - snap);
              to.y = bottomY;
              drawBeam(ctx, from, to, STRIPE_W, shown * glow);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
