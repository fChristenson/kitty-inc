// the "Jellyfish" event (wisp): it covers its crit, whose click freezes the
// screen while a big wisp rises from below it like a jellyfish, a skirt of
// small tentacle wisps trailing under it; it climbs in pulses, ever faster,
// every pulse a squeeze of its tentacles, a flash, a bloop, a jolt and a ring
// of coins pumped out under it; at the top it dives into the total-income
// readout in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutCubic, lerp } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "jellyfish";
const REWARD = 4;
// PULSES thrusts from below the screen up to UNDER of its height beneath the
// total, each surging over THRUST_MS, then sinking back SINK px
const PULSES = 6;
const FIRST_MS = 120;
const UNDER = 0.16;
const THRUST_MS = 160;
const SINK = 14;
const SWAY = 22;
const BELL = 0.085;
// TENTACLES trailing LAG_MS apart, SPREAD px apart and DANGLE px down,
// squeezed together on each pulse
const TENTACLES = 5;
const TENTACLE = 0.4;
const LAG_MS = 45;
const SPREAD = 16;
const DANGLE = 34;
const SQUEEZE_MS = 180;
const PULSE_COINS = 26;
const PULSE_REACH: [number, number] = [40, 120];
const PULSE_BURST: [number, number] = [0.5, 1];
const PULSE_SHAKE: [number, number] = [0.9, 2];

export const forceJellyfishEvent = registerWispEvent(
  KEY,
  "Jellyfish",
  () => CONFIG.jellyfishEvent.chance,
  (floor, context, area) => {
    const { pulseGapsMs, diveMs, holdMs, mergeMs } = CONFIG.jellyfishEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const startX =
      (area.left + area.right) / 2 + (Math.random() - 0.5) * width * 0.3;
    const pulses: number[] = [];
    let clock = FIRST_MS;
    for (let k = 0; k < PULSES; k++) {
      pulses.push(clock);
      clock += lerp(pulseGapsMs, k / (PULSES - 1));
    }
    const diveAt = clock;
    const inAt = diveAt + diveMs;
    const floorY = area.bottom + 60;
    const topY = fallback.y + height * UNDER;
    const levels = Array.from(
      { length: PULSES + 1 },
      (_, k) => floorY + (topY - floorY) * Math.sqrt(k / PULSES),
    );
    // the latest pulse by ms, or -1
    const pulseIndex = (ms: number) => {
      let k = -1;
      while (k + 1 < PULSES && ms >= pulses[k + 1]) k++;
      return k;
    };
    const bellY = (ms: number) => {
      const k = pulseIndex(ms);
      if (k < 0) return levels[0];
      const since = ms - pulses[k];
      const surge = easeOutCubic(clamp01(since / THRUST_MS));
      const sink = SINK * clamp01((since - THRUST_MS) / 300);
      return levels[k] + (levels[k + 1] - levels[k]) * surge + sink;
    };
    const bellX = (ms: number) => startX + Math.sin(ms / 260) * SWAY;
    const bell = { x: 0, y: 0 };
    const bellAt = (ms: number): Point | null => {
      if (ms >= inAt) return null;
      const t = Math.max(0, ms);
      if (t < diveAt) {
        bell.x = bellX(t);
        bell.y = bellY(t);
        return bell;
      }
      const total = cover?.total() ?? fallback;
      const u = easeIn((t - diveAt) / diveMs);
      const fromX = bellX(diveAt);
      const fromY = bellY(diveAt);
      bell.x = fromX + (total.x - fromX) * u;
      bell.y = fromY + (total.y - fromY) * u;
      return bell;
    };
    // how hard the tentacles are squeezed together ms in, 0..1
    const squeeze = (ms: number) => {
      const k = pulseIndex(ms);
      return k < 0 ? 0 : Math.exp(-(ms - pulses[k]) / SQUEEZE_MS);
    };
    const tentacles = Array.from({ length: TENTACLES }, (_, k) => {
      const into = { x: 0, y: 0 };
      const lag = LAG_MS * (1 + Math.abs(k - (TENTACLES - 1) / 2));
      const side = k - (TENTACLES - 1) / 2;
      return (ms: number): Point | null => {
        const head = bellAt(ms - lag);
        if (!head || ms >= inAt + lag) return null;
        const open = 1 - 0.7 * squeeze(ms);
        into.x = head.x + side * SPREAD * open;
        into.y = head.y + DANGLE * (0.7 + 0.3 * open) * (1 + (k % 2) * 0.25);
        return into;
      };
    });

    const pulsing = createBeats(
      pulses,
      (ms) => ms,
      (ms, k) => {
        const t = k / (PULSES - 1);
        const at = { x: bellX(ms), y: bellY(ms) + DANGLE };
        cover!.burst(at, lerp(PULSE_BURST, t));
        cover!.launchFrom(at, ringTargets(at, PULSE_COINS, PULSE_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PULSE_SHAKE, t));
      },
    );
    const finale = createBeats(
      [inAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const bellSize = Math.max(WISP_SIZE, width * BELL);

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pulsing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / diveAt);
          tentacles.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              bellSize * TENTACLE,
              heat,
              0,
              inAt + LAG_MS * (1 + Math.abs(k - (TENTACLES - 1) / 2)),
            ),
          );
          drawWispBetween(ctx, bellAt, ms, now, bellSize, heat, 0, inAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
