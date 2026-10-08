// the liftoff floor crit: the number lights a rocket flame on the end of
// each bar in view in turn, which rattles and roars, blasts off across the
// screen and out of sight, and comes screaming back in from the other side
// to slam home in a blast
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import {
  launchMs,
  launchOffset,
  type BarLaunch,
} from "../../../../shared/barLaunch";
import {
  registerFloorCrit,
  lerp,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";

const LIFTOFF_IN_MS = 250;
const LIFTOFF_EVERY_MS = 150;
const LAUNCH: BarLaunch = {
  burnMs: 320,
  flyMs: 480,
  awayMs: 260,
  backMs: 380,
};
const LIFTOFF_FONT = 60;
// the flame off a bar's left end, flickering, half-lit while it burns
const FLAME = 220;
const FLAME_FLICKER = 60;
const FLAME_W = 70;
const FLAME_CORE = 26;
const FLAME_FLASH = 120;
// stacked ever shorter and wider, so the flame tapers to a point
const FLAME_LAYERS = 6;
const BURNING = 0.5;
const BLAST = 190;
const LAUNCH_SHAKE = 0.9;
const HIT_SHAKE = 1.1;
const TAIL_MS = 900;

const igniteAt = (k: number) => LIFTOFF_IN_MS + k * LIFTOFF_EVERY_MS;
const flightMs = LAUNCH.burnMs + LAUNCH.flyMs + LAUNCH.awayMs;

registerFloorCrit("liftoffCrit", {
  plan(_r, bars, hit, _lift, _crumble, rocket) {
    byHeight(bars).forEach((bar, k) => {
      rocket(bar, igniteAt(k), LAUNCH);
      hit(bar, igniteAt(k) + launchMs(LAUNCH));
    });
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const half = r.moment.barHalfWidth;
    if (ms < LIFTOFF_IN_MS) {
      const p = ms / LIFTOFF_IN_MS;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, LIFTOFF_FONT, p),
        { alpha: 1 - p },
      );
    }
    // a roar and a kick as each one blasts off
    let due = 0;
    for (let k = 0; k < order.length; k++)
      if (ms >= igniteAt(k) + LAUNCH.burnMs) due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(LAUNCH_SHAKE);
      playExplosion();
    }
    for (let k = 0; k < order.length; k++) {
      const bar = order[k];
      const since = ms - igniteAt(k);
      if (since >= 0 && since < flightMs) {
        const tail = {
          x: bars[bar].x - half + launchOffset(LAUNCH, since) * half * 2,
          y: bars[bar].y,
        };
        const roar = since < LAUNCH.burnMs ? BURNING : 1;
        const length =
          (FLAME + FLAME_FLICKER * Math.sin(now * 0.05 + k)) * roar;
        for (let i = 0; i < FLAME_LAYERS; i++) {
          const u = (i + 1) / FLAME_LAYERS;
          const reach = { x: tail.x - length * (1.05 - u), y: tail.y };
          drawBeam(ctx, tail, reach, FLAME_W * roar * u, 0.35);
          drawBeam(ctx, tail, reach, FLAME_CORE * u, 0.4);
        }
        drawMuzzleFlash(ctx, tail, Math.PI, 0.3, FLAME_FLASH * roar);
      }
      drawDetonation(
        ctx,
        along(r, bars, bar, 0.8),
        since - launchMs(LAUNCH),
        BLAST,
        now,
      );
    }
  },
  tailMs: TAIL_MS,
  shake: () => HIT_SHAKE,
});
