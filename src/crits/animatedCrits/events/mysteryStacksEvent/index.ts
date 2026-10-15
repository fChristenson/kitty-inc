// the "Mystery Stacks" event (explosion; levels + crit tier): it covers its
// crit, whose click freezes the screen while every bar in view flips over
// into a gold mystery bar with a ? on it; one by one, quick-fire, top to
// bottom and the clicked one last, the ?s flip round onto the crit's number,
// each with a blast and a jolt; once the last lands, beams join them all and
// every bar blows in a run of blasts taking its levels, the clicked one
// climbing a crit tier in a huge blast. Then the crit's tier pays out
import meta from "./meta";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playCoinDrop } from "../../../../sound";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { clamp01 } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGoldBar } from "../../../../shared/glossyWidgets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { shakeScreen } from "../../../../shared/screenShake";
import { levelsFor } from "../../../../gameState";
import { CRIT_TIER_CONFIG } from "../../../critTypes";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "mysteryStacks";
// each bar flipping over into its gold bar, FLIP_STAGGER_MS after the one above
const FLIP_STAGGER_MS = 60;
const FLIP_FLASH = 0.8;
// the labels, of the bar's height
const LABEL_FONT = 0.62;
const LABEL_STROKE = 0.15;
const LABEL_RES = 2;
const GLOW = 0.55;
const GLOW_ALPHA = 0.3;
const REVEAL_BLAST = 110;
const REVEAL_SHAKE: [number, number] = [0.8, 1.6];
// the beams joining them, then every bar's run of blasts
const LINK = 28;
const LINK_ALPHA = 0.9;
const RUN = 4;
const RUN_GAP_MS = 45;
const RUN_BLAST = 80;
const RUN_SHAKE = 0.4;
const BOOM_LAG_MS = 220;
const BOOM_BLAST = 240;
const BOOM_SHAKE = 2.8;
// the gold bars fading back off the real ones as they blow
const FADE_MS = 220;
const SOUND_GAP_MS = 55;

const GOLD_STOPS = fadeStops(COLOR.heavenlyGold);
const sprites = new Map<string, CritTextSprite>();
function spriteOf(label: string, color: string, height: number) {
  const key = `${label}|${color}|${height}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    const fontSize = height * LABEL_FONT;
    sprite = createCritTextSprite(
      label,
      color,
      { fontSize, strokeWidth: fontSize * LABEL_STROKE },
      LABEL_RES,
    );
    sprites.set(key, sprite);
  }
  return sprite;
}

export const forceMysteryStacksEvent = registerWispEvent(
  KEY,
  "Mystery Stacks",
  () => meta.chance,
  (floor, context) => {
    const {
      flipMs,
      firstRevealMs,
      revealGapMs,
      revealMs,
      linkMs,
      levelShare,
      holdMs,
      mergeMs,
    } = meta.values;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    // top to bottom, the clicked one last
    const order = bars
      .filter((b) => b !== clicked)
      .sort((a, b) => a.center.y - b.center.y);
    order.push(clicked);
    const tier = context.critTier ?? "mega";
    const { label, color } = CRIT_TIER_CONFIG[tier];
    const height = clicked.box.height;
    const mystery = spriteOf("?", COLOR.white, height);
    const number = spriteOf(label, color, height);
    const flipAt = (j: number) => j * FLIP_STAGGER_MS;
    const revealAt = (j: number) => firstRevealMs + j * revealGapMs;
    const linkAt = revealAt(order.length - 1) + revealMs + linkMs;
    const runAt = linkAt + 300;
    const boomAt = runAt + BOOM_LAG_MS;
    const endMs = boomAt + DETONATION_MS;
    const runs = order.flatMap((bar) =>
      Array.from({ length: RUN }, (_, k) => ({
        bar,
        at: runAt + k * RUN_GAP_MS,
        spot: {
          x: bar.box.x + bar.box.width * ((k + 0.5) / RUN),
          y: bar.center.y,
        },
      })),
    );

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const levels = new Map(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    const revealing = createBeats(
      order,
      (_, j) => revealAt(j) + revealMs / 2,
      (_, j, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(
          REVEAL_SHAKE[0] +
            ((REVEAL_SHAKE[1] - REVEAL_SHAKE[0]) * j) /
              Math.max(1, order.length - 1),
        );
        playCoinDrop();
        bang(now);
      },
    );
    const running = createBeats(
      runs,
      (b) => b.at,
      (b, k, now) => {
        // a bar's levels land with its first blast
        if (k % RUN === 0) cover!.levels(b.bar, levels.get(b.bar)!, b.spot);
        if (!cover!.isLive()) return;
        shakeScreen(RUN_SHAKE);
        bang(now);
      },
    );
    const booming = createBeats(
      [boomAt],
      (ms) => ms,
      (_, __, now) => {
        cover!.tierUp(clicked, clicked.center);
        for (const bar of bars) cover!.slam(bar);
        if (!cover!.isLive()) return;
        shakeScreen(BOOM_SHAKE);
        bang(now);
      },
    );

    // bar j's gold bar, flipped in, its label turning from ? onto the number
    const drawStack = (
      ctx: CanvasRenderingContext2D,
      bar: RewardBar,
      j: number,
      ms: number,
      now: number,
    ) => {
      const flip = (ms - flipAt(j)) / flipMs;
      if (flip < 0) return;
      const fade = 1 - clamp01((ms - runAt) / FADE_MS);
      if (fade <= 0) return;
      const { box, center } = bar;
      const sy = Math.max(0.04, Math.sin((Math.PI / 2) * clamp01(flip)));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(center.x, center.y);
      ctx.scale(1, sy);
      ctx.translate(-center.x, -center.y);
      drawGoldBar(ctx, box.x, box.y, box.width, box.height, box.height / 3);
      if (flip < 1) {
        ctx.globalAlpha = fade * FLIP_FLASH * (1 - flip);
        ctx.fillStyle = COLOR.white;
        ctx.beginPath();
        ctx.roundRect(box.x, box.y, box.width, box.height, box.height / 3);
        ctx.fill();
        ctx.globalAlpha = fade;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * (GLOW_ALPHA + 0.15 * Math.sin(now * 0.02 + j));
      drawGlow(ctx, GOLD_STOPS, center.x, center.y, box.width * GLOW, 0.45);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = fade;
      // the ? turning round onto the number: one solid flip on its own axis
      const u = (ms - revealAt(j)) / revealMs;
      const turn = u <= 0 || u >= 1 ? 1 : Math.abs(Math.cos(Math.PI * u));
      ctx.translate(center.x, center.y);
      ctx.scale(Math.max(0.05, turn), 1);
      drawCritTextSprite(ctx, u < 0.5 ? mystery : number, 0, 0);
      ctx.restore();
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: boomAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          revealing.tick(ms, now);
          running.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          order.forEach((bar, j) => drawStack(ctx, bar, j, ms, now));
          if (ms >= linkAt && ms < runAt + FADE_MS) {
            const a = LINK_ALPHA * (0.7 + 0.3 * Math.sin(ms * 0.07));
            const previous = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            for (let j = 0; j + 1 < order.length; j++)
              drawBeam(ctx, order[j].center, order[j + 1].center, LINK, a);
            ctx.globalCompositeOperation = previous;
          }
          order.forEach((bar, j) =>
            drawDetonation(
              ctx,
              bar.center,
              ms - revealAt(j) - revealMs / 2,
              REVEAL_BLAST,
              now,
            ),
          );
          for (const b of runs)
            drawDetonation(ctx, b.spot, ms - b.at, RUN_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - boomAt, BOOM_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
