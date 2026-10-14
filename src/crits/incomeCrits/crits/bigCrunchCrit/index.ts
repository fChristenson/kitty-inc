// Big Crunch, an income crit: the green amount drops under the readout as a
// core and a tilted disk of stars spins up round it, faster and faster,
// shrinking as it spins, a flare and a share quicker and quicker; it
// crunches to a point and a jet of light shoots up into the readout in the
// biggest blast
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawStars,
  planDisk,
  scatterArms,
  type Disk,
  type Orbit,
} from "../../../../shared/animationStyles/galaxy";
import { drawGlow } from "../../../../shared/glowSprite";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale } from "../shared";

// the amount dropping BELOW the readout, shrinking into the core
const IN_MS = 320;
const IN_SHRINK = 0.4;
const BELOW = 120;
// the disk: its stars, spinning up over SPIN_MS (SPIN_RUSH more by its end)
// and shrinking to SHRINK of its size
const STARS = 160;
const ARMS = 3;
const TWIST = 0.7;
const INNER = 30;
const OUTER = 330;
const SQUASH = 0.28;
const TILT = -0.12;
const RIM_HZ = 0.5;
const SPIN_MS = 1500;
const SPIN_RUSH = 3;
const SHRINK = 0.9;
const STAR = 22;
const STAR_GROW = 0.6;
const CORE_GLOW: [number, number] = [60, 280];
const CORE_ALPHA: [number, number] = [0.3, 1];
// the flares, a share each, quicker and quicker; spread FLARE_X by FLARE_Y
// round the core, closer in as it shrinks
const FLARES = 12;
const FLARE_X = 300;
const FLARE_Y = 80;
const FLARE: [number, number] = [40, 80];
// the crunch, its jet up into the readout and the finale
const CRUNCH_BLAST = 220;
const JET_MS = 260;
const JET_FADE_MS = 150;
const JET = 160;
const FINALE_MS = 120;
// shakes by step: a flare, the amount in and the crunch, the finale
const SHAKES = [0.4, 1.8, 2.6];

interface Plan {
  disk: Disk;
  stars: Orbit[];
  flares: number[];
  spots: Point[];
}
const plans = new WeakMap<Running, Plan>();
const core: Point = { x: 0, y: 0 };
const flare: Point = { x: 0, y: 0 };
const GOLD = glowStops(COLOR.heavenlyGold);
const CRUNCH_MS = IN_MS + SPIN_MS;

registerFloorCrit("bigCrunchCrit", {
  plan(r, _bars, hit) {
    // the disk spins round (0, 0), drawn translated under the readout
    const disk = planDisk(
      { x: 0, y: 0 },
      { inner: INNER, outer: OUTER, squash: SQUASH, tilt: TILT, rimHz: RIM_HZ },
    );
    const flares = Array.from(
      { length: FLARES },
      (_, k) => IN_MS + SPIN_MS * (1 - (1 - (k + 1) / (FLARES + 1)) ** 2),
    );
    plans.set(r, {
      disk,
      stars: scatterArms(disk, STARS, ARMS, TWIST),
      flares,
      spots: flares.map((_, k) => ({
        x: (holeHash(k, 2020) - 0.5) * FLARE_X,
        y: (holeHash(k, 2021) - 0.5) * FLARE_Y,
      })),
    });
    hit(0, IN_MS, 1);
    for (const at of flares) hit(0, at);
    hit(0, CRUNCH_MS, 1);
    hit(0, CRUNCH_MS + FINALE_MS, 2);
  },
  draw(ctx, r, ms, bars) {
    const plan = plans.get(r);
    if (!plan) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    core.x = to.x;
    core.y = to.y + BELOW;
    const spun = clamp01((ms - IN_MS) / SPIN_MS);
    if (ms >= IN_MS && ms < CRUNCH_MS) {
      ctx.save();
      ctx.translate(core.x, core.y);
      drawStars(
        ctx,
        plan.disk,
        plan.stars,
        IN_MS + SPIN_MS * (spun + SPIN_RUSH * spun ** 4),
        STAR * (1 + STAR_GROW * spun),
        1 - SHRINK * spun * spun,
      );
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = lerp(CORE_ALPHA[0], CORE_ALPHA[1], spun);
      drawGlow(
        ctx,
        GOLD,
        core.x,
        core.y,
        lerp(CORE_GLOW[0], CORE_GLOW[1], spun),
      );
      ctx.restore();
    }
    for (let k = 0; k < FLARES; k++) {
      const at = plan.flares[k];
      const since = ms - at;
      if (since < 0 || since > DETONATION_MS) continue;
      const left = 1 - clamp01((at - IN_MS) / SPIN_MS);
      flare.x = core.x + plan.spots[k].x * left;
      flare.y = core.y + plan.spots[k].y * left;
      drawDetonation(
        ctx,
        flare,
        since,
        lerp(FLARE[0], FLARE[1], k / FLARES),
        now,
      );
    }
    const jet = ms - CRUNCH_MS;
    if (jet >= 0 && jet < JET_MS + JET_FADE_MS)
      drawBeam(ctx, core, to, JET, 1 - clamp01((jet - JET_MS) / JET_FADE_MS));
    drawDetonation(ctx, core, jet, CRUNCH_BLAST, now);
    if (ms < IN_MS) {
      const p = (ms / IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, core.x, p),
        lerp(0, core.y, p),
        r.flashFont * lerp(1, IN_SHRINK, p),
      );
    }
    drawFinale(ctx, to, jet - FINALE_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
