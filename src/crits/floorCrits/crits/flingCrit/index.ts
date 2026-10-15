// Fling, a floor crit: twin rings open, one flat just under the lowest bar
// in view, its twin just over the highest; the number trembles, drops as a
// wisp into the bottom ring and falls out of the top one at once with its
// speed, down through every bar (each one a hit) and in again, gravity
// adding speed every fall, the rings flaring and the whoosh rising, the last
// fall a blur; then the top ring snaps round to the left end of its own bar,
// turned sideways, and the wisp shoots out of it flat along the bar into the
// readout end in the biggest blast
import {
  drawPortal,
  drawPortalPass,
  portalLook,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { groundY, skyY } from "../../critPlayer/shared";

// the number trembling and shrinking till DROP_MS, the rings opening from
// OPEN_AT over OPEN_MS
const DROP_MS = 300;
const TREMBLE = 10;
const OPEN_AT = 40;
const OPEN_MS = 200;
const SHRINK = 0.45;
// the rings ABOVE the top bar and BELOW the lowest, RING px to the rim,
// GROW bigger each pass and flaring FLARE over FLARE_MS on it
const ABOVE = 150;
const BELOW = 150;
const RING = 120;
const GROW = 0.1;
const FLARE = 0.6;
const FLARE_MS = 180;
const CLOSE_MS = 160;
const BOTTOM_LOOK = 4;
const TOP_LOOK = 1;
// the drop into the bottom ring: INTRO_MS at most, at least MIN_DROP px
const INTRO_MS = 200;
const MIN_DROP = 200;
// the falls, each FALL_MS, entering at SPEED[k] ring gaps a ms and leaving
// at SPEED[k + 1]: whatever comes out of a ring keeps the speed it went in at
const FALL_MS = [300, 200, 130, 80];
const FIRST_SPEED = 0.003;
const SPEED = [FIRST_SPEED];
for (let k = 0; k < FALL_MS.length; k++) SPEED.push(2 / FALL_MS[k] - SPEED[k]);
const FALLS = FALL_MS.length;
// the top ring snapping round beside its own bar's left end over SNAP_MS,
// SIDE px off it, kept on screen; the shot slams READ px short of the end
const SNAP_MS = 70;
const SIDE = 70;
const EDGE = 60;
const READ = 120;
const MIN_SHOT_MS = 50;
const WISP = WISP_SIZE * 1.2;
const WISP_GROW = WISP_SIZE * 1.1;
// a bar's flash as the wisp falls through, wider each fall
const HIT_MS = 160;
const HIT_GLOW: [number, number] = [200, 320];
const HIT_SQUASH = 0.35;
const PASS_SHAKE: [number, number] = [0.3, 1.1];
const END_BLAST = 340;
// shakes by step: a bar it falls through, the slam
const SHAKES = [0.4, 3];

const INTRO = 0;
const FALL = 1;
const SHOT = 2;
interface Leg {
  kind: number;
  startMs: number;
  ms: number;
  // its speed going in, as a share of its average: it speeds up evenly to
  // 2 - a0 by its end
  a0: number;
}
interface Hit {
  bar: number;
  at: number;
  fall: number;
}
interface State {
  legs: Leg[];
  hits: Hit[];
  // when it dives into the bottom ring (and out of the top), the last into
  // the sideways one
  passes: number[];
  shotMs: number;
  endMs: number;
  runner: (ms: number) => Point | null;
  // the spots this frame, so a scroll carries everything along
  colX: number;
  topY: number;
  bottomY: number;
  startY: number;
  sideX: number;
  ownY: number;
  readX: number;
}
const states = new WeakMap<Running, State>();
const WHITE = glowStops(COLOR.white);
const ORIGIN: Point = { x: 0, y: 0 };
const bottomRing: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };
const slam: Point = { x: 0, y: 0 };

function place(s: State, r: Running, bars: Point[]): void {
  const half = r.play.barHalfWidth;
  s.colX = bars[0].x;
  s.topY = skyY(r, bars, ABOVE);
  s.bottomY = groundY(r, bars, BELOW);
  s.startY = Math.min(0, s.bottomY - MIN_DROP);
  s.sideX = Math.max(bars[0].x - half - SIDE, -r.viewportWidth / 2 + EDGE);
  s.ownY = bars[0].y;
  s.readX = bars[0].x + half - READ;
}

// the share of a leg run by `t` of its time
const run = (a0: number, t: number) => a0 * t + (1 - a0) * t * t;
// the time a leg reaches share g of its run
function timeAt(a0: number, g: number): number {
  const b = 1 - a0;
  if (b < 1e-6) return g / a0;
  return (-a0 + Math.sqrt(a0 * a0 + 4 * b * g)) / (2 * b);
}

registerFloorCrit("flingCrit", {
  // it falls through each bar FALLS times
  levels: (count) => Math.ceil(count / FALLS),
  plan(r, bars, hit) {
    const s: State = {
      legs: [],
      hits: [],
      passes: [],
      shotMs: 0,
      endMs: 0,
      runner: () => null,
      colX: 0,
      topY: 0,
      bottomY: 0,
      startY: 0,
      sideX: 0,
      ownY: 0,
      readX: 0,
    };
    place(s, r, bars);
    const gap = Math.max(1, s.bottomY - s.topY);
    // the drop from the number into the bottom ring, landing at SPEED[0]
    const drop = (s.bottomY - s.startY) / gap;
    const end = SPEED[0];
    const start = Math.min(end, Math.max(0, (2 * drop) / INTRO_MS - end));
    const introMs = (2 * drop) / (start + end);
    let t = DROP_MS;
    s.legs.push({
      kind: INTRO,
      startMs: t,
      ms: introMs,
      a0: (start * introMs) / drop,
    });
    for (let i = 0; i < bars.length; i++) {
      const g = (bars[i].y - s.startY) / (s.bottomY - s.startY);
      if (g > 0 && g < 1)
        s.hits.push({
          bar: i,
          at: t + introMs * timeAt(s.legs[0].a0, g),
          fall: 0,
        });
    }
    t += introMs;
    s.passes.push(t);
    for (let k = 0; k < FALLS; k++) {
      const leg: Leg = {
        kind: FALL,
        startMs: t,
        ms: FALL_MS[k],
        a0: SPEED[k] * FALL_MS[k],
      };
      s.legs.push(leg);
      for (let i = 0; i < bars.length; i++)
        s.hits.push({
          bar: i,
          at: t + leg.ms * timeAt(leg.a0, clamp01((bars[i].y - s.topY) / gap)),
          fall: (k + 1) / FALLS,
        });
      t += leg.ms;
      s.passes.push(t);
    }
    // out of the sideways ring along its own bar, flat out
    s.shotMs = t;
    const shotMs = Math.max(
      MIN_SHOT_MS,
      (s.readX - s.sideX) / (SPEED[FALLS] * gap),
    );
    s.legs.push({ kind: SHOT, startMs: t, ms: shotMs, a0: 1 });
    s.endMs = t + shotMs;
    for (const h of s.hits) hit(h.bar, h.at);
    hit(0, s.endMs, 1);
    s.runner = (ms) => {
      const legs = s.legs;
      if (ms < legs[0].startMs) return null;
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (ms > leg.startMs + leg.ms) continue;
        const u = clamp01((ms - leg.startMs) / leg.ms);
        const g = run(leg.a0, u);
        if (leg.kind === INTRO) {
          spot.x = s.colX * u;
          spot.y = lerp(s.startY, s.bottomY, g);
        } else if (leg.kind === FALL) {
          spot.x = s.colX;
          spot.y = lerp(s.topY, s.bottomY, g);
        } else {
          spot.x = lerp(s.sideX, s.readX, g);
          spot.y = s.ownY;
        }
        return spot;
      }
      return null;
    };
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    place(s, r, bars);
    const now = r.startedAt + ms;
    // the number trembling harder as it shrinks, then gone into the wisp
    if (ms < DROP_MS) {
      const p = ms / DROP_MS;
      const shiver = TREMBLE * p;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        Math.sin(ms * 0.11) * shiver,
        Math.cos(ms * 0.13) * shiver,
        r.flashFont * lerp(1, SHRINK, p * p),
        { alpha: 1 - clamp01((ms - DROP_MS * 0.7) / (DROP_MS * 0.3)) },
      );
    }
    // a whoosh and a jolt at every pass, harder each, the slam's bang
    const passes = s.passes;
    while (r.kicked < passes.length && ms >= passes[r.kicked]) {
      r.shake(
        lerp(PASS_SHAKE[0], PASS_SHAKE[1], r.kicked / (passes.length - 1)),
      );
      playSwoosh();
      r.kicked++;
    }
    if (r.kicked === passes.length && ms >= s.endMs) {
      playExplosion();
      r.kicked++;
    }
    let done = 0;
    let since = Infinity;
    for (let k = 0; k < passes.length; k++)
      if (ms >= passes[k]) {
        done++;
        since = ms - passes[k];
      }
    const size =
      RING * (1 + GROW * done) * (1 + FLARE * (1 - clamp01(since / FLARE_MS)));
    const opening = clamp01((ms - OPEN_AT) / OPEN_MS);
    const bottomOpen =
      opening * (1 - clamp01((ms - s.shotMs - FLARE_MS) / CLOSE_MS));
    const topOpen = opening * (1 - clamp01((ms - s.endMs) / CLOSE_MS));
    bottomRing.x = s.colX;
    bottomRing.y = s.bottomY;
    if (bottomOpen > 0)
      drawPortal(
        ctx,
        bottomRing,
        size,
        bottomOpen,
        now,
        1,
        portalLook(BOTTOM_LOOK),
      );
    // the top ring, snapping round beside its own bar as the last fall leaves it
    const snap = clamp01((ms - s.legs[FALLS].startMs) / SNAP_MS);
    const turn = 1 - (1 - snap) * (1 - snap);
    ctx.save();
    ctx.translate(lerp(s.colX, s.sideX, turn), lerp(s.topY, s.ownY, turn));
    ctx.rotate((Math.PI / 2) * turn);
    if (topOpen > 0)
      drawPortal(ctx, ORIGIN, size, topOpen, now, 1, portalLook(TOP_LOOK));
    for (let k = 0; k < passes.length; k++)
      drawPortalPass(ctx, ORIGIN, ms - passes[k], size);
    ctx.restore();
    for (let k = 0; k < passes.length; k++)
      drawPortalPass(ctx, bottomRing, ms - passes[k], size);
    // each bar flashing as it's fallen through
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    const hits = s.hits;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const age = ms - h.at;
      if (age < 0 || age >= HIT_MS) continue;
      ctx.globalAlpha = 1 - age / HIT_MS;
      drawGlow(
        ctx,
        WHITE,
        s.colX,
        bars[h.bar].y,
        lerp(HIT_GLOW[0], HIT_GLOW[1], h.fall),
        HIT_SQUASH,
      );
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    const u = clamp01((ms - DROP_MS) / (s.endMs - DROP_MS));
    drawWispBetween(
      ctx,
      s.runner,
      ms,
      now,
      WISP + WISP_GROW * u,
      u,
      DROP_MS,
      s.endMs,
    );
    slam.x = s.readX;
    slam.y = s.ownY;
    drawDetonation(ctx, slam, ms - s.endMs, END_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
