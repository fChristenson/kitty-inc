// the "Whispering Gallery" event (bounce; a free floor): it covers its crit,
// whose click freezes the screen while an ellipse of light draws itself
// round the clicked floor's button and the locked floor above, the two
// sitting at its foci; a ball wisp shoots off the button and banks off the
// ellipse's wall, and like a whisper across a whispering gallery every
// chord it flies passes through a focus, through the lock with a crack and
// a jolt, back through the button, faster each time, its path closing in
// on the long axis, until it slams into the lock and bursts it open in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam } from "../../shared/beam";
import { drawBounceSplash, ricochetThrough } from "../../shared/bounce";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "whisperingGallery";
// wall contacts (odd, so the last chord runs through the lock)
const BOUNCES = 7;
const ECCENTRICITY = 0.86;
// the launch's angle off the long axis
const LAUNCH = 1.2;
const SEGMENTS = 56;
const WALL = 10;
const BALL = 0.55;
const FOCUS = 0.45;
const SPLASH = 90;
const BOUNCE_SHAKE = 0.3;
const LOCK_SHAKE: [number, number] = [0.6, 1.2];

export const forceWhisperingGalleryEvent = registerWispEvent(
  KEY,
  "Whispering Gallery",
  () => CONFIG.whisperingGalleryEvent.chance,
  (floor, context) => {
    const { drawMs, legsMs, holdMs, mergeMs } = CONFIG.whisperingGalleryEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const centre: Point = {
      x: (button.x + lock.x) / 2,
      y: (button.y + lock.y) / 2,
    };
    const c = Math.hypot(lock.x - button.x, lock.y - button.y) / 2;
    const a = c / ECCENTRICITY;
    const b = Math.sqrt(a * a - c * c);
    const axis = Math.atan2(lock.y - button.y, lock.x - button.x);
    const cos = Math.cos(axis);
    const sin = Math.sin(axis);

    // where a ray from p along d leaves the ellipse
    const wallHit = (p: Point, dx: number, dy: number): Point => {
      const px = cos * (p.x - centre.x) + sin * (p.y - centre.y);
      const py = -sin * (p.x - centre.x) + cos * (p.y - centre.y);
      const ex = cos * dx + sin * dy;
      const ey = -sin * dx + cos * dy;
      const qa = (ex * ex) / (a * a) + (ey * ey) / (b * b);
      const qb = 2 * ((px * ex) / (a * a) + (py * ey) / (b * b));
      const qc = (px * px) / (a * a) + (py * py) / (b * b) - 1;
      const t = (-qb + Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa);
      return { x: p.x + dx * t, y: p.y + dy * t };
    };
    // every chord off the wall runs through the other focus
    const points: Point[] = [button];
    let p = wallHit(button, Math.cos(axis + LAUNCH), Math.sin(axis + LAUNCH));
    points.push(p);
    for (let k = 1; k < BOUNCES; k++) {
      const focus = k % 2 === 1 ? lock : button;
      const dx = focus.x - p.x;
      const dy = focus.y - p.y;
      const length = Math.hypot(dx, dy) || 1;
      p = wallHit(p, dx / length, dy / length);
      points.push(p);
    }
    points.push(lock);
    const path = ricochetThrough(points, legsMs, drawMs);
    const legs = points.length - 1;
    const starts: number[] = [drawMs];
    for (let k = 0; k < legs; k++)
      starts.push(starts[k] + lerp(legsMs, k / Math.max(1, legs - 1)));
    // through the lock on every odd chord, the button on every even one
    const passes: { ms: number; lock: boolean }[] = [];
    for (let k = 1; k < legs - 1; k++) {
      const from = points[k];
      const to = points[k + 1];
      const focus = k % 2 === 1 ? lock : button;
      const share =
        Math.hypot(focus.x - from.x, focus.y - from.y) /
        (Math.hypot(to.x - from.x, to.y - from.y) || 1);
      passes.push({
        ms: lerp([starts[k], starts[k + 1]], share),
        lock: focus === lock,
      });
    }
    const walls = path.bounces.slice(0, -1);
    const endAt = path.endMs + 400;
    const ring: Point[] = Array.from({ length: SEGMENTS + 1 }, (_, i) => {
      const t = (i / SEGMENTS) * Math.PI * 2;
      const x = Math.cos(t) * a;
      const y = Math.sin(t) * b;
      return {
        x: centre.x + cos * x - sin * y,
        y: centre.y + sin * x + cos * y,
      };
    });

    const ballAt = (ms: number): Point | null =>
      ms < drawMs || ms > path.endMs ? null : path.at(ms);
    const lockAt = () => lock;
    const buttonAt = () => button;

    const bouncing = createBeats(
      walls,
      (w) => w.ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BOUNCE_SHAKE);
      },
    );
    const passing = createBeats(
      passes,
      (s) => s.ms,
      (s, k) => {
        if (!s.lock) return;
        cover!.burst(lock, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LOCK_SHAKE, k / Math.max(1, passes.length - 1)));
      },
    );
    const breaking = createBeats(
      [path.endMs],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          passing.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const shown = Math.round(SEGMENTS * clamp01(ms / drawMs));
          const fade = 1 - clamp01((ms - path.endMs) / 300);
          for (let i = 1; i <= shown; i++)
            drawBeam(ctx, ring[i - 1], ring[i], WALL, 0.55 * fade);
          if (ms <= path.endMs) {
            drawWispHead(ctx, buttonAt, ms, now, WISP_SIZE * FOCUS, 0.3);
            drawWispHead(ctx, lockAt, ms, now, WISP_SIZE * FOCUS, 0.3);
          }
          for (const w of walls) drawBounceSplash(ctx, w, ms - w.ms, SPLASH, now);
          drawWisp(ctx, ballAt, ms, now, WISP_SIZE * BALL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
