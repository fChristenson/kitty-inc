// the "Pendulum Wave" event (wisp): it covers its crit, whose click freezes
// the screen while a row of wisps drops in hanging from invisible threads
// across its top and swings, each a touch faster than the one before, so
// the row ripples through snaking waves and splits and rejoins, every swing
// of the end wisp a click, a jolt and coins flung off; then they all let go
// one after another and fly up into the total-income readout, the last in a
// huge blast and shake, and the coins sweep into the total. Pays floor
// income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutCubic } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "pendulumWave";
const REWARD = 4;
// PENDULA wisps hung from SPREAD of the screen's width, LONG of its height
// below a line HANG of its height down, swinging SWING radians at BASE_HZ,
// each STEP_HZ faster than the last
const PENDULA = 9;
const SPREAD = 0.8;
const HANG = 0.18;
const LONG = 0.5;
const SWING = 0.5;
const BASE_HZ = 1.1;
const STEP_HZ = 0.12;
const DROP_MS = 260;
const WISP = 0.045;
const FIRE_GAP_MS = 45;
const CLICK_COINS = 12;
const CLICK_REACH: [number, number] = [25, 70];
const CLICK_SHAKE = 1.1;
const HIT_BURST = 0.5;

export const forcePendulumWaveEvent = registerWispEvent(
  KEY,
  "Pendulum Wave",
  () => CONFIG.pendulumWaveEvent.chance,
  (floor, context, area) => {
    const { swingMs, fireMs, holdMs, mergeMs } = CONFIG.pendulumWaveEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const hangY = area.top + height * HANG;
    const long = height * LONG;
    const pivots = Array.from({ length: PENDULA }, (_, k) => ({
      x: area.left + width * ((1 - SPREAD) / 2 + (SPREAD * k) / (PENDULA - 1)),
      hz: BASE_HZ + STEP_HZ * k,
    }));
    const angle = (k: number, ms: number) =>
      SWING * Math.cos(Math.PI * 2 * pivots[k].hz * (ms / 1000));
    const swingAt = (k: number, ms: number, into: Point): Point => {
      const a = angle(k, ms);
      const drop = easeOutCubic(clamp01(ms / DROP_MS));
      into.x = pivots[k].x + Math.sin(a) * long;
      into.y =
        area.top - 40 + (hangY + Math.cos(a) * long - area.top + 40) * drop;
      return into;
    };
    const releases = pivots.map((_, k) => swingMs + k * FIRE_GAP_MS);
    const arrivals = releases.map((r) => r + fireMs);
    const lastIn = arrivals[PENDULA - 1];
    // every half swing of the fastest: as it peaks out to one side
    const fastest = pivots[PENDULA - 1].hz;
    const clicks: number[] = [];
    for (let ms = 500 / fastest; ms < swingMs; ms += 500 / fastest)
      clicks.push(ms);
    const wisps = pivots.map((_, k) => {
      const into = { x: 0, y: 0 };
      const from = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= arrivals[k]) return null;
        if (ms < releases[k]) return swingAt(k, ms, into);
        swingAt(k, releases[k], from);
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - releases[k]) / fireMs));
        into.x = from.x + (total.x - from.x) * u;
        into.y = from.y + (total.y - from.y) * u;
        return into;
      };
    });

    const clicking = createBeats(
      clicks,
      (ms) => ms,
      (ms) => {
        const at = swingAt(PENDULA - 1, ms, { x: 0, y: 0 });
        cover!.launchFrom(at, ringTargets(at, CLICK_COINS, CLICK_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(CLICK_SHAKE);
      },
    );
    const hits = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === PENDULA - 1) cover!.blast(at);
        else cover!.burst(at, HIT_BURST);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          clicking.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const size = Math.max(WISP_SIZE, width * WISP);
          wisps.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              size,
              clamp01(ms / swingMs),
              0,
              arrivals[k],
            ),
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
