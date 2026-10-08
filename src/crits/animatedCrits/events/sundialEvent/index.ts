// the "Sundial" event (beam; worker perma tiers): it covers its crit, whose
// click freezes the screen while a sun wisp rises off the left horizon of
// the clicked floor's button and climbs over it like the sun over a sundial,
// a blazing shaft of its light thrown from the dial out past it; as the sun
// climbs the shaft sweeps up across the floor, and every worker it passes
// over flares up a perma tier with a jolt; the last lights in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardWorkers, type RewardWorker } from "../../eventRewards";

const KEY = "sundial";
const MAX_WORKERS = 6;
const SUN = WISP_SIZE * 1.6;
// how far the sun rides out from the button, and its shaft past it
const ORBIT = 0.42;
const REACH = 1.6;
const BEAM = 36;
const CORE = 12;
const FLARE = 60;
const FLARE_MS = 300;
// radians the sweep starts before the first worker and ends past the last
const MARGIN = 0.15;
const HIT_SHAKE: [number, number] = [0.5, 1.1];

// a worker's heading from the button: the button sits against the right
// wall at the floor's foot, so workers lie between -π (left) and 0
const heading = (button: Point, w: RewardWorker) =>
  Math.atan2(w.at.y - button.y, w.at.x - button.x);

export const forceSundialEvent = registerWispEvent(
  KEY,
  "Sundial",
  () => CONFIG.sundialEvent.chance,
  (floor, context, area) => {
    const { riseMs, sweepMs, holdMs, mergeMs } = CONFIG.sundialEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const workers = findRewardWorkers(floor, context)
      .filter((w) => heading(button, w) < 0)
      .slice(0, MAX_WORKERS);
    if (workers.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const orbit = Math.min(width * ORBIT, button.y - area.top - 60);
    const reach = Math.max(width, height) * REACH;
    const headings = workers.map((w) => heading(button, w));
    const from = Math.max(-Math.PI, Math.min(...headings) - MARGIN);
    const to = Math.min(0, Math.max(...headings) + MARGIN);
    // the sun's heading from the button, climbing from the horizon
    const sunAngle = (ms: number) =>
      lerp([from, to], smoothstep(clamp01((ms - riseMs) / sweepMs)));
    const sun: Point = { x: 0, y: 0 };
    const sunAt = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const a = sunAngle(ms);
      const rise = clamp01(ms / riseMs);
      sun.x = button.x + Math.cos(a) * orbit;
      sun.y = button.y + Math.sin(a) * orbit + (1 - rise) * 120;
      return sun;
    };
    // a worker is lit when the shaft's heading reaches its own
    const hits = workers
      .map((worker, k) => {
        const want = (headings[k] - from) / (to - from);
        // invert smoothstep by bisection
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (smoothstep(mid) < want) lo = mid;
          else hi = mid;
        }
        return { worker, ms: riseMs + lo * sweepMs };
      })
      .sort((a, b) => a.ms - b.ms);
    const last = hits[hits.length - 1];
    const endAt = riseMs + sweepMs + FLARE_MS;
    const far: Point = { x: 0, y: 0 };

    const lighting = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.promote(h.worker);
        if (h === last) {
          cover!.blast(h.worker.at);
          return;
        }
        cover!.burst(h.worker.at, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers: workers,
        tick: (ms, now) => lighting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const at = sunAt(ms);
          if (!at) return;
          const fade =
            clamp01((ms - riseMs * 0.5) / (riseMs * 0.5)) *
            (1 - clamp01((ms - riseMs - sweepMs) / FLARE_MS));
          const dx = at.x - button.x;
          const dy = at.y - button.y;
          const len = Math.hypot(dx, dy) || 1;
          far.x = button.x + (dx / len) * reach;
          far.y = button.y + (dy / len) * reach;
          drawBeam(ctx, button, far, BEAM, 0.6 * fade);
          drawBeam(ctx, button, far, CORE, fade);
          for (const h of hits) {
            const t = (ms - h.ms) / FLARE_MS;
            if (t >= 0 && t < 1)
              drawBeamFlare(ctx, h.worker.at, FLARE, 1 - t, now);
          }
          drawWisp(ctx, sunAt, ms, now, SUN, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => {
    const button = getButtonCenter(context.isGroundFloor);
    return findRewardWorkers(floor, context).some(
      (w) => heading(button, w) < 0,
    );
  },
);
