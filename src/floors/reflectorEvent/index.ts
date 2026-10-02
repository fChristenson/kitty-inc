// the "Reflector" event (beam): it covers its crit, whose click freezes the
// screen while mirror wisps pop up zigzagging up its sides; an aim laser
// flickers out of the clicked floor's button onto the first, then a blazing
// beam fires and ricochets mirror to mirror up the screen, ever faster, cash
// pouring down every leg of it, every mirror it strikes a flare, a bang, a
// jolt and a spray of coins; the last leg slams into the total-income
// readout in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOutBack, lerp } from "../../shared/easing";
import { sprayTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { drawAimLaser, drawBeam, drawBeamFlare } from "../../shared/beam";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "reflector";
const REWARD = 4;
// the mirrors, as shares of the screen across (from the side the first is
// on) and down
const MIRRORS: Point[] = [
  { x: 0.16, y: 0.66 },
  { x: 0.84, y: 0.5 },
  { x: 0.18, y: 0.34 },
  { x: 0.8, y: 0.2 },
];
const MIRROR = 0.05;
const BLADE: [number, number] = [14, 24];
const TIP_FLARE = 26;
const MIRROR_FLARE = 18;
const FADE_MS = 200;
const HIT_COINS = 34;
const HIT_REACH: [number, number] = [40, 140];
const HIT_SHAKE: [number, number] = [1.1, 2.1];

export const forceReflectorEvent = registerWispEvent(
  KEY,
  "Reflector",
  () => CONFIG.reflectorEvent.chance,
  (floor, context, area) => {
    const { popMs, aimMs, legsMs, streamMs, travelMs, holdMs, mergeMs } =
      CONFIG.reflectorEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const flip = Math.random() < 0.5;
    const mirrors = MIRRORS.map((m) => ({
      x: area.left + width * (flip ? 1 - m.x : m.x),
      y: area.top + height * m.y,
    }));
    // every leg's ends; the last ends on the total, wherever it's drawn
    const stops: Point[] = [button, ...mirrors, { ...fallback }];
    const legs = stops.length - 1;
    const starts: number[] = [];
    const spans: number[] = [];
    let clock = popMs + aimMs;
    for (let k = 0; k < legs; k++) {
      starts.push(clock);
      spans.push(lerp(legsMs, k / (legs - 1)));
      clock += spans[k];
    }
    const hitAt = clock;
    const pour: Pour = { coinsAlong: 120, width: 18, streamMs, travelMs };
    const tip = { x: 0, y: 0 };
    const sync = () => {
      const total = cover?.total() ?? fallback;
      stops[legs].x = total.x;
      stops[legs].y = total.y;
    };

    const firing = createBeats(
      starts,
      (ms) => ms,
      (_, k) => {
        sync();
        const a = stops[k];
        const b = stops[k + 1];
        pourLine(
          cover!,
          sampleLine(
            (u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }),
            24,
          ),
          pour,
        );
      },
    );
    const hits = createBeats(
      mirrors,
      (_, k) => starts[k] + spans[k],
      (m, k) => {
        const t = k / (mirrors.length - 1);
        cover!.burst(m, 0.6 + 0.5 * t);
        cover!.launchFrom(m, sprayTargets(m, HIT_COINS, HIT_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, t));
      },
    );
    const finale = createBeats(
      [hitAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );
    const mirrorSize = Math.max(WISP_SIZE, width * MIRROR);
    const mirrorAt = mirrors.map(
      (m) =>
        (ms: number): Point | null =>
          ms < 0 || ms >= hitAt + FADE_MS ? null : m,
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(starts[legs - 1], pour),
          hitAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hits.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms >= hitAt + FADE_MS + 600) return;
          sync();
          mirrorAt.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              mirrorSize *
                easeOutBack(clamp01((ms - (k * popMs) / mirrors.length) / 160)),
              clamp01(ms / hitAt),
              0,
              hitAt + FADE_MS,
            ),
          );
          if (ms < starts[0]) {
            if (ms >= popMs) drawAimLaser(ctx, stops[0], stops[1]);
            return;
          }
          const fade = 1 - clamp01((ms - hitAt) / FADE_MS);
          if (fade <= 0) return;
          const blade = lerp(BLADE, clamp01(ms / hitAt));
          for (let k = 0; k < legs; k++) {
            if (ms < starts[k]) break;
            const a = stops[k];
            const b = stops[k + 1];
            const u = clamp01((ms - starts[k]) / spans[k]);
            tip.x = a.x + (b.x - a.x) * u;
            tip.y = a.y + (b.y - a.y) * u;
            drawBeam(ctx, a, tip, blade * (0.9 + 0.1 * Math.random()), fade);
            drawBeamFlare(
              ctx,
              u < 1 ? tip : b,
              u < 1 ? TIP_FLARE : MIRROR_FLARE,
              fade,
              now,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
