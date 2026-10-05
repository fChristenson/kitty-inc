// the "Centipede" event (gunfire; worker perma tiers): it covers its crit,
// whose click freezes the screen while a centipede of wisps scuttles in
// across the top of the screen like the old arcade game, bobbing segment
// by segment, sweeping edge to edge and turning down a row at every wall;
// the clicked floor's button turns gun and picks it off from the front,
// shot after shot, each hit segment popping off in a flash and a jolt and
// dropping onto a worker, who climbs a perma tier; the last shot blows the
// head apart in a huge blast and its pieces rain onto every worker left.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardWorkers, type RewardWorker } from "../eventRewards";

const KEY = "centipede";
const MAX_BODY = 12;
const HEAD = WISP_SIZE * 1.2;
const BODY = WISP_SIZE * 0.85;
// px between segments along the track, and their bob
const SPACING = 64;
const WIGGLE = 7;
// the track: ROWS rows ROW_H of the screen apart from TOP down, MARGIN in
// from the edges, sampled every STEP px
const ROWS = 4;
const ROW_H = 0.09;
const TOP = 0.1;
const MARGIN = 90;
const STEP = 6;
// the first and last shots' hits as shares of the crawl
const FIRST_HIT = 0.3;
const LAST_HIT = 0.9;
const BULLET_SPEED = 5;
const BULLET = WISP_SIZE * 0.5;
const MUZZLE_MS = 120;
const MUZZLE = 90;
// a shot segment pops up this far before dropping onto its worker; the
// head's pieces land this far apart
const POP = 140;
const PIECE_GAP = 45;
const SHOT_SHAKE = 0.2;
const HIT_SHAKE = 0.55;
const LAND_SHAKE = 0.3;
const SOUND_GAP_MS = 50;

interface Kill {
  segment: number;
  at: Point;
  ms: number;
  bullet: Bullet;
}

interface Drop {
  from: Point;
  worker: RewardWorker;
  startMs: number;
  landsMs: number;
  at: (ms: number) => Point | null;
}

export const forceCentipedeEvent = registerWispEvent(
  KEY,
  "Centipede",
  () => CONFIG.centipedeEvent.chance,
  (floor, context, area) => {
    const { crawlMs, dropMs, holdMs, mergeMs } = CONFIG.centipedeEvent;
    const workers = findRewardWorkers(floor, context);
    if (workers.length < 2) return;
    const body = Math.min(MAX_BODY, workers.length - 1);
    const gun = getButtonCenter(context.isGroundFloor);

    // the track: in from off the left, then rows joined by half-turns
    const left = area.left + MARGIN;
    const right = area.right - MARGIN;
    const rowH = (area.bottom - area.top) * ROW_H;
    const r = rowH / 2;
    const y0 = area.top + (area.bottom - area.top) * TOP;
    const xs: number[] = [];
    const ys: number[] = [];
    const line = (x0: number, ya: number, x1: number, yb: number) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, yb - ya) / STEP));
      for (let k = 0; k < n; k++) {
        xs.push(x0 + ((x1 - x0) * k) / n);
        ys.push(ya + ((yb - ya) * k) / n);
      }
    };
    const arc = (cx: number, cy: number, a0: number, a1: number) => {
      const n = Math.max(1, Math.round((Math.abs(a1 - a0) * r) / STEP));
      for (let k = 0; k < n; k++) {
        const a = a0 + ((a1 - a0) * k) / n;
        xs.push(cx + Math.cos(a) * r);
        ys.push(cy + Math.sin(a) * r);
      }
    };
    line(left - (body + 2) * SPACING, y0, right - r, y0);
    for (let row = 0; row < ROWS; row++) {
      const y = y0 + row * rowH;
      const last = row === ROWS - 1;
      if (row % 2 === 0) {
        if (row > 0) line(left + r, y, right - r, y);
        if (!last) arc(right - r, y + r, -Math.PI / 2, Math.PI / 2);
      } else {
        line(right - r, y, left + r, y);
        if (!last) arc(left + r, y + r, (3 * Math.PI) / 2, Math.PI / 2);
      }
    }
    const length = (xs.length - 1) * STEP;
    const speed = length / crawlMs;
    const track = (s: number, into: Point): Point => {
      const f = Math.min(xs.length - 1, Math.max(0, s / STEP));
      const k = Math.min(xs.length - 2, Math.floor(f));
      const u = f - k;
      into.x = xs[k] + (xs[k + 1] - xs[k]) * u;
      into.y = ys[k] + (ys[k + 1] - ys[k]) * u;
      return into;
    };
    const crawl = (i: number, ms: number, into: Point): Point | null => {
      const s = speed * ms - i * SPACING;
      if (s < 0) return null;
      track(s, into);
      into.y += Math.sin(ms / 55 + i * 0.9) * WIGGLE;
      return into;
    };

    // shot from the front back, the head last
    const firstHit = Math.max(crawlMs * FIRST_HIT, 700);
    const lastHit = crawlMs * LAST_HIT;
    const order = [...Array.from({ length: body }, (_, k) => k + 1), 0];
    const kills: Kill[] = order.map((segment, k) => {
      const ms = firstHit + ((lastHit - firstHit) * k) / body;
      const at = crawl(segment, ms, { x: 0, y: 0 })!;
      const reach = Math.hypot(at.x - gun.x, at.y - gun.y);
      return {
        segment,
        at,
        ms,
        bullet: aimBullet(gun, at, ms - reach / BULLET_SPEED, BULLET_SPEED),
      };
    });
    const killOf = new Map(kills.map((k) => [k.segment, k]));
    const headKill = killOf.get(0)!;
    const bullets = kills.map((k) => k.bullet);

    const dropTo = (
      from: Point,
      worker: RewardWorker,
      startMs: number,
    ): Drop => {
      const spot: Point = { x: 0, y: 0 };
      const lift: Point = {
        x: (from.x + worker.at.x) / 2,
        y: Math.min(from.y, worker.at.y) - POP,
      };
      return {
        from,
        worker,
        startMs,
        landsMs: startMs + dropMs,
        at: (ms) =>
          ms < startMs || ms > startMs + dropMs
            ? null
            : bezier(
                from,
                lift,
                worker.at,
                easeIn(clamp01((ms - startMs) / dropMs)),
                spot,
              ),
      };
    };
    const drops: Drop[] = kills
      .filter((k) => k.segment > 0)
      .map((k) => dropTo(k.at, workers[k.segment - 1], k.ms));
    workers
      .slice(body)
      .forEach((worker, j) =>
        drops.push(dropTo(headKill.at, worker, headKill.ms + j * PIECE_GAP)),
      );
    const endMs = Math.max(...drops.map((d) => d.landsMs));
    let soundAt = -Infinity;
    const sound = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playBloop();
    };

    const entering = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const firing = createBeats(
      bullets,
      (b) => b.firedAt,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(SHOT_SHAKE);
        sound(now);
      },
    );
    const hitting = createBeats(
      kills,
      (k) => k.ms,
      (k) => {
        if (k.segment === 0) {
          cover!.blast(k.at);
          return;
        }
        cover!.burst(k.at, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(HIT_SHAKE);
        playExplosion();
      },
    );
    const landing = createBeats(
      drops,
      (d) => d.landsMs,
      (d, _, now) => {
        cover!.burst(d.worker.at, 0.4);
        cover!.promote(d.worker);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now);
      },
    );

    const segments = Array.from({ length: body + 1 }, (_, i) => {
      const spot: Point = { x: 0, y: 0 };
      const killAt = killOf.get(i)!.ms;
      return (ms: number) => (ms >= killAt ? null : crawl(i, ms, spot));
    });
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          entering.tick(ms, now);
          firing.tick(ms, now);
          hitting.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          for (let i = body; i >= 0; i--)
            if (ms < killOf.get(i)!.ms)
              drawWisp(
                ctx,
                segments[i],
                ms,
                now,
                i === 0 ? HEAD : BODY,
                i === 0 ? 0.8 : 0.3,
              );
          for (const b of bullets) {
            const t = (ms - b.firedAt) / MUZZLE_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, gun, Math.atan2(b.dy, b.dx), t, MUZZLE);
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const d of drops)
            if (ms >= d.startMs && ms <= d.landsMs)
              drawWisp(ctx, d.at, ms, now, BODY, 0.5);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 1,
);
