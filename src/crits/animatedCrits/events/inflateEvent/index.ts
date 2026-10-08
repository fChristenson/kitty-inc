// the "Inflate" event (experiment: the screen blows up like a balloon;
// cash): it covers its crit, whose click freezes the screen and it starts
// to swell, its middle bulging out toward you like a balloon being blown
// up, in breaths, each bigger and creakier, trembling; then it pops in a
// colossal blast and shake, its pieces flying off every way over a blaze of
// gold and a burst of cash pouring into the total, and the pieces fly back
// together into place. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawDetonation } from "../../../../shared/explosion";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "inflate";
const REWARD = 4;
const COLS = 8;
const ROWS = 12;
const BREATHS = 3;
// how far the bulge swells: the middle pushed out and blown up this much
const BULGE = 0.55;
const TREMBLE = 5;
const FLING: [number, number] = [1.6, 2.6];
const RIVERS = 6;
const RING = 50;
const COLOSSAL = 540;
const VOID = "rgba(0,0,0,0.88)";
const GOLD = fadeStops(COLOR.heavenlyGold);
const BREATH_SHAKE: [number, number] = [0.3, 0.8];
const POP_SHAKE = 2.6;
const BACK_SHAKE = 0.8;

export const forceInflateEvent = registerWispEvent(
  KEY,
  "Inflate",
  () => CONFIG.inflateEvent.chance,
  (floor, context, area) => {
    const { breathMs, poppedMs, backMs, holdMs, mergeMs } = CONFIG.inflateEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const mid: Point = { x: left + width / 2, y: top + height / 2 };
    const reach = Math.hypot(width, height) / 2;
    const breaths = Array.from(
      { length: BREATHS },
      (_, k) => (k + 1) * breathMs,
    );
    const popsAt = breaths[BREATHS - 1];
    const backAt = popsAt + poppedMs;
    const endAt = backAt + backMs;
    // how blown up it is: a swell per breath, sagging back a little between
    const swellAt = (ms: number) => {
      const k = Math.min(BREATHS - 1, Math.floor(ms / breathMs));
      const u = clamp01((ms - k * breathMs) / breathMs);
      const from = k / BREATHS;
      const to = (k + 1) / BREATHS;
      return lerp([from * 0.85, to], smoothstep(u));
    };
    const tw = width / COLS;
    const th = height / ROWS;
    const tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
      const x = left + (i % COLS) * tw;
      const y = top + Math.floor(i / COLS) * th;
      const dx = x + tw / 2 - mid.x;
      const dy = y + th / 2 - mid.y;
      const d = Math.hypot(dx, dy);
      return {
        x,
        y,
        dx,
        dy,
        near: 1 - d / reach,
        fling: lerp(FLING, Math.random()),
      };
    }).sort((a, b) => a.near - b.near);
    const rivers = Array.from({ length: RIVERS }, (_, i) => {
      const angle = (i / RIVERS) * Math.PI * 2;
      const out: Point = {
        x: mid.x + Math.cos(angle) * 420,
        y: mid.y + Math.sin(angle) * 420,
      };
      return sampleLine(
        (u) => ({
          x: lerp([lerp([mid.x, out.x], u), total.x], u * u),
          y: lerp([lerp([mid.y, out.y], u), total.y], u * u),
        }),
        24,
      );
    });
    const pour: Pour = {
      coinsAlong: 220,
      width: 34,
      streamMs: 380,
      travelMs: 700,
    };

    let shot: ScreenCopy | null = null;
    const breathing = createBeats(
      breaths.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BREATH_SHAKE, k / Math.max(1, BREATHS - 2)));
      },
    );
    const popping = createBeats(
      [popsAt],
      (ms) => ms,
      () => {
        for (const line of rivers) pourLine(cover!, line, pour);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            ringTargets(mid, RING, [160, 380]),
            top + 40,
            area.bottom - 40,
          ),
        );
        cover!.blast(mid);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(POP_SHAKE);
      },
    );
    const settling = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(BACK_SHAKE);
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
          breathing.tick(ms, now);
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
          const swell = t < popsAt ? swellAt(t) : 0;
          // flung off at the pop, then flying back in
          const fly =
            t < popsAt
              ? 0
              : t < backAt
                ? easeOut(clamp01((t - popsAt) / poppedMs))
                : 1 - easeIn(clamp01((t - backAt) / backMs));
          const shiver = t < popsAt ? Math.sin(t * 0.09) * TREMBLE * swell : 0;
          for (const tile of tiles) {
            const bulge = swell * BULGE * tile.near * tile.near;
            const push = 1 + bulge + fly * tile.fling;
            const scale = 1 + bulge * 1.4;
            const w = tw * scale;
            const h = th * scale;
            const cx = mid.x + tile.dx * push + shiver;
            const cy = mid.y + tile.dy * push;
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
          // the copy hides the cover's own blast, so the pop is drawn on top
          if (ms >= popsAt && ms < popsAt + 900)
            drawDetonation(ctx, mid, ms - popsAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
