// the "Tile Flip" event (an experiment beyond the six templates: the frozen
// screen flips over in tiles): it covers its crit, whose click freezes the
// screen while it splits into a grid of tiles that flip over like cards in a
// wave racing out from the clicked floor's button, each turning up solid gold
// with a flick, a coin popping out of it and the screen rumbling as the wave
// spreads; once the whole screen is gold it all flips back at once in a
// white flash and a huge blast that sprays cash everywhere, and the coins
// sweep into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01 } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";

const KEY = "tileFlip";
const REWARD = 4;
const COLUMNS = 6;
const GAP = 4;
const BACK = "#1A1206";
const RUMBLE_MS = 80;
const RUMBLE = 0.6;
// a coin pops out of every POP-th tile as it turns gold
const POP = 2;

interface Tile {
  x: number;
  y: number;
  w: number;
  h: number;
  centre: Point;
  flipAt: number;
}

export const forceTileFlipEvent = registerWispEvent(
  KEY,
  "Tile Flip",
  () => CONFIG.tileFlipEvent.chance,
  (floor, context, area) => {
    const { waveMs, flipMs, showMs, backMs, holdMs, mergeMs } =
      CONFIG.tileFlipEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const size = width / COLUMNS;
    const rows = Math.ceil(height / size);
    const far = Math.hypot(width, height);
    const tiles: Tile[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < COLUMNS; c++) {
        const x = area.left + c * size;
        const y = area.top + r * size;
        const centre = { x: x + size / 2, y: y + size / 2 };
        const d = Math.hypot(centre.x - button.x, centre.y - button.y);
        tiles.push({
          x,
          y,
          w: size,
          h: size,
          centre,
          flipAt: (d / far) * waveMs * 1.6,
        });
      }
    const goldAt = Math.max(...tiles.map((t) => t.flipAt)) + flipMs;
    const backAt = goldAt + showMs;
    const endAt = backAt + backMs;
    const popping = tiles.filter((_, i) => i % POP === 0);

    let shot: ScreenCopy | null = null;
    let lastRumble = -Infinity;
    const pops = createBeats(
      popping,
      (t) => t.flipAt + flipMs / 2,
      (t) => {
        cover!.launchFrom(t.centre, [
          { x: t.centre.x, y: t.centre.y - size * 0.6 },
        ]);
        if (cover!.isLive()) playBloop();
      },
    );
    const flipBack = createBeats(
      [backAt],
      (ms) => ms,
      () => cover!.blast(button),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pops.tick(ms, now);
          flipBack.tick(ms, now);
          if (ms < backAt && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(RUMBLE * (0.5 + clamp01(ms / goldAt)));
          }
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          for (const t of tiles) {
            // 0..1 over the flip to gold, then back down over the flip back
            const turn =
              ms < backAt
                ? clamp01((ms - t.flipAt) / flipMs)
                : 1 - clamp01((ms - backAt) / backMs);
            if (turn <= 0) continue;
            const squash = Math.abs(Math.cos(Math.PI * turn));
            const w = (t.w - GAP) * squash;
            ctx.fillStyle = BACK;
            ctx.fillRect(t.x, t.y, t.w, t.h);
            if (turn < 0.5)
              drawScreenPart(
                ctx,
                shot,
                t.x,
                t.y,
                t.w,
                t.h,
                t.centre.x - w / 2,
                t.y + GAP / 2,
                w,
                t.h - GAP,
              );
            else {
              ctx.fillStyle = COLOR.heavenlyGold;
              ctx.fillRect(t.centre.x - w / 2, t.y + GAP / 2, w, t.h - GAP);
            }
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
