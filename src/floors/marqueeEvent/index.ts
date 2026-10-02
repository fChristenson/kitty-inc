// the "Marquee" event: it covers its crit, whose click freezes the screen
// while a ring of wisps lights up round its edges like the bulbs of a
// theatre marquee; a light chases round them, faster and faster, every lap a
// bloop, a jolt and a ring of coins, until it's a blur; then every bulb
// blazes at once with a bang and they all fire into the total-income
// readout, the last in a huge blast and shake, and the coins sweep into the
// total. Pays floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { ringTargets } from "../../shared/coinTargets";
import { createBeats } from "../../shared/eventBeats";
import { totalSpot } from "../cashFlow";

const KEY = "marquee";
const REWARD = 4;
// BULBS round a frame INSET of the screen's width in from its edges, its top
// UNDER of its height below the total; the chaser runs LAPS laps, trailing
// TAIL bulbs
const BULBS = 12;
const INSET = 0.1;
const UNDER = 0.1;
const LAPS = 4;
const TAIL = 3;
// the bulbs, as shares of the screen's width, unlit to lit
const BULB: [number, number] = [0.03, 0.065];
const POP_MS = 160;
const POP_GAP_MS = 25;
// fired into the total FIRE_GAP_MS apart
const FIRE_GAP_MS = 30;
const LAP_COINS = 10;
const LAP_REACH: [number, number] = [25, 60];
const LAP_SHAKE: [number, number] = [0.6, 1.6];
const BLAZE_BURST = 0.6;
const BLAZE_SHAKE = 2;
const HIT_BURST = 0.4;

export const forceMarqueeEvent = registerWispEvent(
  KEY,
  "Marquee",
  () => CONFIG.marqueeEvent.chance,
  (floor, context, area) => {
    const { chaseMs, blazeMs, fireMs, holdMs, mergeMs } = CONFIG.marqueeEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const left = area.left + width * INSET;
    const right = area.right - width * INSET;
    const top = fallback.y + height * UNDER;
    const bottom = area.bottom - width * INSET;
    // evenly round the frame's perimeter, clockwise from its top left
    const w = right - left;
    const h = bottom - top;
    const perimeter = 2 * (w + h);
    const bulbs: Point[] = Array.from({ length: BULBS }, (_, k) => {
      let d = (k / BULBS) * perimeter;
      if (d < w) return { x: left + d, y: top };
      d -= w;
      if (d < h) return { x: right, y: top + d };
      d -= h;
      if (d < w) return { x: right - d, y: bottom };
      return { x: left, y: bottom - (d - w) };
    });
    // the chaser's place round the ring, speeding up
    const chaser = (ms: number) => LAPS * BULBS * easeIn(clamp01(ms / chaseMs));
    const laps = Array.from(
      { length: LAPS },
      (_, k) => chaseMs * Math.sqrt((k + 1) / LAPS),
    );
    const fireAt = chaseMs + blazeMs;
    const arrivals = bulbs.map((_, k) => fireAt + k * FIRE_GAP_MS + fireMs);
    const endAt = arrivals[BULBS - 1];
    const lit = (k: number, ms: number) => {
      if (ms >= chaseMs) return 1;
      const behind = (((chaser(ms) - k) % BULBS) + BULBS) % BULBS;
      return Math.max(0, 1 - behind / TAIL);
    };
    const bulbAt = bulbs.map((b, k) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < k * POP_GAP_MS || ms >= arrivals[k]) return null;
        const u = clamp01((ms - fireAt - k * FIRE_GAP_MS) / fireMs);
        if (u <= 0) return b;
        const to = cover?.total() ?? fallback;
        const e = easeIn(u);
        into.x = b.x + (to.x - b.x) * e;
        into.y = b.y + (to.y - b.y) * e;
        return into;
      };
    });

    const lapping = createBeats(
      laps,
      (ms) => ms,
      (_, k) => {
        const at = bulbs[0];
        cover!.launchFrom(at, ringTargets(at, LAP_COINS, LAP_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(LAP_SHAKE, k / (LAPS - 1)));
      },
    );
    const blaze = createBeats(
      [chaseMs],
      (ms) => ms,
      () => {
        for (const b of bulbs) cover!.burst(b, BLAZE_BURST);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BLAZE_SHAKE);
      },
    );
    const hits = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === BULBS - 1) cover!.blast(at);
        else cover!.burst(at, HIT_BURST);
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
          lapping.tick(ms, now);
          blaze.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const unlit = Math.max(WISP_SIZE * 0.5, width * BULB[0]);
          const full = Math.max(WISP_SIZE, width * BULB[1]);
          bulbs.forEach((_, k) => {
            const from = k * POP_GAP_MS;
            const glow = lit(k, ms);
            const size =
              (unlit + (full - unlit) * glow) *
              easeOutBack(clamp01((ms - from) / POP_MS));
            drawWispBetween(
              ctx,
              bulbAt[k],
              ms,
              now,
              size,
              glow,
              from,
              arrivals[k],
            );
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
