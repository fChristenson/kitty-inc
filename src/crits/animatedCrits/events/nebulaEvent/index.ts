// the "Nebula" event (spray + galaxy; levels + crit tier): it covers its
// crit, whose click freezes the screen while a nozzle wisp spirals out from
// mid-screen spraying a swirling cloud of gold mist; the cloud spins up on a
// tilted disk and its mist drifts together into clumps that ignite into
// stars one by one, quicker and quicker, each a pop; then the spinning disk
// flings its stars off along their orbits onto the bars in a rattling storm
// of blasts, every landing free levels, into a huge blast on the clicked
// bar, which climbs a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawSpray, planSpray } from "../../../../shared/spray";
import { planDisk, type Orbit } from "../../../../shared/galaxy";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "nebula";
const SPECKS = 320;
const CLUMPS = 24;
const SPECK = 16;
const STAR = WISP_SIZE * 0.6;
const NOZZLE = WISP_SIZE * 0.8;
const DROPLET = WISP_SIZE * 0.6;
// the disk's radius as a share of the screen's width (at most MAX_R px)
const WIDTH = 0.44;
const MAX_R = 560;
const INNER = 0.2;
const SQUASH = 0.5;
const TILT = -0.06;
const RIM_HZ = 0.2;
// the disk's clock runs this much faster per second once the spray's done
const QUICKEN = 1.6;
// the nozzle spirals out over this many laps, spraying outward this far
const LAPS = 2;
const SPRAY_REACH = 140;
const SPRAY_SPREAD = 0.6;
const LAND_MS = 120;
// flung stars arc off along their heading this far, landing LAND_GAP_MS apart
const FLING = 260;
const FLING_MS = 160;
const LAND_GAP_MS = 26;
const POP_BLAST = 80;
const LAND_BLAST = 130;
const FINALE_LAG = 140;
const FINALE_BLAST = 850;
const POP_SHAKE = 0.3;
const LAND_SHAKE: [number, number] = [0.4, 0.8];
const FINALE_SHAKE = 1.8;
const SOUND_GAP_MS = 55;

interface Speck {
  orbit: Orbit;
  clump: number;
  lands: number;
}

interface Star {
  orbit: Orbit;
  ignites: number;
  bar: RewardBar;
  to: Point;
  lands: number;
  from: Point;
  bow: Point;
}

export const forceNebulaEvent = registerWispEvent(
  KEY,
  "Nebula",
  () => CONFIG.nebulaEvent.chance,
  (floor, context, area) => {
    const { sprayMs, igniteMs, levelShare, holdMs, mergeMs } =
      CONFIG.nebulaEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const w = area.right - area.left;
    const R = Math.min(MAX_R, w * WIDTH);
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const disk = planDisk(center, {
      inner: R * INNER,
      outer: R,
      squash: SQUASH,
      tilt: TILT,
      rimHz: RIM_HZ,
    });
    const flingAt = sprayMs + igniteMs + 100;
    // the disk's own clock, quickening once the spray's done, held at the fling
    const clock = (ms: number) => {
      const s = (Math.min(ms, flingAt) - sprayMs) / 1000;
      return s <= 0 ? ms : sprayMs + (s + QUICKEN * s * s) * 1000;
    };
    const orbitIn = (from: number, to: number): Orbit => ({
      radius: R * lerp([from, to], Math.sqrt(Math.random())),
      phase: Math.random() * Math.PI * 2,
    });

    // the nozzle spirals out from the middle over the spray
    const nozzle: Point = { x: 0, y: 0 };
    const nozzleAngle = (ms: number) =>
      clamp01(ms / sprayMs) * Math.PI * 2 * LAPS;
    const nozzleAt = (ms: number): Point =>
      disk.place(
        lerp([R * INNER, R], clamp01(ms / sprayMs)),
        nozzleAngle(ms),
        nozzle,
      );
    const spray = planSpray(
      nozzleAt,
      (ms) => {
        const at = nozzleAt(ms);
        return Math.atan2(at.y - center.y, at.x - center.x);
      },
      {
        startMs: 0,
        endMs: sprayMs,
        reach: SPRAY_REACH,
        spread: SPRAY_SPREAD,
      },
    );

    // the stars, igniting quicker and quicker, each flung onto a bar in turn
    const clumpOrbits = Array.from({ length: CLUMPS }, () =>
      orbitIn(INNER + 0.05, 0.95),
    );
    const spot: Point = { x: 0, y: 0 };
    const stars: Star[] = clumpOrbits.map((orbit, k) => {
      const bar = bars[k % bars.length];
      const from = { ...disk.at(orbit, clock(flingAt), spot) };
      const heading = disk.heading(orbit, clock(flingAt));
      return {
        orbit,
        ignites: sprayMs + igniteMs * Math.sqrt((k + 1) / CLUMPS),
        bar,
        to: {
          x: bar.box.x + bar.box.width * lerp([0.12, 0.88], Math.random()),
          y: bar.center.y,
        },
        lands: flingAt + FLING_MS + k * LAND_GAP_MS,
        from,
        bow: {
          x: from.x + Math.cos(heading) * FLING,
          y: from.y + Math.sin(heading) * FLING,
        },
      };
    });
    const specks: Speck[] = Array.from({ length: SPECKS }, (_, i) => {
      const orbit = orbitIn(INNER, 1);
      return {
        orbit,
        clump: i % CLUMPS,
        lands:
          ((orbit.radius - R * INNER) / (R - R * INNER)) * sprayMs + LAND_MS,
      };
    });
    const lastLanding = stars[stars.length - 1].lands;
    const finaleAt = lastLanding + FINALE_LAG;
    const endMs = finaleAt + DETONATION_MS;
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const spraying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const igniting = createBeats(
      stars,
      (s) => s.ignites,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(POP_SHAKE);
      },
    );
    const landing = createBeats(
      stars,
      (s) => s.lands,
      (s, k, now) => {
        cover!.levels(s.bar, levels.get(s.bar)!, s.from);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, stars.length - 1)));
        bang(now);
      },
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        cover!.tierUp(clicked, center);
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(clicked.center);
        if (cover!.isLive()) shakeScreen(FINALE_SHAKE);
      },
    );

    const point: Point = { x: 0, y: 0 };
    const flights = stars.map((s) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < s.ignites || ms > s.lands) return null;
        if (ms < flingAt) return disk.at(s.orbit, clock(ms), p);
        const u = clamp01((ms - flingAt) / (s.lands - flingAt)) ** 2;
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        p.x = a * s.from.x + b * s.bow.x + u * u * s.to.x;
        p.y = a * s.from.y + b * s.bow.y + u * u * s.to.y;
        return p;
      };
    });

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          spraying.tick(ms, now);
          igniting.tick(ms, now);
          landing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const t = clock(ms);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < specks.length; i++) {
            const s = specks[i];
            const star = stars[s.clump];
            if (ms < s.lands || ms >= star.ignites) continue;
            // drifting off its own orbit onto its clump's as the clump forms
            const u = clamp01((ms - sprayMs) / (star.ignites - sprayMs)) ** 2;
            disk.drift(s.orbit, star.orbit, u, t, point);
            stampGlimmer(
              ctx,
              point.x,
              point.y,
              SPECK + (i % 3) * 5,
              now * 0.003 + i,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
          drawSpray(ctx, spray, ms, now, DROPLET);
          drawWispBetween(ctx, nozzleAt, ms, now, NOZZLE, 0.6, 0, sprayMs);
          for (let k = 0; k < stars.length; k++) {
            const s = stars[k];
            drawWispBetween(
              ctx,
              flights[k],
              ms,
              now,
              STAR,
              0.8,
              s.ignites,
              s.lands,
            );
            drawDetonation(ctx, s.to, ms - s.lands, LAND_BLAST, now);
            if (ms >= s.ignites && ms - s.ignites < DETONATION_MS)
              drawDetonation(
                ctx,
                disk.at(s.orbit, clock(s.ignites), point),
                ms - s.ignites,
                POP_BLAST,
                now,
              );
          }
          drawDetonation(ctx, clicked.center, ms - finaleAt, FINALE_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
