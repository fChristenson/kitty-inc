// the "Compactor" event (bounce; free upgrade levels): it covers its crit,
// whose click freezes the screen while two walls of light slam down at the
// ends of an income bar and a ball wisp drops in between; the walls close
// in on it and it ricochets between them ever faster as the gap shrinks,
// every bounce a splash and a boing, until they crush it onto the middle of
// the bar in a burst and a jolt of free levels; then the ball hops on to
// the next bar, quicker each time, the last crush landing in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawBounceSplash, type Bounce } from "../../../../shared/bounce";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "compactor";
const MAX_BARS = 4;
const OUT = 12;
const GAP = 26;
const ABOVE = 26;
const WALL_UP = 90;
const WALL_DOWN = 14;
const WALL_W = 7;
// px per ms, sped up at every bounce
const SPEED = 1.1;
const GAIN = 1.06;
const MAX_BOUNCES = 30;
const HOP = 22;
const DROP_MS = 180;
const SPLASH = 70;
const BOING_GAP_MS = 45;
const BOUNCE_SHAKE: [number, number] = [0.15, 0.4];
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Press {
  bar: RewardBar;
  y: number;
  // the walls' ends, closing on the middle from opens to crushes
  left: number;
  right: number;
  mid: number;
  rest: Point;
  opens: number;
  crushes: number;
  bounces: Bounce[];
}

export const forceCompactorEvent = registerWispEvent(
  KEY,
  "Compactor",
  () => CONFIG.compactorEvent.chance,
  (floor, context, area) => {
    const { closesMs, levelShare, holdMs, mergeMs } = CONFIG.compactorEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = DROP_MS;
    const presses: Press[] = bars.map((bar, k) => {
      const { box } = bar;
      const left = box.x - OUT;
      const right = box.x + box.width + OUT;
      const mid = box.x + box.width / 2;
      const y = box.y - ABOVE;
      const opens = clock;
      const closeMs = lerp(closesMs, k / Math.max(1, bars.length - 1));
      const crushes = opens + closeMs;
      // the walls close at a steady pace, so each next wall contact solves
      // a straight line meeting a straight line
      const inL = (mid - GAP / 2 - left) / closeMs;
      const inR = (right - GAP / 2 - mid) / closeMs;
      const bounces: Bounce[] = [];
      let x = mid;
      let t = opens;
      let dir = k % 2 ? -1 : 1;
      let speed = SPEED;
      while (bounces.length < MAX_BOUNCES) {
        const hit =
          dir > 0
            ? (right + inR * opens - x + speed * t) / (speed + inR)
            : (x - left + inL * opens + speed * t) / (speed + inL);
        if (hit >= crushes - 8) break;
        x = dir > 0 ? right - inR * (hit - opens) : left + inL * (hit - opens);
        t = hit;
        bounces.push({ at: { x, y }, ms: t, normal: dir > 0 ? Math.PI : 0 });
        dir = -dir;
        speed *= GAIN;
      }
      clock = crushes + DROP_MS;
      return {
        bar,
        y,
        left,
        right,
        mid,
        rest: { x: mid, y },
        opens,
        crushes,
        bounces,
      };
    });
    const last = presses[presses.length - 1];
    const endAt = last.crushes;
    const bounces = presses.flatMap((p) => p.bounces);
    const spot: Point = { x: 0, y: 0 };
    const sky: Point = { x: presses[0].mid, y: area.top - 40 };
    // dropping in, ricocheting, then hopping on to the next bar's middle
    const ballAt = (ms: number): Point => {
      let from = sky;
      let leaves = 0;
      for (const p of presses) {
        if (ms < p.opens) {
          const u = clamp01((ms - leaves) / (p.opens - leaves));
          spot.x = lerp([from.x, p.mid], u);
          spot.y = lerp([from.y, p.y], easeIn(u)) - 4 * HOP * 3 * u * (1 - u);
          return spot;
        }
        if (ms < p.crushes) {
          let at = p.mid;
          let since = p.opens;
          let leg = p.crushes - p.opens;
          let to = p.mid;
          for (const b of p.bounces) {
            if (ms < b.ms) {
              to = b.at.x;
              leg = b.ms - since;
              break;
            }
            at = b.at.x;
            since = b.ms;
            to = p.mid;
            leg = p.crushes - since;
          }
          const u = clamp01((ms - since) / (leg || 1));
          spot.x = lerp([at, to], u);
          spot.y = p.y - 4 * HOP * (leg / 300) * u * (1 - u);
          return spot;
        }
        from = p.rest;
        leaves = p.crushes;
      }
      spot.x = last.mid;
      spot.y = last.y;
      return spot;
    };
    const wall: Point = { x: 0, y: 0 };
    const wallTo: Point = { x: 0, y: 0 };

    let boing = -Infinity;
    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(BOUNCE_SHAKE, b.ms / endAt));
        if (b.ms - boing < BOING_GAP_MS) return;
        boing = b.ms;
        playBloop();
      },
    );
    const crushing = createBeats(
      presses,
      (p) => p.crushes,
      (p, k) => {
        const at = p.rest;
        cover!.levels(p.bar, levelsFor(p.bar.floor, levelShare, 2), at);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, presses.length - 1)));
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
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          crushing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          for (const p of presses) {
            if (ms < p.opens - DROP_MS || ms > p.crushes + 200) continue;
            const u = clamp01((ms - p.opens) / (p.crushes - p.opens));
            const alpha =
              ms > p.crushes
                ? 1 - (ms - p.crushes) / 200
                : clamp01((ms - p.opens + DROP_MS) / DROP_MS);
            const top = p.bar.box.y - WALL_UP;
            const bottom = p.bar.box.y + p.bar.box.height + WALL_DOWN;
            for (const side of [-1, 1]) {
              wall.x =
                side < 0
                  ? lerp([p.left, p.mid - GAP / 2], u)
                  : lerp([p.right, p.mid + GAP / 2], u);
              wall.y = top;
              wallTo.x = wall.x;
              wallTo.y = bottom;
              drawBeam(ctx, wall, wallTo, WALL_W * (1 + u), alpha);
            }
            if (ms >= p.crushes && ms < p.crushes + 200)
              drawBeamFlare(ctx, p.rest, 40, alpha, now);
          }
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWispBetween(ctx, ballAt, ms, now, WISP_SIZE * 0.4, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
