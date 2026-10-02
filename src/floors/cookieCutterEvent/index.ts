// the "Cookie Cutter" event (beam): it covers its crit, whose click freezes
// the screen while an aim laser flickers down out of the sky onto a ring
// round the clicked floor's button; then a blazing beam fires and cuts round
// the ring like a cookie cutter, ever faster, cash spitting out of the cut,
// every quarter a flare, a bang and a jolt; the ring closes with a bang and
// the cut-out disc of the screen lifts out of its hole and flies up into the
// total-income readout, shrinking, in a huge blast and shake that sprays
// cash everywhere, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "cookieCutter";
const REWARD = 4;
// the ring RING of the screen's smaller side across round the button
const RING = 0.4;
const BLADE = 20;
const FLARE = 30;
const CUT = 5;
const SHRINK = 0.3;
const HOLE = "rgba(0,0,0,0.8)";
const GLOW = "rgba(255,215,0,0.45)";
// cash spits out of the cut every SPIT_MS
const SPIT_MS = 45;
const SPIT_COINS = 9;
const SPIT_REACH: [number, number] = [30, 110];
const QUARTER_SHAKE: [number, number] = [1, 1.8];
const CLOSE_SHAKE = 2.2;
const FINAL_COINS = 260;
const FINAL_REACH: [number, number] = [0.08, 0.6];

export const forceCookieCutterEvent = registerWispEvent(
  KEY,
  "Cookie Cutter",
  () => CONFIG.cookieCutterEvent.chance,
  (floor, context, area) => {
    const { aimMs, cutMs, liftMs, holdMs, mergeMs } = CONFIG.cookieCutterEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const r = (span * RING) / 2;
    const centre = {
      x: Math.min(area.right - r - 8, Math.max(area.left + r + 8, button.x)),
      y: Math.min(area.bottom - r - 8, Math.max(area.top + r + 90, button.y)),
    };
    const sky = { x: (area.left + area.right) / 2, y: area.top - 60 };
    const way = Math.random() < 0.5 ? 1 : -1;
    const from = -Math.PI / 2;
    const cutAt = aimMs;
    const closeAt = cutAt + cutMs;
    const inAt = closeAt + liftMs;
    const angle = (ms: number) =>
      from + way * Math.PI * 2 * easeIn(clamp01((ms - cutAt) / cutMs)) ** 0.8;
    const tip = { x: 0, y: 0 };
    const tipAt = (ms: number) => {
      const a = angle(ms);
      tip.x = centre.x + Math.cos(a) * r;
      tip.y = centre.y + Math.sin(a) * r;
      return tip;
    };
    // the quarters, by when the tip gets there
    const quarters = [1, 2, 3].map((q) => {
      const share = (q / 4) ** (1 / 0.8);
      return cutAt + cutMs * Math.sqrt(share);
    });
    const spits = Array.from(
      { length: Math.floor(cutMs / SPIT_MS) },
      (_, k) => cutAt + k * SPIT_MS,
    );
    // the disc of screen, grabbed the moment it's cut free
    let disc: HTMLCanvasElement | null = null;

    const spitting = createBeats(
      spits,
      (ms) => ms,
      (ms) => {
        const at = { ...tipAt(ms) };
        const out = Math.atan2(at.y - centre.y, at.x - centre.x);
        cover!.launchFrom(
          at,
          sprayTargets(at, SPIT_COINS, SPIT_REACH).map((p) => ({
            x: p.x + Math.cos(out) * 40,
            y: p.y + Math.sin(out) * 40,
          })),
        );
      },
    );
    const quartering = createBeats(
      quarters,
      (ms) => ms,
      (ms, k) => {
        cover!.burst({ ...tipAt(ms) }, 0.7 + 0.2 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(QUARTER_SHAKE, k / 2));
      },
    );
    const closing = createBeats(
      [closeAt],
      (ms) => ms,
      () => {
        cover!.burst({ x: centre.x, y: centre.y - r }, 1.3);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(CLOSE_SHAKE);
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => {
        const total = cover!.total() ?? fallback;
        cover!.blast(total);
        cover!.launchFrom(
          total,
          clampTargetsY(
            sprayTargets(total, FINAL_COINS, [
              span * FINAL_REACH[0],
              span * FINAL_REACH[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );
    const ring = (
      ctx: CanvasRenderingContext2D,
      at: Point,
      radius: number,
      start: number,
      end: number,
    ) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius, start, end, way < 0);
      ctx.lineWidth = CUT * 3;
      ctx.strokeStyle = GLOW;
      ctx.stroke();
      ctx.lineWidth = CUT;
      ctx.strokeStyle = COLOR.white;
      ctx.stroke();
      ctx.restore();
    };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          spitting.tick(ms, now);
          quartering.tick(ms, now);
          closing.tick(ms, now);
          finale.tick(ms, now);
        },
        // the hole it leaves, under the coins
        drawUnder: (ctx, ms) => {
          if (ms < closeAt) return;
          if (!disc) {
            const m = ctx.getTransform();
            const size = Math.max(1, Math.ceil(m.a * r * 2));
            disc = document.createElement("canvas");
            disc.width = size;
            disc.height = size;
            disc
              .getContext("2d")!
              .drawImage(
                ctx.canvas,
                m.a * (centre.x - r) + m.e,
                m.d * (centre.y - r) + m.f,
                size,
                size,
                0,
                0,
                size,
                size,
              );
          }
          if (ms >= inAt + 300) return;
          ctx.save();
          ctx.fillStyle = HOLE;
          ctx.beginPath();
          ctx.arc(centre.x, centre.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ring(ctx, centre, r, 0, Math.PI * 2);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < cutAt) {
            drawAimLaser(ctx, sky, tipAt(cutAt));
            return;
          }
          if (ms < closeAt) {
            ring(ctx, centre, r, from, angle(ms));
            const at = tipAt(ms);
            drawBeam(ctx, sky, at, BLADE * (0.9 + 0.1 * Math.random()));
            drawBeamFlare(ctx, at, FLARE, 1, now);
            return;
          }
          if (ms >= inAt || !disc) return;
          // the disc flying up into the total, shrinking
          const total = cover?.total() ?? fallback;
          const u = smoothstep(clamp01((ms - closeAt) / liftMs));
          const lift = easeIn(u);
          const at = {
            x: centre.x + (total.x - centre.x) * lift,
            y: centre.y + (total.y - centre.y) * lift,
          };
          const size =
            r * (1 + 0.15 * Math.sin(u * Math.PI) - (1 - SHRINK) * lift);
          ctx.save();
          ctx.beginPath();
          ctx.arc(at.x, at.y, size, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(disc, at.x - size, at.y - size, size * 2, size * 2);
          ctx.restore();
          ring(ctx, at, size, 0, Math.PI * 2);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
