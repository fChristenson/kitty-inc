// the bomb lob income crit: the number blows apart into a dozen bomb wisps,
// fuses fizzing, lobbed high onto the total; they land one after another
// across the readout, each a blast with two more off its sides, and the last
// cracks the whole readout in a cluster
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  clamp01,
  drawText,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash, quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, readoutSpot } from "../shared";

const SWELL_MS = 150;
const SWELL = 0.4;
const THROB = 0.06;
const THROB_TURNS = 40;
const BOMBS = 12;
const LAUNCH_EVERY_MS = 20;
const FLY_MS = 380;
const LAND_EVERY_MS = 50;
const LAST_DELAY_MS = 110;
// where the bombs start round the number, and how high they're lobbed
const RING_X = 120;
const RING_Y = 80;
const LIFT = 260;
const LIFT_SPREAD = 260;
const BOMB = WISP_SIZE;
const BOMB_HEAT = 0.7;
const FUSE = 60;
const OPEN_BLAST = 320;
const BLAST = 190;
const SIDE_BLAST = 110;
const SIDE_GAP = 90;
const SIDE_DELAY_MS = 45;
// shakes by step: a bomb, the last cluster
const SHAKES = [0.7, 2.4];

interface Bomb {
  to: Point;
  launch: number;
  land: number;
  path: (ms: number) => Point;
}
interface Lob {
  bombs: Bomb[];
  endAt: number;
}
const lobs = new WeakMap<Running, Lob>();
const side: Point = { x: 0, y: 0 };

function planLob(to: Point): Lob {
  const bombs: Bomb[] = [];
  for (let k = 0; k < BOMBS; k++) {
    const a = (k / BOMBS) * Math.PI * 2;
    const from = { x: Math.cos(a) * RING_X, y: Math.sin(a) * RING_Y };
    const spot = readoutSpot(to, k, 81);
    const launch = SWELL_MS + k * LAUNCH_EVERY_MS;
    const land = SWELL_MS + FLY_MS + k * LAND_EVERY_MS;
    const lift = LIFT + holeHash(k, 83) * LIFT_SPREAD;
    // a quadratic's top sits halfway to its pull
    const pull = {
      x: (from.x + spot.x) / 2,
      y: Math.min(from.y, spot.y) - lift * 2,
    };
    bombs.push({
      to: spot,
      launch,
      land,
      path: (ms) =>
        quadratic(from, pull, spot, clamp01((ms - launch) / (land - launch))),
    });
  }
  return { bombs, endAt: bombs[BOMBS - 1].land + LAST_DELAY_MS };
}

registerFloorCrit("bombLobCrit", {
  plan(r, bars, hit) {
    const lob = planLob(bars[0]);
    lobs.set(r, lob);
    for (const b of lob.bombs) hit(0, b.land);
    hit(0, lob.endAt, 1);
  },
  draw(ctx, r, ms, bars) {
    const lob = lobs.get(r);
    if (!lob) return;
    const now = r.startedAt + ms;
    if (ms < SWELL_MS) {
      const p = ms / SWELL_MS;
      const throb = 1 + THROB * Math.sin(p * p * THROB_TURNS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + SWELL * p) * throb,
      );
    }
    side.x = 0;
    side.y = 0;
    drawDetonation(ctx, side, ms - SWELL_MS, OPEN_BLAST, now);
    const { bombs } = lob;
    for (let k = 0; k < bombs.length; k++) {
      const b = bombs[k];
      if (ms >= b.launch && ms < b.land)
        drawLitFuse(
          ctx,
          b.path(ms),
          (ms - b.launch) / (b.land - b.launch),
          FUSE,
          now,
        );
      drawWispBetween(ctx, b.path, ms, now, BOMB, BOMB_HEAT, b.launch, b.land);
      const since = ms - b.land;
      drawDetonation(ctx, b.to, since, BLAST, now);
      side.y = b.to.y;
      side.x = b.to.x - SIDE_GAP;
      drawDetonation(ctx, side, since - SIDE_DELAY_MS, SIDE_BLAST, now);
      side.x = b.to.x + SIDE_GAP;
      drawDetonation(ctx, side, since - SIDE_DELAY_MS, SIDE_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - lob.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
