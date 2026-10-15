// Ring Fence, an income crit: the number shrinks away and a ring of wisp
// bullets flashes up all round the total, popping in one after another round
// the circle, each firing straight in at the readout; ring after ring, each
// turned a little further, denser and quicker, a blast on the readout as
// every ring lands, until the last, the densest, closes in all at once in the
// huge blast
import {
  aimBullet,
  drawBullets,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  registerFloorCrit,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

// the rings: COUNTS bullets each from FIRST_MS, GAPS_MS apart (closing), each
// popping in round the circle over WHIRL_MS (the last all at once), RADIUS px
// out, each turned TURN rad on from the last
const COUNTS = [10, 14, 18, 24, 32];
const FIRST_MS = 200;
const GAPS_MS: [number, number] = [280, 120];
const WHIRL_MS = 90;
const RADIUS = 400;
const SQUASH = 0.75;
const TURN = 0.35;
// px a ms: a round crosses in about 100ms
const SPEED = 4;
const ROUND = WISP_SIZE * 0.5;
const LAST_ROUND = WISP_SIZE * 0.65;
const POP = 40;
const POP_MS = 100;
const SPARK = 44;
const SPARK_MS = 140;
const RING_BLAST = 150;
// shakes by step: a ring, the last
const SHAKES = [0.8, 2.8];

interface Ring {
  rounds: Bullet[];
  landsMs: number;
}
const states = new WeakMap<Running, Ring[]>();
const ORIGIN: Point = { x: 0, y: 0 };

registerFloorCrit("ringFenceCrit", {
  plan(r, _bars, hit) {
    let t = FIRST_MS;
    const rings = COUNTS.map((count, k) => {
      const last = k === COUNTS.length - 1;
      const rounds: Bullet[] = [];
      let landsMs = 0;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + k * TURN;
        const from = {
          x: Math.cos(a) * RADIUS,
          y: Math.sin(a) * RADIUS * SQUASH,
        };
        const fired = t + (last ? 0 : (i / count) * WHIRL_MS);
        const round = aimBullet(
          from,
          readoutSpot(ORIGIN, i + k * 40, 6110),
          fired,
          SPEED,
        );
        rounds.push(round);
        landsMs = Math.max(landsMs, round.hitAt);
      }
      hit(0, landsMs, last ? 1 : 0);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (COUNTS.length - 2));
      return { rounds, landsMs };
    });
    states.set(r, rings);
  },
  draw(ctx, r, ms, bars) {
    const rings = states.get(r);
    if (!rings) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    ctx.save();
    ctx.translate(to.x, to.y);
    const lastRing = rings.length - 1;
    for (let k = 0; k < rings.length; k++)
      drawBullets(
        ctx,
        rings[k].rounds,
        ms,
        now,
        k === lastRing ? LAST_ROUND : ROUND,
      );
    // a pop where each round flashes up, a spark where it lands
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < rings.length; k++) {
      const { rounds } = rings[k];
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const popped = ms - round.firedAt;
        if (popped >= 0 && popped < POP_MS)
          stampGlimmer(
            ctx,
            round.from.x,
            round.from.y,
            POP * (1 - popped / POP_MS),
            i + k * 50,
            COLOR.white,
          );
        const landed = ms - round.hitAt;
        if (landed >= 0 && landed < SPARK_MS)
          stampGlimmer(
            ctx,
            round.to.x,
            round.to.y,
            SPARK * (1 - landed / SPARK_MS),
            i + k * 50,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
      }
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < lastRing; k++)
      drawDetonation(ctx, ORIGIN, ms - rings[k].landsMs, RING_BLAST, now);
    ctx.restore();
    drawFinale(ctx, to, ms - rings[lastRing].landsMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
