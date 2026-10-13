// the coin spin income crit: the green amount flies up under the total and
// turns into a big gold coin that spins up, faster and faster to a blur,
// trembling, glitter swirling into it as it charges; at the climax it shoots
// up into the readout with a bang and bursts across it in a rattle of
// blasts, a share each, the last huge
import { COLOR } from "../../../../palette";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawSpinCoin, loadSpinCoin } from "../../../../shared/coinFlip";
import { DETONATION_MS, drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  glowStops,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

loadSpinCoin();

// the amount flying up to its spot under the total, shrinking into the coin
const UP_MS = 220;
const BELOW = 300;
const UP_SHRINK = 0.4;
const APPEAR_BLAST = 90;
// the charge: the coin spinning up from SPIN to SPIN + SPIN_UP radians a ms,
// swelling, trembling
const CHARGE_MS = 900;
const CLIMAX_MS = UP_MS + CHARGE_MS;
const SPIN = 0.008;
const SPIN_UP = 0.12;
const RADIUS: [number, number] = [62, 92];
const TREMBLE = 14;
const GLOW = 380;
const STREAKS = 320;
// past half charged a gold blur swells round it
const BLUR = 240;
const BLUR_ALPHA = 0.8;
// glitter swirling in from SWIRL out, quicker as it charges
const SPECKS = 24;
const SWIRL = 300;
const SWIRL_SQUASH = 0.6;
const SWIRL_TURN = 2.4;
const SWIRL_RATE: [number, number] = [0.0012, 0.005];
const SPECK = 26;
// the shot up into the readout, then the rattle across it
const FLY_MS = 110;
const IN_MS = CLIMAX_MS + FLY_MS;
const LAUNCH_BLAST = 150;
const IN_BLAST = 200;
const POPS = 10;
const FIRST_POP_MS = 40;
const POP_GAP_MS = 45;
const POP_BLAST = 110;
const END_MS = IN_MS + FIRST_POP_MS + (POPS - 1) * POP_GAP_MS + 60;
// shakes by step: a pop, the coin in, the last blast
const SHAKES = [0.5, 1.4, 2.4];

interface Spin {
  charge: Charge;
  pops: Point[];
}
const spins = new WeakMap<Running, Spin>();
const GOLD = glowStops(COLOR.heavenlyGold);
const origin: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// radians the coin has turned by ms: spinning up through the charge, flat
// out after
function turnAt(ms: number): number {
  const u = clamp01((ms - UP_MS) / CHARGE_MS);
  return (
    Math.max(0, ms - UP_MS) * SPIN +
    (CHARGE_MS * SPIN_UP * u ** 3) / 3 +
    Math.max(0, ms - CLIMAX_MS) * SPIN_UP
  );
}

registerFloorCrit("coinSpinCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    spins.set(r, {
      charge: planCharge(UP_MS, CHARGE_MS),
      pops: Array.from({ length: POPS }, (_, k) => readoutSpot(to, k, 1510)),
    });
    hit(0, IN_MS, 1);
    for (let k = 0; k < POPS; k++)
      hit(0, IN_MS + FIRST_POP_MS + k * POP_GAP_MS);
    hit(0, END_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const spin = spins.get(r);
    if (!spin) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    tickCharge(spin.charge, ms, r.shake);
    const c = chargeAt(spin.charge, ms);
    const sx = to.x;
    const sy = to.y + BELOW;

    if (ms < UP_MS) {
      const p = (ms / UP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, sx, p),
        lerp(0, sy, p),
        r.flashFont * lerp(1, UP_SHRINK, p),
      );
      return;
    }
    if (ms < CLIMAX_MS) {
      trembleAt(c, ms, TREMBLE, shiver);
      spot.x = sx + shiver.x;
      spot.y = sy + shiver.y;
    } else {
      spot.x = sx;
      spot.y = lerp(sy, to.y, clamp01((ms - CLIMAX_MS) / FLY_MS) ** 2);
    }
    if (ms < CLIMAX_MS) {
      drawChargeStreaks(ctx, spot, c, STREAKS, ms);
      drawChargeGlow(ctx, spot, c, GLOW, now);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const rate = lerp(SWIRL_RATE[0], SWIRL_RATE[1], c);
      for (let i = 0; i < SPECKS; i++) {
        const p = ((ms - UP_MS) * rate + holeHash(i, 1511)) % 1;
        const a = holeHash(i, 1512) * Math.PI * 2 + p * SWIRL_TURN;
        const d = SWIRL * (1 - p) ** 1.5;
        stampGlimmer(
          ctx,
          spot.x + Math.cos(a) * d,
          spot.y + Math.sin(a) * d * SWIRL_SQUASH,
          SPECK * (1 - 0.5 * p),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.restore();
    }
    if (ms < IN_MS) {
      const blur = clamp01((c - 0.5) * 2);
      if (blur > 0 || ms >= CLIMAX_MS) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = BLUR_ALPHA * (ms >= CLIMAX_MS ? 1 : blur);
        drawGlow(ctx, GOLD, spot.x, spot.y, BLUR);
        ctx.restore();
      }
      drawSpinCoin(
        ctx,
        spot.x,
        spot.y,
        lerp(...RADIUS, ms >= CLIMAX_MS ? 1 : c),
        1,
        turnAt(ms),
      );
    }
    origin.x = sx;
    origin.y = sy;
    drawDetonation(ctx, origin, ms - UP_MS, APPEAR_BLAST, now);
    drawDetonation(ctx, origin, ms - CLIMAX_MS, LAUNCH_BLAST, now);
    drawDetonation(ctx, to, ms - IN_MS, IN_BLAST, now);
    for (let k = 0; k < POPS; k++)
      drawDetonation(
        ctx,
        spin.pops[k],
        ms - IN_MS - FIRST_POP_MS - k * POP_GAP_MS,
        POP_BLAST,
        now,
      );
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
