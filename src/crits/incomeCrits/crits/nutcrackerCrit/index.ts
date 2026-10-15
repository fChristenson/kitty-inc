// Nutcracker, an income crit: the green amount drops under the total and
// shatters into a walnut of glitter between the two hinged jaws of a
// nutcracker of light; the jaws swing shut on it in squeeze after squeeze,
// each harder and quicker, a white-hot line where they bite, cracks
// spreading over the shell as it squashes thinner and taller, glitter
// squirting out and streaming up into the readout, a share each; the last
// squeeze cracks it wide open, the halves flying apart, and its golden
// kernel swells and bursts up into the total: the finale
import { COLOR } from "../../../../palette";
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import { DETONATION_MS } from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

// the amount dropping to BELOW under the total, shattering into the walnut
// RX by RY px round over SHATTER_MS
const DROP_MS = 200;
const SHATTER_MS = 160;
const BELOW = 380;
const RX = 115;
const RY = 135;
const SPECK = 20;
// the jaws: hinged HINGE px under the walnut, ARM long, THICK px, swung
// open LIFT px at the walnut, wide open OPEN px more as they swing in
const HINGE = 240;
const ARM = 540;
const THICK = 32;
const LIFT = 230;
const OPEN = 260;
// the squeezes: SQUEEZES from FIRST_MS, GAPS_MS apart (closing)
const FIRST_MS = DROP_MS + 200;
const SQUEEZES = 7;
const GAPS_MS: [number, number] = [280, 100];
const CRACKS = 1.3;
// each squeeze's glitter streaming up into the readout over FLY_MS, set
// off over SPREAD_MS, landing across READOUT_X; the readout flashing
const STREAM = 16;
const FLY_MS = 190;
const SPREAD_MS = 60;
const READOUT_X = 280;
const SWERVE = 130;
const FLASH_MS = 170;
const FLASH = 170;
// the crack: the halves flying SPLIT px apart over HALVES_MS, dropping
// FALL px; the kernel swelling over SWELL_MS, then rising RISE_MS
const HALVES_MS = 380;
const SPLIT = 280;
const FALL = 180;
const KERNEL = 70;
const SWELL_MS = 70;
const RISE_MS = 150;
// shakes by step: a share, the crack, the finale
const SHAKES = [0.4, 2, 2.6];

// the walnut's specks, of RX and RY: its bumpy shell, the seam down its
// middle, the glitter packed inside; and which half each flies off with
const SHELL = 56;
const SEAM = 12;
const INNER = 26;
const BITS = SHELL + SEAM + INNER;
const BX = new Float32Array(BITS);
const BY = new Float32Array(BITS);
const SIDE = new Int8Array(BITS);
for (let i = 0; i < SHELL; i++) {
  const t = (i / SHELL) * Math.PI * 2;
  const bump = 1 + 0.07 * Math.sin(7 * t) - 0.06 * Math.cos(t) ** 2;
  BX[i] = Math.cos(t) * bump;
  BY[i] = Math.sin(t) * bump;
}
for (let j = 0; j < SEAM; j++) {
  const i = SHELL + j;
  BX[i] = 0.06 * Math.sin(j * 2.1);
  BY[i] = lerp(-0.9, 0.9, j / (SEAM - 1));
}
for (let j = 0; j < INNER; j++) {
  const i = SHELL + SEAM + j;
  const t = holeHash(j, 4210) * Math.PI * 2;
  const d = 0.75 * Math.sqrt(holeHash(j, 4211));
  BX[i] = Math.cos(t) * d;
  BY[i] = Math.sin(t) * d;
}
for (let i = 0; i < BITS; i++)
  SIDE[i] = BX[i] < -0.02 ? -1 : BX[i] > 0.02 ? 1 : i % 2 ? 1 : -1;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

interface Plan {
  crush: Crush;
  crackMs: number;
  finaleMs: number;
}
const plans = new WeakMap<Running, Plan>();
const pose: CrushPose = { crush: 0, lift: 0, since: Infinity, press: -1 };
const squash: Point = { x: 1, y: 1 };
const stretch: Point = { x: 1, y: 1 };
const nut: Point = { x: 0, y: 0 };
const hinge: Point = { x: 0, y: 0 };
const tip: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };

registerFloorCrit("nutcrackerCrit", {
  plan(r, _bars, hit) {
    const crush = planCrush(FIRST_MS, SQUEEZES, GAPS_MS, 1.7, {
      climaxShake: SHAKES[1],
      bang: false,
    });
    const crackMs = crush.slams[SQUEEZES - 1];
    for (let k = 0; k < SQUEEZES - 1; k++) hit(0, crush.slams[k] + FLY_MS, 0);
    hit(0, crackMs, 1);
    const finaleMs = crackMs + SWELL_MS + RISE_MS;
    hit(0, finaleMs, 2);
    plans.set(r, { crush, crackMs, finaleMs });
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const { crush, crackMs } = plan;
    const now = r.startedAt + ms;
    const to = bars[0];
    nut.x = to.x;
    nut.y = to.y + BELOW;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, nut.x, p),
        lerp(0, nut.y, p),
        r.flashFont * lerp(1, 0.5, p),
      );
    }
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    // squeezed across (x), bulging up and down (y)
    squashScale(pose.crush, squash);
    const halfW = RX * squash.y;
    const halfH = RY * squash.x;
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    if (ms >= DROP_MS && ms < crackMs) {
      const shatter = Math.min(1, (ms - DROP_MS) / SHATTER_MS);
      // the kernel glowing through the shell, brighter the more it cracks
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * shatter * (0.35 + 0.5 * pose.crush);
      drawGlow(ctx, GOLD, nut.x, nut.y, KERNEL * (1 + 0.8 * pose.crush));
      ctx.globalAlpha = alpha;
      beginLightBatch(ctx);
      for (let i = 0; i < BITS; i++)
        stampGlimmer(
          ctx,
          nut.x + BX[i] * halfW * shatter,
          nut.y + BY[i] * halfH * shatter,
          i < SHELL ? SPECK * 1.2 : SPECK,
          i,
          i < SHELL + SEAM && i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      // the jaws pivoting on the hinge, swinging in wide open, biting at
      // the walnut's sides and stretching as they snap shut
      crusherScale(crush, ms, stretch);
      const swing = 1 - Math.min(1, (ms - DROP_MS) / (FIRST_MS - DROP_MS));
      const gap = halfW + THICK / 2 + pose.lift * LIFT + swing * swing * OPEN;
      hinge.x = nut.x;
      hinge.y = nut.y + HINGE;
      const len = ARM * stretch.x;
      const reach = Math.hypot(gap, HINGE);
      for (let side = -1; side <= 1; side += 2) {
        tip.x = hinge.x + ((side * gap) / reach) * len;
        tip.y = hinge.y - (HINGE / reach) * len;
        drawSlab(ctx, hinge, tip, THICK * stretch.y, 1 - swing, now);
        // cracks spreading over the shell from each bite
        contact.x = nut.x + side * halfW;
        contact.y = nut.y;
        drawCrushStrain(
          ctx,
          contact,
          side > 0 ? Math.PI : 0,
          halfH * 1.4,
          pose.crush,
          RX * CRACKS,
          now,
        );
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - swing);
      drawGlow(ctx, GOLD, hinge.x, hinge.y, THICK * 1.6);
      drawGlow(ctx, WHITE, hinge.x, hinge.y, THICK * 0.6);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    // the white-hot bite down each side at every squeeze, glitter squirting
    if (pose.press >= 0 && pose.press < SQUEEZES - 1)
      for (let side = -1; side <= 1; side += 2) {
        contact.x = nut.x + side * halfW;
        contact.y = nut.y;
        drawCrushContact(
          ctx,
          contact,
          side > 0 ? 0 : Math.PI,
          halfH * 2,
          pose.since,
          (pose.press + 1) / SQUEEZES,
          now,
        );
      }
    // each squeeze's glitter streaming up into the readout, which flashes
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < SQUEEZES - 1; k++) {
      const since = ms - crush.slams[k];
      if (since < 0 || since >= SPREAD_MS + FLY_MS) continue;
      for (let i = 0; i < STREAM; i++) {
        const t = (since - holeHash(i + k * STREAM, 4220) * SPREAD_MS) / FLY_MS;
        if (t < 0 || t >= 1) continue;
        const e = t * t;
        const sx = nut.x + (holeHash(i, 4221) * 2 - 1) * halfW * 0.6;
        const sy = nut.y - halfH;
        const ex = to.x + (holeHash(i + k * STREAM, 4222) * 2 - 1) * READOUT_X;
        const cx = sx + (holeHash(i + k, 4223) * 2 - 1) * SWERVE;
        const u = 1 - e;
        stampGlimmer(
          ctx,
          u * u * sx + 2 * u * e * cx + e * e * ex,
          u * u * sy + 2 * u * e * ((sy + to.y) / 2) + e * e * to.y,
          SPECK * (1.2 - 0.5 * t),
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    for (let k = 0; k < SQUEEZES - 1; k++) {
      const since = ms - crush.slams[k] - FLY_MS;
      if (since < 0 || since >= FLASH_MS) continue;
      const fade = 1 - since / FLASH_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(
        ctx,
        GOLD,
        to.x,
        to.y,
        FLASH * (0.7 + 0.5 * (k / SQUEEZES)),
        0.5,
      );
      drawGlow(ctx, WHITE, to.x, to.y, FLASH * 0.35 * fade);
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    // the crack: jets up into the readout and down, the halves flying apart
    const cracked = ms - crackMs;
    drawCrushBurst(ctx, nut, 0, RY * 2, cracked, now);
    if (cracked >= 0 && cracked < HALVES_MS) {
      const u = cracked / HALVES_MS;
      const out = 1 - (1 - u) ** 3;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - u);
      beginLightBatch(ctx);
      for (let i = 0; i < SHELL + SEAM; i++)
        stampGlimmer(
          ctx,
          nut.x + BX[i] * halfW + SIDE[i] * out * SPLIT,
          nut.y + BY[i] * halfH + u * u * FALL - out * 40,
          SPECK * 1.2,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      endLightBatch(ctx);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    // the kernel swelling, then shooting up stretched into the total
    if (cracked >= 0 && ms < plan.finaleMs) {
      const swell = Math.min(1, cracked / SWELL_MS);
      const p = Math.max(0, (cracked - SWELL_MS) / RISE_MS) ** 2;
      const y = lerp(nut.y, to.y, p);
      const size = KERNEL * (1.8 + 0.6 * swell) * (1 - 0.3 * p);
      ctx.globalCompositeOperation = "lighter";
      drawGlow(ctx, GOLD, nut.x, y, size, 1 + 1.2 * p);
      drawGlow(ctx, WHITE, nut.x, y, size * 0.45, 1 + 1.2 * p);
      ctx.globalCompositeOperation = previous;
    }
    drawFinale(ctx, to, ms - plan.finaleMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
