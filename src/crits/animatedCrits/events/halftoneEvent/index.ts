// the "Halftone" event (experiment: the screen turns into a halftone print;
// cash): it covers its crit, whose click freezes the screen and a ring of
// gold sweeps out from the clicked floor's button, turning everything it
// passes into a halftone of gold dots on black, big where the picture is
// bright and tiny where it's dark, with a jolt as it fills the screen; then
// the dots peel off in a wave and swirl up into the total as cash, the
// picture fading back in behind them, in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeIn, easeOut } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, type FadeStops } from "../../../../shared/glowSprite";
import { bezier } from "../../../../shared/curves";
import { totalSpot } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "halftone";
const REWARD = 4;
// floor-local px per dot
const CELL = 18;
// the halftone's own px per floor-local px
const RES = 0.75;
const COINS = 520;
const COIN = 0.5;
const SWIRL = 220;
const RING: FadeStops = [
  [0, `${COLOR.heavenlyGold}00`],
  [0.86, `${COLOR.heavenlyGold}00`],
  [0.94, COLOR.heavenlyGold],
  [1, `${COLOR.heavenlyGold}00`],
];
const FILL_SHAKE = 1.0;
const PEEL_SHAKE = 0.7;

interface Dot {
  x: number;
  y: number;
  // 0..1 brightness
  l: number;
}

// the copy's brightness sampled once per cell
function dotsOf(
  shot: ScreenCopy,
  left: number,
  top: number,
  cols: number,
  rows: number,
): Dot[] {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  drawScreenPart(
    g,
    shot,
    left,
    top,
    cols * CELL,
    rows * CELL,
    0,
    0,
    cols,
    rows,
  );
  const px = g.getImageData(0, 0, cols, rows).data;
  const dots: Dot[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      dots.push({
        x: left + (c + 0.5) * CELL,
        y: top + (r + 0.5) * CELL,
        l: (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255,
      });
    }
  return dots;
}

// gold dots on black, sized by brightness, drawn once
function printOf(
  dots: Dot[],
  left: number,
  top: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * RES);
  canvas.height = Math.ceil(height * RES);
  const g = canvas.getContext("2d")!;
  g.fillStyle = COLOR.black;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.scale(RES, RES);
  g.translate(-left, -top);
  g.fillStyle = COLOR.heavenlyGold;
  g.beginPath();
  for (const d of dots) {
    const r = CELL * 0.55 * Math.sqrt(0.08 + 0.92 * d.l);
    g.moveTo(d.x + r, d.y);
    g.arc(d.x, d.y, r, 0, Math.PI * 2);
  }
  g.fill();
  return canvas;
}

export const forceHalftoneEvent = registerWispEvent(
  KEY,
  "Halftone",
  () => CONFIG.halftoneEvent.chance,
  (floor, context, area) => {
    const { sweepMs, showMs, peelMs, holdMs, mergeMs } = CONFIG.halftoneEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const reach = Math.max(
      Math.hypot(button.x - left, button.y - top),
      Math.hypot(button.x - area.right, button.y - top),
      Math.hypot(button.x - left, button.y - area.bottom),
      Math.hypot(button.x - area.right, button.y - area.bottom),
    );
    const peelsAt = sweepMs + showMs;
    const travel = peelsAt + peelMs;
    // the coins' dots aren't known till the screen is copied: each starts on
    // a random cell and is sized once the copy is read
    const sizes = new Float32Array(COINS).fill(1);
    const cells = new Uint32Array(COINS);
    const into: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const c = Math.floor(Math.random() * cols);
      const r = Math.floor(Math.random() * rows);
      cells[i] = r * cols + c;
      const from: Point = {
        x: left + (c + 0.5) * CELL,
        y: top + (r + 0.5) * CELL,
      };
      // peeled off in a wave down from the top
      const leaves =
        peelsAt +
        ((from.y - top) / height) * peelMs * 0.45 +
        Math.random() * 80;
      const bend: Point = {
        x: from.x + (Math.random() < 0.5 ? -1 : 1) * SWIRL,
        y: (from.y + total.y) / 2,
      };
      const arrives = travel - between([0, 60]);
      return (f) => {
        const ms = f * travel;
        if (ms < leaves) return { x: from.x, y: from.y, scale: 0 };
        const p = bezier(
          from,
          bend,
          total,
          easeIn(clamp01((ms - leaves) / (arrives - leaves))),
          into,
        );
        return { x: p.x, y: p.y, scale: COIN * sizes[i] };
      };
    });

    let shot: ScreenCopy | null = null;
    let print: HTMLCanvasElement | null = null;
    const filling = createBeats(
      [sweepMs, peelsAt],
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(k === 0 ? FILL_SHAKE : PEEL_SHAKE);
      },
    );
    const finishing = createBeats(
      [travel],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          filling.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= travel) {
            shot = print = null;
            return;
          }
          shot ??= copyScreen(ctx);
          if (!print) {
            const dots = dotsOf(shot, left, top, cols, rows);
            print = printOf(dots, left, top, cols * CELL, rows * CELL);
            // coins sized to the dot they leave from
            for (let i = 0; i < COINS; i++) sizes[i] = 0.5 + dots[cells[i]].l;
          }
          const t = Math.max(0, ms);
          const r = reach * easeOut(clamp01(t / sweepMs));
          const fade = 1 - clamp01((t - peelsAt) / (peelMs * 0.8));
          if (r <= 0 || fade <= 0) return;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.beginPath();
          ctx.arc(button.x, button.y, r, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(print, left, top, cols * CELL, rows * CELL);
          ctx.restore();
          if (t < sweepMs) {
            ctx.globalCompositeOperation = "lighter";
            drawGlow(ctx, RING, button.x, button.y, r * 1.06);
            ctx.globalCompositeOperation = "source-over";
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
