// the "Marx Generator" event (lightning; a crit tier): it covers its crit,
// whose click freezes the screen while a tower of spark gaps rises up the
// screen's left side, pairs of electrode sparks popping in from the bottom
// up; then the gaps fire one after another up the tower, ever faster, each
// a crack, a flash and a jolt, the charge zigzagging up from gap to gap and
// every fired gap left arcing; at the top the whole stack dumps it in one
// colossal bolt across onto the clicked floor's bar, which jumps a crit
// tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars } from "../../eventRewards";

const KEY = "marxGenerator";
// the tower: this far in from the screen's left edge, its gaps GAP px wide,
// a stage about every STEP px up the screen
const INSET = 90;
const GAP = 130;
const STEP = 240;
const STAGES: [number, number] = [6, 12];
const PAD_BOTTOM = 140;
const PAD_TOP = 180;
const ELECTRODE = 24;
const POP_MS = 170;
const BOLT_MS = 140;
const FINAL_MS = 300;
// a fired gap keeps arcing this faintly till the stack discharges
const ARC = 0.35;
const FIRE_SHAKE: [number, number] = [0.3, 1.1];
const FINAL_SHAKE = 1.8;
const SOUND_GAP_MS = 70;

interface Stage {
  left: Point;
  right: Point;
  mid: Point;
  popsAt: number;
  firesAt: number;
  gap: Bolt;
  // the charge leaping up to the next stage
  climb: Bolt | null;
}

export const forceMarxGeneratorEvent = registerWispEvent(
  KEY,
  "Marx Generator",
  () => CONFIG.marxGeneratorEvent.chance,
  (floor, context, area) => {
    const { chargeMs, fireMs, dischargeMs, holdMs, mergeMs } =
      CONFIG.marxGeneratorEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const low = area.bottom - PAD_BOTTOM;
    const high = area.top + PAD_TOP;
    const n = Math.round(
      Math.min(STAGES[1], Math.max(STAGES[0], (low - high) / STEP + 1)),
    );
    const x = area.left + INSET;
    const fireStart = chargeMs + POP_MS;
    const stages: Stage[] = Array.from({ length: n }, (_, k) => {
      const y = lerp([low, high], k / (n - 1));
      const left: Point = { x, y };
      const right: Point = { x: x + GAP, y };
      const u = k / (n - 1);
      return {
        left,
        right,
        mid: { x: x + GAP / 2, y },
        popsAt: (chargeMs * k) / n,
        // quickening up the tower
        firesAt: fireStart + fireMs * (1 - (1 - u) ** 1.8),
        gap: createBolt(left, right, 0),
        climb: null,
      };
    });
    // the charge zigzags up: off one side of a gap onto the other of the next
    stages.forEach((s, k) => {
      const next = stages[k + 1];
      if (!next) return;
      s.climb =
        k % 2 === 0
          ? createBolt(s.right, next.left, 1)
          : createBolt(s.left, next.right, 1);
    });
    const top = stages[n - 1];
    const finalAt = top.firesAt + dischargeMs;
    const hit: Point = { x: bar.center.x, y: bar.box.y };
    const finalBolt = createBolt(top.mid, hit, 4);
    const endMs = finalAt + FINAL_MS;

    let soundAt = -Infinity;
    const crack = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const charging = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const firing = createBeats(
      stages,
      (s) => s.firesAt,
      (s, k, now) => {
        cover!.burst(s.mid, 0.5);
        if (!cover!.isLive()) return;
        shakeScreen(lerp(FIRE_SHAKE, k / (n - 1)));
        crack(now);
      },
    );
    const discharging = createBeats(
      [finalAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, top.mid);
        cover!.slam(bar);
        cover!.blast(bar.center);
        if (cover!.isLive()) shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          charging.tick(ms, now);
          firing.tick(ms, now);
          discharging.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const gone = clamp01((ms - finalAt) / FINAL_MS);
          for (let k = 0; k < n; k++) {
            const s = stages[k];
            if (ms < s.popsAt) break;
            const pop = easeOutBack(clamp01((ms - s.popsAt) / POP_MS));
            const t = ms - s.firesAt;
            const size = ELECTRODE * pop * (t >= 0 ? 1.4 : 1);
            const alpha = 1 - gone;
            drawGlitterLight(ctx, s.left.x, s.left.y, size, k * 2, alpha, now);
            drawGlitterLight(
              ctx,
              s.right.x,
              s.right.y,
              size,
              k * 2 + 1,
              alpha,
              now,
            );
            if (t < 0) continue;
            if (t < BOLT_MS) {
              const fade = 1 - t / BOLT_MS;
              drawBolt(ctx, s.gap, 0.4 + 0.6 * fade, 1.1);
              drawStrike(ctx, s.mid, fade, 1, now);
              if (s.climb) drawBolt(ctx, s.climb, fade, 0.7);
            } else if (gone < 1) {
              const flicker = 0.7 + 0.3 * Math.sin(now / 37 + k * 1.7);
              drawBolt(ctx, s.gap, ARC * flicker * (1 - gone), 0.6);
            }
          }
          const t = ms - finalAt;
          if (t >= 0 && t < FINAL_MS) {
            drawBolt(ctx, finalBolt, 1 - t / FINAL_MS, 2.2);
            drawStrike(ctx, hit, 1 - t / FINAL_MS, 2.5, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
