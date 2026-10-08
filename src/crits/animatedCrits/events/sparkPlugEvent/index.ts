// the "Spark Plug" event (lightning; free hires): it covers its crit, whose
// click freezes the screen while pairs of electrode wisps fly out of the
// clicked floor's button and settle over empty spots on the floors in view;
// over each one sparks jump the gap, snap, snap, snap, then it fires in a
// blinding flash, a crack and a jolt and a new worker forms there, ever
// faster spot after spot; the last fires in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "sparkPlug";
const MAX_HIRES = 6;
const FORM_MS = 300;
// electrodes sit GAP px apart, HIGH px over the spot; SPARKS snaps before it fires
const GAP = 70;
const HIGH = 50;
const SPARKS = 3;
const SPARK_MS = 70;
const ELECTRODE = 0.3;
const FIRE_SHAKE: [number, number] = [0.5, 1.3];

export const forceSparkPlugEvent = registerWispEvent(
  KEY,
  "Spark Plug",
  () => CONFIG.sparkPlugEvent.chance,
  (floor, context) => {
    const { flyMs, firesMs, holdMs, mergeMs } = CONFIG.sparkPlugEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock: number = flyMs;
    const plugs = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const ends: [Point, Point] = [
        { x: spot.x - GAP / 2, y: spot.y - HIGH },
        { x: spot.x + GAP / 2, y: spot.y - HIGH },
      ];
      const sparksFrom = clock;
      const span = lerp(firesMs, k / Math.max(1, hires.length - 1));
      clock += span;
      return {
        hire,
        spot,
        ends,
        sparks: Array.from(
          { length: SPARKS },
          (_, s) => sparksFrom + (span * s) / (SPARKS + 1),
        ),
        fires: clock,
        gap: createBolt(ends[0], ends[1], 1),
        down: createBolt({ x: spot.x, y: spot.y - HIGH }, spot, 2),
      };
    });
    const last = plugs[plugs.length - 1];
    const endAt = last.fires;
    const electrodes = plugs.flatMap((plug, k) =>
      plug.ends.map((end) => {
        const at: Point = { x: 0, y: 0 };
        const arrive = k === 0 ? 0 : plugs[k - 1].fires;
        return {
          fires: plug.fires,
          at: (ms: number): Point | null => {
            if (ms > plug.fires) return null;
            const u = easeOut(clamp01((ms - arrive) / flyMs));
            at.x = lerp([button.x, end.x], u);
            at.y = lerp([button.y, end.y], u);
            return at;
          },
          from: arrive,
        };
      }),
    );

    const firing = createBeats(
      plugs,
      (p) => p.fires,
      (p, k) => {
        giveHire(p.hire);
        if (p === last) {
          cover!.blast(p.spot);
          return;
        }
        cover!.burst(p.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(FIRE_SHAKE, k / Math.max(1, plugs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => firing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          for (const p of plugs) {
            for (const s of p.sparks) {
              const t = (ms - s) / SPARK_MS;
              if (t >= 0 && t < 1) drawBolt(ctx, p.gap, 1 - t, 0.4);
            }
            const t = (ms - p.fires) / 180;
            if (t >= 0 && t < 1) {
              drawBolt(ctx, p.gap, 1 - t, 0.9);
              drawBolt(ctx, p.down, 1 - t, 0.9);
              drawStrike(ctx, p.spot, 1 - t, 1, now);
            }
          }
          for (const e of electrodes)
            drawWispBetween(
              ctx,
              e.at,
              ms,
              now,
              WISP_SIZE * ELECTRODE,
              0.5,
              e.from,
              e.fires,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
