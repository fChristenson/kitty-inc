// the "Convex Hull" event (experiment: the gift-wrapping algorithm; cash): it
// covers its crit, whose click freezes the screen while glittering pins pop
// up all over the screen; a wisp on the leftmost pin sweeps an aim laser
// round until it touches the next pin out, and a band of light snaps taut
// between them, then again from there, faster and faster, wrapping the
// outermost pins in the tightest band round them all, every pin it locks a
// flash, a pop, a jolt and a spray of coins; then the band snaps in like
// elastic, scooping up every pin inside as it passes, into one ball that
// shoots into the total in a huge blast. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawAimLaser, drawBeam } from "../../../../shared/beam";
import { totalSpot } from "../../cashFlow";

const KEY = "convexHull";
const REWARD = 4;
const PINS = 30;
const MARGIN = 70;
const SPACING = 70;
const PIN = 13;
const POP_MS = 120;
const BAND = 8;
const LOCK_COINS = 6;
const CATCH_COINS = 3;
const REACH: [number, number] = [50, 140];
const WRAPPER = 0.55;
const BALL = 0.9;
const DASH_MS = 220;
const BLOOP_GAP_MS = 70;
const LOCK_SHAKE: [number, number] = [0.4, 0.9];
const SNAP_SHAKE = 1.2;

// the outermost points, in order round them (Andrew's monotone chain)
function hullOf(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (
        out.length >= 2 &&
        cross(out[out.length - 2], out[out.length - 1], p) <= 0
      )
        out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

// how far from c the polygon's edge lies along (dx, dy), a unit direction
function edgeDistance(c: Point, dx: number, dy: number, hull: Point[]): number {
  let best = Infinity;
  for (let k = 0; k < hull.length; k++) {
    const a = hull[k];
    const b = hull[(k + 1) % hull.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - c.x) * ey - (a.y - c.y) * ex) / den;
    const u = ((a.x - c.x) * dy - (a.y - c.y) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  return best;
}

export const forceConvexHullEvent = registerWispEvent(
  KEY,
  "Convex Hull",
  () => CONFIG.convexHullEvent.chance,
  (floor, context, area) => {
    const { pinMs, wrapMs, snapMs, holdMs, mergeMs } = CONFIG.convexHullEvent;
    const total = totalSpot(area);
    const pins: Point[] = [];
    for (let tries = 0; pins.length < PINS && tries < PINS * 40; tries++) {
      const p = {
        x:
          area.left +
          MARGIN +
          Math.random() * (area.right - area.left - MARGIN * 2),
        y:
          area.top +
          MARGIN * 2 +
          Math.random() * (area.bottom - area.top - MARGIN * 3),
      };
      if (pins.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= SPACING))
        pins.push(p);
    }
    const hull = hullOf(pins);
    const n = hull.length;
    if (n < 3) return;
    const pops = pins.map((_, i) => (pinMs * i) / pins.length);
    const angle = (a: Point, b: Point) => Math.atan2(b.y - a.y, b.x - a.x);
    // step k sweeps round from hull[k] onto hull[k + 1]
    const steps: {
      from: Point;
      to: Point;
      turnFrom: number;
      turn: number;
      starts: number;
      locks: number;
    }[] = [];
    let clock: number = pinMs + POP_MS;
    for (let k = 0; k < n; k++) {
      const from = hull[k];
      const to = hull[(k + 1) % n];
      const turnFrom = angle(hull[(k - 1 + n) % n], from);
      let turn = angle(from, to) - turnFrom;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn <= -Math.PI) turn += Math.PI * 2;
      const ms = lerp(wrapMs, k / (n - 1));
      steps.push({
        from,
        to,
        turnFrom,
        turn,
        starts: clock,
        locks: clock + ms,
      });
      clock += ms;
    }
    const wrapped = clock;
    const snapped = wrapped + snapMs;
    const landsAt = snapped + DASH_MS;
    const endAt = landsAt + 200;
    const centre: Point = {
      x: hull.reduce((s, p) => s + p.x, 0) / n,
      y: hull.reduce((s, p) => s + p.y, 0) / n,
    };
    // the band's share of its full size as it snaps in
    const shrink = (ms: number) => 1 - easeIn(clamp01((ms - wrapped) / snapMs));
    const msAtShrink = (s: number) =>
      wrapped + snapMs * Math.sqrt(clamp01(1 - s));
    // each pin is caught when the shrinking band reaches it, then rides it
    const catches = pins.map((p) => {
      const d = Math.hypot(p.x - centre.x, p.y - centre.y) || 1;
      const edge = edgeDistance(
        centre,
        (p.x - centre.x) / d,
        (p.y - centre.y) / d,
        hull,
      );
      const ratio = Math.min(1, d / edge);
      return { pin: p, ratio, ms: msAtShrink(ratio) };
    });
    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < snapped || ms > landsAt) return null;
      const u = easeIn((ms - snapped) / DASH_MS);
      ball.x = lerp([centre.x, total.x], u);
      ball.y = lerp([centre.y, total.y], u);
      return ball;
    };
    const wrapper: Point = { x: 0, y: 0 };
    const wrapperAt = (ms: number): Point | null => {
      const step = steps.find((s) => ms < s.locks) ?? steps[n - 1];
      if (ms < steps[0].starts - POP_MS || ms > wrapped) return null;
      wrapper.x = step.from.x;
      wrapper.y = step.from.y;
      return wrapper;
    };

    let bloop = -Infinity;
    const locking = createBeats(
      steps,
      (s) => s.locks,
      (s, k) => {
        cover!.burst(s.to, 0.45);
        cover!.launchFrom(
          s.to,
          clampTargetsY(
            sprayTargets(s.to, LOCK_COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LOCK_SHAKE, k / (n - 1)));
      },
    );
    const catching = createBeats(
      catches.filter((c) => !hull.includes(c.pin)),
      (c) => c.ms,
      (c) => {
        const at = pinAt(pins.indexOf(c.pin), c.ms, { x: 0, y: 0 });
        cover!.launchFrom(at, sprayTargets(at, CATCH_COINS, REACH));
        if (!cover!.isLive() || c.ms - bloop < BLOOP_GAP_MS) return;
        bloop = c.ms;
        playBloop();
      },
    );
    const snapping = createBeats(
      [wrapped],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SNAP_SHAKE);
      },
    );
    const landing = createBeats(
      [landsAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const pinAt = (i: number, ms: number, into: Point): Point => {
      const p = pins[i];
      const s = Math.min(1, shrink(ms) / catches[i].ratio);
      into.x = centre.x + (p.x - centre.x) * s;
      into.y = centre.y + (p.y - centre.y) * s;
      return into;
    };
    const spot: Point = { x: 0, y: 0 };
    const corner1: Point = { x: 0, y: 0 };
    const corner2: Point = { x: 0, y: 0 };
    const aim: Point = { x: 0, y: 0 };
    const laser = Math.hypot(area.right - area.left, area.bottom - area.top);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          locking.tick(ms, now);
          catching.tick(ms, now);
          snapping.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          if (ms < snapped) {
            const s = shrink(ms);
            for (let i = 0; i < pins.length; i++) {
              if (ms < pops[i]) continue;
              const pop = easeOut(clamp01((ms - pops[i]) / POP_MS));
              pinAt(i, ms, spot);
              drawGlitterLight(ctx, spot.x, spot.y, PIN * pop, i, 1, now);
            }
            // the band: locked edges, shrinking toward the middle once wrapped
            for (const step of steps) {
              if (ms < step.locks) break;
              corner1.x = centre.x + (step.from.x - centre.x) * s;
              corner1.y = centre.y + (step.from.y - centre.y) * s;
              corner2.x = centre.x + (step.to.x - centre.x) * s;
              corner2.y = centre.y + (step.to.y - centre.y) * s;
              drawBeam(ctx, corner1, corner2, BAND, 0.9);
            }
            const step = steps.find((st) => ms >= st.starts && ms < st.locks);
            if (step) {
              const u = smoothstep(
                clamp01((ms - step.starts) / (step.locks - step.starts)),
              );
              const a = step.turnFrom + step.turn * u;
              aim.x = step.from.x + Math.cos(a) * laser;
              aim.y = step.from.y + Math.sin(a) * laser;
              drawAimLaser(ctx, step.from, aim);
            }
            drawWispHead(ctx, wrapperAt, ms, now, WISP_SIZE * WRAPPER, 0.7);
          }
          drawWisp(ctx, ballAt, ms, now, WISP_SIZE * BALL, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
