// the "Crumple" event (experiment: the screen is crumpled up like paper;
// cash): it covers its crit, whose click freezes the screen and the whole of
// it scrunches up into a tight ball of crumpled pieces over a dark blaze of
// gold, with a crunch and a jolt; the ball trembles, then is tossed high and
// bursts in a colossal blast and shake, flinging rivers of cash looping into
// the total as the pieces fly back out and smooth flat into place. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawDetonation } from "../../../../shared/explosion";
import { bezier } from "../../../../shared/curves";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "crumple";
const REWARD = 4;
const COLS = 6;
const ROWS = 9;
const BALL = 110;
// each crumpled piece's size, as a share of its tile
const PIECE: [number, number] = [0.25, 0.42];
const TREMBLE = 6;
const APEX = 0.28;
const RIVERS = 5;
const REACH = 380;
const RING = 50;
const COLOSSAL = 520;
const VOID = "rgba(0,0,0,0.88)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const CRUNCH_SHAKE = 0.9;
const POP_SHAKE = 2.6;
const SETTLE_SHAKE = 0.8;

export const forceCrumpleEvent = registerWispEvent(
  KEY,
  "Crumple",
  () => CONFIG.crumpleEvent.chance,
  (floor, context, area) => {
    const { crumpleMs, trembleMs, tossMs, unfoldMs, holdMs, mergeMs } =
      CONFIG.crumpleEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const apex: Point = { x: mid.x, y: top + height * APEX };
    const crumpledAt = crumpleMs;
    const tossedAt = crumpledAt + trembleMs;
    const popsAt = tossedAt + tossMs;
    const endAt = popsAt + unfoldMs;
    const tw = width / COLS;
    const th = height / ROWS;
    const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * BALL;
      return {
        x: left + (i % COLS) * tw,
        y: top + Math.floor(i / COLS) * th,
        dx: Math.cos(a) * r,
        dy: Math.sin(a) * r,
        piece: between(PIECE),
        phase: Math.random() * Math.PI * 2,
        order: Math.random(),
      };
    }).sort((a, b) => a.order - b.order);
    // the ball's middle: squeezed in the middle, tossed up to the apex
    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number) => {
      const u = easeOut(clamp01((ms - tossedAt) / tossMs));
      ball.x = lerp([mid.x, apex.x], u);
      ball.y = lerp([mid.y, apex.y], u) - Math.sin(Math.PI * u) * 60;
      if (ms > crumpledAt && ms < tossedAt)
        ball.x += Math.sin(ms * 0.09) * TREMBLE;
      return ball;
    };
    const rivers = Array.from({ length: RIVERS }, (_, i) => {
      const angle = Math.PI * (0.1 + (0.8 * i) / (RIVERS - 1));
      const out: Point = {
        x: apex.x + Math.cos(angle) * REACH * 1.6,
        y: apex.y + Math.sin(angle) * REACH,
      };
      const into: Point = { x: 0, y: 0 };
      return sampleLine((u) => ({ ...bezier(apex, out, total, u, into) }), 30);
    });
    const pour: Pour = {
      coinsAlong: 200,
      width: 34,
      streamMs: 380,
      travelMs: 700,
    };

    let shot: ScreenCopy | null = null;
    const crunching = createBeats(
      [crumpledAt],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(CRUNCH_SHAKE);
      },
    );
    const popping = createBeats(
      [popsAt],
      (ms) => ms,
      () => {
        for (const line of rivers) pourLine(cover!, line, pour);
        cover!.launchFrom(
          apex,
          clampTargetsY(
            ringTargets(apex, RING, [140, 360]),
            top + 40,
            area.bottom - 40,
          ),
        );
        cover!.blast(apex);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );
    const settling = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(SETTLE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: popsAt + pour.streamMs + pour.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          crunching.tick(ms, now);
          popping.tick(ms, now);
          settling.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const t = Math.max(0, ms);
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          drawGlow(ctx, GOLD, mid.x, mid.y, width * 0.6);
          ctx.globalCompositeOperation = "source-over";
          const { x: bx, y: by } = ballAt(t);
          // scrunched in, then flung back out from the burst to lie flat
          const squeeze =
            t < popsAt
              ? easeIn(clamp01(t / crumpleMs))
              : 1 - easeOut(clamp01((t - popsAt) / unfoldMs));
          const fromX = t < popsAt ? bx : apex.x;
          const fromY = t < popsAt ? by : apex.y;
          for (const tile of tiles) {
            const s = lerp([1, tile.piece], squeeze);
            const w = tw * s;
            const h = th * s;
            const jiggle =
              t > crumpledAt && t < popsAt
                ? Math.sin(t * 0.05 + tile.phase) * 4
                : 0;
            const cx = lerp(
              [tile.x + tw / 2, fromX + tile.dx + jiggle],
              squeeze,
            );
            const cy = lerp([tile.y + th / 2, fromY + tile.dy], squeeze);
            drawScreenPart(
              ctx,
              shot,
              tile.x,
              tile.y,
              tw,
              th,
              cx - w / 2,
              cy - h / 2,
              w,
              h,
            );
          }
        },
        drawOver: (ctx, ms, now) => {
          // the copy hides the cover's own blast, so the burst is drawn on top
          if (ms >= popsAt && ms < popsAt + 900)
            drawDetonation(ctx, apex, ms - popsAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
