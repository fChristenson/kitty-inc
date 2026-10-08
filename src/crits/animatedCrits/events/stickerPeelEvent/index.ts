// the "Sticker Peel" event (experiment: the frozen screen peels off like a
// sticker; cash): it covers its crit, whose click freezes the screen and
// its bottom-right corner lifts and peels back diagonally across the
// screen, the curled-over flap showing a shining gold backing and a dark
// gold-lit void underneath; every quarter peeled is a rip, a jolt and coins
// bursting out from under the fold; once it's nearly all peeled it snaps
// back down flat in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  copyScreen,
  drawScreenPart,
  type ScreenCopy,
} from "../../../../shared/screenCopy";

const KEY = "stickerPeel";
const REWARD = 4;
// the peel runs along this direction, toward the bottom-right corner
const DIR = { x: 0.82, y: 0.57 };
const REACH = 0.88;
const RIPS = 4;
const EDGE = 5;
const COINS = 16;
const VOID = "rgba(0,0,0,0.9)";
const GLOW = fadeStops(COLOR.heavenlyGold);
const RIP_SHAKE: [number, number] = [0.5, 1.3];

// the part of polygon `poly` on one side of the line p·DIR = d
function cut(poly: Point[], d: number, beyond: boolean): Point[] {
  const out: Point[] = [];
  const side = (p: Point) =>
    (p.x * DIR.x + p.y * DIR.y - d) * (beyond ? 1 : -1);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

function trace(ctx: CanvasRenderingContext2D, poly: Point[]): void {
  ctx.beginPath();
  poly.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.closePath();
}

export const forceStickerPeelEvent = registerWispEvent(
  KEY,
  "Sticker Peel",
  () => CONFIG.stickerPeelEvent.chance,
  (floor, context, area) => {
    const { peelMs, snapMs, holdMs, mergeMs } = CONFIG.stickerPeelEvent;
    const left = area.left;
    const top = area.top;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const rect: Point[] = [
      { x: left, y: top },
      { x: area.right, y: top },
      { x: area.right, y: area.bottom },
      { x: left, y: area.bottom },
    ];
    const dot = (p: Point) => p.x * DIR.x + p.y * DIR.y;
    const d0 = dot(rect[2]);
    const d1 = lerp([d0, dot(rect[0])], REACH);
    const snapAt = peelMs;
    const endAt = snapAt + snapMs;
    const line = (ms: number) =>
      ms < snapAt
        ? lerp([d0, d1], smoothstep(clamp01(ms / peelMs)))
        : lerp([d1, d0], easeIn(clamp01((ms - snapAt) / snapMs)));
    const rips = Array.from({ length: RIPS }, (_, k) => {
      // when the peel crosses each quarter of its run
      const share = (k + 1) / (RIPS + 1);
      let lo = 0;
      let hi: number = peelMs;
      for (let i = 0; i < 20; i++) {
        const m = (lo + hi) / 2;
        if ((d0 - line(m)) / (d0 - d1) < share) lo = m;
        else hi = m;
      }
      return lo;
    });
    const mid = { x: left + width / 2, y: top + height / 2 };
    const foldPoint = (d: number): Point => {
      const k = d - dot(mid);
      return { x: mid.x + DIR.x * k, y: mid.y + DIR.y * k };
    };

    let shot: ScreenCopy | null = null;
    const ripping = createBeats(
      rips,
      (ms) => ms,
      (ms, k) => {
        const at = foldPoint(line(ms));
        cover!.launchFrom(
          at,
          clampTargetsY(
            sprayTargets(at, COINS, [60, 240]),
            top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(RIP_SHAKE, k / (RIPS - 1)));
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
          ripping.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms >= endAt) {
            shot = null;
            return;
          }
          shot ??= copyScreen(ctx);
          const d = line(ms);
          const peeled = cut(rect, d, true);
          if (peeled.length < 3) return;
          const kept = cut(rect, d, false);
          ctx.save();
          // the void under the peeled part
          trace(ctx, peeled);
          ctx.fillStyle = VOID;
          ctx.fill();
          ctx.save();
          ctx.clip();
          ctx.globalCompositeOperation = "lighter";
          drawGlow(ctx, GLOW, rect[2].x, rect[2].y, width * 0.8);
          ctx.restore();
          // the still-stuck part of the screen
          if (kept.length >= 3) {
            ctx.save();
            trace(ctx, kept);
            ctx.clip();
            drawScreenPart(
              ctx,
              shot,
              left,
              top,
              width,
              height,
              left,
              top,
              width,
              height,
            );
            ctx.restore();
          }
          // the flap folded back over it, gold side up
          const flap = peeled.map((p) => {
            const k = 2 * (dot(p) - d);
            return { x: p.x - DIR.x * k, y: p.y - DIR.y * k };
          });
          trace(ctx, flap);
          ctx.fillStyle = COLOR.heavenlyGold;
          ctx.fill();
          ctx.lineWidth = EDGE;
          ctx.strokeStyle = COLOR.goldStandardAmber;
          ctx.stroke();
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
