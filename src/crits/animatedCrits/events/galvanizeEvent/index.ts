// the "Galvanize" event (lightning; free upgrade levels): it covers its crit,
// whose click freezes the screen while bolts start arcing between the income
// bars, leaping from the end of one to the far end of the next, crackling up
// and down the stack faster and faster; every arc a blinding strike at both
// ends, a crack, a jolt and free levels on both bars; then one great bolt
// chains through every bar at once in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "galvanize";
const MAX_BARS = 5;
const ARCS = 12;
const BOLT_MS = 160;
const CHAIN_DELAY_MS = 140;
const CHAIN_MS = 360;
const ARC_SHAKE: [number, number] = [0.4, 1.0];
const BANG_GAP_MS = 60;

interface Arc {
  bolt: Bolt;
  ends: [RewardBar, RewardBar];
  ms: number;
}

export const forceGalvanizeEvent = registerWispEvent(
  KEY,
  "Galvanize",
  () => CONFIG.galvanizeEvent.chance,
  (floor, context) => {
    const { arcsMs, levelShare, holdMs, mergeMs } = CONFIG.galvanizeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const endOf = (bar: RewardBar, right: boolean): Point => ({
      x: right ? bar.box.x + bar.box.width : bar.box.x,
      y: bar.center.y,
    });
    // pairs of neighbouring bars, ping-ponging up and down the stack; a lone
    // bar arcs between its own two ends
    const pairs: [RewardBar, RewardBar][] =
      bars.length === 1
        ? [[bars[0], bars[0]]]
        : bars
            .slice(1)
            .map((bar, i) => [bars[i], bar] as [RewardBar, RewardBar]);
    let clock = 0;
    const arcs: Arc[] = Array.from({ length: ARCS }, (_, k) => {
      const cycle = pairs.length * 2 - 2;
      const step = cycle > 0 ? k % cycle : 0;
      const pair = pairs[step < pairs.length ? step : cycle - step];
      const flip = k % 2 === 1;
      clock += lerp(arcsMs, k / (ARCS - 1));
      return {
        bolt: createBolt(endOf(pair[0], flip), endOf(pair[1], !flip), 2),
        ends: pair,
        ms: clock,
      };
    });
    const chainAt = clock + CHAIN_DELAY_MS;
    const chain: Bolt[] =
      bars.length === 1
        ? [createBolt(endOf(bars[0], false), endOf(bars[0], true), 3)]
        : bars
            .slice(1)
            .map((bar, i) => createBolt(bars[i].center, bar.center, 3));
    const endAt = chainAt + CHAIN_MS;
    const middle = bars[Math.floor(bars.length / 2)];
    let lastBang = -Infinity;

    const arcing = createBeats(
      arcs,
      (a) => a.ms,
      (a, k) => {
        for (const bar of new Set(a.ends))
          cover!.levels(bar, levelsFor(bar.floor, levelShare, 1));
        if (!cover!.isLive()) return;
        if (a.ms - lastBang >= BANG_GAP_MS) {
          lastBang = a.ms;
          playExplosion();
        }
        shakeScreen(lerp(ARC_SHAKE, k / (ARCS - 1)));
      },
    );
    const chaining = createBeats(
      [chainAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(middle.center);
        if (cover!.isLive()) playExplosion();
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
          arcing.tick(ms, now);
          chaining.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const a of arcs) {
            const t = (ms - a.ms) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, a.bolt, 1 - t, 1);
            drawStrike(ctx, a.bolt.from, 1 - t, 1, now);
            drawStrike(ctx, a.bolt.to, 1 - t, 1, now);
          }
          const c = (ms - chainAt) / CHAIN_MS;
          if (c >= 0 && c < 1) {
            const fade = 1 - clamp01(c);
            for (const bolt of chain) {
              drawBolt(ctx, bolt, fade, 2);
              drawStrike(ctx, bolt.to, fade, 2, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
