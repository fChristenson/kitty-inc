// the "Stained Glass" event (experiment: the frozen screen turns into a
// stained-glass window; cash): it covers its crit, whose click freezes the
// screen and leading creeps over it as it turns into a stained-glass window
// of bright panes; light floods in through them pane after pane, rippling
// out from the clicked floor's button, ever faster, each a chime, a jolt
// and a spurt of coins; then the whole window blazes white and clears back
// to the screen in a huge blast and shake. Pays floor income × floor number
// × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import type { Point } from "../../../../shared/wisp";

const KEY = "stainedGlass";
const REWARD = 4;
const COLS = 4;
const ROWS = 6;
// inner corners wander up to JITTER of a pane off the grid
const JITTER = 0.3;
const LEAD = "#1A1220";
const LEAD_WIDTH = 9;
const TINT = 0.75;
const GLASS = [
  COLOR.fullHouseCrimson,
  COLOR.pairBlue,
  COLOR.threeOfAKindGreen,
  COLOR.heavenlyGold,
  COLOR.royalFlushPurple,
  COLOR.orange,
  COLOR.teal,
  COLOR.peppermintPink,
];
const SHINE = fadeStops(COLOR.white);
const SHINE_MS = 380;
const PANE_COINS = 8;
const SHINE_SHAKE: [number, number] = [0.3, 0.9];

export const forceStainedGlassEvent = registerWispEvent(
  KEY,
  "Stained Glass",
  () => CONFIG.stainedGlassEvent.chance,
  (floor, context, area) => {
    const { leadMs, shineMs, blazeMs, holdMs, mergeMs } =
      CONFIG.stainedGlassEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const cw = width / COLS;
    const ch = height / ROWS;
    const button = getButtonCenter(context.isGroundFloor);
    // the grid's corners, the inner ones wandering
    const corners: Point[][] = Array.from({ length: ROWS + 1 }, (_, r) =>
      Array.from({ length: COLS + 1 }, (_, c) => {
        const inner = r > 0 && r < ROWS && c > 0 && c < COLS;
        return {
          x:
            left + c * cw + (inner ? (Math.random() * 2 - 1) * JITTER * cw : 0),
          y: top + r * ch + (inner ? (Math.random() * 2 - 1) * JITTER * ch : 0),
        };
      }),
    );
    const panes = corners.slice(0, ROWS).flatMap((row, r) =>
      row.slice(0, COLS).map((_, c) => {
        const quad = [
          corners[r][c],
          corners[r][c + 1],
          corners[r + 1][c + 1],
          corners[r + 1][c],
        ];
        const centre = {
          x: quad.reduce((s, p) => s + p.x, 0) / 4,
          y: quad.reduce((s, p) => s + p.y, 0) / 4,
        };
        return {
          quad,
          centre,
          color: GLASS[Math.floor(Math.random() * GLASS.length)],
          at: 0,
        };
      }),
    );
    // light floods in from the button outward, quickening
    const ordered = [...panes].sort(
      (a, b) =>
        Math.hypot(a.centre.x - button.x, a.centre.y - button.y) -
        Math.hypot(b.centre.x - button.x, b.centre.y - button.y),
    );
    ordered.forEach((p, k) => {
      const u = k / (ordered.length - 1);
      p.at = leadMs + shineMs * (0.6 * u + 0.4 * u * u);
    });
    const blazeAt = leadMs + shineMs + SHINE_MS * 0.5;
    const endAt = blazeAt + blazeMs;
    const centre = { x: left + width / 2, y: top + height / 2 };

    // the window, built once off the frozen frame: tinted panes and leading
    let shot: ScreenCopy | null = null;
    let glass: ScreenCopy | null = null;
    const build = (from: ScreenCopy): ScreenCopy => {
      const canvas = document.createElement("canvas");
      canvas.width = from.canvas.width;
      canvas.height = from.canvas.height;
      const g = canvas.getContext("2d")!;
      g.drawImage(from.canvas, 0, 0);
      g.setTransform(from.at);
      g.globalCompositeOperation = "color";
      g.globalAlpha = TINT;
      for (const p of panes) {
        g.beginPath();
        for (const q of p.quad) g.lineTo(q.x, q.y);
        g.closePath();
        g.fillStyle = p.color;
        g.fill();
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.strokeStyle = LEAD;
      g.lineWidth = LEAD_WIDTH;
      g.lineJoin = "round";
      for (const p of panes) {
        g.beginPath();
        for (const q of p.quad) g.lineTo(q.x, q.y);
        g.closePath();
        g.stroke();
      }
      return { canvas, at: from.at };
    };

    const shining = createBeats(
      ordered,
      (p) => p.at,
      (p, k) => {
        cover!.launchFrom(
          p.centre,
          clampTargetsY(
            sprayTargets(p.centre, PANE_COINS, [60, 200]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playBloop();
        shakeScreen(lerp(SHINE_SHAKE, k / (ordered.length - 1)));
      },
    );
    const blazing = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          shining.tick(ms, now);
          blazing.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = glass = null;
            return;
          }
          shot ??= copyScreen(ctx);
          glass ??= build(shot);
          ctx.save();
          ctx.globalAlpha =
            ms < blazeAt
              ? easeOut(clamp01(ms / leadMs))
              : 1 - clamp01((ms - blazeAt) / blazeMs);
          drawScreenPart(
            ctx,
            glass,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height,
          );
          ctx.globalCompositeOperation = "lighter";
          for (const p of panes) {
            const t = (ms - p.at) / SHINE_MS;
            if (t < 0 || t >= 1) continue;
            ctx.globalAlpha = Math.sin(Math.PI * t) * 0.8;
            drawGlow(
              ctx,
              SHINE,
              p.centre.x,
              p.centre.y,
              Math.max(cw, ch) * 0.8,
            );
          }
          if (ms >= blazeAt) {
            ctx.globalAlpha = 0.8 * (1 - clamp01((ms - blazeAt) / blazeMs));
            ctx.fillStyle = COLOR.white;
            ctx.fillRect(left, top, width, height);
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
