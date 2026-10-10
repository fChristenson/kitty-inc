// the mortars income crit: the number splits into five wisps manning a row
// of mortar tubes along the bottom of the screen; they thump shells up off
// the top of the screen, quicker and quicker, each dropping back down onto
// the total; then all five fire at once and the volley comes down
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { smoothstep } from "../../../../shared/easing";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { quadratic } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const MAN_MS = 200;
const TUBES = 5;
const SHELLS = 15;
const GAP_MS: [number, number] = [65, 38];
const FLY_MS = 520;
const VOLLEY_DELAY_MS = 160;
// later tubes' volley shells land this much later, so the volley rattles in
const VOLLEY_STAGGER_MS = 30;
// the tubes: spread across this share of the screen, up from its bottom
// (the bottom as far under the middle as this share of the total's height
// over it); the shells' top, off the top of the screen over the total
const TUBE_SPREAD = 0.36;
const BOTTOM = 0.75;
const TUBE_UP = 90;
const APEX = 250;
const VOLLEY_GAP = 150;
const MAN_LIFT = 120;
const FLASH_MS = 90;
const FLASH = 130;
const VOLLEY_FLASH_MS = 120;
const VOLLEY_FLASH = 200;
const CREW = WISP_SIZE;
const CREW_HEAT = 0.7;
const SHELL = WISP_SIZE * 0.8;
const VOLLEY_SHELL = WISP_SIZE * 1.1;
const SHELL_BLAST = 180;
const VOLLEY_BLAST = 220;
const LAUNCH_KICK = 0.3;
const VOLLEY_KICK = 1.2;
// shakes by step: a shell, a volley shell, the last
const SHAKES = [0.7, 1.2, 2.4];

interface Shell {
  at: number;
  land: number;
  tube: number;
  to: Point;
  path: (ms: number) => Point;
}
interface Battery {
  tubes: Point[];
  crews: ((ms: number) => Point)[];
  shells: Shell[];
  volley: Shell[];
  volleyAt: number;
  // every launch, in time order, for the thumps
  launches: number[];
  endAt: number;
}
const batteries = new WeakMap<Running, Battery>();

// lobbed from `from` up to the apex and down onto `to`
function lob(from: Point, to: Point, apexY: number, at: number, land: number) {
  const pull = { x: (from.x + to.x) / 2, y: (4 * apexY - from.y - to.y) / 2 };
  return (ms: number) =>
    quadratic(from, pull, to, clamp01((ms - at) / (land - at)));
}

function planBattery(to: Point, viewportWidth: number): Battery {
  const y = -to.y * BOTTOM - TUBE_UP;
  const apex = to.y - APEX;
  const origin = { x: 0, y: 0 };
  const tubes: Point[] = [];
  for (let k = 0; k < TUBES; k++)
    tubes.push({
      x: lerp(-TUBE_SPREAD, TUBE_SPREAD, k / (TUBES - 1)) * viewportWidth,
      y,
    });
  const crews = tubes.map((tube) => {
    const pull = { x: tube.x / 2, y: -MAN_LIFT * 2 };
    return (ms: number) =>
      quadratic(origin, pull, tube, smoothstep(clamp01(ms / MAN_MS)));
  });
  const shells: Shell[] = [];
  const launches: number[] = [];
  let at = MAN_MS;
  for (let k = 0; k < SHELLS; k++) {
    const tube = k % TUBES;
    const spot = readoutSpot(to, k, 191);
    const land = at + FLY_MS;
    shells.push({
      at,
      land,
      tube,
      to: spot,
      path: lob(tubes[tube], spot, apex, at, land),
    });
    launches.push(at);
    at += lerp(GAP_MS[0], GAP_MS[1], k / (SHELLS - 1));
  }
  const volleyAt = shells[SHELLS - 1].at + VOLLEY_DELAY_MS;
  launches.push(volleyAt);
  const volley = tubes.map((tube, k) => {
    const spot = { x: to.x + (k - (TUBES - 1) / 2) * VOLLEY_GAP, y: to.y };
    const land = volleyAt + FLY_MS + k * VOLLEY_STAGGER_MS;
    return {
      at: volleyAt,
      land,
      tube: k,
      to: spot,
      path: lob(tube, spot, apex, volleyAt, land),
    };
  });
  return {
    tubes,
    crews,
    shells,
    volley,
    volleyAt,
    launches,
    endAt: volley[TUBES - 1].land,
  };
}

registerFloorCrit("mortarsCrit", {
  plan(r, bars, hit) {
    const battery = planBattery(bars[0], r.viewportWidth);
    batteries.set(r, battery);
    for (const shell of battery.shells) hit(0, shell.land);
    const { volley } = battery;
    for (let k = 0; k < volley.length; k++)
      hit(0, volley[k].land, k === volley.length - 1 ? 2 : 1);
  },
  draw(ctx, r, ms, bars) {
    const battery = batteries.get(r);
    if (!battery) return;
    const now = r.startedAt + ms;
    const { tubes, shells, volley, volleyAt, launches } = battery;
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < launches.length && ms >= launches[r.kicked]) {
      r.shake(r.kicked === launches.length - 1 ? VOLLEY_KICK : LAUNCH_KICK);
      r.kicked++;
    }
    for (let k = 0; k < battery.crews.length; k++)
      drawWispBetween(
        ctx,
        battery.crews[k],
        ms,
        now,
        CREW,
        CREW_HEAT,
        0,
        volleyAt + 100,
      );
    for (let k = 0; k < shells.length; k++) {
      const shell = shells[k];
      drawMuzzleFlash(
        ctx,
        tubes[shell.tube],
        -Math.PI / 2,
        (ms - shell.at) / FLASH_MS,
        FLASH,
      );
      drawWispBetween(ctx, shell.path, ms, now, SHELL, 1, shell.at, shell.land);
      drawDetonation(ctx, shell.to, ms - shell.land, SHELL_BLAST, now);
    }
    const last = volley.length - 1;
    for (let k = 0; k <= last; k++) {
      const shell = volley[k];
      drawMuzzleFlash(
        ctx,
        tubes[k],
        -Math.PI / 2,
        (ms - volleyAt) / VOLLEY_FLASH_MS,
        VOLLEY_FLASH,
      );
      drawWispBetween(
        ctx,
        shell.path,
        ms,
        now,
        VOLLEY_SHELL,
        1,
        shell.at,
        shell.land,
      );
      if (k < last)
        drawDetonation(ctx, shell.to, ms - shell.land, VOLLEY_BLAST, now);
    }
    drawFinale(ctx, bars[0], ms - battery.endAt, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
