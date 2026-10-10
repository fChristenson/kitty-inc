// the "Nova Disk" event (galaxy; levels): it covers its crit, whose click
// freezes the screen while a lit bomb wisp swells up mid-screen, ringed by
// hundreds of glitter stars on a tilted disk; as its fuse burns the disk
// spins faster and pulls in tighter, its inner stars spiralling into the
// bomb in quickening pops; then the bomb blows, the disk bursts outward and
// dozens of its stars are flung off along their orbits onto the bars in a
// rattling storm of blasts, each landing free levels, the last slamming
// every bar. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { drawStars, planDisk, type Orbit } from "../../../../shared/galaxy";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "novaDisk";
const STARS = 300;
const INNER = 70;
const FLUNG_PER_BAR = 6;
const STAR = 14;
const BOMB = WISP_SIZE * 1.4;
const FLUNG = WISP_SIZE * 0.55;
// the disk's radius as a share of the screen's width (at most MAX_R px)
const WIDTH = 0.44;
const MAX_R = 560;
const SQUASH = 0.42;
const TILT = -0.08;
const RIM_HZ = 0.25;
// the disk's clock runs this much faster per second of fuse, and it pulls
// in to 1 - PULL of its size
const QUICKEN = 1.6;
const PULL = 0.45;
// the inner stars sink in with this share of their way left to go
const SINK = 0.85;
const GULP_EVERY = 4;
const GULP_BLAST = 70;
const BLOW_BLAST = 480;
const LAND_BLAST = 130;
// after the blow the disk bursts outward this much faster per ms, fading
const BURST = 0.006;
const BURST_MS = 600;
// flung stars arc off along their heading this far, landing LAND_GAP_MS apart
const FLING = 260;
const FLING_MS = 140;
const LAND_GAP_MS = 28;
const GULP_SHAKE = 0.3;
const BLOW_SHAKE = 1.8;
const LAND_SHAKE: [number, number] = [0.4, 0.8];
const SOUND_GAP_MS = 55;

interface Gulp {
  orbit: Orbit;
  ms: number;
  pops: boolean;
}

interface Flung {
  orbit: Orbit;
  bar: RewardBar;
  to: Point;
  ms: number;
  from: Point;
  bow: Point;
}

export const forceNovaDiskEvent = registerWispEvent(
  KEY,
  "Nova Disk",
  () => CONFIG.novaDiskEvent.chance,
  (floor, context, area) => {
    const { growMs, fuseMs, levelShare, holdMs, mergeMs } =
      CONFIG.novaDiskEvent;
    const bars = findRewardBars(floor, context);
    if (bars.length === 0) return;
    const w = area.right - area.left;
    const R = Math.min(MAX_R, w * WIDTH);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const disk = planDisk(center, {
      inner: R * 0.12,
      outer: R,
      squash: SQUASH,
      tilt: TILT,
      rimHz: RIM_HZ,
    });
    const blowAt = growMs + fuseMs;
    // the disk's own clock, quickening as the fuse burns, held at the blow
    const clock = (ms: number) => {
      const s = (Math.min(ms, blowAt) - growMs) / 1000;
      return s <= 0 ? ms : growMs + (s + QUICKEN * s * s) * 1000;
    };
    const pull = (ms: number) =>
      1 - PULL * clamp01((ms - growMs) / fuseMs) ** 1.5;
    const orbitIn = (from: number, to: number): Orbit => ({
      radius: R * lerp([from, to], Math.sqrt(Math.random())),
      phase: Math.random() * Math.PI * 2,
    });

    // the inner stars sink in, the rest of the way quicker and quicker
    const gulps: Gulp[] = Array.from({ length: INNER }, (_, i) => ({
      orbit: orbitIn(0.15, 0.5),
      ms: growMs + fuseMs * Math.sqrt((i + 1) / INNER) * 0.97,
      pops: i % GULP_EVERY === GULP_EVERY - 1,
    }));
    const flungCount = Math.min(STARS, bars.length * FLUNG_PER_BAR);
    const outer = Array.from({ length: STARS }, () => orbitIn(0.5, 1));
    const spot: Point = { x: 0, y: 0 };
    const flung: Flung[] = outer.slice(0, flungCount).map((orbit, k) => {
      const bar = bars[k % bars.length];
      const from = { ...disk.at(orbit, clock(blowAt), spot, pull(blowAt)) };
      const heading = disk.heading(orbit, clock(blowAt));
      return {
        orbit,
        bar,
        to: {
          x: bar.box.x + bar.box.width * lerp([0.12, 0.88], Math.random()),
          y: bar.center.y,
        },
        ms: blowAt + FLING_MS + k * LAND_GAP_MS,
        from,
        bow: {
          x: from.x + Math.cos(heading) * FLING,
          y: from.y + Math.sin(heading) * FLING,
        },
      };
    });
    const disc = outer.slice(flungCount);
    const flungOrbits = outer.slice(0, flungCount);
    const lastLanding = flung[flung.length - 1];
    const endMs = Math.max(blowAt + BURST_MS, lastLanding.ms) + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    let soundAt = -Infinity;
    const bang = (now: number, loud = false) => {
      if (!loud && now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const gulping = createBeats(
      gulps.filter((g) => g.pops),
      (g) => g.ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GULP_SHAKE);
      },
    );
    const blowing = createBeats(
      [blowAt],
      (ms) => ms,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(BLOW_SHAKE);
        bang(now, true);
      },
    );
    const landing = createBeats(
      flung,
      (f) => f.ms,
      (f, k, now) => {
        cover!.levels(f.bar, levels.get(f.bar)!, f.from);
        if (f === lastLanding) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(f.to);
          return;
        }
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, flung.length - 1)));
        bang(now);
      },
    );

    const point: Point = { x: 0, y: 0 };
    const gulpAt = (g: Gulp, ms: number): Point => {
      const u = clamp01((ms - growMs) / (g.ms - growMs));
      const r = g.orbit.radius * (1 - SINK * u * u);
      return disk.place(r, disk.angle(g.orbit, clock(ms)), point, pull(ms));
    };
    const flight = flung.map((f) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < blowAt || ms > f.ms) return null;
        const u = (ms - blowAt) / (f.ms - blowAt);
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        p.x = a * f.from.x + b * f.bow.x + c * f.to.x;
        p.y = a * f.from.y + b * f.bow.y + c * f.to.y;
        return p;
      };
    });
    const bomb = () => center;

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastLanding.ms + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          gulping.tick(ms, now);
          blowing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const t = clock(ms);
          if (ms < blowAt) {
            const size = pull(ms) * grow;
            drawStars(ctx, disk, disc, t, STAR, size);
            drawStars(ctx, disk, flungOrbits, t, STAR, size);
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            gulps.forEach((g, i) => {
              if (ms >= g.ms) return;
              const p = gulpAt(g, ms);
              stampGlimmer(
                ctx,
                p.x,
                p.y,
                STAR * grow,
                now * 0.004 + i,
                i % 2 ? COLOR.heavenlyGold : COLOR.white,
              );
            });
            ctx.restore();
            const burn = clamp01((ms - growMs) / fuseMs);
            drawLitFuse(ctx, center, burn, BOMB * 1.4 * grow, now);
            drawWisp(ctx, bomb, ms, now, BOMB * grow * (1 + 0.3 * burn), burn);
          } else {
            const since = ms - blowAt;
            drawStars(
              ctx,
              disk,
              disc,
              t,
              STAR,
              pull(blowAt) * (1 + since * BURST),
              clamp01(1 - since / BURST_MS),
            );
          }
          for (let k = 0; k < flung.length; k++)
            drawWispBetween(
              ctx,
              flight[k],
              ms,
              now,
              FLUNG,
              0.9,
              blowAt,
              flung[k].ms,
            );
          for (const g of gulps)
            if (g.pops) drawDetonation(ctx, center, ms - g.ms, GULP_BLAST, now);
          drawDetonation(ctx, center, ms - blowAt, BLOW_BLAST, now);
          for (const f of flung)
            drawDetonation(ctx, f.to, ms - f.ms, LAND_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
