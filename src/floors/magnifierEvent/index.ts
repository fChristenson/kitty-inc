// the "Magnifier" event (an experiment beyond the four templates: the frozen
// screen magnified): it covers its crit, whose click freezes the screen while
// a glowing magnifying lens glides across it, blowing up whatever's under it;
// it stops three times and zooms right in, each zoom a bloop, a jolt and a
// spray of cash bursting out of the lens; then it glides onto the
// total-income readout and zooms in hard in a huge blast and shake, and the
// coins sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { between, clamp01, smoothstep } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "magnifier";
const REWARD = 4;
// the lens: LENS of the screen's width across, zooming ZOOM times as it
// glides and up to PUMP times at a stop (FINAL on the total)
const LENS = 0.17;
const ZOOM = 1.6;
const PUMP = 3;
const FINAL = 4.5;
// the stops, as shares of the screen across and down
const STOPS: Point[] = [
  { x: 0.3, y: 0.7 },
  { x: 0.7, y: 0.5 },
  { x: 0.35, y: 0.32 },
];
const RIM = 5;
const STOP_COINS = 60;
const STOP_REACH: [number, number] = [40, 150];
const STOP_SHAKE = [1.2, 1.6, 2];

export const forceMagnifierEvent = registerWispEvent(
  KEY,
  "Magnifier",
  () => CONFIG.magnifierEvent.chance,
  (floor, context, area) => {
    const { glideMs, zoomMs, holdMs, mergeMs } = CONFIG.magnifierEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const r = (width * LENS) / 2;
    const flip = Math.random() < 0.5;
    const route: Point[] = [
      {
        x: flip ? area.right + r * 2 : area.left - r * 2,
        y: area.top + height * 0.8,
      },
      ...STOPS.map((s) => ({
        x: area.left + width * (flip ? 1 - s.x : s.x),
        y: area.top + height * s.y,
      })),
      fallback,
    ];
    // glide to stop k, then zoom there
    const legs = route.slice(1).map((_, k) => ({
      from: k * (glideMs + zoomMs),
      stopAt: k * (glideMs + zoomMs) + glideMs,
    }));
    const finalAt = legs[legs.length - 1].stopAt;
    const endAt = finalAt + zoomMs;
    const lens = { x: 0, y: 0 };
    const place = (ms: number): { at: Point; zoom: number } => {
      route[route.length - 1] = cover?.total() ?? fallback;
      const k = Math.min(legs.length - 1, Math.floor(ms / (glideMs + zoomMs)));
      const leg = legs[k];
      const u = smoothstep(clamp01((ms - leg.from) / glideMs));
      lens.x = route[k].x + (route[k + 1].x - route[k].x) * u;
      lens.y = route[k].y + (route[k + 1].y - route[k].y) * u;
      const pump = Math.sin(Math.PI * clamp01((ms - leg.stopAt) / zoomMs));
      const peak = k === legs.length - 1 ? FINAL : PUMP;
      return { at: lens, zoom: ZOOM + (peak - ZOOM) * pump };
    };

    const stops = createBeats(
      legs,
      (l) => l.stopAt + zoomMs * 0.5,
      (_, k) => {
        const at = route[k + 1];
        if (k === legs.length - 1) {
          cover!.blast(cover!.total() ?? fallback);
          return;
        }
        cover!.burst(at, 0.8);
        cover!.launchFrom(
          at,
          sprayTargets(at, STOP_COINS, [
            STOP_REACH[0],
            between([STOP_REACH[1] * 0.8, STOP_REACH[1]]),
          ]),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(STOP_SHAKE[k]);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => stops.tick(ms, now),
        drawOver: (ctx, ms) => {
          if (ms >= endAt) return;
          const { at, zoom } = place(ms);
          const m = ctx.getTransform();
          // the patch of screen under the lens, blown up to fill it
          const half = r / zoom;
          const sx = m.a * (at.x - half) + m.e;
          const sy = m.d * (at.y - half) + m.f;
          const size = m.a * half * 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
          ctx.clip();
          if (size > 0)
            ctx.drawImage(
              ctx.canvas,
              sx,
              sy,
              size,
              size,
              at.x - r,
              at.y - r,
              r * 2,
              r * 2,
            );
          ctx.restore();
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.lineWidth = RIM * 2;
          ctx.strokeStyle = "rgba(255,215,0,0.35)";
          ctx.beginPath();
          ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = RIM * 0.6;
          ctx.strokeStyle = COLOR.white;
          ctx.stroke();
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
