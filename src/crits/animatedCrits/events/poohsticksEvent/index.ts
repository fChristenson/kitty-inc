// the "Poohsticks" event (mix; free hires and cash): it covers its crit,
// whose click freezes the screen while a broad river of cash pours out of
// the clicked floor's button and winds back and forth up the screen into
// the total; three stick wisps plop into it with a splash and race along on
// the current, bobbing and drifting, the lead swapping as the water
// carries one past another, every overtake a swish and a jolt; at the
// finish each leaps out of the river in turn and lands on an empty spot as
// a new worker, the last in a huge blast, while the river drains into the
// total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { alongRoute, bezier } from "../../../../shared/curves";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  measure,
  pointAlong,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "poohsticks";
const REWARD = 3;
const STICKS = 3;
// the river's bends and how far either side of the middle they swing (a
// share of the screen's width), and its width
const BENDS = 4;
const SWING = 0.34;
const RIVER_W = 80;
// each stick's speed wobbles this much either way, and it bobs this far
// across the river
const SURGE = 0.45;
const BOB = 0.3;
const STEP_MS = 8;
const DROP_LIFT = 320;
const DROP_GAP_MS = 90;
const LEAP_LIFT = 260;
const SIZE = WISP_SIZE * 0.75;
const OVERTAKE_GAP_MS = 140;
const SPLASH_SHAKE = 0.5;
const OVERTAKE_SHAKE = 0.45;
const HIRE_SHAKE = 0.9;

interface Stick {
  dropsAt: number;
  racesAt: number;
  finishAt: number;
  landsAt: number;
  // its spot on the river every STEP_MS from racesAt
  xs: Float32Array;
  ys: Float32Array;
  hire: number;
  at: (ms: number) => Point | null;
}

export const forcePoohsticksEvent = registerWispEvent(
  KEY,
  "Poohsticks",
  () => CONFIG.poohsticksEvent.chance,
  (floor, context, area) => {
    const { travelMs, streamMs, dropMs, raceMs, leapMs, holdMs, mergeMs } =
      CONFIG.poohsticksEvent;
    const hires = findRewardHires(floor, context).slice(0, STICKS);
    if (hires.length === 0) return;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const w = area.right - area.left;
    const cx = (area.left + area.right) / 2;
    const route: Point[] = [button];
    for (let b = 1; b <= BENDS; b++)
      route.push({
        x: cx + (b % 2 ? -1 : 1) * SWING * w,
        y: lerp([button.y, fallback.y], b / (BENDS + 1)),
      });
    route.push(fallback);
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }));
    const along = measure(line);
    const pour: Pour = {
      coinsAlong: 1_800,
      width: RIVER_W,
      streamMs,
      travelMs,
    };

    // each stick drifts down the river on its own surging current
    const here: Point = { x: 0, y: 0 };
    const ahead: Point = { x: 0, y: 0 };
    const sticks: Stick[] = Array.from({ length: STICKS }, (_, k) => {
      const dropsAt = dropMs + k * DROP_GAP_MS;
      const racesAt = dropsAt + DROP_GAP_MS * 2;
      const phase = Math.random() * Math.PI * 2;
      const period = 500 + Math.random() * 400;
      const bobPhase = Math.random() * Math.PI * 2;
      const xs: number[] = [];
      const ys: number[] = [];
      let s = 0;
      let t = 0;
      while (s < 1) {
        pointAlong(line, along, s, here);
        pointAlong(line, along, s + 0.01, ahead);
        const dx = ahead.x - here.x;
        const dy = ahead.y - here.y;
        const d = Math.hypot(dx, dy) || 1;
        const off = BOB * RIVER_W * Math.sin(t / 180 + bobPhase);
        xs.push(here.x - (dy / d) * off);
        ys.push(here.y + (dx / d) * off);
        s +=
          (STEP_MS / raceMs) *
          (1 + SURGE * Math.sin((t / period) * Math.PI * 2 + phase));
        t += STEP_MS;
      }
      const finishAt = racesAt + t;
      return {
        dropsAt,
        racesAt,
        finishAt,
        landsAt: finishAt + leapMs,
        xs: Float32Array.from(xs),
        ys: Float32Array.from(ys),
        hire: -1,
        at: () => null,
      };
    });
    // the finishers in order, each onto the next free spot
    const finishers = sticks
      .map((_, k) => k)
      .sort((a, b) => sticks[a].finishAt - sticks[b].finishAt);
    finishers.forEach((k, r) => (sticks[k].hire = r < hires.length ? r : -1));
    const spot: Point = { x: 0, y: 0 };
    for (const stick of sticks) {
      const n = stick.xs.length;
      const start: Point = { x: line[0].x, y: line[0].y - DROP_LIFT };
      const end: Point = { x: stick.xs[n - 1], y: stick.ys[n - 1] };
      const hire = stick.hire >= 0 ? hires[stick.hire] : null;
      const to: Point = hire ? { x: hire.x, y: hire.y - 40 } : fallback;
      const peak: Point = {
        x: (end.x + to.x) / 2,
        y: Math.min(end.y, to.y) - LEAP_LIFT,
      };
      const at = (ms: number): Point | null => {
        if (ms < stick.dropsAt || ms > stick.landsAt) return null;
        if (ms < stick.racesAt) {
          const u = (ms - stick.dropsAt) / (stick.racesAt - stick.dropsAt);
          spot.x = lerp([start.x, stick.xs[0]], u);
          spot.y = lerp([start.y, stick.ys[0]], easeIn(u));
          return spot;
        }
        if (ms < stick.finishAt) {
          const f = (ms - stick.racesAt) / STEP_MS;
          const i = Math.min(n - 2, Math.floor(f));
          const u = Math.min(1, f - i);
          spot.x = lerp([stick.xs[i], stick.xs[i + 1]], u);
          spot.y = lerp([stick.ys[i], stick.ys[i + 1]], u);
          return spot;
        }
        return bezier(
          end,
          peak,
          to,
          clamp01((ms - stick.finishAt) / leapMs),
          spot,
        );
      };
      // each stick needs its own point: the trail samples it at past ms
      const own: Point = { x: 0, y: 0 };
      stick.at = (ms) => {
        const p = at(ms);
        if (!p) return null;
        own.x = p.x;
        own.y = p.y;
        return own;
      };
    }
    // the lead changing hands
    const overtakes: number[] = [];
    const progress = (stick: Stick, ms: number) =>
      ms < stick.racesAt
        ? -1
        : Math.min(1, (ms - stick.racesAt) / (stick.finishAt - stick.racesAt));
    const lastFinish = Math.max(...sticks.map((s) => s.finishAt));
    let leader = -1;
    for (let ms = sticks[STICKS - 1].racesAt; ms < lastFinish; ms += STEP_MS) {
      let best = 0;
      for (let k = 1; k < STICKS; k++)
        if (progress(sticks[k], ms) > progress(sticks[best], ms)) best = k;
      if (leader >= 0 && best !== leader) {
        const prev = overtakes[overtakes.length - 1] ?? -Infinity;
        if (ms - prev >= OVERTAKE_GAP_MS) overtakes.push(ms);
      }
      leader = best;
    }
    const lastLands = Math.max(...sticks.map((s) => s.landsAt));
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      lastLands + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        pourLine(cover!, line, pour);
        playSwoosh();
      },
    );
    const splashing = createBeats(
      sticks,
      (s) => s.racesAt,
      (s) => {
        cover!.burst({ x: s.xs[0], y: s.ys[0] }, 0.45);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SPLASH_SHAKE);
      },
    );
    const overtaking = createBeats(
      overtakes,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(OVERTAKE_SHAKE);
      },
    );
    const leaping = createBeats(
      sticks,
      (s) => s.finishAt,
      (s) => {
        cover!.burst(
          { x: s.xs[s.xs.length - 1], y: s.ys[s.ys.length - 1] },
          0.5,
        );
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      sticks,
      (s) => s.landsAt,
      (s) => {
        const hire = s.hire >= 0 ? hires[s.hire] : null;
        const at = hire ? { x: hire.x, y: hire.y - 40 } : fallback;
        if (hire) giveHire(hire);
        if (s.landsAt >= lastLands) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIRE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          splashing.tick(ms, now);
          overtaking.tick(ms, now);
          leaping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > lastLands + 600) return;
          for (const s of sticks)
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              SIZE,
              0.6,
              s.dropsAt,
              s.landsAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
