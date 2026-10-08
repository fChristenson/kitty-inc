// the "Spark Jump" event (lightning; free hires): it covers its crit, whose
// click freezes the screen while a spark wisp crackles on the clicked
// floor's button, then leaps in a jagged bolt onto an empty spot: a blinding
// strike, a crack and a jolt, and a new worker jolts into being there; the
// spark sizzles in place a beat, then leaps on to the next spot, quicker
// each time, the last strike landing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "sparkJump";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 40;
const BOLT_MS = 180;
const SIZZLES = 3;
const SIZZLE_REACH = 50;
const SPARK = 0.45;
const JUMP_SHAKE: [number, number] = [0.6, 1.4];

interface Jump {
  hire: RewardHire;
  spot: Point;
  bolt: Bolt;
  sizzles: Bolt[];
  ms: number;
  final: boolean;
}

export const forceSparkJumpEvent = registerWispEvent(
  KEY,
  "Spark Jump",
  () => CONFIG.sparkJumpEvent.chance,
  (floor, context) => {
    const { jumpsMs, holdMs, mergeMs } = CONFIG.sparkJumpEvent;
    const hires = findRewardHires(floor, context)
      .slice(0, MAX_HIRES)
      .sort((a, b) => a.x - b.x);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let from: Point = button;
    let clock = 0;
    const jumps: Jump[] = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      clock += lerp(jumpsMs, k / Math.max(1, hires.length - 1));
      const jump = {
        hire,
        spot,
        bolt: createBolt(from, spot, 2),
        sizzles: Array.from({ length: SIZZLES }, (_, s) => {
          const a = (s / SIZZLES) * Math.PI * 2 + Math.random();
          return createBolt(
            spot,
            {
              x: spot.x + Math.cos(a) * SIZZLE_REACH,
              y: spot.y + Math.sin(a) * SIZZLE_REACH,
            },
            0,
          );
        }),
        ms: clock,
        final: k === hires.length - 1,
      };
      from = spot;
      return jump;
    });
    const endAt = clock;
    const spark = (ms: number): Point => {
      let at = button;
      for (const j of jumps) if (ms >= j.ms) at = j.spot;
      return at;
    };

    const jumping = createBeats(
      jumps,
      (j) => j.ms,
      (j, k) => {
        giveHire(j.hire);
        if (j.final) {
          cover!.blast(j.spot);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(j.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(JUMP_SHAKE, k / Math.max(1, jumps.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => jumping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + BOLT_MS) return;
          for (let i = 0; i < jumps.length; i++) {
            const j = jumps[i];
            const t = (ms - j.ms) / BOLT_MS;
            if (t >= 0 && t < 1) {
              drawBolt(ctx, j.bolt, 1 - t, j.final ? 2 : 1.2);
              drawStrike(ctx, j.spot, 1 - t, j.final ? 3 : 1.5, now);
            }
            const next = jumps[i + 1]?.ms ?? endAt;
            if (ms >= j.ms && ms < next)
              for (const s of j.sizzles)
                drawBolt(ctx, s, 0.3 + 0.5 * Math.random(), 0.4);
          }
          drawWispBetween(ctx, spark, ms, now, WISP_SIZE * SPARK, 1, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
