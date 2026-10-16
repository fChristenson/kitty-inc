// Fairy Ring, an income crit: the green amount slams into the readout and a
// ring of glowing toadstools pops up one by one, flat under it; the ring
// starts turning, faster each turn, every turn a jolt, a flash and a share,
// fairies dancing up off the spots, more each time; then the ring blazes,
// trembling, and erupts in a pillar of light straight up through the
// readout with the last share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { easeOutBack } from "../../../../shared/easing";
import {
  drawSummonPillar,
  planSummon,
  summonTurn,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

// the amount sliding into the readout, shrinking
const IN_MS = 150;
const IN_SHRINK = 0.4;
const IN_BLAST = 110;
// the ring lies flat BELOW the readout's middle, RADIUS round, SQUASH as tall
// as it's wide; SPOTS toadstools pop up POP_GAP_MS apart, each over POP_MS
const BELOW = 50;
const RADIUS = 270;
const SQUASH = 0.3;
const SPOTS = 12;
const FIRST_POP_MS = IN_MS + 30;
const POP_GAP_MS = 32;
const POP_MS = 150;
// the circle's own drawing time before it turns (planSummon's pen and marks)
const SUMMON_LEAD_MS = 400;
// turning TURNS times, erupting at ERUPT_MS; the pillar PILLAR px up
const TURNS = 6;
const ERUPT_MS = 1480;
const PILLAR = 420;
const ERUPT_BLAST = 380;
// a spot: its pool of light, its glowing cap CAP_UP px above it
const POOL = 46;
const POOL_SQUASH = 0.45;
const CAP = 30;
const CAP_UP = 14;
const POP_FLARE = 1.6;
// each turn's flash: spots flaring, the ring kicked KICK wider, a glow on the
// ring and on the readout, gone over FLASH_MS
const FLASH_MS = 140;
const FLARE = 1.3;
const KICK = 0.1;
const RING_FLASH = 1.25;
const READOUT_FLASH = 170;
// the blaze over BLAZE_MS before the eruption: spots swelling and trembling
const BLAZE_MS = 260;
const BLAZE = 1.8;
const TREMBLE = 9;
const FADE_MS = 220;
const RIM: [number, number] = [2, 9];
const RIM_ALPHA: [number, number] = [0.35, 0.95];
// fairies: FAIRY_BASE off the first turn, FAIRY_MORE more each turn after,
// ERUPT_FAIRIES flung up with the pillar
const FAIRY_BASE = 2;
const FAIRY_MORE = 2;
const FAIRY_GAP_MS = 14;
const FAIRY_MS = 300;
const FAIRY_RISE: [number, number] = [150, 240];
const FAIRY_WIGGLE = 26;
const FAIRY_SIZE = 0.45;
const ERUPT_FAIRIES = 10;
const ERUPT_FAIRY_MS = 280;
const ERUPT_RISE: [number, number] = [360, 520];
// shakes by step: a turn, the amount in, the eruption
const SHAKES = [0.5, 1.4, 3.2];

const GREEN = fadeStops(COLOR.moneyGreen);
const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.2);

interface Fairy {
  from: number;
  to: number;
  at: (ms: number) => Point | null;
}
interface Plan {
  to: Point;
  ring: Point;
  summon: Summon;
  fairies: Fairy[];
}
const plans = new WeakMap<Running, Plan>();

function planFairy(
  ring: Point,
  summon: Summon,
  spot: number,
  from: number,
  life: number,
  rise: number,
  phase: number,
): Fairy {
  const a = (spot / SPOTS) * Math.PI * 2 + summonTurn(summon, from);
  const bx = ring.x + Math.cos(a) * RADIUS;
  const by = ring.y + Math.sin(a) * RADIUS * SQUASH;
  const p: Point = { x: bx, y: by };
  return {
    from,
    to: from + life,
    // darting up off its spot, weaving side to side
    at: (ms) => {
      const u = (ms - from) / life;
      if (u < 0 || u > 1) return null;
      p.x = bx + Math.sin(u * 9 + phase) * FAIRY_WIGGLE * (0.3 + u);
      p.y = by - rise * (1 - (1 - u) * (1 - u));
      return p;
    },
  };
}

registerFloorCrit("fairyRingCrit", {
  plan(r, bars, hit) {
    const target = bars[0];
    if (!target) return;
    const to: Point = { x: target.x, y: target.y };
    const ring: Point = { x: to.x, y: to.y + BELOW };
    const popsEnd = FIRST_POP_MS + SPOTS * POP_GAP_MS;
    const summon = planSummon(popsEnd - SUMMON_LEAD_MS, ERUPT_MS, TURNS);
    const fairies: Fairy[] = [];
    for (let j = 0; j < summon.revs.length; j++) {
      const rev = summon.revs[j];
      const n = FAIRY_BASE + j * FAIRY_MORE;
      for (let f = 0; f < n; f++) {
        const seed = j * 31 + f;
        fairies.push(
          planFairy(
            ring,
            summon,
            Math.floor(holeHash(seed, 7710) * SPOTS),
            rev + f * FAIRY_GAP_MS,
            FAIRY_MS,
            lerp(FAIRY_RISE[0], FAIRY_RISE[1], holeHash(seed, 7711)),
            holeHash(seed, 7712) * Math.PI * 2,
          ),
        );
      }
    }
    for (let f = 0; f < ERUPT_FAIRIES; f++)
      fairies.push(
        planFairy(
          ring,
          summon,
          Math.floor((f * SPOTS) / ERUPT_FAIRIES),
          summon.eruptMs + f * 6,
          ERUPT_FAIRY_MS,
          lerp(ERUPT_RISE[0], ERUPT_RISE[1], holeHash(f, 7713)),
          holeHash(f, 7714) * Math.PI * 2,
        ),
      );
    plans.set(r, { to, ring, summon, fairies });
    hit(0, IN_MS, 1);
    for (const rev of summon.revs) hit(0, rev);
    hit(0, summon.eruptMs, 2);
  },
  draw(ctx, r, ms) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const { to, ring, summon, fairies } = plan;
    const { revs } = summon;
    const erupt = ms - summon.eruptMs;

    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    drawDetonation(ctx, to, ms - IN_MS, IN_BLAST, now);

    // the latest turn's flash
    let flash = 0;
    for (let k = revs.length - 1; k >= 0; k--) {
      const since = ms - revs[k];
      if (since < 0) continue;
      if (since < FLASH_MS) {
        const f = 1 - since / FLASH_MS;
        flash = f * f * lerp(0.7, 1.2, k / Math.max(1, revs.length - 1));
      }
      break;
    }
    const blaze =
      erupt < 0 ? clamp01((ms - (summon.eruptMs - BLAZE_MS)) / BLAZE_MS) : 1;
    const fade = 1 - clamp01(erupt / FADE_MS);

    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    if (fade > 0 && ms >= FIRST_POP_MS) {
      const kick = 1 + KICK * Math.min(1, flash);
      const rx = RADIUS * kick;
      const ry = rx * SQUASH;
      // the faint rim joining the spots, hotter on every flash and the blaze
      const heat = Math.min(1, flash + blaze);
      ctx.globalAlpha =
        alpha *
        fade *
        lerp(RIM_ALPHA[0], RIM_ALPHA[1], heat) *
        clamp01((ms - FIRST_POP_MS) / (SPOTS * POP_GAP_MS));
      ctx.lineWidth = lerp(RIM[0], RIM[1], heat);
      ctx.strokeStyle = COLOR.moneyGreen;
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      const turn = summonTurn(summon, ms);
      const swell = 1 + flash * FLARE + blaze * BLAZE;
      const shiver = TREMBLE * blaze * blaze;
      beginLightBatch(ctx);
      ctx.globalAlpha = alpha * fade;
      for (let i = 0; i < SPOTS; i++) {
        const pop = clamp01((ms - FIRST_POP_MS - i * POP_GAP_MS) / POP_MS);
        const s = Math.max(0, easeOutBack(pop));
        if (s <= 0) continue;
        const a = (i / SPOTS) * Math.PI * 2 + turn;
        const sin = Math.sin(a);
        // nearer spots (the front of the ring) bigger
        const depth = 0.72 + 0.28 * (sin + 1) * 0.5;
        const x = ring.x + Math.cos(a) * rx + Math.sin(now * 0.09 + i) * shiver;
        const y = ring.y + sin * ry + Math.cos(now * 0.11 + i) * shiver;
        const size = s * depth * (swell + (1 - pop) * POP_FLARE);
        drawGlow(ctx, GREEN, x, y, POOL * size, POOL_SQUASH);
        stampGlimmer(
          ctx,
          x,
          y - CAP_UP * size,
          CAP * size,
          now * 0.004 + i,
          i % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      // each turn's flash across the ring and on the readout
      if (flash > 0) {
        ctx.globalAlpha = alpha * fade * Math.min(1, flash);
        drawGlow(ctx, GOLD, ring.x, ring.y, RADIUS * RING_FLASH, SQUASH);
        drawGlow(ctx, GREEN, to.x, to.y, READOUT_FLASH * (0.6 + flash));
      }
      // the blaze gathering in the ring's middle
      if (blaze > 0) {
        ctx.globalAlpha = alpha * fade * blaze;
        drawGlow(ctx, WHITE, ring.x, ring.y, RADIUS * blaze, SQUASH);
      }
      endLightBatch(ctx);
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;

    for (let k = 0; k < fairies.length; k++) {
      const f = fairies[k];
      drawWispBetween(
        ctx,
        f.at,
        ms,
        now,
        WISP_SIZE * FAIRY_SIZE,
        0.6,
        f.from,
        f.to,
      );
    }

    drawSummonPillar(ctx, summon, ms, ring, RADIUS, PILLAR);
    drawDetonation(ctx, to, erupt, ERUPT_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
