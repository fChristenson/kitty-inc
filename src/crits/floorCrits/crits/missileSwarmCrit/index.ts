// the missile swarm floor crit: the number fires a fan of missiles that
// climb, curl over in long loops and dive onto the bars in view one after
// another in a rolling string of blasts
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { cubic } from "../../../../shared/curves";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

const MISSILE_IN_MS = 250;
const MISSILE_EVERY_MS = 70;
const MISSILE_FLY_MS = 750;
const MISSILE_EASE = 1.4;
const MISSILE_PER_BAR = 2;
const MISSILE_LEAST = 6;
const MISSILE_FONT = 130;
const MISSILE_JITTER = 12;
const MISSILE_FADE_MS = 200;
// the fan they launch in (rad wide), how far they climb, and how high over
// their bar they curl over from
const MISSILE_FAN = 1.6;
const MISSILE_CLIMB = 600;
const MISSILE_DIVE = 700;
const MISSILE_SWAY = 400;
const MISSILE_FLASH_MS = 120;
const MISSILE_FLASH = 130;
const MISSILE_SIZE = 0.9;
const MISSILE_LAUNCH_SHAKE = 0.3;
const MISSILE_BLAST = 160;
const MISSILE_SHAKE = 0.9;
const MISSILE_TAIL_MS = 900;

const LAUNCH: Point = { x: 0, y: 0 };
const countOf = (bars: number) =>
  Math.max(MISSILE_LEAST, MISSILE_PER_BAR * bars);
const launchesAt = (i: number) => MISSILE_IN_MS + i * MISSILE_EVERY_MS;
const angleOf = (i: number, count: number) =>
  -Math.PI / 2 + (i / Math.max(1, count - 1) - 0.5) * MISSILE_FAN;

// missile i: its bar, where on it it lands, and its flight there
function missile(r: Running, bars: Point[], order: number[], i: number) {
  const count = countOf(bars.length);
  const bar = order[i % order.length];
  const to = along(r, bars, bar, holeHash(i, 1701) * 2 - 1);
  const a = angleOf(i, count);
  const climb = {
    x: Math.cos(a) * MISSILE_CLIMB,
    y: Math.sin(a) * MISSILE_CLIMB,
  };
  const dive = {
    x: to.x + (holeHash(i, 1702) - 0.5) * MISSILE_SWAY,
    y: to.y - MISSILE_DIVE,
  };
  return {
    bar,
    to,
    a,
    at: (t: number): Point =>
      cubic(
        LAUNCH,
        climb,
        dive,
        to,
        clamp01((t - launchesAt(i)) / MISSILE_FLY_MS) ** MISSILE_EASE,
        { x: 0, y: 0 },
      ),
  };
}

registerFloorCrit("missileSwarmCrit", {
  plan(r, bars, hit) {
    const order = byHeight(bars);
    for (let i = 0; i < countOf(bars.length); i++)
      hit(missile(r, bars, order, i).bar, launchesAt(i) + MISSILE_FLY_MS);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const count = countOf(bars.length);
    const lastLaunch = launchesAt(count - 1);
    if (ms < lastLaunch + MISSILE_FADE_MS) {
      const shrink = clamp01(ms / MISSILE_IN_MS);
      const jitter =
        ms >= MISSILE_IN_MS
          ? (holeHash(Math.floor(ms / 20), 11) - 0.5) * MISSILE_JITTER
          : 0;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        jitter,
        0,
        lerp(r.flashFont, MISSILE_FONT, shrink),
        {
          alpha: ms > lastLaunch ? 1 - (ms - lastLaunch) / MISSILE_FADE_MS : 1,
        },
      );
    }
    let due = 0;
    for (let i = 0; i < count; i++) if (ms >= launchesAt(i)) due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(MISSILE_LAUNCH_SHAKE);
    }
    for (let i = 0; i < count; i++) {
      const m = missile(r, bars, order, i);
      const launch = launchesAt(i);
      drawMuzzleFlash(
        ctx,
        LAUNCH,
        m.a,
        (ms - launch) / MISSILE_FLASH_MS,
        MISSILE_FLASH,
      );
      drawWispBetween(
        ctx,
        m.at,
        ms,
        now,
        WISP_SIZE * MISSILE_SIZE,
        0.8,
        launch,
        launch + MISSILE_FLY_MS,
      );
      drawDetonation(
        ctx,
        m.to,
        ms - launch - MISSILE_FLY_MS,
        MISSILE_BLAST,
        now,
      );
    }
  },
  tailMs: MISSILE_TAIL_MS,
  shake: () => MISSILE_SHAKE,
});
