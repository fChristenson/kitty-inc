// the cork pop income crit: the number swells and shudders like a shaken
// bottle, a cork wisp pops up into the total with a bang, and a gushing jet
// of gold spray follows, its top whipping back and forth across the readout
// in a rattle of pops, a last big gush blowing it
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  drawSpray,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../../../shared/spray";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

const POP_MS = 260;
const CORK_MS = 150;
const CORK_IN_MS = POP_MS + CORK_MS;
const GUSH_MS = POP_MS + 60;
const GUSH_FOR_MS = 1000;
const STOP_MS = GUSH_MS + GUSH_FOR_MS;
const END_MS = STOP_MS + 60;
// shaken: swelling, juddering harder, a jolt every RATTLE_MS
const SWELL = 0.3;
const JUDDER = 30;
const JUDDER_MS = 25;
const RATTLES = 5;
const RATTLE_MS = 50;
const RATTLE_SHAKE = 0.3;
// the jet: its whip either side of straight up and how fast it whips
const WHIP = 0.28;
const WHIP_RATE = 0.012;
const SPREAD = 0.08;
const FLIGHT_MS = 240;
// pops on the readout, quickening, from a little after the gush starts
const FIRST_POP_MS = 200;
const POP_GAP_MS: [number, number] = [90, 45];
// a pop sits this share of the way from the readout to where the jet lands
const POP_DROP = 0.2;
const CORK = WISP_SIZE * 1.3;
const DROPLET = 110;
const MIST = 130;
const POP_BLAST = 150;
const OPEN_BLAST = 220;
const CORK_BLAST = 240;
// shakes by step: a pop, the cork in, the last gush
const SHAKES = [0.5, 1.4, 2.4];

interface Bottle {
  spray: Spray;
  pops: Point[];
  popAt: number[];
  cork: (ms: number) => Point;
}
const bottles = new WeakMap<Running, Bottle>();
const origin: Point = { x: 0, y: 0 };
const land: Point = { x: 0, y: 0 };

function planBottle(to: Point): Bottle {
  const spray = planSpray(
    origin,
    (ms) => -Math.PI / 2 + WHIP * Math.sin((ms - GUSH_MS) * WHIP_RATE),
    {
      startMs: GUSH_MS,
      endMs: STOP_MS,
      spread: SPREAD,
      reach: Math.hypot(to.x, to.y),
      flightMs: FLIGHT_MS,
    },
  );
  const pops: Point[] = [];
  const popAt: number[] = [];
  for (let t = GUSH_MS + FIRST_POP_MS; t < STOP_MS - 20; ) {
    const p = sprayLandsAt(spray, t, { x: 0, y: 0 });
    pops.push({ x: p.x, y: to.y + (p.y - to.y) * POP_DROP });
    popAt.push(t);
    t += lerp(POP_GAP_MS[0], POP_GAP_MS[1], (t - GUSH_MS) / GUSH_FOR_MS);
  }
  const spot: Point = { x: 0, y: 0 };
  return {
    spray,
    pops,
    popAt,
    cork: (ms) => {
      const u = clamp01((ms - POP_MS) / CORK_MS) ** 2;
      spot.x = lerp(0, to.x, u);
      spot.y = lerp(0, to.y, u);
      return spot;
    },
  };
}

registerFloorCrit("corkPopCrit", {
  plan(r, bars, hit) {
    const bottle = planBottle(bars[0]);
    bottles.set(r, bottle);
    hit(0, CORK_IN_MS, 1);
    for (const at of bottle.popAt) hit(0, at);
    hit(0, END_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const bottle = bottles.get(r);
    if (!bottle) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    while (r.kicked < RATTLES && ms >= r.kicked * RATTLE_MS) {
      r.kicked++;
      r.shake(RATTLE_SHAKE * r.kicked);
    }
    if (ms < POP_MS) {
      const u = ms / POP_MS;
      const judder =
        (holeHash(Math.floor(ms / JUDDER_MS), 221) - 0.5) * JUDDER * u;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        judder,
        0,
        r.flashFont * (1 + SWELL * u),
      );
    }
    drawDetonation(ctx, origin, ms - POP_MS, OPEN_BLAST, now);
    drawWispBetween(ctx, bottle.cork, ms, now, CORK, 1, POP_MS, CORK_IN_MS);
    drawDetonation(ctx, to, ms - CORK_IN_MS, CORK_BLAST, now);
    drawSpray(ctx, bottle.spray, ms, now, DROPLET);
    if (ms >= GUSH_MS && ms < STOP_MS)
      drawSprayMist(
        ctx,
        sprayLandsAt(bottle.spray, ms, land),
        ms - GUSH_MS,
        1,
        MIST,
        now,
      );
    const { pops, popAt } = bottle;
    for (let k = 0; k < pops.length; k++)
      drawDetonation(ctx, pops[k], ms - popAt[k], POP_BLAST, now);
    drawFinale(ctx, to, ms - END_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
