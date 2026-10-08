// the "Alignment" event (wisp): it covers its crit, whose click freezes the
// screen while wisps wheel round its middle on rings like planets, each at
// its own speed, every pass of one planet by its neighbour a flash, a jolt
// and coins; as they come round they fall into one dead straight line
// pointing at the total-income readout, blazing up with a bang, then fire
// along it into the total one after another, the last in a huge blast and
// shake, and the coins sweep into the total. Pays floor income × floor
// number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playBloop,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOutBack } from "../../../../shared/easing";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "alignment";
const REWARD = 4;
// the planets: one per ring, the rings RINGS of the screen's width (or
// height, if less) round a point DROP of its height under its middle, the
// inner ones circling faster: HZ turns a second, out to in
const RINGS = [0.42, 0.34, 0.26, 0.18, 0.1];
const HZ = [0.4, 0.9, 1.4, 1.9, 2.4];
const DROP = 0.1;
// each drawn SIZE of the screen's width, smallest out
const SIZE = [0.04, 0.045, 0.05, 0.055, 0.065];
const POP_MS = 220;
const FIRE_GAP_MS = 60;
const PASS_COINS = 10;
const PASS_REACH: [number, number] = [20, 60];
const PASS_SHAKE = 1;
const LINE_SHAKE = 2;
const HIT_BURST = 0.6;

export const forceAlignmentEvent = registerWispEvent(
  KEY,
  "Alignment",
  () => CONFIG.alignmentEvent.chance,
  (floor, context, area) => {
    const { orbitMs, lineMs, fireMs, holdMs, mergeMs } = CONFIG.alignmentEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const span = Math.min(width, height);
    const fallback = totalSpot(area);
    const centre = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    // every planet reaches the line pointing at the total at orbitMs
    const line = Math.atan2(fallback.y - centre.y, fallback.x - centre.x);
    const angle = (k: number, ms: number) =>
      line + Math.PI * 2 * HZ[k] * ((Math.min(ms, orbitMs) - orbitMs) / 1000);
    const orbit = (k: number, ms: number, into: Point): Point => {
      const a = angle(k, ms);
      into.x = centre.x + Math.cos(a) * span * RINGS[k];
      into.y = centre.y + Math.sin(a) * span * RINGS[k];
      return into;
    };
    // outermost (nearest the total) first
    const fireFrom = orbitMs + lineMs;
    const leaves = RINGS.map((_, k) => fireFrom + k * FIRE_GAP_MS);
    const arrivals = leaves.map((at) => at + fireMs);
    const lastIn = arrivals[arrivals.length - 1];
    // two planets passing: whenever their angles differ by whole turns
    const passes: { at: number; k: number }[] = [];
    for (let k = 0; k < RINGS.length; k++)
      for (let j = k + 1; j < RINGS.length; j++) {
        const gap = (HZ[j] - HZ[k]) / 1000;
        for (let n = 1; ; n++) {
          const at = orbitMs - n / gap;
          if (at < POP_MS) break;
          passes.push({ at, k });
        }
      }
    const planets = RINGS.map((_, k) => {
      const into = { x: 0, y: 0 };
      const from = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms >= arrivals[k]) return null;
        if (ms < leaves[k]) return orbit(k, ms, into);
        orbit(k, orbitMs, from);
        const total = cover?.total() ?? fallback;
        const u = easeIn(clamp01((ms - leaves[k]) / fireMs));
        into.x = from.x + (total.x - from.x) * u;
        into.y = from.y + (total.y - from.y) * u;
        return into;
      };
    });

    const passing = createBeats(
      passes,
      (p) => p.at,
      (p) => {
        const at = orbit(p.k, p.at, { x: 0, y: 0 });
        cover!.launchFrom(at, ringTargets(at, PASS_COINS, PASS_REACH));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PASS_SHAKE);
      },
    );
    const lined = createBeats(
      [orbitMs],
      (ms) => ms,
      () => {
        RINGS.forEach((_, k) =>
          cover!.burst(orbit(k, orbitMs, { x: 0, y: 0 }), 0.7),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(LINE_SHAKE);
      },
    );
    const hits = createBeats(
      arrivals,
      (ms) => ms,
      (_, k) => {
        const at = cover!.total() ?? fallback;
        if (k === RINGS.length - 1) cover!.blast(at);
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
          passing.tick(ms, now);
          lined.tick(ms, now);
          hits.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const pop = easeOutBack(clamp01(ms / POP_MS));
          const heat = ms >= orbitMs ? 1 : clamp01(ms / orbitMs) * 0.6;
          planets.forEach((at, k) =>
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              Math.max(WISP_SIZE * 0.8, width * SIZE[k]) * pop,
              heat,
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
