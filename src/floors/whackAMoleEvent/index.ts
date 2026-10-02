// the "Whack-a-Mole" event: it covers its crit, whose click freezes the screen
// while a grid of holes opens across it and a big gold mallet swings in. One
// after another, ever faster, a wisp pops up out of a hole and the mallet
// slams down on it: each whack a flash, a bang, a jolt and coins knocked out.
// The last pops up huge in the middle hole; the mallet swells, rears back and
// smashes it in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../moneyCover)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playExplosion, playSlamExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, type Point } from "../../shared/wisp";
import { forceTestCrit } from "../upgradeButton";
import { forceClaimEventProc, registerEventProc } from "../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
} from "../moneyCover";
import { lerp, clamp01 } from "../../shared/easing";
import { ringTargets, sprayTargets } from "../../shared/coinTargets";
import { createGlowSprite, drawGlowSprite } from "../../shared/glowShape";

const KEY = "whackAMole";
const REWARD = 4;
const MOLES = 8;
// a 3 × 3 grid of holes, each HOLE of the screen's width across, GRID_X of
// it apart sideways and GRID_Y of its height apart (capped) up and down
const HOLE = 0.18;
const GRID_X = 0.3;
const GRID_Y = 0.2;
const HOLE_DEPTH = 0.2;
const OPEN_MS = 200;
// each mole: a wisp at MOLE_SIZE of a hole, rising RISE of it out of the hole
// over RISE_MS, popping up LEAD of the gap before the mallet lands
const MOLE_SIZE = 0.42;
const RISE = 0.3;
const RISE_MS = 110;
const LEAD = 0.55;
// the mallet, in holes: its handle LENGTH long and GRIP thick, its head
// HEAD tall and HEAD_THICK thick; reared back RAISE rad (FINAL_RAISE for the
// last, swelling FINAL_GROW), shifting to the next hole over MOVE of the gap
// and slamming down over its last SLAM
const LENGTH = 1.5;
const GRIP = 0.12;
const HEAD = 0.85;
const HEAD_THICK = 0.48;
const RAISE = 1.15;
const FINAL_RAISE = 1.6;
const FINAL_GROW = 1.8;
const FINAL_MOLE = 2;
const MOVE = 0.65;
const SLAM = 0.3;
const TREMBLE = 0.06;
// each whack: a burst, a jolt and coins
const WHACK_BURST: [number, number] = [0.3, 0.55];
const WHACK_BURST_MS = 260;
const WHACK_SHAKE: [number, number] = [0.7, 1.6];
const WHACK_COINS: [number, number] = [3, 5];
const SPRAY: [number, number] = [70, 220];
// the last: a huge blast and a ring of FINAL_COINS
const FINAL_COINS = 28;
const FINAL_RING: [number, number] = [130, 380];
const FINAL_SHAKE = 2.8;
const BLAST_SCALE = 1.9;
const SPARK_REACH = 400;
const SPARK_SIZE = 22;
// the look
const RIM_WIDTH = 6;

interface Mole {
  hole: Point;
  popAt: number;
  whackAt: number;
  final: boolean;
  poppedAt: number | null;
  whackedAt: number | null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.whackAMoleEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const area = context.getScreenAreaLocal?.(floor);
      if (!area) return;
      const { firstWhackMs, gapMs, finalMs, holdMs, mergeMs } =
        CONFIG.whackAMoleEvent;
      const width = area.right - area.left;
      const height = area.bottom - area.top;
      const center = {
        x: (area.left + area.right) / 2,
        y: (area.top + area.bottom) / 2,
      };
      const hole = width * HOLE;
      const stepX = width * GRID_X;
      const stepY = Math.min(height * GRID_Y, width * GRID_X);
      const holes: Point[] = [];
      for (let row = -1; row <= 1; row++)
        for (let column = -1; column <= 1; column++)
          holes.push({
            x: center.x + column * stepX,
            y: center.y + row * stepY,
          });
      const middle = holes[4];
      const lift = hole * RISE;

      let whackAt = 0;
      let previous = -1;
      const moles: Mole[] = Array.from({ length: MOLES + 1 }, (_, i) => {
        const final = i === MOLES;
        let index = 4;
        if (!final) {
          do index = Math.floor(Math.random() * holes.length);
          while (index === previous || (i === MOLES - 1 && index === 4));
        }
        previous = index;
        const gap =
          i === 0
            ? firstWhackMs
            : final
              ? finalMs
              : lerp(gapMs, (i - 1) / (MOLES - 2));
        whackAt += gap;
        return {
          hole: holes[index],
          popAt: whackAt - gap * LEAD,
          whackAt,
          final,
          poppedAt: null,
          whackedAt: null,
        };
      });
      const last = moles[MOLES];
      const startedAt = performance.now();

      // where the mallet's head strikes (on top of a risen mole), how far
      // it's reared back and how big
      const malletAt = (ms: number) => {
        const k = moles.findIndex((m) => ms < m.whackAt);
        const top = (at: Point) => ({ x: at.x, y: at.y - lift });
        if (k === -1)
          return { strike: top(last.hole), raise: 0, grow: FINAL_GROW };
        const to = moles[k];
        const from = moles[k - 1] ?? to;
        const start = k === 0 ? 0 : from.whackAt;
        const u = (ms - start) / (to.whackAt - start);
        const raise = to.final ? FINAL_RAISE : RAISE;
        const grow = to.final ? 1 + (FINAL_GROW - 1) * clamp01(u / MOVE) : 1;
        const shift = 1 - (1 - clamp01(u / MOVE)) ** 2;
        const a = top(from.hole);
        const b = top(to.hole);
        const strike = {
          x: a.x + (b.x - a.x) * shift,
          y: a.y + (b.y - a.y) * shift,
        };
        let angle: number;
        if (u < 1 - SLAM) {
          angle = raise * (1 - (1 - clamp01(u / (1 - SLAM - 0.1))) ** 2);
          if (to.final)
            angle += Math.sin(ms * 0.9) * TREMBLE * clamp01(u / MOVE);
        } else {
          const v = (u - (1 - SLAM)) / SLAM;
          angle = raise * (1 - v * v);
        }
        return { strike, raise: angle, grow };
      };

      const moleAt = (mole: Mole, ms: number): Point | null => {
        if (ms < mole.popAt || ms >= mole.whackAt) return null;
        const rise = 1 - (1 - clamp01((ms - mole.popAt) / RISE_MS)) ** 3;
        return { x: mole.hole.x, y: mole.hole.y - lift * rise };
      };

      // the mallet at its base size, traced once round its pivot (the
      // handle's end), its head on the left
      const length = hole * LENGTH;
      const head = hole * HEAD;
      const thick = hole * HEAD_THICK;
      const grip = hole * GRIP;
      const mallet = createGlowSprite(
        {
          left: -length - thick / 2,
          top: -head / 2,
          width: length + thick / 2,
          height: head,
        },
        (s) => {
          s.roundRect(
            -length + thick / 2,
            -grip / 2,
            length - thick / 2,
            grip,
            grip / 2,
          );
          s.roundRect(-length - thick / 2, -head / 2, thick, head, thick * 0.3);
        },
        { maxScale: FINAL_GROW },
      );
      const drawMallet = (ctx: CanvasRenderingContext2D, ms: number) => {
        const { strike, raise, grow } = malletAt(ms);
        const show = clamp01(ms / OPEN_MS);
        // it pivots on the end of its handle, off to the strike's right
        drawGlowSprite(
          ctx,
          mallet,
          strike.x + length * grow,
          strike.y - (head * grow) / 2,
          grow * show,
          raise,
        );
      };

      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: last.whackAt + holdMs + mergeMs, mergeMs },
        {
          rewardMultiplier: REWARD,
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            moles.forEach((mole, i) => {
              if (mole.poppedAt === null && ms >= mole.popAt) {
                mole.poppedAt = now;
                if (cover?.isLive()) playBloop();
              }
              if (mole.whackedAt === null && ms >= mole.whackAt)
                whack(mole, i, now);
            });
            ctx.save();
            ctx.translate(rect.left, rect.top);
            const open = 1 - (1 - clamp01(ms / OPEN_MS)) ** 3;
            if (open > 0 && last.whackedAt === null)
              for (const at of holes) {
                ctx.beginPath();
                ctx.ellipse(
                  at.x,
                  at.y,
                  (hole / 2) * open,
                  hole * HOLE_DEPTH * open,
                  0,
                  0,
                  Math.PI * 2,
                );
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = "#000";
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.strokeStyle = COLOR.heavenlyGold;
                ctx.lineWidth = RIM_WIDTH;
                ctx.stroke();
              }
            moles.forEach((mole, i) => {
              if (mole.whackedAt === null || mole.final) return;
              drawWhiteBurst(
                ctx,
                mole.hole.x,
                mole.hole.y - lift,
                (now - mole.whackedAt) / WHACK_BURST_MS,
                lerp(WHACK_BURST, i / (MOLES - 1)),
              );
            });
            if (last.whackedAt !== null)
              drawExplosion(
                ctx,
                middle.x,
                middle.y - lift,
                now - last.whackedAt,
                now,
                BLAST_SCALE,
                SPARK_REACH,
                SPARK_SIZE,
              );
            ctx.restore();
          },
          // the moles and the mallet over the coins they knock out
          drawOver: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            const ms = now - startedAt;
            ctx.save();
            ctx.translate(rect.left, rect.top);
            for (const mole of moles) {
              if (ms < mole.popAt || ms >= mole.whackAt) continue;
              drawWisp(
                ctx,
                (t) => moleAt(mole, t),
                ms,
                now,
                hole * MOLE_SIZE * (mole.final ? FINAL_MOLE : 1),
                mole.final
                  ? clamp01((ms - mole.popAt) / (mole.whackAt - mole.popAt))
                  : 0.3,
              );
            }
            if (last.whackedAt === null) drawMallet(ctx, ms);
            ctx.restore();
          },
        },
      );
      if (!cover) return;

      // on the frame the mallet lands
      function whack(mole: Mole, i: number, now: number): void {
        mole.whackedAt = now;
        if (!cover?.isLive()) return;
        const at = { x: mole.hole.x, y: mole.hole.y - lift };
        if (mole.final) {
          playSlamExplosion();
          shakeScreen(FINAL_SHAKE);
          cover.launchFrom(at, ringTargets(at, FINAL_COINS, FINAL_RING));
          return;
        }
        const t = i / (MOLES - 1);
        playExplosion();
        shakeScreen(lerp(WHACK_SHAKE, t));
        cover.launchFrom(
          at,
          sprayTargets(
            at,
            Math.round(lerp(WHACK_COINS, t)),
            SPRAY,
            -Math.PI / 2,
            Math.PI,
          ),
        );
      }
    },
  },
  { label: "Whack-a-Mole", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Whack-a-Mole
export function forceWhackAMoleEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
