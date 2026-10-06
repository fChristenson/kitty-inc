// the "Oort Cloud" event (galaxy; worker perma tiers): it covers its crit,
// whose click freezes the screen while a sun wisp flares up in the middle
// of the screen, ringed by a faint tilted halo of hundreds of glitter stars
// drifting slowly round it far out; a rogue star wisp streaks across
// through the halo, and every star it brushes is knocked loose with a pop:
// each slides down onto a plunging orbit, whips round the sun faster and
// faster, then breaks orbit along its heading and arcs onto a worker, who
// climbs a perma tier, the last in a big blast. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import {
  clamp01,
  easeIn,
  easeOutBack,
  lerp,
  smoothstep,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { drawStars, planDisk, type Orbit } from "../../shared/galaxy";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "oortCloud";
const MAX_WORKERS = 6;
const COMETS_EACH = 4;
const HALO_STARS = 260;
const DISK_STARS = 80;
const STAR = 9;
const COMET = 14;
const CORE = WISP_SIZE * 1.1;
const ROGUE = WISP_SIZE * 0.8;
// the cloud's radius as a share of the screen's width (at most MAX_R px);
// the halo is its outer share from HALO_FROM, the sun's own disk inside DISK
const WIDTH = 0.44;
const MAX_R = 560;
const HALO_FROM = 0.72;
const DISK = 0.3;
const SQUASH = 0.5;
const TILT = -0.18;
const RIM_HZ = 0.2;
// the plunging orbits' radii, as shares of the cloud's
const PLUNGE: [number, number] = [0.1, 0.2];
// the rogue crosses the halo's top from left to right, between these heights
// (shares of the cloud's radius above the sun)
const ROGUE_Y: [number, number] = [0.6, 0.25];
const FLING = 260;
const KICK_SHAKE = 0.25;
const BREAK_SHAKE = 0.4;
const LAND_SHAKE = 0.6;
const FADE_MS = 300;
const SOUND_GAP_MS = 70;

interface Comet {
  from: Orbit;
  to: Orbit;
  kicksAt: number;
  captured: number;
  breaksAt: number;
  lands: number;
  worker: RewardWorker;
  out: Point;
  bow: Point;
}

export const forceOortCloudEvent = registerWispEvent(
  KEY,
  "Oort Cloud",
  () => CONFIG.oortCloudEvent.chance,
  (floor, context, area) => {
    const { growMs, passMs, plungeMs, whipMs, gapMs, flyMs, holdMs, mergeMs } =
      CONFIG.oortCloudEvent;
    const workers = findRewardWorkers(floor, context).slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const w = area.right - area.left;
    const R = Math.min(MAX_R, w * WIDTH);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + R, lerp([area.top, area.bottom], 0.36)),
    };
    const disk = planDisk(centre, {
      inner: R * 0.06,
      outer: R,
      squash: SQUASH,
      tilt: TILT,
      rimHz: RIM_HZ,
    });
    const orbitIn = (from: number, to: number): Orbit => ({
      radius: R * lerp([from, to], Math.sqrt(Math.random())),
      phase: Math.random() * Math.PI * 2,
    });
    const halo = Array.from({ length: HALO_STARS }, () =>
      orbitIn(HALO_FROM, 1),
    );
    const inner = Array.from({ length: DISK_STARS }, () => orbitIn(0.08, DISK));

    // the rogue's straight run across the top of the halo
    const start: Point = { x: area.left - 300, y: centre.y - R * ROGUE_Y[0] };
    const end: Point = { x: area.right + 300, y: centre.y - R * ROGUE_Y[1] };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    const rogue: Point = { x: 0, y: 0 };
    const rogueAt = (ms: number): Point => {
      const u = clamp01((ms - growMs) / passMs);
      rogue.x = start.x + dx * u;
      rogue.y = start.y + dy * u;
      return rogue;
    };

    // the halo stars nearest its line are knocked loose as it passes them
    const mid = growMs + passMs / 2;
    const q: Point = { x: 0, y: 0 };
    const near = halo
      .map((orbit) => {
        disk.at(orbit, mid, q);
        const u = ((q.x - start.x) * dx + (q.y - start.y) * dy) / len2;
        const d = Math.hypot(q.x - start.x - dx * u, q.y - start.y - dy * u);
        return { orbit, u, d };
      })
      .filter((s) => s.u > 0.1 && s.u < 0.9)
      .sort((a, b) => a.d - b.d)
      .slice(0, workers.length * COMETS_EACH)
      .sort((a, b) => a.u - b.u);
    const loose = new Set(near.map((s) => s.orbit));
    const bound = halo.filter((orbit) => !loose.has(orbit));
    const comets: Comet[] = near.map((s, j) => {
      const k = j % workers.length;
      const kicksAt = growMs + passMs * s.u;
      const captured = kicksAt + plungeMs;
      const to: Orbit = {
        radius: R * lerp(PLUNGE, Math.random()),
        phase: s.orbit.phase,
      };
      const breaksAt =
        Math.max(captured, growMs + passMs + plungeMs) +
        whipMs +
        k * gapMs +
        Math.random() * gapMs * 0.5;
      const out = disk.at(to, breaksAt, { x: 0, y: 0 });
      const a = disk.heading(to, breaksAt);
      return {
        from: s.orbit,
        to,
        kicksAt,
        captured,
        breaksAt,
        lands: breaksAt + flyMs,
        worker: workers[k],
        out,
        bow: { x: out.x + Math.cos(a) * FLING, y: out.y + Math.sin(a) * FLING },
      };
    });
    const firstLands = workers.map((worker) =>
      Math.min(
        ...comets.filter((c) => c.worker === worker).map((c) => c.lands),
      ),
    );
    const firstBreaks = workers.map((worker) =>
      Math.min(
        ...comets.filter((c) => c.worker === worker).map((c) => c.breaksAt),
      ),
    );
    const endMs = Math.max(...comets.map((c) => c.lands));
    const lastWorker = workers[firstLands.indexOf(Math.max(...firstLands))];

    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };
    const passing = createBeats(
      [0, growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const kicking = createBeats(
      comets,
      (c) => c.kicksAt,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(KICK_SHAKE);
        sound(now);
      },
    );
    const breaking = createBeats(
      firstBreaks,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BREAK_SHAKE);
      },
    );
    const landing = createBeats(
      workers,
      (_, k) => firstLands[k],
      (worker, _, now) => {
        cover!.promote(worker);
        if (worker === lastWorker) {
          cover!.blast(worker.at);
          return;
        }
        cover!.burst(worker.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const coreAt = () => centre;
    const bit: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          passing.tick(ms, now);
          kicking.tick(ms, now);
          breaking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const grow = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - (endMs - FADE_MS)) / FADE_MS);
          drawStars(ctx, disk, bound, ms, STAR, grow, fade * 0.8);
          drawStars(ctx, disk, inner, ms, STAR, grow, fade);
          drawWisp(ctx, coreAt, ms, now, CORE * grow * fade, 0.8);
          drawWispBetween(
            ctx,
            rogueAt,
            ms,
            now,
            ROGUE,
            0.5,
            growMs,
            growMs + passMs,
          );
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < comets.length; i++) {
            const c = comets[i];
            if (ms >= c.lands) continue;
            let size = COMET;
            if (ms < c.kicksAt) {
              disk.at(c.from, ms, bit, grow);
              size = STAR;
            } else if (ms < c.breaksAt)
              disk.drift(
                c.from,
                c.to,
                smoothstep(clamp01((ms - c.kicksAt) / plungeMs)),
                ms,
                bit,
              );
            else
              bezier(
                c.out,
                c.bow,
                c.worker.at,
                easeIn((ms - c.breaksAt) / flyMs),
                bit,
              );
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              size,
              i + ms * 0.006,
              i % 2 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
