// the "Crossette" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a lit shell rockets up out of the clicked
// floor's button and bursts in a big blast that splits it into four shells
// flying off in a cross; each of those blasts and splits into four more,
// popping in a cluster, the bursts multiplying across the sky, every blast
// its own bang, shake and spray of coins; shell after shell, the last one
// splitting round a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "crossette";
const REWARD = 4;
const SHELLS = 3;
const EDGE = 170;
const TOP = 260;
// the four splits fly SPLIT px, their own four SPLIT / 2 more
const SPLIT = 130;
const SHELL = 0.38;
const SPLINTER = 0.26;
const FUSE = 14;
const SHELL_BLAST = 240;
const SPLIT_BLAST = 160;
const POP_BLAST = 100;
const FINALE_BLAST = 340;
const COINS = 24;
const COIN_REACH: [number, number] = [20, 100];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceCrossetteEvent = registerWispEvent(
  KEY,
  "Crossette",
  () => CONFIG.crossetteEvent.chance,
  (floor, context, area) => {
    const { shellsMs, riseMs, splitMs, holdMs, mergeMs } =
      CONFIG.crossetteEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    const flyers: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
      size: number;
    }[] = [];
    const fly = (
      from: Point,
      to: Point,
      leaves: number,
      blows: number,
      size: number,
    ) => {
      const at: Point = { x: 0, y: 0 };
      flyers.push({
        leaves,
        blows,
        size,
        at: (ms: number): Point => {
          const u = easeOut(clamp01((ms - leaves) / (blows - leaves)));
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], u);
          return at;
        },
      });
    };
    let clock = 0;
    let endAt = 0;
    let finale: Point = button;
    for (let s = 0; s < SHELLS; s++) {
      const final = s === SHELLS - 1;
      const burst: Point = final
        ? { x: (area.left + area.right) / 2, y: area.top + TOP + 80 }
        : {
            x: lerp(
              [area.left + EDGE, area.right - EDGE],
              s % 2 === 0 ? 0.25 : 0.75,
            ),
            y: area.top + TOP + s * 40,
          };
      const bursts = clock + riseMs;
      fly(button, burst, clock, bursts, SHELL);
      blasts.push({
        at: burst,
        ms: bursts,
        size: final ? FINALE_BLAST : SHELL_BLAST,
        shake: final ? 1.5 : 1,
        coins: COINS * 2,
      });
      const turn = s * 0.4;
      for (let i = 0; i < 4; i++) {
        const a = turn + (i / 4) * Math.PI * 2;
        const split: Point = {
          x: burst.x + Math.cos(a) * SPLIT,
          y: burst.y + Math.sin(a) * SPLIT,
        };
        const splits = bursts + splitMs + i * 20;
        fly(burst, split, bursts, splits, SPLINTER);
        blasts.push({
          at: split,
          ms: splits,
          size: SPLIT_BLAST,
          shake: 0.9,
          coins: COINS,
        });
        for (let j = 0; j < 4; j++) {
          const b = a + (j / 4) * Math.PI * 2 + Math.PI / 4;
          const pops = splits + splitMs * 0.6 + j * 25;
          blasts.push({
            at: {
              x: split.x + Math.cos(b) * SPLIT * 0.5,
              y: split.y + Math.sin(b) * SPLIT * 0.5,
            },
            ms: pops,
            size: POP_BLAST,
            shake: 0.5,
            coins: 4,
          });
          endAt = Math.max(endAt, pops);
        }
      }
      if (final) finale = burst;
      clock += lerp(shellsMs, s / (SHELLS - 1));
    }
    let lastBang = -Infinity;

    const launching = createBeats(
      flyers.filter((f) => f.size === SHELL),
      (f) => f.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(b.at, ringTargets(b.at, b.coins, COIN_REACH));
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const ending = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(finale),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launching.tick(ms, now);
          booming.tick(ms, now);
          ending.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const f of flyers) {
            if (ms < f.leaves || ms >= f.blows) continue;
            drawLitFuse(
              ctx,
              f.at(ms),
              (ms - f.leaves) / (f.blows - f.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              f.at,
              ms,
              now,
              WISP_SIZE * f.size,
              0.6,
              f.leaves,
              f.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
