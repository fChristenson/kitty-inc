// the "Woodworm" event (drill; free upgrade levels): it covers its crit,
// whose click freezes the screen while a swarm of tiny drill heads rains
// down onto an income bar and bores into it all along its length at once,
// whirring in in shuddering shoves, sparks and chips spraying out of every
// hole, until the bar's riddled and jolts with free levels; then the swarm
// lifts off and drops on the next bar, quicker each time, the last bar
// riddled in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDrill, planDrill, type Drill } from "../../../../shared/drill";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "woodworm";
const MAX_BARS = 4;
const WORMS = 5;
const SIZE = WISP_SIZE * 0.5;
const ABOVE = 160;
const STAGGER_MS = 50;
const BITE_GAP_MS = 45;
const PUSH_GAP_MS = 60;
const BITE_SHAKE = 0.2;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Riddle {
  bar: RewardBar;
  drills: Drill[];
  done: number;
}

export const forceWoodwormEvent = registerWispEvent(
  KEY,
  "Woodworm",
  () => CONFIG.woodwormEvent.chance,
  (floor, context) => {
    const { approachMs, boresMs, levelShare, holdMs, mergeMs } =
      CONFIG.woodwormEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const riddles: Riddle[] = bars.map((bar, k) => {
      const boreMs = lerp(boresMs, k / Math.max(1, bars.length - 1));
      const { box } = bar;
      const drills = Array.from({ length: WORMS }, (_, j) => {
        // spread along the bar, each a little off its slot
        const x =
          box.x + ((j + 0.5 + (Math.random() - 0.5) * 0.6) / WORMS) * box.width;
        const target: Point = { x, y: box.y };
        const from: Point = {
          x: x + (Math.random() - 0.5) * 80,
          y: box.y - ABOVE - Math.random() * 60,
        };
        return planDrill(from, target, {
          approachMs,
          boreMs: boreMs * (0.85 + Math.random() * 0.3),
          pushes: 3,
          reach: box.height * 0.7,
          startMs: clock + j * STAGGER_MS,
        });
      });
      const done = Math.max(...drills.map((d) => d.through));
      clock = done - approachMs * 0.6;
      return { bar, drills, done };
    });
    const last = riddles[riddles.length - 1];
    const endAt = last.done;
    const drills = riddles.flatMap((r) => r.drills);
    const bites = drills.map((d) => d.bites).sort((a, b) => a - b);
    const pushes = drills.flatMap((d) => d.pushes).sort((a, b) => a - b);

    let bite = -Infinity;
    const biting = createBeats(
      bites,
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive() || ms - bite < BITE_GAP_MS) return;
        bite = ms;
        playBloop();
      },
    );
    let push = -Infinity;
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (ms) => {
        if (!cover!.isLive() || ms - push < PUSH_GAP_MS) return;
        push = ms;
        shakeScreen(BITE_SHAKE);
      },
    );
    const riddling = createBeats(
      riddles,
      (r) => r.done,
      (r, k) => {
        const at = r.bar.center;
        cover!.levels(r.bar, levelsFor(r.bar.floor, levelShare, 2), at);
        if (r === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, riddles.length - 1)));
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
          biting.tick(ms, now);
          shoving.tick(ms, now);
          riddling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          for (const d of drills) drawDrill(ctx, d, ms, now, SIZE);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
