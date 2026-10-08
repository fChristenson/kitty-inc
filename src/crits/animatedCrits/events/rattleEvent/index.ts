// the "Rattle" event (experiment: the screen rattles to pieces on a shaking
// table; cash): it covers its crit, whose click freezes the screen and it
// breaks into loose tiles that start hopping like crockery on a shaking
// table, each hop higher than the last, every clattering landing a splash,
// a jolt and cash jumping out of the gaps; on the last they all slam down
// flat together in a huge blast and shake as the cash pours into the total.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "rattle";
const REWARD = 4;
const COLS = 6;
const ROWS = 9;
const HOPS = 5;
const LIFT: [number, number] = [14, 90];
const JITTER: [number, number] = [0.6, 1.3];
const WOBBLE = 4;
const SPLASHES = 6;
const SPLASH = 90;
const COINS = 16;
const VOID = "rgba(0,0,0,0.88)";
const UP = -Math.PI / 2;
const CLACK_SHAKE: [number, number] = [0.4, 1.1];

export const forceRattleEvent = registerWispEvent(
  KEY,
  "Rattle",
  () => CONFIG.rattleEvent.chance,
  (floor, context, area) => {
    const { hopsMs, holdMs, mergeMs } = CONFIG.rattleEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const tw = width / COLS;
    const th = height / ROWS;
    const still: Point = { x: 0, y: 0 };
    const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const jitter = between(JITTER);
      const path: BouncePath = hops(
        Array.from({ length: HOPS + 1 }, () => still),
        hopsMs,
        [LIFT[0] * jitter, LIFT[1] * jitter],
      );
      return {
        x: left + (i % COLS) * tw,
        y: top + Math.floor(i / COLS) * th,
        path,
        phase: Math.random() * Math.PI * 2,
      };
    });
    // every tile lands together, so one path's landings are the clacks
    const clacks = tiles[0].path.bounces.map((b) => b.ms);
    const endAt = clacks[clacks.length - 1];
    const splashes: Bounce[] = clacks.flatMap((ms) =>
      Array.from({ length: SPLASHES }, () => {
        const tile = tiles[Math.floor(Math.random() * tiles.length)];
        return { at: { x: tile.x + tw / 2, y: tile.y + th }, ms, normal: UP };
      }),
    );

    let shot: ScreenCopy | null = null;
    const clacking = createBeats(
      clacks,
      (ms) => ms,
      (ms, k) => {
        if (ms === endAt) {
          cover!.blast(mid);
          return;
        }
        for (let i = 0; i < 2; i++) {
          const tile = tiles[Math.floor(Math.random() * tiles.length)];
          const gap: Point = { x: tile.x, y: tile.y };
          cover!.launchFrom(
            gap,
            clampTargetsY(
              sprayTargets(gap, COINS, [80, 240], UP, 1.6),
              top + 40,
              area.bottom - 40,
            ),
          );
        }
        if (!cover!.isLive()) return;
        playBloop();
        if (k % 2 === 1) playExplosion();
        shakeScreen(lerp(CLACK_SHAKE, k / (clacks.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => clacking.tick(ms, now),
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          for (const tile of tiles) {
            const lift = tile.path.at(t).y;
            const wobble =
              lift < -1 ? Math.sin(t * 0.05 + tile.phase) * WOBBLE : 0;
            drawScreenPart(
              ctx,
              shot,
              tile.x,
              tile.y,
              tw,
              th,
              tile.x + wobble,
              tile.y + lift,
              tw,
              th,
            );
          }
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 400) return;
          for (const s of splashes)
            drawBounceSplash(ctx, s, ms - s.ms, SPLASH, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
