// the "Spark of Life" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while sparks crackle over an empty spot on
// every floor in view with room for another worker; one after another, ever
// faster, a huge bolt of lightning cracks down out of the sky onto each spot
// in a blinding strike, a bang and a big jolt, and a new worker jolts to life
// out of the glow; after the last, every new hire flashes in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";
import { WORKER_HEIGHT } from "../../../../floors/worker";
import type { Point } from "../../../../shared/wisp";

const KEY = "sparkOfLife";
const MAX_HIRES = 4;
const STRIKE_MS = 200;
const SPARKS = 3;
const SPARK_REACH = 70;
const FORM_MS = 280;
const STRIKE_SHAKE: [number, number] = [1.1, 1.9];

export const forceSparkOfLifeEvent = registerWispEvent(
  KEY,
  "Spark of Life",
  () => CONFIG.sparkOfLifeEvent.chance,
  (floor, context, area) => {
    const { chargeMs, gapsMs, holdMs, mergeMs } = CONFIG.sparkOfLifeEvent;
    const hires = findRewardHires(floor, context)
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const spots: Point[] = hires.map((h) => ({ x: h.x, y: h.y }));
    const strikes: number[] = [];
    let clock = chargeMs;
    hires.forEach((_, k) => {
      strikes.push(clock);
      clock += lerp(gapsMs, k / Math.max(1, hires.length - 1));
    });
    const lastStrike = strikes[strikes.length - 1];
    const flashAt = lastStrike + FORM_MS;
    const bolts = spots.map((spot) =>
      createBolt(
        { x: spot.x + (Math.random() - 0.5) * 300, y: area.top - 60 },
        { x: spot.x, y: spot.y - WORKER_HEIGHT * 0.2 },
        3,
      ),
    );
    const sparks = spots.map(() =>
      Array.from({ length: SPARKS }, () =>
        createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
      ),
    );

    const striking = createBeats(
      strikes,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, hires.length - 1);
        giveHire(hires[k]);
        cover!.burst(spots[k], 0.8 + 0.4 * t);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, t));
      },
    );
    const flashing = createBeats(
      [flashAt],
      (ms) => ms,
      () => cover!.blast(spots[spots.length - 1]),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: flashAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          striking.tick(ms, now);
          flashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms >= flashAt + STRIKE_MS) return;
          spots.forEach((spot, k) => {
            const since = ms - strikes[k];
            // crackling over the spot until its bolt lands
            if (since < 0) {
              const charge = clamp01(ms / strikes[k]);
              sparks[k].forEach((spark, j) => {
                const a = now * 0.03 + j * 2.1 + k;
                spark.from.x = spot.x;
                spark.from.y = spot.y;
                spark.to.x = spot.x + Math.cos(a) * SPARK_REACH * charge;
                spark.to.y = spot.y + Math.sin(a) * SPARK_REACH * charge;
                drawBolt(ctx, spark, 0.4 + 0.5 * charge, 0.5);
              });
              return;
            }
            if (since < STRIKE_MS) {
              const fade = 1 - since / STRIKE_MS;
              drawBolt(ctx, bolts[k], fade, 1.4);
              drawStrike(ctx, bolts[k].to, fade, 1.4, now);
            }
            if (ms >= flashAt && ms < flashAt + STRIKE_MS)
              drawStrike(ctx, spot, 1 - (ms - flashAt) / STRIKE_MS, 1.6, now);
          });
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
