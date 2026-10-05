// the "Smart Rockets" event (experiment: a genetic algorithm; cash): it
// covers its crit, whose click freezes the screen while a beam of light
// slams across it between the clicked floor's button and the total; a swarm
// of little rocket wisps launches off the button, each steering by its own
// random genes, and they flail about, crashing into the beam or the edges
// with pops; the best of them breed, and the next swarm launches, flying
// better, curving round the beam; generation after generation, faster, until
// the whole last swarm streaks round it into the total, every rocket landing
// a spray of coins, the last in a huge blast. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { ringTargets } from "../../shared/coinTargets";
import { totalSpot } from "../cashFlow";

const KEY = "smartRockets";
const REWARD = 4;
// the swarm, its genes (one thrust angle per BLOCK steps), and how long it flies
const SWARM = 14;
const STEPS = 48;
const BLOCK = 6;
const GENES = STEPS / BLOCK;
const THRUST = 0.9;
const MAX_SPEED = 26;
const LAUNCH = 6;
// the evolution: run this many generations, show these
const BREED = 50;
const SHOWN = [0, 4, 14, BREED - 1];
const MUTATE = 0.06;
// a rocket's in once it's this close to the total
const HIT = 50;
// the beam spans this share of the way across, halfway between the two
const WALL = 0.55;
const WALL_W = 12;
const ROCKET = WISP_SIZE * 0.45;
const COINS = 5;
const COIN_RING: [number, number] = [40, 90];
const CRASH_SHAKE = 0.2;
const HIT_SHAKE = 0.4;
const SOUND_GAP_MS = 60;

interface Flight {
  // x, y each step; the step it crashed or got in on, if it did
  path: Float32Array;
  ends: number;
  hit: boolean;
}

export const forceSmartRocketsEvent = registerWispEvent(
  KEY,
  "Smart Rockets",
  () => CONFIG.smartRocketsEvent.chance,
  (floor, context, area) => {
    const { growMs, flyMs, gapMs, holdMs, mergeMs } = CONFIG.smartRocketsEvent;
    const start = getButtonCenter(context.isGroundFloor);
    const target = totalSpot(area);
    const wallY = (start.y + target.y) / 2;
    const width = area.right - area.left;
    const wallMid = (start.x + target.x) / 2;
    const wallLeft = Math.max(area.left + 40, wallMid - (width * WALL) / 2);
    const wallRight = Math.min(area.right - 40, wallMid + (width * WALL) / 2);

    const fly = (genes: Float32Array): Flight => {
      const path = new Float32Array((STEPS + 1) * 2);
      let x = start.x;
      let y = start.y;
      let vx = 0;
      let vy = -LAUNCH;
      path[0] = x;
      path[1] = y;
      for (let s = 1; s <= STEPS; s++) {
        const a = genes[Math.floor((s - 1) / BLOCK)];
        vx += Math.cos(a) * THRUST;
        vy += Math.sin(a) * THRUST;
        const v = Math.hypot(vx, vy);
        if (v > MAX_SPEED) {
          vx *= MAX_SPEED / v;
          vy *= MAX_SPEED / v;
        }
        const nx = x + vx;
        const ny = y + vy;
        const crossed = (y - wallY) * (ny - wallY) <= 0 && ny !== y;
        const atX = crossed ? x + ((wallY - y) / (ny - y)) * (nx - x) : 0;
        x = nx;
        y = ny;
        path[s * 2] = x;
        path[s * 2 + 1] = y;
        if (crossed && atX > wallLeft && atX < wallRight) {
          path[s * 2] = atX;
          path[s * 2 + 1] = wallY;
          return { path, ends: s, hit: false };
        }
        if (
          x < area.left ||
          x > area.right ||
          y < area.top - 60 ||
          y > area.bottom
        )
          return { path, ends: s, hit: false };
        if (Math.hypot(x - target.x, y - target.y) < HIT)
          return { path, ends: s, hit: true };
      }
      return { path, ends: STEPS, hit: false };
    };
    const fitness = (f: Flight): number => {
      const x = f.path[f.ends * 2];
      const y = f.path[f.ends * 2 + 1];
      const d = Math.hypot(x - target.x, y - target.y);
      let score = 1 / (1 + d / 50) ** 2;
      if (f.hit) score *= 10 * (1 + (STEPS - f.ends) / STEPS);
      else if (f.ends < STEPS) score *= 0.2;
      return score;
    };

    // evolve at arm: roulette parents, one-point crossover, a few mutations
    let swarm = Array.from({ length: SWARM }, () =>
      Float32Array.from({ length: GENES }, () => Math.random() * Math.PI * 2),
    );
    const shown: Flight[][] = [];
    for (let g = 0; g < BREED; g++) {
      const flights = swarm.map(fly);
      if (SHOWN.includes(g)) shown.push(flights);
      const scores = flights.map(fitness);
      const sum = scores.reduce((a, b) => a + b, 0);
      const pick = () => {
        let r = Math.random() * sum;
        for (let i = 0; i < SWARM; i++)
          if ((r -= scores[i]) <= 0) return swarm[i];
        return swarm[SWARM - 1];
      };
      swarm = swarm.map(() => {
        const a = pick();
        const b = pick();
        const cut = Math.floor(Math.random() * GENES);
        return Float32Array.from({ length: GENES }, (_, k) =>
          Math.random() < MUTATE
            ? Math.random() * Math.PI * 2
            : k < cut
              ? a[k]
              : b[k],
        );
      });
    }
    // the last swarm shown always makes it: any straggler is steered home
    const final = shown[shown.length - 1];

    // each shown generation flies flyMs (quickening), gapMs after the last
    const windows = shown.map(
      (_, g) => flyMs * lerp([1.15, 0.8], g / (shown.length - 1)),
    );
    let clock = growMs;
    const launches = windows.map((ms) => {
      const at = clock;
      clock += ms + gapMs;
      return at;
    });
    const stepMs = shown.map((_, g) => windows[g] / STEPS);
    const ends = shown.flatMap((flights, g) =>
      flights.map((f, i) => ({
        g,
        i,
        ms: launches[g] + f.ends * stepMs[g],
        at: { x: f.path[f.ends * 2], y: f.path[f.ends * 2 + 1] },
        hit: f.hit || g === shown.length - 1,
      })),
    );
    for (const e of ends)
      if (e.g === shown.length - 1 && !final[e.i].hit) {
        e.at.x = target.x;
        e.at.y = target.y;
      }
    const endMs = Math.max(...ends.map((e) => e.ms));
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const launching = createBeats(
      launches,
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const ending = createBeats(
      ends,
      (e) => e.ms,
      (e, _, now) => {
        const lastOne = e.ms === endMs;
        if (e.hit) {
          const to = cover!.total() ?? target;
          if (lastOne) {
            cover!.blast(to);
            return;
          }
          cover!.burst(to, 0.4);
          cover!.launchFrom(to, ringTargets(to, COINS, COIN_RING));
        } else cover!.burst(e.at, 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(e.hit ? HIT_SHAKE : CRASH_SHAKE);
        sound(now);
      },
    );

    // a rocket at ms: along its steps, the last swarm's stragglers bent home
    const rocketAt = shown.map((flights, g) =>
      flights.map((f, i) => {
        const spot: Point = { x: 0, y: 0 };
        const end = ends.find((e) => e.g === g && e.i === i)!;
        return (ms: number): Point | null => {
          const t = (ms - launches[g]) / stepMs[g];
          if (t < 0 || t >= f.ends) return null;
          const s = Math.floor(t);
          const u = t - s;
          spot.x = lerp([f.path[s * 2], f.path[s * 2 + 2]], u);
          spot.y = lerp([f.path[s * 2 + 1], f.path[s * 2 + 3]], u);
          if (g === shown.length - 1 && !f.hit) {
            const k = (t / f.ends) ** 3;
            spot.x = lerp([spot.x, end.at.x], k);
            spot.y = lerp([spot.y, end.at.y], k);
          }
          return spot;
        };
      }),
    );
    const a: Point = { x: wallLeft, y: wallY };
    const b: Point = { x: wallRight, y: wallY };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launching.tick(ms, now);
          ending.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + 300) return;
          const slam = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - endMs) / 300);
          a.x = wallMid + (wallLeft - wallMid) * slam;
          b.x = wallMid + (wallRight - wallMid) * slam;
          drawBeam(ctx, a, b, WALL_W, 0.8 * fade);
          for (let g = 0; g < shown.length; g++) {
            if (ms < launches[g] || ms > launches[g] + windows[g]) continue;
            for (const at of rocketAt[g])
              drawWisp(
                ctx,
                at,
                ms,
                now,
                ROCKET,
                g === shown.length - 1 ? 1 : 0.5,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
