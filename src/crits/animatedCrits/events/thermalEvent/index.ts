// the "Thermal" event (experiment: the frozen screen seen through a thermal
// camera; cash): it covers its crit, whose click freezes the screen and it
// washes into a blocky thermal image, cold blues and purples with the
// building glowing orange; hot spots flare white-hot one after another, the
// income bars and workers burning brightest, each a hum, a jolt and a spurt
// of coins, ever faster; then the whole screen overheats in a white flash
// and snaps back in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, type FadeStops } from "../../../../shared/glowSprite";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";
import { findRewardBars, findRewardWorkers } from "../../eventRewards";
import type { Point } from "../../../../shared/wisp";

const KEY = "thermal";
const REWARD = 4;
// the camera's blocky resolution: this many screen px per thermal px
const BLOCK = 6;
// brightness 0..1 mapped through these colors, cold to white-hot
const RAMP: [number, number, number][] = [
  [10, 4, 40],
  [40, 20, 140],
  [150, 30, 160],
  [230, 60, 60],
  [255, 150, 20],
  [255, 230, 90],
  [255, 255, 255],
];
const HOT: FadeStops = [
  [0, "#FFFFFF"],
  [0.35, "#FFE066"],
  [0.7, "#FF7A1ACC"],
  [1, "#FF7A1A00"],
];
const MAX_SPOTS = 9;
const SPOT = 110;
const FLARE_MS = 360;
const SPOT_COINS = 10;
const SPOT_SHAKE: [number, number] = [0.3, 1];

// the copy redrawn small and recolored through RAMP by brightness, once
function thermalOf(shot: ScreenCopy): ScreenCopy {
  const w = Math.max(1, Math.round(shot.canvas.width / BLOCK));
  const h = Math.max(1, Math.round(shot.canvas.height / BLOCK));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(shot.canvas, 0, 0, w, h);
  const image = g.getImageData(0, 0, w, h);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const l = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
    const f = l * (RAMP.length - 1);
    const k = Math.min(RAMP.length - 2, Math.floor(f));
    const t = f - k;
    for (let c = 0; c < 3; c++)
      px[i + c] = RAMP[k][c] + (RAMP[k + 1][c] - RAMP[k][c]) * t;
  }
  g.putImageData(image, 0, 0);
  // its transform scaled down with it
  const kx = w / shot.canvas.width;
  const ky = h / shot.canvas.height;
  const m = shot.at;
  return {
    canvas,
    at: new DOMMatrix([
      m.a * kx,
      m.b * ky,
      m.c * kx,
      m.d * ky,
      m.e * kx,
      m.f * ky,
    ]),
  };
}

export const forceThermalEvent = registerWispEvent(
  KEY,
  "Thermal",
  () => CONFIG.thermalEvent.chance,
  (floor, context, area) => {
    const { washMs, flaresMs, overheatMs, holdMs, mergeMs } =
      CONFIG.thermalEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const spots: Point[] = [
      ...findRewardBars(floor, context).map((b) => b.center),
      ...findRewardWorkers(floor, context, true).map((w) => w.at),
    ]
      .sort(
        (a, b) =>
          Math.hypot(a.x - button.x, a.y - button.y) -
          Math.hypot(b.x - button.x, b.y - button.y),
      )
      .slice(0, MAX_SPOTS);
    const flares = spots.map((at, k) => ({
      at,
      flaresAt:
        washMs +
        flaresMs *
          (0.6 * (k / Math.max(1, spots.length - 1)) +
            0.4 * (k / Math.max(1, spots.length - 1)) ** 2),
    }));
    const overheatAt = washMs + flaresMs + FLARE_MS * 0.5;
    const endAt = overheatAt + overheatMs;
    const centre = { x: left + width / 2, y: top + height / 2 };

    let shot: ScreenCopy | null = null;
    let thermal: ScreenCopy | null = null;
    const flaring = createBeats(
      flares,
      (f) => f.flaresAt,
      (f, k) => {
        cover!.launchFrom(
          f.at,
          clampTargetsY(
            sprayTargets(f.at, SPOT_COINS, [60, 220]),
            top + 40,
            area.bottom - 20,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPOT_SHAKE, k / Math.max(1, flares.length - 1)));
      },
    );
    const overheating = createBeats(
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
          flaring.tick(ms, now);
          overheating.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = thermal = null;
            return;
          }
          shot ??= copyScreen(ctx);
          thermal ??= thermalOf(shot);
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha =
            ms < overheatAt
              ? easeOut(clamp01(ms / washMs))
              : 1 - clamp01((ms - overheatAt) / overheatMs);
          drawScreenPart(
            ctx,
            thermal,
            left,
            top,
            width,
            height,
            left,
            top,
            width,
            height,
          );
          ctx.imageSmoothingEnabled = true;
          ctx.globalCompositeOperation = "lighter";
          for (const f of flares) {
            const t = (ms - f.flaresAt) / FLARE_MS;
            if (t < 0) continue;
            // flared spots keep smouldering
            ctx.globalAlpha =
              t < 1 ? Math.sin(Math.PI * Math.min(t, 0.5)) : 0.5;
            drawGlow(
              ctx,
              HOT,
              f.at.x,
              f.at.y,
              SPOT * (t < 1 ? 1 + 0.4 * Math.sin(Math.PI * t) : 0.8),
            );
          }
          if (ms >= overheatAt) {
            ctx.globalAlpha =
              0.85 * (1 - clamp01((ms - overheatAt) / overheatMs));
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
