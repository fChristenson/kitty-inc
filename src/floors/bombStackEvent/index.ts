// the "Bomb Stack" event (explosion; cash): it covers its crit, whose click
// freezes the screen while bomb wisps fly out of the clicked floor's button
// and stack up into a pyramid in the middle of the screen, fuses fizzing;
// the bottom row goes off in white blasts that hurl the rest of the stack
// higher, then the next row blows and hurls the rest higher still, each row
// a bang, a big jolt and a spray of coins, until the lone bomb at the top is
// flung sky high and goes off in a huge blast and shake. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "bombStack";
const REWARD = 4;
// rows of 4, 3, 2 and 1 bombs GAP px apart, the base BASE px off the bottom;
// every row that blows throws the rows above JUMP px higher
const ROWS = 4;
const GAP = 64;
const BASE = 200;
const JUMP = 90;
const JUMP_MS = 180;
const BOMB = 0.4;
const FUSE = 18;
const BLAST = 150;
const COINS = 6;
const COIN_REACH: [number, number] = [30, 110];
const ROW_SHAKE: [number, number] = [0.8, 1.5];

export const forceBombStackEvent = registerWispEvent(
  KEY,
  "Bomb Stack",
  () => CONFIG.bombStackEvent.chance,
  (floor, context, area) => {
    const { stackMs, blowsMs, holdMs, mergeMs } = CONFIG.bombStackEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const cx = (area.left + area.right) / 2;
    const base = area.bottom - BASE;
    let clock: number = stackMs;
    const rowBlows = Array.from({ length: ROWS }, (_, r) => {
      const at = clock;
      clock += lerp(blowsMs, r / (ROWS - 1));
      return at;
    });
    // how far row r has been thrown up by the rows under it, ms in
    const lift = (r: number, ms: number) => {
      let up = 0;
      for (let below = 0; below < r; below++)
        up +=
          JUMP *
          easeOut(clamp01((ms - rowBlows[below]) / JUMP_MS)) *
          (1 + below * 0.5);
      return up;
    };
    const count = (ROWS * (ROWS + 1)) / 2;
    const bombs: {
      row: number;
      home: Point;
      lands: number;
      at: (ms: number) => Point;
    }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let i = 0; i < ROWS - r; i++) {
        const home: Point = {
          x: cx + (i - (ROWS - r - 1) / 2) * GAP,
          y: base - r * GAP * 0.85,
        };
        const lands =
          (stackMs * 0.8 * bombs.length) / count + stackMs * 0.2 * (r / ROWS);
        const at: Point = { x: 0, y: 0 };
        const row = r;
        bombs.push({
          row,
          home,
          lands,
          at: (ms: number): Point => {
            const u = easeOut(clamp01(ms / Math.max(1, lands)));
            at.x = lerp([button.x, home.x], u);
            at.y = lerp([button.y, home.y], u) - lift(row, ms);
            return at;
          },
        });
      }
    const endAt = rowBlows[ROWS - 1];
    const blasts = bombs.map((b) => ({
      ...b,
      blows: rowBlows[b.row],
      spot: { x: 0, y: 0 } as Point,
    }));

    const landing = createBeats(
      bombs,
      (b) => b.lands,
      (_, k) => {
        if (cover?.isLive() && k % 2 === 0) playBloop();
      },
    );
    const blowing = createBeats(
      blasts,
      (b) => b.blows,
      (b) => {
        const at = b.at(b.blows);
        b.spot.x = at.x;
        b.spot.y = at.y;
        if (b.row === ROWS - 1) {
          cover!.blast(b.spot);
          return;
        }
        cover!.launchFrom(b.spot, ringTargets(b.spot, COINS, COIN_REACH));
      },
    );
    const rumbling = createBeats(
      rowBlows.slice(0, -1),
      (ms) => ms,
      (_, r) => {
        if (!cover?.isLive()) return;
        playExplosion();
        shakeScreen(lerp(ROW_SHAKE, r / (ROWS - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          blowing.tick(ms, now);
          rumbling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts) {
            if (b.row < ROWS - 1)
              drawDetonation(ctx, b.spot, ms - b.blows, BLAST, now);
            if (ms >= b.blows) continue;
            drawLitFuse(ctx, b.at(ms), clamp01(ms / b.blows), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              0,
              b.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
