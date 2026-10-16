// Thunderbolt, an income crit: the green amount splits into two crackling
// wisps, one gold and one white, that snap out to either end of the total
// and hang there trembling; they trade forked bolts straight across the
// readout in quickening volleys, each a blink-fast flash, crack and jolt
// landing a share of the amount where it crosses, the arcs thicker and the
// wisps hotter each time. Then both charge, rumbling and swelling, fire at
// once, and the two bolts collide in the readout's middle in one huge
// forking blast: the last share, the big blast and hardest shake
import { COLOR } from "../../../../palette";
import { drawChargeGlow } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/animationStyles/lightning";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  lerp,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawNumberShrink } from "../shared";

// the wisps sit SPAN px either side of the total, kept MARGIN px in from the
// screen's sides; they snap out there over APPEAR_MS
const SPAN = 400;
const MIN_SPAN = 160;
const MARGIN = 60;
const APPEAR_MS = 130;
// the volleys: SHOTS bolts, alternating sides, quickening from the first gap
// to the last
const SHOTS = 8;
const FIRST_SHOT_MS = 240;
const GAP_MS: [number, number] = [175, 60];
// a bolt's blink: full, a dip at DIP_MS, a re-strike, gone by BOLT_MS
const BOLT_MS: [number, number] = [110, 85];
const DIP_MS: [number, number] = [30, 48];
const DIP = 0.25;
const BOLT_SCALE: [number, number] = [0.8, 1.8];
const STRIKE_SCALE: [number, number] = [0.8, 1.5];
// where a bolt crosses the readout: up to READOUT_X either side of its middle
const READOUT_X = 280;
const CROSS_JITTER_Y = 18;
// a shot knocks both wisps outwards JOLT px, settling over JOLT_MS
const JOLT: [number, number] = [14, 34];
const JOLT_MS = 120;
const KICK: [number, number] = [0.25, 0.9];
// the wisps' tremble, px, as the volleys run and as they charge
const TREMBLE: [number, number] = [3, 9];
const CHARGE_TREMBLE = 16;
// the charge, then the clash
const CHARGE_MS = 1080;
const CLASH_MS = 1440;
const RUMBLE_MS: [number, number] = [80, 28];
const RUMBLE: [number, number] = [0.35, 1.3];
const CHARGE_GLOW = 300;
// the wisps' halos, by heat
const HALO: [number, number] = [70, 150];
const SIZE: [number, number] = [1.05, 1.5];
// the crackles round each wisp: CRACKLES short arcs, re-aimed every
// CRACKLE_MS, CRACKLE_REACH px long (longer as they charge)
const CRACKLES = 2;
const CRACKLE_MS = 45;
const CRACKLE_REACH: [number, number] = [50, 130];
const CRACKLE_SCALE: [number, number] = [0.3, 0.75];
// the clash: two giant bolts meeting in the middle, RAYS forked bolts flung
// out of it
const GIANT_MS = 260;
const GIANT = 3;
const GIANT_STRIKE = 3.2;
const RAYS = 7;
const RAY_REACH: [number, number] = [220, 340];
const RAY_SCALE = 1.4;
const FLASH_MS = 160;
const CROSS_FLASH = 140;
const MUZZLE_FLASH = 110;
const CLASH_FLASH = 460;
const FINALE_BLAST = 480;
// shakes by step: a share, the clash
const SHAKES = [0.55, 3.2];

const GOLD = fadeStops(COLOR.heavenlyGold);
const GREEN = fadeStops(COLOR.moneyGreen);
const WHITE = fadeStops(COLOR.white, 0.2);
const WHITE_BOLT = "#ffffff";

interface Duelist {
  side: number;
  home: Point;
  pos: Point;
  at: (ms: number) => Point | null;
  arcs: Bolt[];
  arcEnds: Point[];
}
interface State {
  to: Point;
  duelists: Duelist[];
  shotAt: Float32Array;
  bolts: Bolt[];
  cross: Point[];
  giants: Bolt[];
  rays: Bolt[];
  kicked: number;
  nextRumble: number;
}
const states = new WeakMap<Running, State>();
const origin: Point = { x: 0, y: 0 };

// how hot the duel's running at ms, 0..1 over the volleys
const heatAt = (ms: number) => clamp01(ms / CHARGE_MS);
const chargeAt = (ms: number) =>
  clamp01((ms - CHARGE_MS) / (CLASH_MS - CHARGE_MS));

function planDuelist(side: number, home: Point, shotAt: Float32Array): Duelist {
  const pos: Point = { x: 0, y: 0 };
  const phase = side > 0 ? 1.7 : 0;
  const arcs: Bolt[] = [];
  const arcEnds: Point[] = [];
  for (let k = 0; k < CRACKLES; k++) {
    const end: Point = { x: home.x, y: home.y };
    arcEnds.push(end);
    arcs.push(createBolt(pos, end, 0));
  }
  return {
    side,
    home,
    pos,
    arcs,
    arcEnds,
    // snapping out from the flash's spot, then trembling at home, knocked
    // outwards by every shot; gone as it fires its last bolt
    at: (ms) => {
      if (ms < 0 || ms >= CLASH_MS) return null;
      if (ms < APPEAR_MS) {
        const p = 1 - (1 - ms / APPEAR_MS) ** 3;
        pos.x = lerp(origin.x, home.x, p);
        pos.y = lerp(origin.y, home.y, p);
        return pos;
      }
      const h = heatAt(ms);
      const c = chargeAt(ms);
      const amp = lerp(TREMBLE[0], TREMBLE[1], h) + CHARGE_TREMBLE * c * c;
      let jolt = 0;
      for (let k = shotAt.length - 1; k >= 0; k--) {
        const since = ms - shotAt[k];
        if (since < 0) continue;
        if (since < JOLT_MS) {
          const f = 1 - since / JOLT_MS;
          jolt = lerp(JOLT[0], JOLT[1], k / (SHOTS - 1)) * f * f;
        }
        break;
      }
      pos.x =
        home.x + side * jolt + amp * Math.sin(ms * (0.6 + 0.9 * h) + phase);
      pos.y = home.y + amp * Math.cos(ms * (0.8 + 1.1 * h) + phase);
      return pos;
    },
  };
}

registerFloorCrit("thunderboltCrit", {
  plan(r, bars, hit) {
    const target = bars[0];
    if (!target) return;
    const to: Point = { x: target.x, y: target.y };
    const span = Math.max(
      MIN_SPAN,
      Math.min(SPAN, r.viewportWidth / 2 - MARGIN - Math.abs(to.x)),
    );
    const shotAt = new Float32Array(SHOTS);
    shotAt[0] = FIRST_SHOT_MS;
    for (let k = 1; k < SHOTS; k++)
      shotAt[k] =
        shotAt[k - 1] + lerp(GAP_MS[0], GAP_MS[1], (k - 1) / (SHOTS - 2));
    const left = planDuelist(-1, { x: to.x - span, y: to.y }, shotAt);
    const right = planDuelist(1, { x: to.x + span, y: to.y }, shotAt);
    const bolts: Bolt[] = [];
    const cross: Point[] = [];
    for (let k = 0; k < SHOTS; k++) {
      const from = k % 2 ? right.home : left.home;
      const into = k % 2 ? left.home : right.home;
      bolts.push(createBolt(from, into, 1 + Math.floor((k * 3) / SHOTS)));
      cross.push({
        x: to.x + (holeHash(k, 9610) * 2 - 1) * Math.min(READOUT_X, span),
        y: to.y + (holeHash(k, 9611) * 2 - 1) * CROSS_JITTER_Y,
      });
      hit(0, shotAt[k]);
    }
    const rays: Bolt[] = [];
    for (let k = 0; k < RAYS; k++) {
      const a = ((k + holeHash(k, 9612) * 0.6) / RAYS) * Math.PI * 2;
      const reach = lerp(RAY_REACH[0], RAY_REACH[1], holeHash(k, 9613));
      rays.push(
        createBolt(
          to,
          { x: to.x + Math.cos(a) * reach, y: to.y + Math.sin(a) * reach },
          2,
        ),
      );
    }
    hit(0, CLASH_MS, 1);
    states.set(r, {
      to,
      duelists: [left, right],
      shotAt,
      bolts,
      cross,
      giants: [createBolt(left.home, to, 4), createBolt(right.home, to, 4)],
      rays,
      kicked: 0,
      nextRumble: CHARGE_MS,
    });
  },
  draw(ctx, r, ms) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    const to = s.to;
    const { duelists, shotAt, bolts, cross } = s;
    drawNumberShrink(ctx, r, ms);
    const alpha = ctx.globalAlpha;
    const previous = ctx.globalCompositeOperation;
    const h = heatAt(ms);
    const c = chargeAt(ms);

    // a jolt on every shot, harder each time; a rumble rising as they charge
    while (s.kicked < SHOTS && ms >= shotAt[s.kicked]) {
      r.shake(lerp(KICK[0], KICK[1], s.kicked / (SHOTS - 1)));
      s.kicked++;
    }
    if (ms >= s.nextRumble && ms < CLASH_MS) {
      r.shake(lerp(RUMBLE[0], RUMBLE[1], c));
      s.nextRumble = ms + lerp(RUMBLE_MS[0], RUMBLE_MS[1], c);
    }

    // the wisps' halos, swelling hotter, and the charge gathering in them
    if (ms < CLASH_MS) {
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let d = 0; d < duelists.length; d++) {
        const p = duelists[d].at(ms);
        if (!p) continue;
        const flicker = 0.85 + 0.15 * Math.sin(now * (0.03 + 0.04 * h) + d);
        ctx.globalAlpha = alpha * (0.45 + 0.4 * h) * flicker;
        drawGlow(
          ctx,
          d === 0 ? GOLD : WHITE,
          p.x,
          p.y,
          lerp(HALO[0], HALO[1], h) * (1 + 0.4 * c),
        );
      }
      endLightBatch(ctx);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
      if (c > 0)
        for (let d = 0; d < duelists.length; d++) {
          const p = duelists[d].at(ms);
          if (p) drawChargeGlow(ctx, p, c, CHARGE_GLOW, now);
        }
    }

    // the volleys' bolts: a blink, a dip, a re-strike
    for (let k = 0; k < SHOTS; k++) {
      const since = ms - shotAt[k];
      if (since < 0) break;
      const u = k / (SHOTS - 1);
      const life = lerp(BOLT_MS[0], BOLT_MS[1], u);
      if (since >= life) continue;
      const fade =
        (1 - since / life) *
        (since >= DIP_MS[0] && since < DIP_MS[1] ? DIP : 1);
      const scale = lerp(BOLT_SCALE[0], BOLT_SCALE[1], u);
      if (k % 2) drawBolt(ctx, bolts[k], fade, scale, WHITE_BOLT);
      else drawBolt(ctx, bolts[k], fade, scale);
      const strike = lerp(STRIKE_SCALE[0], STRIKE_SCALE[1], u);
      drawStrike(ctx, cross[k], fade, strike, now);
      drawStrike(ctx, bolts[k].to, fade, strike * 0.8, now);
    }

    // crackles round each wisp, re-aimed in flickers, longer as they charge
    if (ms >= APPEAR_MS && ms < CLASH_MS) {
      const flick = Math.floor(ms / CRACKLE_MS);
      const reach = lerp(CRACKLE_REACH[0], CRACKLE_REACH[1], Math.max(h * 0.5, c));
      const scale = lerp(CRACKLE_SCALE[0], CRACKLE_SCALE[1], Math.max(h * 0.5, c));
      for (let d = 0; d < duelists.length; d++) {
        const w = duelists[d];
        const p = w.at(ms);
        if (!p) continue;
        for (let k = 0; k < CRACKLES; k++) {
          if (holeHash(flick * 7 + k, 9620 + d) < 0.3 - 0.25 * c) continue;
          const a = holeHash(flick * 7 + k, 9622 + d) * Math.PI * 2;
          const len = reach * (0.5 + 0.5 * holeHash(flick * 7 + k, 9624 + d));
          w.arcEnds[k].x = p.x + Math.cos(a) * len;
          w.arcEnds[k].y = p.y + Math.sin(a) * len;
          if (d === 0) drawBolt(ctx, w.arcs[k], 0.9, scale);
          else drawBolt(ctx, w.arcs[k], 0.9, scale, WHITE_BOLT);
        }
      }
    }

    // the wisps themselves, hotter as the duel runs
    if (ms < CLASH_MS + 400)
      for (let d = 0; d < duelists.length; d++)
        drawWisp(
          ctx,
          duelists[d].at,
          ms,
          now,
          WISP_SIZE * lerp(SIZE[0], SIZE[1], Math.max(h, c)),
          Math.min(1, 0.3 + 0.5 * h + 0.5 * c),
        );

    // each shot's flashes: the muzzle, and green where it crosses the readout
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let k = 0; k < SHOTS; k++) {
      const since = ms - shotAt[k];
      if (since < 0) break;
      if (since >= FLASH_MS) continue;
      const f = 1 - since / FLASH_MS;
      const grow = lerp(1, 1.5, k / (SHOTS - 1));
      const spot = cross[k];
      const muzzle = bolts[k].from;
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GREEN, spot.x, spot.y, CROSS_FLASH * grow * (1.5 - 0.5 * f), 0.5);
      drawGlow(ctx, WHITE, spot.x, spot.y, CROSS_FLASH * 0.4 * grow * f);
      drawGlow(ctx, k % 2 ? WHITE : GOLD, muzzle.x, muzzle.y, MUZZLE_FLASH * grow * f);
    }
    // the clash's flash, white-hot then green over the readout
    const g = ms - CLASH_MS;
    if (g >= 0 && g < FLASH_MS * 2) {
      const f = 1 - g / (FLASH_MS * 2);
      ctx.globalAlpha = alpha * f;
      drawGlow(ctx, GREEN, to.x, to.y, CLASH_FLASH * (1.5 - 0.5 * f), 0.45);
      drawGlow(ctx, WHITE, to.x, to.y, CLASH_FLASH * 0.45 * f, 0.7);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;

    // the clash: both giant bolts meeting in the middle, forks flung out
    if (g >= 0 && g < GIANT_MS) {
      const f = 1 - g / GIANT_MS;
      drawBolt(ctx, s.giants[0], f, GIANT);
      drawBolt(ctx, s.giants[1], f, GIANT, WHITE_BOLT);
      for (let k = 0; k < s.rays.length; k++)
        if (k % 2) drawBolt(ctx, s.rays[k], f, RAY_SCALE, WHITE_BOLT);
        else drawBolt(ctx, s.rays[k], f, RAY_SCALE);
      drawStrike(ctx, to, f, GIANT_STRIKE, now);
    }
    drawDetonation(ctx, to, g, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
