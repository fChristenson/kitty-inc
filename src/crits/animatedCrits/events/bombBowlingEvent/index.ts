// the "Bomb Bowling" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a triangle of ten fizzing bomb pins pops up
// across the screen and a huge lit bomb rolls in from the far side like a
// bowling ball, faster and faster, its fuse burning down; it smashes into
// the head pin, which goes off in a big blast, and the strike rips back
// through the rack row by row, every pin a blast, a bang and a shake, the
// back row each bursting into a cluster; then the ball itself blows in the
// middle of the wreckage in a colossal blast. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";

const KEY = "bombBowling";
const REWARD = 4;
const ROWS = 4;
const ROW_GAP = 66;
const PIN_GAP = 68;
const PIN = 0.36;
const BALL = 0.9;
const FUSE = 30;
const BALL_FUSE = 48;
const POP_MS = 160;
const PIN_BLAST = 250;
const CLUSTER = 150;
const CLUSTER_REACH = 70;
const CLUSTER_MS = 90;
const COLOSSAL = 720;
const PIN_COINS = 12;
const PIN_REACH: [number, number] = [70, 240];
const BANG_GAP_MS = 45;
const PIN_SHAKE: [number, number] = [0.6, 1.4];
const CLUSTER_SHAKE = 0.7;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceBombBowlingEvent = registerWispEvent(
  KEY,
  "Bomb Bowling",
  () => CONFIG.bombBowlingEvent.chance,
  (floor, context, area) => {
    const { rollMs, chainMs, holdMs, mergeMs } = CONFIG.bombBowlingEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = area.top + height * 0.55;
    const mid = (area.left + area.right) / 2;
    const head: Point = { x: mid + dir * width * 0.05, y: lane };
    const pins: { at: Point; row: number }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let j = 0; j <= r; j++)
        pins.push({
          at: {
            x: head.x + dir * r * ROW_GAP,
            y: lane + (j - r / 2) * PIN_GAP,
          },
          row: r,
        });
    const centre: Point = {
      x: head.x + (dir * (ROWS - 1) * ROW_GAP) / 2,
      y: lane,
    };
    const start: Point = {
      x: dir > 0 ? area.left - 80 : area.right + 80,
      y: lane,
    };

    // the strike tearing back through the rack, the back row in clusters
    const blasts: Blast[] = [];
    const pinBlows = pins.map((pin) => {
      const ms =
        rollMs +
        (pin.row / (ROWS - 1)) * chainMs * 0.75 +
        Math.abs(pin.at.y - lane) * 0.25;
      blasts.push({
        at: pin.at,
        ms,
        size: PIN_BLAST,
        shake: lerp(PIN_SHAKE, pin.row / (ROWS - 1)),
        coins: PIN_COINS,
      });
      if (pin.row === ROWS - 1)
        for (let c = 0; c < 3; c++) {
          const a = (c / 3) * Math.PI * 2 + Math.random();
          blasts.push({
            at: {
              x: pin.at.x + Math.cos(a) * CLUSTER_REACH,
              y: pin.at.y + Math.sin(a) * CLUSTER_REACH,
            },
            ms: ms + CLUSTER_MS + c * 25,
            size: CLUSTER,
            shake: CLUSTER_SHAKE,
            coins: 5,
          });
        }
      return ms;
    });
    const finalAt = rollMs + chainMs;
    const colossal: Blast = {
      at: centre,
      ms: finalAt,
      size: COLOSSAL,
      shake: 0,
      coins: 0,
    };
    blasts.push(colossal);
    const endAt = finalAt + DETONATION_MS;

    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= finalAt) return null;
      if (ms < rollMs) {
        const u = easeIn(ms / rollMs);
        ball.x = lerp([start.x, head.x], u);
        ball.y = lane;
        return ball;
      }
      const u = easeOut((ms - rollMs) / chainMs);
      ball.x = lerp([head.x, centre.x], u);
      ball.y = lane;
      return ball;
    };
    const pinAts = pins.map((pin) => () => pin.at);

    let bang = -Infinity;
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b === colossal) {
          cover!.blast(b.at);
          if (cover!.isLive()) playSlamExplosion();
          return;
        }
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, b.coins, PIN_REACH),
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
          const pop = easeOut(clamp01(ms / POP_MS));
          for (let i = 0; i < pins.length; i++) {
            if (ms >= pinBlows[i]) continue;
            drawLitFuse(ctx, pins[i].at, clamp01(ms / pinBlows[i]), FUSE, now);
            drawWispHead(ctx, pinAts[i], ms, now, WISP_SIZE * PIN * pop, 0.6);
          }
          const at = ballAt(ms);
          if (at) {
            drawLitFuse(ctx, at, clamp01(ms / finalAt), BALL_FUSE, now);
            drawWispHead(ctx, ballAt, ms, now, WISP_SIZE * BALL, 0.8);
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
