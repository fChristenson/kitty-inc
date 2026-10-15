// Piranhas, an income crit: the green amount shrinks away as a school of
// hundreds of gold specks, a few fierce lead wisps at its head, streams up
// under the total and circles it as one long mass, flashing white-gold at
// every turn; in closing waves a flurry peels off and darts into the
// readout, a pair of gold jaws snapping shut on it: a green flash, a jolt
// and a share each, the school circling faster and packing tighter; then
// it balls up and the whole school drives into the readout at once: the
// last share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { easeOutCubic } from "../../../../shared/easing";
import {
  diveAt,
  diveRest,
  drawDives,
  drawSwarm,
  planDives,
  planSwarm,
  swarmAt,
  swarmSpread,
  type Dives,
  type Swarm,
  type SwarmKey,
} from "../../../../shared/animationStyles/swarm";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { drawNumberShrink, readoutSpot } from "../shared";

const TAU = Math.PI * 2;
const IN_MS = 100;
const COUNT = 240;
const LEADS = 3;
const SPECK = 17;
const LEAD = WISP_SIZE * 1.15;
// streaming up from the flash over STREAM_MS, bowed STREAM_BOW px aside,
// onto the bottom of its loop round the total: CY px under it, RX by RY px,
// lapping LAP_HZ[0] to [1] times a second, tightening to TIGHT of its size
// through the waves and PACKED_LOOP as it balls up
const STREAM_MS = 230;
const JOIN_MS = IN_MS + STREAM_MS;
const STREAM_BOW = 170;
const CY = 50;
const RX = 330;
const RY = 105;
const LAP_HZ: [number, number] = [0.8, 2.4];
const TIGHT = 0.8;
const PACKED_LOOP = 0.45;
// the school's spread: streaming in, swimming, packing through the waves,
// balled up at the climax
const SPREAD_IN = 40;
const SPREAD_SWIM = 125;
const SPREAD_LATE = 80;
const SPREAD_BALL = 24;
const PACK_MS = 220;
// it flashes as it turns at the loop's ends (TURN_SHARP sharpens the peak)
const TURN_SHARP = 6;
const TURN_GLOW = 2.2;
// the waves: WAVES from FIRST_MS, GAPS_MS apart (closing), WAVES_SHARE of
// the school in all, each WAVE_SPREAD_MS wide; each dart FLIGHT_MS
const WAVES = 7;
const FIRST_MS = JOIN_MS + 170;
const GAPS_MS: [number, number] = [210, 70];
const WAVES_SHARE = 0.45;
const WAVE_SPREAD_MS = 70;
const FLIGHT_MS = 120;
const CLIMAX_SPREAD_MS = 50;
// the bite: jaws JAW_W px either side, TEETH teeth TOOTH px deep, snapping
// shut from JAW_GAP px over BITE_MS before the hit; the flash after
const JAW_W = 62;
const TEETH = 5;
const TOOTH = 16;
const JAW_GAP = 46;
const BITE_MS = 90;
const FLASH_MS = 160;
const FLASH = 120;
const IN_BLAST = 480;
const IN_FLASH = 420;
const IN_FLASH_MS = 320;
// shakes by step: a bite, the school in
const SHAKES = [0.7, 2.9];

const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);
const GOLD = fadeStops(COLOR.heavenlyGold);

interface State {
  live: { to: Point };
  swarm: Swarm;
  dives: Dives;
  // where each wave bites the readout, then the total
  spots: Point[];
  waveHits: Float32Array;
  climax: number;
  inMs: number;
  leads: ((ms: number) => Point | null)[];
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };

// how far round its loop the school is at ms (rad), from the bottom
function loopAngle(ms: number, climax: number): number {
  const span = Math.max(1, climax - JOIN_MS) / 1000;
  const s = Math.max(0, ms - JOIN_MS) / 1000;
  return (
    Math.PI / 2 +
    TAU * (LAP_HZ[0] * s + ((LAP_HZ[1] - LAP_HZ[0]) * s * s) / (2 * span))
  );
}

// the loop's size at ms: tightening through the waves, then balling up
function loopScale(ms: number, climax: number): number {
  const waves = clamp01((ms - JOIN_MS) / (climax - PACK_MS - JOIN_MS));
  const pack = clamp01((ms - climax + PACK_MS) / PACK_MS);
  return lerp(lerp(1, TIGHT, waves), PACKED_LOOP, pack * pack);
}

// one jaw: a row of teeth across x±JAW_W at y, pointing `dir` (+1 down)
function jaw(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  const step = (JAW_W * 2) / (TEETH * 2);
  ctx.moveTo(x - JAW_W, y);
  for (let k = 1; k <= TEETH * 2; k++)
    ctx.lineTo(x - JAW_W + k * step, k % 2 ? y + dir * TOOTH : y);
}

registerFloorCrit("piranhasCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const waves: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < WAVES; k++) {
      waves.push(t);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (WAVES - 1));
    }
    const climax = t;
    const live = { to };
    const center = (ms: number, into: Point): Point => {
      const at = live.to;
      if (ms < JOIN_MS) {
        // streaming up from the flash (the screen's middle) onto the loop
        const u = easeOutCubic(clamp01((ms - IN_MS) / STREAM_MS));
        const ex = at.x;
        const ey = at.y + CY + RY;
        into.x = ex * u - STREAM_BOW * Math.sin(Math.PI * u);
        into.y = ey * u;
        return into;
      }
      const a = loopAngle(ms, climax);
      const k = loopScale(ms, climax);
      into.x = at.x + Math.cos(a) * RX * k;
      into.y = at.y + CY * k + Math.sin(a) * RY * k;
      return into;
    };
    const keys: SwarmKey[] = [
      { ms: IN_MS, r: SPREAD_IN },
      { ms: JOIN_MS, r: SPREAD_SWIM },
      { ms: climax - PACK_MS, r: SPREAD_LATE },
      { ms: climax, r: SPREAD_BALL },
    ];
    const swarm = planSwarm(center, {
      count: COUNT,
      startMs: IN_MS,
      endMs: climax,
      spread: swarmSpread(keys),
      spinHz: [0.3, 1.4],
      lagMs: 170,
      squash: 0.6,
    });
    // the leads swim at the school's head
    for (let i = 0; i < LEADS; i++) {
      swarm.lag[i] = 0;
      swarm.reach[i] = 0.2 + 0.15 * i;
    }
    const dives = planDives(
      swarm,
      waves,
      WAVE_SPREAD_MS,
      FLIGHT_MS,
      WAVES_SHARE,
    );
    for (let i = 0; i < LEADS; i++) dives.startMs[i] = Infinity;
    diveRest(dives, WAVES, climax, CLIMAX_SPREAD_MS);
    const waveHits = new Float32Array(WAVES);
    for (let k = 0; k < WAVES; k++) {
      waveHits[k] = waves[k] + WAVE_SPREAD_MS / 2 + FLIGHT_MS;
      hit(0, waveHits[k], 0);
    }
    const inMs = climax + CLIMAX_SPREAD_MS + FLIGHT_MS;
    hit(0, inMs, 1);
    const leads = Array.from({ length: LEADS }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < IN_MS
          ? null
          : ms < dives.startMs[i]
            ? swarmAt(swarm, i, ms, at)
            : diveAt(swarm, dives, i, ms, live.to, at);
    });
    const spots: Point[] = [];
    for (let k = 0; k < WAVES; k++) spots.push(readoutSpot(to, k, 6170));
    spots.push(to);
    states.set(r, { live, swarm, dives, spots, waveHits, climax, inMs, leads });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    s.live.to = to;
    s.spots[WAVES] = to;
    const { swarm, dives, spots, waveHits, climax } = s;
    drawNumberShrink(ctx, r, ms);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;

    // the school, flashing as it turns at the loop's ends
    let turn = 0;
    if (ms >= JOIN_MS && ms < climax)
      turn = Math.abs(Math.cos(loopAngle(ms, climax))) ** TURN_SHARP;
    if (turn > 0.05) {
      swarm.center(ms - swarm.lagMs * 0.3, head);
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      ctx.globalAlpha = alpha * 0.55 * turn;
      drawGlow(ctx, GOLD, head.x, head.y, swarm.spread(ms) * TURN_GLOW, 0.7);
      ctx.globalAlpha = alpha * 0.4 * turn;
      drawGlow(ctx, WHITE, head.x, head.y, swarm.spread(ms) * 0.9, 0.7);
      endLightBatch(ctx);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    drawSwarm(ctx, swarm, ms, SPECK * (1 + 0.5 * turn), dives);
    drawDives(ctx, swarm, dives, spots, ms, SPECK);
    const heat = clamp01((ms - JOIN_MS) / (climax - JOIN_MS));
    for (let i = 0; i < LEADS; i++)
      drawWispBetween(
        ctx,
        s.leads[i],
        ms,
        now,
        LEAD,
        0.3 + 0.7 * heat,
        IN_MS,
        dives.startMs[i] + FLIGHT_MS,
      );

    // each wave's bite: gold jaws snapping shut on the readout, then a
    // green flash
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let k = 0; k < WAVES; k++) {
      const since = ms - waveHits[k];
      if (since < -BITE_MS || since >= FLASH_MS) continue;
      const spot = spots[k];
      const shut = clamp01((since + BITE_MS) / BITE_MS);
      const gap = JAW_GAP * (1 - shut * shut) + TOOTH * 0.5;
      const fade = since < 0 ? 1 : 1 - since / FLASH_MS;
      ctx.beginPath();
      jaw(ctx, spot.x, spot.y - gap, 1);
      jaw(ctx, spot.x, spot.y + gap, -1);
      ctx.globalAlpha = alpha * fade;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.strokeStyle = COLOR.white;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    beginLightBatch(ctx);
    for (let k = 0; k < WAVES; k++) {
      const since = ms - waveHits[k];
      if (since < 0 || since >= FLASH_MS) continue;
      const spot = spots[k];
      const fade = 1 - since / FLASH_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(ctx, GREEN, spot.x, spot.y, FLASH * (1.4 - 0.4 * fade), 0.5);
      drawGlow(ctx, WHITE, spot.x, spot.y, FLASH * 0.4 * fade);
    }
    // the school in: a green-white flash over the whole readout
    const sinceIn = ms - s.inMs;
    if (sinceIn >= 0 && sinceIn < IN_FLASH_MS) {
      const fade = 1 - sinceIn / IN_FLASH_MS;
      ctx.globalAlpha = alpha * fade;
      drawGlow(ctx, GREEN, to.x, to.y, IN_FLASH * (1.5 - 0.5 * fade), 0.45);
      drawGlow(ctx, WHITE, to.x, to.y, IN_FLASH * 0.35 * fade, 0.6);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, to, sinceIn, IN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
