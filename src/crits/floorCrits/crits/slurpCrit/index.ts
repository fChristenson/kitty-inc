// Slurp, a floor crit: the number flies up over the roof and curls into an
// orb of light that starts slurping the glitter off every bar in view, a
// speck or two snapping up to it, then a flood, a crust of it whirling round
// the orb as it swells, glows and trembles, the rumble rising; it gulps the
// last, collapses to a point and bursts, the glitter raining back down onto
// the bars top to bottom, a blast and levels on each, its own last
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { snapAt, type Snap } from "../../../../shared/animationStyles/pull";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast, skyY } from "../../critPlayer/shared";

const IN_MS = 160;
// the orb ABOVE px over the top bar; slurping from IN_MS for PULL_MS, a
// crust CRUST px deep round it; collapsing over COLLAPSE_MS
const ABOVE = 280;
const PULL_MS = 1100;
const CRUST: [number, number] = [50, 110];
const COLLAPSE_MS = 140;
const ORB = 260;
const STREAKS = 320;
const TREMBLE = 14;
const CORE = WISP_SIZE * 1.4;
// the glitter: SPECKS on each bar INSET in from its ends, SPECK px
const SPECKS = 12;
const INSET = 70;
const SPECK = 20;
// the burst: the glitter back onto each bar over FLY_MS, bowed BOW px out,
// each bar LAND_GAP_MS after the one above, its own last
const FLY_MS = 220;
const BOW = 220;
const LAND_GAP_MS = 45;
const BURST_BLAST = 340;
const LAND_BLAST = 130;
const OWN_BLAST = 300;
const TAIL_MS = DETONATION_MS;
// shakes by step: a bar's glitter back, its own
const SHAKES = [1, 2.8];

interface Speck {
  bar: number;
  // its spot on its bar, from the bar's middle
  home: Point;
  snap: Snap;
  landsMs: number;
}
interface State {
  specks: Speck[];
  charge: Charge;
  burstMs: number;
  lands: { bar: number; ms: number }[];
}
const states = new WeakMap<Running, State>();
const orb: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const atOrb = () => orb;

registerFloorCrit("slurpCrit", {
  plan(r, bars, hit) {
    const reach = r.play.barHalfWidth - INSET;
    const order = ownLast(bars);
    const pullEnd = IN_MS + PULL_MS;
    const burstMs = pullEnd + COLLAPSE_MS;
    const lands = order.map((bar, k) => ({
      bar,
      ms: burstMs + FLY_MS + k * LAND_GAP_MS,
    }));
    for (const land of lands) hit(land.bar, land.ms, land.bar === 0 ? 1 : 0);
    const specks: Speck[] = [];
    order.forEach((bar, k) => {
      for (let i = 0; i < SPECKS; i++)
        specks.push({
          bar,
          home: {
            x: (((i + 0.5) / SPECKS) * 2 - 1) * reach,
            y: (hash01(i + k * SPECKS, 4510) - 0.5) * BAR_HALF_H,
          },
          snap: {
            pole: 0,
            from: { x: 0, y: 0 },
            angle: hash01(i + k * SPECKS, 4511) * Math.PI * 2,
            reach:
              CRUST[0] + (CRUST[1] - CRUST[0]) * hash01(i + k * SPECKS, 4512),
            startMs: 0,
            landMs: 0,
            bow: i % 2 ? 1 : -1,
          },
          landsMs: lands[k].ms,
        });
    });
    // a trickle then a flood, in a shuffled order across the bars
    const shuffled = specks
      .map((s, i) => ({ s, key: hash01(i, 4513) }))
      .sort((a, b) => a.key - b.key);
    shuffled.forEach(({ s }, i) => {
      const snapMs = 200;
      s.snap.landMs =
        IN_MS +
        snapMs +
        (PULL_MS - snapMs) * Math.sqrt((i + 1) / specks.length);
      s.snap.startMs = s.snap.landMs - snapMs;
    });
    states.set(r, {
      specks,
      charge: planCharge(IN_MS, PULL_MS, { climaxShake: 2.4 }),
      burstMs,
      lands,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, burstMs } = state;
    orb.x = bars[0].x;
    orb.y = skyY(r, bars, ABOVE);
    if (ms < IN_MS) {
      const u = ms / IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        orb.x * u * u,
        orb.y * u * u,
        r.flashFont * (1 - 0.7 * u),
        { alpha: 1 - u },
      );
    }
    tickCharge(charge, ms, r.shake);
    const c = chargeAt(charge, Math.min(ms, charge.climaxMs));
    trembleAt(c, ms, TREMBLE, shiver);
    // collapsing to a point once it's full, gone as it bursts
    const collapse = clamp01((ms - charge.climaxMs) / COLLAPSE_MS);
    const squeeze = 1 - collapse * collapse;
    orb.x += shiver.x;
    orb.y += shiver.y;
    if (ms >= IN_MS && ms < burstMs) {
      drawChargeGlow(ctx, orb, c * (0.5 + 0.5 * squeeze), ORB, now);
      drawChargeStreaks(ctx, orb, c, STREAKS * squeeze, ms);
      drawWispHead(ctx, atOrb, ms, now, CORE * (0.6 + 0.8 * c) * squeeze, c);
    }
    // the glitter: lying on its bar, snapping up, crusting the orb, or
    // raining back down onto its bar
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < state.specks.length; i++) {
      const s = state.specks[i];
      if (ms >= s.landsMs) continue;
      const bar = bars[s.bar];
      const homeX = bar.x + s.home.x;
      const homeY = bar.y + s.home.y;
      if (ms < burstMs) {
        s.snap.from.x = homeX;
        s.snap.from.y = homeY;
        snapAt(s.snap, ms, orb, SPECK, spot);
        if (ms >= s.snap.landMs) {
          spot.x = orb.x + (spot.x - orb.x) * squeeze;
          spot.y = orb.y + (spot.y - orb.y) * squeeze;
        }
      } else {
        const u = clamp01((ms - burstMs) / (s.landsMs - burstMs));
        const e = u * u;
        const w = 1 - e;
        const dx = homeX - orb.x;
        const dy = homeY - orb.y;
        const d = Math.hypot(dx, dy) || 1;
        const cx = orb.x + dx / 2 - (dy / d) * BOW * (i % 2 ? 1 : -1);
        const cy = orb.y + dy / 2 + (dx / d) * BOW * (i % 2 ? 1 : -1);
        spot.x = w * w * orb.x + 2 * w * e * cx + e * e * homeX;
        spot.y = w * w * orb.y + 2 * w * e * cy + e * e * homeY;
      }
      stampGlimmer(
        ctx,
        spot.x,
        spot.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, orb, ms - burstMs, BURST_BLAST, now);
    for (const land of state.lands)
      drawDetonation(
        ctx,
        bars[land.bar],
        ms - land.ms,
        land.bar === 0 ? OWN_BLAST : LAND_BLAST,
        now,
      );
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
