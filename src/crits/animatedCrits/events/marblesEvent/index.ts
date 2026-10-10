// the "Marbles" event (bounce; free hires): it covers its crit, whose click
// freezes the screen while a ring of glitter lays itself out in the middle
// of it with marble wisps scattered inside; a big shooter marble flicks in
// from outside and cracks into one, knocking it bouncing out over the ring's
// edge and arcing down onto an empty spot as a new worker, the shooter
// rolling to a stop where it hit; it flicks again from there, quicker each
// time, every crack a splash, a click and a jolt, until the ring is cleared,
// the last landing in a big blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "marbles";
const MAX_MARBLES = 5;
// the ring: this far down the screen, RX by RY px, drawn in RING_DOTS glints
const RING_AT = 0.4;
const RX = 190;
const RY = 110;
const RING_DOTS = 44;
const RING_DOT = 11;
const MARBLE = WISP_SIZE * 0.7;
const SHOOTER = WISP_SIZE;
// the shooter rolls on this far past each hit
const ROLL = 50;
const HOP: [number, number] = [40, 220];
const HIT_SHAKE: [number, number] = [0.4, 0.8];
const LAND_SHAKE = 0.6;

interface Shot {
  hire: RewardHire;
  marble: Point;
  from: Point;
  fires: number;
  hits: number;
  rest: Point;
  knocked: BouncePath;
}

export const forceMarblesEvent = registerWispEvent(
  KEY,
  "Marbles",
  () => CONFIG.marblesEvent.chance,
  (floor, context, area) => {
    const { growMs, shotMs, pauseMs, knockMs, dropMs, holdMs, mergeMs } =
      CONFIG.marblesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_MARBLES);
    if (hires.length === 0) return;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: lerp([area.top, area.bottom], RING_AT),
    };
    // marbles spread round inside the ring
    const marbles: Point[] = hires.map((_, k) => {
      const a = (k / hires.length) * Math.PI * 2 + Math.random() * 0.6;
      const r = 0.35 + 0.25 * Math.random();
      return {
        x: centre.x + Math.cos(a) * RX * r,
        y: centre.y + Math.sin(a) * RY * r,
      };
    });
    // where a line from p along (dx, dy) leaves the ring
    const exitFrom = (p: Point, dx: number, dy: number): Point => {
      const px = (p.x - centre.x) / RX;
      const py = (p.y - centre.y) / RY;
      const qx = dx / RX;
      const qy = dy / RY;
      const a = qx * qx + qy * qy;
      const b = 2 * (px * qx + py * qy);
      const c = px * px + py * py - 1;
      const t = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
      return { x: p.x + dx * t, y: p.y + dy * t };
    };

    let from: Point = { x: centre.x - RX - 80, y: centre.y + RY + 40 };
    let clock: number = growMs;
    const shots: Shot[] = hires.map((hire, k) => {
      const pace = lerp([1.2, 0.7], k / Math.max(1, hires.length - 1));
      const marble = marbles[k];
      const fires = clock;
      const hits = fires + shotMs * pace;
      const dx = marble.x - from.x;
      const dy = marble.y - from.y;
      const d = Math.hypot(dx, dy) || 1;
      const rest = {
        x: marble.x - (dy / d) * ROLL * 0.5 - (dx / d) * 10,
        y: marble.y + (dx / d) * ROLL * 0.5,
      };
      const exit = exitFrom(marble, dx / d, dy / d);
      const knocked = hops(
        [marble, exit, { x: hire.x, y: hire.y }],
        [knockMs, dropMs],
        HOP,
        hits,
      );
      const shot = { hire, marble, from, fires, hits, rest, knocked };
      from = rest;
      clock = hits + pauseMs * pace;
      return shot;
    });
    const last = shots[shots.length - 1];
    const endMs = last.knocked.endMs;
    const splashes: Bounce[] = shots.flatMap((s) => [
      { at: s.marble, ms: s.hits, normal: -Math.PI / 2 },
      s.knocked.bounces[0],
    ]);

    const firing = createBeats(
      shots,
      (s) => s.fires,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const cracking = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.burst(s.marble, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
      },
    );
    const landing = createBeats(
      shots,
      (s) => s.knocked.endMs,
      (s) => {
        giveHire(s.hire);
        const at = { x: s.hire.x, y: s.hire.y };
        if (s === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        playBloop();
      },
    );

    const shooter: Point = { x: 0, y: 0 };
    const shooterAt = (ms: number): Point | null => {
      if (ms < 0 || ms > endMs) return null;
      for (let k = shots.length - 1; k >= 0; k--) {
        const s = shots[k];
        if (ms < s.fires) continue;
        if (ms < s.hits) {
          const u = easeIn((ms - s.fires) / (s.hits - s.fires));
          shooter.x = lerp([s.from.x, s.marble.x], u);
          shooter.y = lerp([s.from.y, s.marble.y], u);
        } else {
          const u = easeOut(clamp01((ms - s.hits) / 150));
          shooter.x = lerp([s.marble.x, s.rest.x], u);
          shooter.y = lerp([s.marble.y, s.rest.y], u);
        }
        return shooter;
      }
      shooter.x = shots[0].from.x;
      shooter.y = shots[0].from.y;
      return shooter;
    };
    const marbleAt = shots.map((s) => (ms: number): Point | null => {
      if (ms > s.knocked.endMs) return null;
      return ms < s.hits ? s.marble : s.knocked.at(ms);
    });
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          firing.tick(ms, now);
          cracking.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - last.hits) / 500);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let k = 0; k < RING_DOTS; k++) {
            const a = (k / RING_DOTS) * Math.PI * 2;
            stampGlimmer(
              ctx,
              centre.x + Math.cos(a) * RX * pop,
              centre.y + Math.sin(a) * RY * pop,
              RING_DOT * fade,
              a + now / 900,
              k % 2 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
          for (const b of splashes)
            drawBounceSplash(ctx, b, ms - b.ms, 110, now);
          for (const at of marbleAt)
            drawWisp(ctx, at, ms, now, MARBLE * pop, 0.6);
          drawWisp(ctx, shooterAt, ms, now, SHOOTER * fade, 0.9);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
