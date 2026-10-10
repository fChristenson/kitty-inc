// the "Bar Billiards" event (bounce; levels): it covers its crit, whose
// click freezes the screen while a ball wisp drops into the clicked floor's
// income bar and ricochets about inside it like a ball in a pill-shaped
// box, banking off its long sides and round its curved ends, quicker and
// quicker, every bounce a splash, a boing and a jolt that lands free
// levels; at full tilt it smashes up out through the top of the bar in a
// huge blast and a big batch of levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBounceSplash, type Bounce } from "../../../../shared/bounce";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "barBilliards";
const BOUNCES = 16;
// px the ball keeps inside the bar's rim, its first speed (px/ms) and the
// gain on every bounce, and its first heading
const INSET = 14;
const SPEED = 0.9;
const GAIN = 1.07;
const HEADING = -0.45;
const DROP = 260;
const EXIT = 360;
const BALL = WISP_SIZE * 0.55;
const SPLASH = 70;
const BOUNCE_SHAKE: [number, number] = [0.25, 0.75];

interface Leg {
  from: Point;
  to: Point;
  starts: number;
  ends: number;
}

export const forceBarBilliardsEvent = registerWispEvent(
  KEY,
  "Bar Billiards",
  () => CONFIG.barBilliardsEvent.chance,
  (floor, context) => {
    const { dropMs, exitMs, levelShare, holdMs, mergeMs } =
      CONFIG.barBilliardsEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    // the bar as a stadium: straight sides between two half circles
    const r = bar.box.height / 2 - INSET;
    const cy = bar.center.y;
    const xL = bar.box.x + bar.box.height / 2;
    const xR = bar.box.x + bar.box.width - bar.box.height / 2;
    const ends = [
      { x: xL, y: cy },
      { x: xR, y: cy },
    ];
    const legs: Leg[] = [];
    const bounces: Bounce[] = [];
    const entry: Point = { x: lerp([xL, xR], 0.3), y: cy };
    legs.push({
      from: { x: entry.x, y: cy - DROP },
      to: entry,
      starts: 0,
      ends: dropMs,
    });
    let p = entry;
    let vx = Math.cos(HEADING) * SPEED;
    let vy = Math.sin(HEADING) * SPEED;
    let clock: number = dropMs;
    for (let k = 0; k < BOUNCES; k++) {
      // the first wall it reaches: a long side, or a curved end
      let t = Infinity;
      let nx = 0;
      let ny = 0;
      if (vy !== 0) {
        const wall = vy > 0 ? cy + r : cy - r;
        const tw = (wall - p.y) / vy;
        const x = p.x + vx * tw;
        if (tw > 1e-6 && x >= xL && x <= xR) {
          t = tw;
          nx = 0;
          ny = vy > 0 ? -1 : 1;
        }
      }
      for (const c of ends) {
        // |p + v t - c| = r
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const a = vx * vx + vy * vy;
        const b = 2 * (dx * vx + dy * vy);
        const q = dx * dx + dy * dy - r * r;
        const disc = b * b - 4 * a * q;
        if (disc < 0) continue;
        const tc = (-b + Math.sqrt(disc)) / (2 * a);
        const hx = p.x + vx * tc;
        const onCap = c === ends[0] ? hx <= xL : hx >= xR;
        if (tc > 1e-6 && tc < t && onCap) {
          t = tc;
          nx = -(hx - c.x) / r;
          ny = -(p.y + vy * tc - c.y) / r;
        }
      }
      if (!Number.isFinite(t)) break;
      const to: Point = { x: p.x + vx * t, y: p.y + vy * t };
      legs.push({ from: p, to, starts: clock, ends: clock + t });
      clock += t;
      bounces.push({ at: to, ms: clock, normal: Math.atan2(ny, nx) });
      const dot = vx * nx + vy * ny;
      vx = (vx - 2 * dot * nx) * GAIN;
      vy = (vy - 2 * dot * ny) * GAIN;
      p = to;
    }
    const breaksAt = clock;
    const out: Point = { x: p.x, y: cy - EXIT };
    legs.push({ from: p, to: out, starts: clock, ends: clock + exitMs });
    const endAt = clock + exitMs;
    const spot: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point => {
      const t = Math.max(0, ms);
      const leg = legs.find((l) => t < l.ends) ?? legs[legs.length - 1];
      const u = clamp01((t - leg.starts) / (leg.ends - leg.starts));
      const e = leg === legs[0] ? easeIn(u) : u;
      spot.x = lerp([leg.from.x, leg.to.x], e);
      spot.y = lerp([leg.from.y, leg.to.y], e);
      return spot;
    };
    const top: Point = { x: p.x, y: bar.box.y };

    const dropping = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const bouncing = createBeats(
      bounces,
      (b) => b.ms,
      (b, k) => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), {
          x: b.at.x - Math.cos(b.normal) * 40,
          y: b.at.y - Math.sin(b.normal) * 40,
        });
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, bounces.length - 1)));
      },
    );
    const breaking = createBeats(
      [breaksAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 4, 3), top);
        cover!.slam(bar);
        cover!.blast(top);
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
          dropping.tick(ms, now);
          bouncing.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          for (const b of bounces)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWispBetween(
            ctx,
            ballAt,
            ms,
            now,
            BALL,
            clamp01(ms / breaksAt),
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
