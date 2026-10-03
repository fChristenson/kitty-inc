// the "Pixel Storm" event (experiment: the frozen screen breaks into a
// flock; cash): it covers its crit, whose click freezes the screen and it
// breaks up into big square tiles that peel away from the clicked floor's
// button outward and take flight, swirling round the middle of the dark
// screen like a murmuration of starlings, faster and faster; then they
// stream back home row by row, each row clicking into place with a bloop,
// a jolt and coins, until the screen is whole again in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { hash01 } from "../../shared/twinkle";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../shared/glowSprite";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../shared/screenCopy";

const KEY = "pixelStorm";
const REWARD = 4;
const COLS = 6;
const ROWS = 9;
const LIFT_SPREAD_MS = 260;
const FLY_MS = 280;
const SWIRL_TURNS = 1.6;
const SHRINK = 0.8;
const ROW_COINS = 10;
const VOID = "rgba(0,0,0,0.88)";
const GLOW = fadeStops(COLOR.heavenlyGold);
const ROW_SHAKE: [number, number] = [0.4, 1.1];

export const forcePixelStormEvent = registerWispEvent(
  KEY,
  "Pixel Storm",
  () => CONFIG.pixelStormEvent.chance,
  (floor, context, area) => {
    const { swirlMs, rowGapMs, holdMs, mergeMs } = CONFIG.pixelStormEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const tileW = width / COLS;
    const tileH = height / ROWS;
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const button = getButtonCenter(context.isGroundFloor);
    const reach = Math.hypot(width, height);
    const returnAt = LIFT_SPREAD_MS + FLY_MS + swirlMs;
    const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const home = { x: left + c * tileW, y: top + r * tileH };
      const d =
        Math.hypot(home.x + tileW / 2 - button.x, home.y + tileH / 2 - button.y) /
        reach;
      return {
        home,
        row: r,
        lifts: d * LIFT_SPREAD_MS,
        returns: returnAt + (ROWS - 1 - r) * rowGapMs,
        radius: lerp([0.12, 0.42], hash01(i, 3)) * Math.min(width, height),
        phase: hash01(i, 4) * Math.PI * 2,
        squash: lerp([0.6, 1], hash01(i, 5)),
      };
    });
    const rows = Array.from({ length: ROWS }, (_, r) => ({
      r,
      lands: returnAt + (ROWS - 1 - r) * rowGapMs + FLY_MS,
      at: { x: mid.x, y: top + (r + 0.5) * tileH },
    }));
    const endAt = returnAt + (ROWS - 1) * rowGapMs + FLY_MS + 60;
    const spot = { x: 0, y: 0 };
    const swirl = (t: (typeof tiles)[number], ms: number) => {
      const s = clamp01(ms / returnAt);
      const a = t.phase + Math.PI * 2 * SWIRL_TURNS * s * s;
      spot.x = mid.x + Math.cos(a) * t.radius - tileW / 2;
      spot.y = mid.y + Math.sin(a) * t.radius * t.squash - tileH / 2;
      return spot;
    };

    let shot: ScreenCopy | null = null;
    const landing = createBeats(
      rows,
      (row) => row.lands,
      (row, k) => {
        cover!.launchFrom(
          row.at,
          clampTargetsY(
            sprayTargets(row.at, ROW_COINS, [60, 220], -Math.PI / 2, Math.PI),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(ROW_SHAKE, k / (ROWS - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(mid),
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
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          ctx.save();
          ctx.fillStyle = VOID;
          ctx.fillRect(left, top, width, height);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.5;
          drawGlow(ctx, GLOW, mid.x, mid.y, Math.min(width, height) * 0.45);
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
          for (const t of tiles) {
            let x = t.home.x;
            let y = t.home.y;
            let k = 1;
            if (ms >= t.returns) {
              const u = clamp01((ms - t.returns) / FLY_MS);
              const s = swirl(t, t.returns);
              const e = easeOutBack(u);
              x = lerp([s.x, t.home.x], e);
              y = lerp([s.y, t.home.y], e);
              k = lerp([SHRINK, 1], u);
            } else if (ms >= t.lifts) {
              const u = smoothstep(clamp01((ms - t.lifts) / FLY_MS));
              const s = swirl(t, ms);
              x = lerp([t.home.x, s.x], u);
              y = lerp([t.home.y, s.y], u);
              k = lerp([1, SHRINK], easeIn(u));
            }
            const w = tileW * k;
            const h = tileH * k;
            drawScreenPart(
              ctx,
              shot,
              t.home.x,
              t.home.y,
              tileW,
              tileH,
              x + (tileW - w) / 2,
              y + (tileH - h) / 2,
              w,
              h,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
