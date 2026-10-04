// the "Collision Course" event (explosion; cash): it covers its crit, whose
// click freezes the screen while two overlapping rings of fizzing bomb wisps
// spin up in the middle of the screen, one clockwise, the other against it;
// wherever the rings cross, a bomb from each meets head-on and the pair goes
// off in a big blast with its own bang and shake and spray of cash, pair
// after pair at the two crossings in a rolling chain, quicker and quicker,
// until the last pairs meet at both crossings at once round one colossal
// blast in the middle. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";

const KEY = "collisionCourse";
const REWARD = 4;
const PAIRS = 9;
// rad a second each ring turns
const SPIN = 4.2;
const POP_MS = 160;
const BOMB = 0.36;
const FUSE = 32;
const BLAST = 260;
const CLUSTER = 220;
const COLOSSAL = 720;
const BANG_GAP_MS = 45;
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const FINAL_SHAKE = 2.6;

interface Bomb {
  centre: Point;
  start: number;
  spin: number;
  blows: number;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceCollisionCourseEvent = registerWispEvent(
  KEY,
  "Collision Course",
  () => CONFIG.collisionCourseEvent.chance,
  (floor, context, area) => {
    const { firstMs, gapsMs, holdMs, mergeMs } = CONFIG.collisionCourseEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const radius = Math.min(width * 0.22, height * 0.18, 240);
    const mid: Point = {
      x: area.left + width / 2,
      y: area.top + height * 0.45,
    };
    const apart = radius * 1.1;
    const centres: Point[] = [
      { x: mid.x - apart / 2, y: mid.y },
      { x: mid.x + apart / 2, y: mid.y },
    ];
    // the two crossings, straight above and below the middle
    const rise = Math.sqrt(radius * radius - (apart / 2) ** 2);
    const crossings: Point[] = [
      { x: mid.x, y: mid.y - rise },
      { x: mid.x, y: mid.y + rise },
    ];
    const angleOn = (c: Point, p: Point) => Math.atan2(p.y - c.y, p.x - c.x);
    // each collision set first, then a bomb on each ring placed to meet there
    const bombs: Bomb[] = [];
    const blasts: Blast[] = [];
    let clock: number = firstMs;
    for (let k = 0; k < PAIRS; k++) {
      const final = k >= PAIRS - 2;
      const at = crossings[k % 2];
      const ms = clock;
      if (k < PAIRS - 2) clock += lerp(gapsMs, k / Math.max(1, PAIRS - 3));
      [1, -1].forEach((spin, r) => {
        const c = centres[r];
        bombs.push({
          centre: c,
          start: angleOn(c, at) - (spin * SPIN * ms) / 1000,
          spin,
          blows: ms,
        });
      });
      blasts.push({
        at,
        ms,
        size: final ? CLUSTER : BLAST,
        shake: final ? HIT_SHAKE[1] : lerp(HIT_SHAKE, k / (PAIRS - 1)),
        coins: final ? 20 : 26,
      });
    }
    const finalAt = clock;
    blasts.push({
      at: mid,
      ms: finalAt + 40,
      size: COLOSSAL,
      shake: FINAL_SHAKE,
      coins: 0,
    });
    for (const c of centres)
      blasts.push({
        at: c,
        ms: finalAt + 70,
        size: CLUSTER,
        shake: HIT_SHAKE[1],
        coins: 16,
      });
    const colossal = blasts.find((b) => b.size === COLOSSAL)!;
    const endAt = finalAt + 70 + DETONATION_MS;
    const spots = bombs.map(() => ({ x: 0, y: 0 }));
    const ats = bombs.map((b, i) => (ms: number): Point => {
      const a = b.start + (b.spin * SPIN * Math.max(0, ms)) / 1000;
      const grow = easeOut(clamp01(ms / POP_MS));
      spots[i].x = b.centre.x + Math.cos(a) * radius * grow;
      spots[i].y = b.centre.y + Math.sin(a) * radius * grow;
      return spots[i];
    });

    let bang = -Infinity;
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b === colossal) {
          cover!.blast(b.at);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(b.shake);
          return;
        }
        if (b.coins > 0)
          cover!.launchFrom(
            b.at,
            clampTargetsY(
              sprayTargets(b.at, b.coins, [60, 260]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        if (!cover!.isLive()) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => blasting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let i = 0; i < bombs.length; i++) {
            const b = bombs[i];
            if (ms >= b.blows) continue;
            const at = ats[i](ms);
            drawLitFuse(ctx, at, clamp01(ms / b.blows), FUSE, now);
            drawWispHead(ctx, ats[i], ms, now, WISP_SIZE * BOMB, 0.6);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
