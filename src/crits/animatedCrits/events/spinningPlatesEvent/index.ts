// the "Spinning Plates" event (wisp; crit tiers): it covers its crit, whose
// click freezes the screen while a plate of whirling wisps starts to wobble
// over every income bar; a juggler wisp dashes from plate to plate,
// flicking each one faster, every flick a pop and a jolt, the plates
// steadying into blurs as they speed up; then one by one they come crashing
// down onto their bars in a flash and a jolt that jumps each a crit tier,
// the last in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "spinningPlates";
const MAX_BARS = 4;
const ROUNDS = 2;
const ABOVE = 60;
const RX = 46;
const RY = 12;
const ORBS = 6;
const ORB = 8;
// laps a second a plate spins, and how much faster each flick makes it
const SPIN0 = 0.6;
const FLICK = 1.4;
const WOBBLE = 10;
const DROP_MS = 160;
const JUGGLER = 0.45;
const FLICK_SHAKE = 0.3;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Plate {
  bar: RewardBar;
  at: Point;
  flicks: number[];
  drops: number;
}

export const forceSpinningPlatesEvent = registerWispEvent(
  KEY,
  "Spinning Plates",
  () => CONFIG.spinningPlatesEvent.chance,
  (floor, context, area) => {
    const { dashMs, dropsMs, holdMs, mergeMs } = CONFIG.spinningPlatesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const plates: Plate[] = bars.map((bar) => ({
      bar,
      at: { x: bar.center.x, y: bar.box.y - ABOVE },
      flicks: [],
      drops: 0,
    }));
    // the juggler's round: plate to plate, back and forth
    const order: Plate[] = [];
    for (let r = 0; r < ROUNDS; r++)
      order.push(...(r % 2 ? plates.slice().reverse() : plates));
    let clock = 0;
    const visits = order.map((plate, k) => {
      clock += lerp(dashMs, k / Math.max(1, order.length - 1));
      plate.flicks.push(clock);
      return { plate, ms: clock };
    });
    const route: Point[] = [
      { x: area.left - 40, y: plates[0].at.y - 60 },
      ...visits.map((v) => v.plate.at),
    ];
    const doneAt = clock;
    clock += lerp(dropsMs, 0);
    plates.forEach((p, k) => {
      p.drops = clock;
      clock += lerp(dropsMs, k / Math.max(1, plates.length - 1));
    });
    const last = plates[plates.length - 1];
    const endAt = last.drops + DROP_MS;
    // each plate's angle at ms: faster with every flick
    const turnAt = (p: Plate, ms: number) => {
      let turn = 0;
      let rate = SPIN0;
      let from = 0;
      for (const f of p.flicks) {
        if (ms < f) break;
        turn += rate * (f - from);
        from = f;
        rate += FLICK;
      }
      return ((turn + rate * (ms - from)) / 1000) * Math.PI * 2;
    };
    const rateAt = (p: Plate, ms: number) => {
      let flicked = 0;
      for (const f of p.flicks) if (ms >= f) flicked++;
      return SPIN0 + FLICK * flicked;
    };
    const juggler: Point = { x: 0, y: 0 };
    // hopping stop to stop, landing on each plate on its beat
    const jugglerAt = (ms: number): Point => {
      let k = 0;
      while (k < visits.length && ms >= visits[k].ms) k++;
      if (k === visits.length) {
        juggler.x = route[k].x;
        juggler.y = route[k].y;
        return juggler;
      }
      const fromMs = k === 0 ? 0 : visits[k - 1].ms;
      const u = clamp01((ms - fromMs) / (visits[k].ms - fromMs));
      juggler.x = lerp([route[k].x, route[k + 1].x], u);
      juggler.y =
        lerp([route[k].y, route[k + 1].y], u) - Math.sin(Math.PI * u) * 50;
      return juggler;
    };

    const flicking = createBeats(
      visits,
      (v) => v.ms,
      () => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(FLICK_SHAKE);
      },
    );
    const dropping = createBeats(
      plates,
      (p) => p.drops + DROP_MS,
      (p, k) => {
        cover!.tierUp(p.bar, p.bar.center);
        if (p === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(p.bar.center);
          return;
        }
        cover!.burst(p.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, plates.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          flicking.tick(ms, now);
          dropping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const p of plates) {
            if (ms > p.drops + DROP_MS) continue;
            const fall = easeIn(clamp01((ms - p.drops) / DROP_MS));
            const cy = lerp([p.at.y, p.bar.center.y], fall);
            // a slow plate wobbles; a fast one runs true
            const wobble =
              (WOBBLE / rateAt(p, ms)) * Math.sin(ms * 0.01 + p.at.x);
            const turn = turnAt(p, ms);
            for (let i = 0; i < ORBS; i++) {
              const a = turn + (i / ORBS) * Math.PI * 2;
              const x = p.at.x + Math.cos(a) * RX;
              const y = cy + Math.sin(a) * RY + Math.cos(a) * wobble;
              drawGlitterLight(
                ctx,
                x,
                y,
                ORB,
                i + p.at.x,
                0.6 + 0.4 * Math.sin(a),
                now,
              );
            }
          }
          drawWispBetween(
            ctx,
            jugglerAt,
            ms,
            now,
            WISP_SIZE * JUGGLER,
            0.8,
            0,
            doneAt + 150,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
