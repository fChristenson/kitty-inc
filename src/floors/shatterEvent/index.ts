// the "Shatter" event (an experiment beyond the five templates: the frozen
// screen shatters like a pane of glass): it covers its crit, whose click
// freezes the screen while cracks shoot out from the clicked floor's button
// to the screen's edges in three hard knocks, each a crack, a jolt and coins
// spurting out of the impact; on the last the whole screen shatters in a
// blinding flash, a huge blast and shake, its shards blowing outward and
// tumbling away under gravity to reveal the game again, and the cash sweeps
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import type { Point } from "../../shared/wisp";

const KEY = "shatter";
const REWARD = 4;
const CRACKS = 9;
// the shards' rings, px out from the impact (the last reaches past the edges)
const RINGS = [150, 380];
const CRACK = 5;
const SPURT_COINS = 26;
const SPURT_REACH: [number, number] = [70, 280];
// shards fly out at SPEED px/ms (inner ones faster), falling at GRAVITY
const SPEED: [number, number] = [0.15, 0.55];
const GRAVITY = 0.0028;
const KNOCK_SHAKE = [0.9, 1.3, 1.7];
// the pane is copied this long before it shatters, under the cracks
const SNAP_EARLY_MS = 60;

interface Shard {
  poly: Point[];
  box: { x: number; y: number; w: number; h: number };
  vx: number;
  vy: number;
}

export const forceShatterEvent = registerWispEvent(
  KEY,
  "Shatter",
  () => CONFIG.shatterEvent.chance,
  (floor, context, area) => {
    const { knocksMs, fallMs, holdMs, mergeMs } = CONFIG.shatterEvent;
    const impact = getButtonCenter(context.isGroundFloor);
    const far =
      Math.max(
        ...[
          [area.left, area.top],
          [area.right, area.top],
          [area.left, area.bottom],
          [area.right, area.bottom],
        ].map(([x, y]) => Math.hypot(x - impact.x, y - impact.y)),
      ) + 60;
    const radii = [0, ...RINGS, far];
    const offset = Math.random() * Math.PI * 2;
    // every crack's corner points, out from the impact
    const cracks: Point[][] = Array.from({ length: CRACKS }, (_, i) => {
      const angle =
        offset + ((i + 0.5 * (Math.random() - 0.5)) / CRACKS) * Math.PI * 2;
      return radii.map((r, j) => {
        const a = angle + (j > 0 ? (Math.random() - 0.5) * 0.25 : 0);
        const rr =
          r * (j > 0 && j < radii.length - 1 ? 0.8 + 0.4 * Math.random() : 1);
        return {
          x: impact.x + Math.cos(a) * rr,
          y: impact.y + Math.sin(a) * rr,
        };
      });
    });
    const shards: Shard[] = [];
    for (let i = 0; i < CRACKS; i++) {
      const a = cracks[i];
      const b = cracks[(i + 1) % CRACKS];
      for (let j = 0; j + 1 < radii.length; j++) {
        const poly =
          j === 0 ? [a[0], b[1], a[1]] : [a[j], b[j], b[j + 1], a[j + 1]];
        const xs = poly.map((p) => p.x);
        const ys = poly.map((p) => p.y);
        const box = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
        const cx = xs.reduce((s, x) => s + x, 0) / xs.length - impact.x;
        const cy = ys.reduce((s, y) => s + y, 0) / ys.length - impact.y;
        const length = Math.hypot(cx, cy) || 1;
        const speed =
          SPEED[0] +
          (SPEED[1] - SPEED[0]) *
            (1 - j / radii.length) *
            (0.6 + 0.4 * Math.random());
        shards.push({
          poly,
          box,
          vx: (cx / length) * speed,
          vy: (cy / length) * speed,
        });
      }
    }
    // the knocks before the last each open their share of the cracks
    const knocks = knocksMs;
    const shatterAt = knocks[knocks.length - 1];
    const endAt = shatterAt + fallMs;
    const opened = (i: number) =>
      knocks[Math.floor((i * (knocks.length - 1)) / CRACKS)];
    const tip: Point = { x: 0, y: 0 };

    const knocking = createBeats(
      knocks.slice(0, -1),
      (ms) => ms,
      (_, k) => {
        cover!.launchFrom(
          impact,
          clampTargetsY(
            sprayTargets(
              impact,
              SPURT_COINS,
              SPURT_REACH,
              -Math.PI / 2,
              Math.PI * 2,
            ),
            area.top + 40,
            area.bottom - 20,
          ),
        );
        cover!.burst(impact, 0.7 + 0.2 * k);
        if (!cover!.isLive()) return;
        playSwoosh();
        playExplosion();
        shakeScreen(KNOCK_SHAKE[k] ?? 1.5);
      },
    );
    const shattering = createBeats(
      [shatterAt],
      (ms) => ms,
      () => cover!.blast(impact, 70),
    );

    let pane: HTMLCanvasElement | null = null;
    let paneAt: DOMMatrix | null = null;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          knocking.tick(ms, now);
          shattering.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms >= endAt) {
            pane = null;
            return;
          }
          const m = ctx.getTransform();
          if (!pane && ms >= shatterAt - SNAP_EARLY_MS) {
            // the frozen screen as it was (before the cracks and the blast
            // draw over it), cut into shards from the shatter on
            pane = document.createElement("canvas");
            pane.width = ctx.canvas.width;
            pane.height = ctx.canvas.height;
            pane.getContext("2d")!.drawImage(ctx.canvas, 0, 0);
            paneAt = m;
          }
          if (ms < shatterAt) {
            // the cracks running out from the impact, a third per knock
            cracks.forEach((crack, i) => {
              const since = ms - opened(i);
              if (since < 0) return;
              const reach = easeOut(clamp01(since / 120)) * (crack.length - 1);
              for (let j = 0; j < reach; j++) {
                const f = Math.min(1, reach - j);
                const from = crack[j];
                tip.x = from.x + (crack[j + 1].x - from.x) * f;
                tip.y = from.y + (crack[j + 1].y - from.y) * f;
                drawBeam(ctx, from, tip, CRACK, 0.9);
              }
            });
            drawBeamFlare(ctx, impact, 24, 0.8, now);
            return;
          }
          if (!pane) return;
          const t = ms - shatterAt;
          // a blinding flash behind the shards, fading back to the game
          const flash = 1 - clamp01(t / (fallMs * 0.6));
          if (flash > 0) {
            ctx.fillStyle = `rgba(255,255,255,${flash})`;
            ctx.fillRect(
              area.left,
              area.top,
              area.right - area.left,
              area.bottom - area.top,
            );
          }
          const fade = 1 - clamp01((t - fallMs * 0.6) / (fallMs * 0.4));
          if (fade <= 0) return;
          const p0 = paneAt!;
          ctx.save();
          ctx.globalAlpha = fade;
          for (const s of shards) {
            const dx = s.vx * t;
            const dy = s.vy * t + 0.5 * GRAVITY * t * t;
            const sx = Math.max(0, p0.a * s.box.x + p0.e);
            const sy = Math.max(0, p0.d * s.box.y + p0.f);
            const sw =
              Math.min(pane.width, p0.a * (s.box.x + s.box.w) + p0.e) - sx;
            const sh =
              Math.min(pane.height, p0.d * (s.box.y + s.box.h) + p0.f) - sy;
            if (sw <= 0 || sh <= 0) continue;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(s.poly[0].x + dx, s.poly[0].y + dy);
            for (let k = 1; k < s.poly.length; k++)
              ctx.lineTo(s.poly[k].x + dx, s.poly[k].y + dy);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(
              pane,
              sx,
              sy,
              sw,
              sh,
              (sx - p0.e) / p0.a + dx,
              (sy - p0.f) / p0.d + dy,
              sw / p0.a,
              sh / p0.d,
            );
            ctx.restore();
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
