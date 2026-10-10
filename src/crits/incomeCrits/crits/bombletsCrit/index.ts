// the bomblets income crit: the number rockets up under the total as a
// fizzing bomb and bursts; four bomblets land across the readout in a row of
// blasts, each bursting into three more that hop on along it, a rattle of
// twelve; the last brings the huge blast in the middle
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  FLOOR_CRIT_FONT,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash, quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

const RISE_MS = 200;
const BURST_MS = RISE_MS + 140;
const HOP_MS = 180;
const HOP2_MS = 130;
const STAGGER_MS = 45;
const STAGGER2_MS = 12;
const LAST_DELAY_MS = 80;
// the bomb bursts this far under the total; its bomblets land across it
const UNDER = 170;
const FIRST_X = [-330, -110, 110, 330];
const LAND_Y = 20;
const SECOND_STEP = 90;
const SECOND_JITTER_X = 30;
const SECOND_JITTER_Y = 60;
const HOP_LIFT = 140;
const NUMBER_FONT = FLOOR_CRIT_FONT * 0.45;
const BOMB = WISP_SIZE * 1.4;
const BOMB_FUSE = 80;
const BOMBLET = WISP_SIZE * 0.8;
const BOMBLET_FUSE = 40;
const HEAT = 0.7;
const BURST_BLAST = 260;
const FIRST_BLAST = 200;
const SECOND_BLAST = 130;
const BURST_KICK = 1.4;
// shakes by step: a big bomblet, a small one, the last
const SHAKES = [1, 0.5, 2.4];

interface Bomblet {
  from: Point;
  to: Point;
  at: number;
  land: number;
  big: boolean;
  path: (ms: number) => Point;
}
interface Bombs {
  under: Point;
  bomb: (ms: number) => Point;
  bomblets: Bomblet[];
  endAt: number;
}
const runs = new WeakMap<Running, Bombs>();

function hopPath(from: Point, to: Point, at: number, land: number) {
  const pull = {
    x: (from.x + to.x) / 2,
    y: Math.min(from.y, to.y) - HOP_LIFT * 2,
  };
  return (ms: number) =>
    quadratic(from, pull, to, clamp01((ms - at) / (land - at)));
}

function planBombs(to: Point): Bombs {
  const under = { x: to.x, y: to.y + UNDER };
  const bomblets: Bomblet[] = [];
  FIRST_X.forEach((dx, k) => {
    const first = { x: to.x + dx, y: to.y + LAND_Y };
    const land = BURST_MS + HOP_MS + k * STAGGER_MS;
    bomblets.push({
      from: under,
      to: first,
      at: BURST_MS,
      land,
      big: true,
      path: hopPath(under, first, BURST_MS, land),
    });
    for (let j = 0; j < 3; j++) {
      const n = k * 3 + j;
      const spot = {
        x:
          first.x +
          (j - 1) * SECOND_STEP +
          (holeHash(n, 181) - 0.5) * SECOND_JITTER_X,
        y: to.y + (holeHash(n, 182) - 0.5) * SECOND_JITTER_Y,
      };
      const end = land + HOP2_MS + n * STAGGER2_MS;
      bomblets.push({
        from: first,
        to: spot,
        at: land,
        land: end,
        big: false,
        path: hopPath(first, spot, land, end),
      });
    }
  });
  let last = 0;
  for (const b of bomblets) last = Math.max(last, b.land);
  const spot: Point = { x: 0, y: 0 };
  return {
    under,
    bomb: (ms) => {
      const u = clamp01(ms / RISE_MS);
      spot.x = lerp(0, under.x, u);
      spot.y = lerp(0, under.y, u * u);
      return spot;
    },
    bomblets,
    endAt: last + LAST_DELAY_MS,
  };
}

registerFloorCrit("bombletsCrit", {
  plan(r, bars, hit) {
    const run = planBombs(bars[0]);
    runs.set(r, run);
    for (const b of run.bomblets) hit(0, b.land, b.big ? 0 : 1);
    hit(0, run.endAt, 2);
  },
  draw(ctx, r, ms, bars) {
    const run = runs.get(r);
    if (!run) return;
    const now = r.startedAt + ms;
    if (ms >= BURST_MS && r.kicked === 0) {
      r.kicked = 1;
      r.shake(BURST_KICK);
    }
    if (ms < BURST_MS) {
      const p = run.bomb(ms);
      drawLitFuse(ctx, p, ms / BURST_MS, BOMB_FUSE, now);
      drawWispBetween(ctx, run.bomb, ms, now, BOMB, HEAT, 0, BURST_MS);
      // the number riding the bomb up, shrinking away as it lights
      drawText(
        ctx,
        r.glyphs,
        r.label,
        p.x,
        p.y,
        lerp(r.flashFont, NUMBER_FONT, clamp01(ms / RISE_MS)),
        { alpha: 1 - clamp01((ms - RISE_MS) / (BURST_MS - RISE_MS)) },
      );
    }
    drawDetonation(ctx, run.under, ms - BURST_MS, BURST_BLAST, now);
    const { bomblets } = run;
    for (let k = 0; k < bomblets.length; k++) {
      const b = bomblets[k];
      if (ms >= b.at && ms < b.land)
        drawLitFuse(
          ctx,
          b.path(ms),
          (ms - b.at) / (b.land - b.at),
          b.big ? BOMBLET_FUSE * 1.5 : BOMBLET_FUSE,
          now,
        );
      drawWispBetween(ctx, b.path, ms, now, BOMBLET, HEAT, b.at, b.land);
      drawDetonation(
        ctx,
        b.to,
        ms - b.land,
        b.big ? FIRST_BLAST : SECOND_BLAST,
        now,
      );
    }
    drawFinale(ctx, bars[0], ms - run.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
