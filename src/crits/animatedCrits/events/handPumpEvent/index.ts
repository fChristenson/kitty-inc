// the "Hand Pump" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a wisp works the clicked floor's
// button like an old hand pump, hauling up and slamming down; every plunge
// squirts a jet of cash up out of the button, each one shooting farther,
// arcing onto the next income bar with a bang and a jolt that jumps it a
// crit tier; the strokes come quicker and quicker until the last plunge
// blasts a gusher all the way into the total in a huge blast and shake.
// Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  measure,
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "handPump";
const REWARD = 2;
const MAX_BARS = 4;
const TOP = 160;
const BOTTOM = 30;
// the share of each stroke spent hauling up, before the plunge
const HAUL = 0.62;
const SPEED = 2.4;
const MIN_TRAVEL_MS = 220;
const PUMP = 0.75;
const PLUNGE_SHAKE = 0.35;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Jet {
  bar: RewardBar | null;
  to: Point;
  plunges: number;
  hits: number;
  line: Point[];
  pour: Pour;
}

export const forceHandPumpEvent = registerWispEvent(
  KEY,
  "Hand Pump",
  () => CONFIG.handPumpEvent.chance,
  (floor, context, area) => {
    const { firstMs, strokesMs, squirtMs, gushMs, holdMs, mergeMs } =
      CONFIG.handPumpEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const spout: Point = { x: button.x, y: button.y - BOTTOM };
    const dist = (p: Point) => Math.hypot(p.x - button.x, p.y - button.y);
    const bars = findRewardBars(floor, context)
      .slice(0, MAX_BARS)
      .sort((a, b) => dist(a.center) - dist(b.center));
    const targets = [...bars, null];
    let clock: number = firstMs;
    const jets: Jet[] = targets.map((bar, k) => {
      const to = bar ? bar.center : total;
      const plunges = clock;
      clock += lerp(strokesMs, k / Math.max(1, targets.length - 1));
      // straight up out of the spout, then bending over onto its target
      const bend: Point = { x: spout.x, y: Math.min(spout.y, to.y) - 120 };
      const p: Point = { x: 0, y: 0 };
      const line = sampleLine(
        (u) => ({ ...bezier(spout, bend, to, u, p) }),
        30,
      );
      const along = measure(line);
      const travelMs = Math.max(MIN_TRAVEL_MS, along[along.length - 1] / SPEED);
      return {
        bar,
        to,
        plunges,
        hits: plunges + travelMs,
        line,
        pour: {
          coinsAlong: bar ? 320 : 520,
          width: bar ? 28 : 40,
          streamMs: bar ? squirtMs : gushMs,
          travelMs,
        },
      };
    });
    const last = jets[jets.length - 1];
    const plunges = jets.map((j) => j.plunges);
    const pump: Point = { x: spout.x, y: 0 };
    // hauled up, then slammed down onto each plunge
    const pumpAt = (ms: number): Point => {
      let k = 0;
      while (k < plunges.length - 1 && ms > plunges[k]) k++;
      const from = k > 0 ? plunges[k - 1] : 0;
      const u = clamp01((ms - from) / (plunges[k] - from));
      const lift =
        u < HAUL ? easeOut(u / HAUL) : 1 - easeIn((u - HAUL) / (1 - HAUL));
      pump.y = button.y - lerp([BOTTOM, TOP], ms > last.plunges ? 0 : lift);
      return pump;
    };

    const plunging = createBeats(
      jets,
      (j) => j.plunges,
      (j) => {
        pourLine(cover!, j.line, j.pour);
        cover!.burst(spout, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(PLUNGE_SHAKE);
      },
    );
    const hitting = createBeats(
      jets,
      (j) => j.hits,
      (j, k) => {
        if (!j.bar) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.tierUp(j.bar, j.to);
        cover!.burst(j.to, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jets.length - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(last.plunges, last.pour),
          last.hits + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          plunging.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            pumpAt,
            ms,
            now,
            WISP_SIZE * PUMP,
            0.8,
            0,
            last.plunges + 150,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
