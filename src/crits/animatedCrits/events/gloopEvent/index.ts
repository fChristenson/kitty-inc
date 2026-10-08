// the "Gloop" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a thick pool of cash spreads
// along the bottom of the screen; under each income bar in turn it swells
// up into a huge wobbling bubble of cash that stretches and bulges, then
// bursts with a gloop, flinging its skin up in a gush that splashes down
// onto the bar with a jolt of free levels, each quicker than the last, the
// last landing in a huge blast and shake. Pays floor income × floor number
// × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "gloop";
const REWARD = 2;
const MAX_BARS = 4;
const POOL = 260;
const SKIN = 130;
const COIN = 0.45;
const LOW = 50;
const DEEP = 50;
const RADIUS = 130;
const WOBBLE = 0.08;
const SPREAD_MS = 300;
const FLY_MS = 420;
const ARC = 260;
const POP_SHAKE = 0.5;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Bubble {
  bar: RewardBar;
  foot: Point;
  swells: number;
  bursts: number;
  lands: number;
}

export const forceGloopEvent = registerWispEvent(
  KEY,
  "Gloop",
  () => CONFIG.gloopEvent.chance,
  (floor, context, area) => {
    const { swellsMs, levelShare, holdMs, mergeMs } = CONFIG.gloopEvent;
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => b.box.y - a.box.y);
    if (bars.length === 0) return;
    const surface = area.bottom - LOW - DEEP / 2;
    let clock = SPREAD_MS * 0.6;
    const bubbles: Bubble[] = bars.map((bar, k) => {
      const swellMs = lerp(swellsMs, k / Math.max(1, bars.length - 1));
      const swells = clock;
      const bursts = swells + swellMs;
      clock = bursts - swellMs * 0.35;
      return {
        bar,
        foot: { x: bar.center.x, y: surface },
        swells,
        bursts,
        lands: bursts + FLY_MS,
      };
    });
    const last = bubbles[bubbles.length - 1];
    const travel = last.lands + 200;
    const width = area.right - area.left;
    const paths: CoinPath[] = [];
    for (let i = 0; i < POOL; i++) {
      const x = area.left + Math.random() * width;
      const depth = Math.random() * DEEP;
      const appears = (Math.abs(x - bars[0].center.x) / width) * SPREAD_MS;
      const phase = Math.random() * Math.PI * 2;
      paths.push((f) => {
        const ms = f * travel;
        // heaving under every bubble that's swelling
        let heave = 0;
        for (const b of bubbles) {
          if (ms < b.swells || ms > b.bursts + 200) continue;
          const near = Math.max(0, 1 - Math.abs(x - b.foot.x) / (RADIUS * 2));
          heave += near * 12 * Math.sin(ms * 0.03 + phase);
        }
        return {
          x,
          y:
            surface -
            DEEP / 2 +
            depth +
            Math.sin(x * 0.03 + ms * 0.008 + phase) * 4 +
            heave,
          scale: COIN * easeOut(clamp01((ms - appears) / 200)),
        };
      });
    }
    for (const b of bubbles) {
      const { foot, bar } = b;
      for (let j = 0; j < SKIN; j++) {
        // round the dome, upper half only
        const a = Math.PI + Math.random() * Math.PI;
        const skin = 1 - Math.random() * 0.15;
        const lobe = Math.random() * Math.PI * 2;
        const to: Point = {
          x: bar.box.x + 10 + Math.random() * (bar.box.width - 20),
          y: bar.box.y - 4 - Math.random() * 18,
        };
        const from: Point = { x: 0, y: 0 };
        const bend: Point = { x: 0, y: 0 };
        const into: Point = { x: 0, y: 0 };
        paths.push((f) => {
          const ms = f * travel;
          if (ms < b.bursts) {
            const u = easeOut(clamp01((ms - b.swells) / (b.bursts - b.swells)));
            const r =
              RADIUS *
              u *
              skin *
              (1 + WOBBLE * Math.sin(a * 3 + ms * 0.02 + lobe));
            return {
              x: foot.x + Math.cos(a) * r * 1.15,
              y: foot.y + Math.sin(a) * r,
              scale: COIN * Math.min(1, u * 3),
            };
          }
          if (ms < b.lands) {
            from.x = foot.x + Math.cos(a) * RADIUS * 1.15;
            from.y = foot.y + Math.sin(a) * RADIUS;
            bend.x = lerp([from.x, to.x], 0.5);
            bend.y = Math.min(from.y, to.y) - ARC;
            const p = bezier(from, bend, to, (ms - b.bursts) / FLY_MS, into);
            return { x: p.x, y: p.y, scale: COIN };
          }
          return { x: to.x, y: to.y, scale: COIN };
        });
      }
    }

    const popping = createBeats(
      bubbles,
      (b) => b.bursts,
      (b) => {
        cover!.burst({ x: b.foot.x, y: b.foot.y - RADIUS }, 0.4);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(POP_SHAKE);
      },
    );
    const landing = createBeats(
      bubbles,
      (b) => b.lands,
      (b, k) => {
        const at = b.bar.center;
        cover!.levels(b.bar, levelsFor(b.bar.floor, levelShare, 2), at);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bubbles.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          popping.tick(ms, now);
          landing.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
