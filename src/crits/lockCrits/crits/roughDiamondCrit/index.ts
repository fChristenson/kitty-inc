// Rough Diamond, a lock crit: the number bursts into four gun wisps in the
// corners of the dark locked floor that fire streams of glitter into its
// middle, every speck landing in its place in the outline of a giant gem,
// faster and faster, a click and a jolt as each facet closes; the finished
// gem blazes white and throbs, then crushes down into the lock, which
// bursts open, and the gem's glitter showers onto the new floor's bar: it
// pays out at once
import meta from "./meta";
import { COLOR } from "../../../../palette";
import {
  shapeOutline,
  SHAPES,
} from "../../../../shared/animationStyles/drawing";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { playSpinTick } from "../../../../sound";
import {
  FLOOR_H,
  FLOOR_X_MAX,
  FLOOR_X_MIN,
} from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import { getIncomeBarBox } from "../../../../floors/incomePanel";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const ARC_MS = 150;
// the guns WALL_IN px in from the floor's walls, CORNER of its height off
// its middle; the gem DOTS specks, GEM px from its middle to its edge,
// each flying FLY_MS, filling over FILL_MS (quickening by FILL_EASE), a
// click every FACETS of the way
const WALL_IN = 60;
const CORNER = 0.35;
const GUN = WISP_SIZE * 1.1;
const DOTS = 180;
const GEM = 250;
const DOT = 22;
const FLY_MS = 140;
const FILL_MS = 850;
const FILL_EASE = 0.55;
const FACETS = 6;
// blazing over BLAZE_MS, throbbing THROB_HZ, crushing into the lock over
// CRUSH_MS, then showering onto the bar over SHOWER_MS
const BLAZE_MS = 240;
const THROB_HZ = 9;
const CRUSH_MS = 110;
const SHOWER_MS = 200;
const SHOWER_STAGGER_MS = 1;
const OPEN_BLAST = 440;
const BAR_BLAST = 240;
// shakes by step: a facet, the floor bursting open, onto its bar
const SHAKES = [0.5, 3.2, 1.3];

interface State {
  dots: Point[];
  lands: Float32Array;
  facets: number[];
  blazeAt: number;
  openAt: number;
  landAt: number;
  guns: Point[];
  bar: Point;
  spots: Point[];
}
const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const dot: Point = { x: 0, y: 0 };
const gun: Point = { x: 0, y: 0 };
const atGun = () => gun;

registerFloorCrit("roughDiamondCrit", {
  reward(t) {
    t.payPayouts(t.count * meta.values.payouts);
    t.punch("Payout!");
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const left = FLOOR_X_MIN + WALL_IN - lock.x;
    const right = FLOOR_X_MAX - WALL_IN - lock.x;
    const up = FLOOR_H * CORNER;
    const guns = [
      { x: left, y: -up },
      { x: right, y: -up },
      { x: right, y: up },
      { x: left, y: up },
    ];
    const dots = shapeOutline(SHAPES.gem, DOTS, ORIGIN, GEM);
    const n = dots.length;
    const lands = Float32Array.from(
      dots,
      (_, i) => ARC_MS + FLY_MS + FILL_MS * (i / n) ** FILL_EASE,
    );
    const facets: number[] = [];
    for (let f = 1; f <= FACETS; f++) {
      const at = lands[Math.min(n - 1, Math.round((f * n) / FACETS) - 1)];
      facets.push(at);
      hit(0, at, 0);
    }
    const blazeAt = lands[n - 1];
    const openAt = blazeAt + BLAZE_MS + CRUSH_MS;
    hit(0, openAt, 1);
    const box = getIncomeBarBox(false);
    const bar = {
      x: box.x + box.width / 2 - lock.x,
      y: box.y + box.height / 2 - lock.y,
    };
    const landAt = openAt + (n - 1) * SHOWER_STAGGER_MS + SHOWER_MS;
    hit(0, landAt, 2);
    states.set(r, {
      dots,
      lands,
      facets,
      blazeAt,
      openAt,
      landAt,
      guns,
      bar,
      spots: dots.map((_, i) => ({
        x: bar.x + (holeHash(i, 5110) * 2 - 1) * box.width * 0.45,
        y: bar.y + (holeHash(i, 5111) - 0.5) * box.height,
      })),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    const { dots, lands, facets, blazeAt, openAt, guns, spots } = state;
    if (ms < ARC_MS) {
      const p = ms / ARC_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lock.x * p,
        lock.y * p,
        r.flashFont * (1 - 0.6 * p),
      );
      return;
    }
    // a click as each facet closes
    while (r.kicked < facets.length && ms >= facets[r.kicked]) {
      playSpinTick(1 + r.kicked / facets.length);
      r.kicked++;
    }
    ctx.save();
    ctx.translate(lock.x, lock.y);
    const blaze = clamp01((ms - blazeAt) / BLAZE_MS);
    const throb =
      blaze > 0
        ? 0.5 + 0.5 * Math.sin(((ms - blazeAt) / 1000) * THROB_HZ * Math.PI * 2)
        : 0;
    const crush = clamp01((ms - blazeAt - BLAZE_MS) / CRUSH_MS) ** 2;
    // the guns firing until it's drawn
    if (ms < blazeAt) {
      const heat = clamp01((ms - ARC_MS) / (blazeAt - ARC_MS));
      for (let g = 0; g < guns.length; g++) {
        gun.x = guns[g].x * clamp01((ms - ARC_MS) / 120);
        gun.y = guns[g].y * clamp01((ms - ARC_MS) / 120);
        drawWispHead(ctx, atGun, ms, now, GUN, heat);
      }
    }
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < dots.length; i++) {
      const fired = lands[i] - FLY_MS;
      if (ms < fired) break;
      const p = dots[i];
      let size = DOT;
      if (ms < lands[i]) {
        const u = (ms - fired) / FLY_MS;
        const from = guns[i % guns.length];
        dot.x = lerp(from.x, p.x, u);
        dot.y = lerp(from.y, p.y, u);
      } else if (ms < openAt) {
        // blazing, then crushed down into the lock
        const scale = (1 + 0.06 * throb) * (1 - crush);
        dot.x = p.x * scale;
        dot.y = p.y * scale;
        size = DOT * (1 + 0.6 * blaze);
      } else {
        const u = clamp01((ms - openAt - i * SHOWER_STAGGER_MS) / SHOWER_MS);
        if (u >= 1) continue;
        dot.x = spots[i].x * u;
        dot.y = spots[i].y * u - 200 * 4 * u * (1 - u);
        size = DOT * 1.2;
      }
      stampGlimmer(
        ctx,
        dot.x,
        dot.y,
        size,
        i,
        blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, ORIGIN, ms - openAt, OPEN_BLAST, now);
    drawDetonation(ctx, state.bar, ms - state.landAt, BAR_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
