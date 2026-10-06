// the "Flow Field" event (experiment: particles riding a swirling flow
// field, like a wind map; cash): it covers its crit, whose click freezes the
// screen while coins scatter evenly all over it; an invisible current stirs
// up and they start to drift, gathering into long swirling streams that
// curl round eddies and braid together, every gust a whoosh and a jolt;
// then the whole field bends toward the total and every stream pours into
// it in a huge blast. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { scatterEvenly } from "../../shared/clutter";
import type { CoinPath } from "../coins";
import { totalSpot } from "../cashFlow";

const KEY = "flowField";
const REWARD = 4;
const COINS = 340;
const MARGIN = 40;
// the field: px per ms at full strength, eddies this many px across,
// drifting with time; then a pull toward the total, in px per ms
const SPEED = 0.45;
const EDDY = 260;
const DRIFT = 0.0008;
const PULL = 2;
const ARRIVE = 40;
const STEP = 12;
const GUSTS = 3;
const GUST_SHAKE: [number, number] = [0.3, 0.7];

export const forceFlowFieldEvent = registerWispEvent(
  KEY,
  "Flow Field",
  () => CONFIG.flowFieldEvent.chance,
  (floor, context, area) => {
    const { scatterMs, flowMs, pourMs, holdMs, mergeMs } =
      CONFIG.flowFieldEvent;
    const target = totalSpot(area);
    const box = {
      left: area.left + MARGIN,
      top: area.top + MARGIN,
      right: area.right - MARGIN,
      bottom: area.bottom - MARGIN,
    };
    const spots = scatterEvenly(box, COINS);
    const pourAt = scatterMs + flowMs;
    const endAt = pourAt + pourMs;
    const k = (Math.PI * 2) / EDDY;
    const phase = Math.random() * Math.PI * 2;

    // the coins, advected once through the field: a curl of two drifting
    // wave patterns (so it never piles up), bent toward the total at the end
    const steps = Math.ceil((endAt - scatterMs) / STEP) + 1;
    const frames = new Float32Array(steps * COINS * 2);
    const arrived = new Float32Array(COINS).fill(Infinity);
    const x = Float32Array.from(spots, (p) => p.x);
    const y = Float32Array.from(spots, (p) => p.y);
    for (let s = 0; s < steps; s++) {
      const ms = scatterMs + s * STEP;
      const strength = smoothstep(clamp01((ms - scatterMs) / (flowMs * 0.4)));
      const pull = PULL * smoothstep(clamp01((ms - pourAt) / pourMs));
      const t = ms * DRIFT;
      for (let i = 0; i < COINS; i++) {
        if (arrived[i] < Infinity) {
          frames[(s * COINS + i) * 2] = target.x;
          frames[(s * COINS + i) * 2 + 1] = target.y;
          continue;
        }
        const px = x[i] * k;
        const py = y[i] * k;
        // the curl of sin(px + t) sin(py) + 0.6 sin(0.7 py - t) cos(0.7 px):
        // closed eddies, so the coins circle instead of piling up
        let vx =
          Math.sin(px + t) * Math.cos(py) +
          0.42 * Math.cos(0.7 * py - t) * Math.cos(0.7 * px + phase);
        let vy =
          -Math.cos(px + t) * Math.sin(py) +
          0.42 * Math.sin(0.7 * py - t) * Math.sin(0.7 * px + phase);
        vx *= SPEED * strength * (1 - pull / PULL);
        vy *= SPEED * strength * (1 - pull / PULL);
        const dx = target.x - x[i];
        const dy = target.y - y[i];
        const d = Math.hypot(dx, dy) || 1;
        x[i] += (vx + (dx / d) * pull) * STEP;
        y[i] += (vy + (dy / d) * pull) * STEP;
        if (pull === 0) {
          x[i] = Math.min(box.right, Math.max(box.left, x[i]));
          y[i] = Math.min(box.bottom, Math.max(box.top, y[i]));
        }
        if (d < ARRIVE) arrived[i] = ms;
        frames[(s * COINS + i) * 2] = x[i];
        frames[(s * COINS + i) * 2 + 1] = y[i];
      }
    }
    const lastIn = Math.min(
      endAt,
      Math.max(
        ...Array.from(arrived).map((ms) => (Number.isFinite(ms) ? ms : endAt)),
      ),
    );
    const travelMs = endAt;

    const paths: CoinPath[] = spots.map((spot, i) => {
      const pops = (scatterMs * 0.8 * i) / COINS;
      return (f: number) => {
        const ms = f * travelMs;
        if (ms < pops) return { x: spot.x, y: spot.y, scale: 0 };
        if (ms < scatterMs) return { x: spot.x, y: spot.y };
        if (ms >= arrived[i]) return { x: target.x, y: target.y, scale: 0 };
        const t = Math.min(steps - 1, (ms - scatterMs) / STEP);
        const s = Math.min(steps - 2, Math.floor(t));
        const u = t - s;
        const a = (s * COINS + i) * 2;
        const b = a + COINS * 2;
        return {
          x: lerp([frames[a], frames[b]], u),
          y: lerp([frames[a + 1], frames[b + 1]], u),
          scale: ms >= endAt ? 0 : 1,
        };
      };
    });

    const gusting = createBeats(
      Array.from({ length: GUSTS }, (_, g) => scatterMs + (flowMs * g) / GUSTS),
      (ms) => ms,
      (_, g) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(GUST_SHAKE, g / (GUSTS - 1)));
      },
    );
    const pouring = createBeats(
      [0, pourAt, lastIn],
      (ms) => ms,
      (ms) => {
        if (ms === lastIn && ms > 0) {
          cover!.blast(cover!.total() ?? target);
          return;
        }
        if (cover!.isLive()) (ms === 0 ? playBloop : playSwoosh)();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          gusting.tick(ms, now);
          pouring.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
