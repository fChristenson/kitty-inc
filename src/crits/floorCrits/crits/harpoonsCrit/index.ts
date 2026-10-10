// the harpoons floor crit: the number flies to the screen's side and fires
// harpoons into the bars in view quick-fire, a muzzle flash and a line of
// light trailing each, every one thunking in with a blast; then it yanks
// every line at once: each bar jolts, blasts race back along every line, and
// it reels itself in onto its own bar in a huge blast
import { drawBeam } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const HP_IN_MS = 220;
const HP_SHOTS = 8;
const HP_EVERY_MS = 50;
const HP_FLY_MS = 110;
// the gun: across and up from the middle (of the viewport's width)
const HP_GUN: Point = { x: 0.42, y: -0.1 };
const HP_GUN_SIZE = 1.3;
const HP_TIP_SIZE = 0.6;
const HP_MUZZLE_MS = 90;
const HP_MUZZLE = 170;
const HP_LINE = 7;
const HP_LINE_ALPHA = 0.7;
// the lines thicken as they're yanked taut, then burn out
const HP_TAUT = 2;
const HP_TAUT_MS = 120;
const HP_BURN_MS = 200;
const HP_THUNK = 150;
// the yank: a beat after the last lands, every bar jolting, then blasts
// racing back along each line, a line HP_RUN_STAGGER_MS after the last
const HP_YANK_MS = 160;
const HP_YANK_BLAST = 200;
const HP_YANK_SHAKE = 1.6;
const HP_RUN = [0.25, 0.5, 0.75];
const HP_RUN_MS = 45;
const HP_RUN_STAGGER_MS = 20;
const HP_RUN_BLAST = 120;
const HP_REEL_GAP_MS = 40;
const HP_REEL_MS = 200;
const HP_BOOM = 440;
const HP_CLUSTER = [-0.25, 0.25, -0.5, 0.5];
const HP_CLUSTER_MS = 45;
const HP_CLUSTER_BLAST = 170;
const HP_KICKED_YANK = 1;
const HP_KICKED_BOOM = 1e6;
// shakes by step: a thunk or a yank, the last one
const HP_SHAKES = [0.6, 3];
const HP_TAIL_MS = 1000;

interface Shot {
  bar: number;
  side: number;
  fired: number;
  lands: number;
  // where it sticks, kept on its bar as it scrolls
  at: Point;
  tip: (t: number) => Point;
}
interface Harpoons {
  shots: Shot[];
  yank: number;
  reel: number;
  boom: number;
  // the gun and its own bar this frame
  gun: Point;
  own: Point;
  reeling: (t: number) => Point;
}
const volleys = new WeakMap<Running, Harpoons>();

function planHarpoons(bars: Point[]): Harpoons {
  const order = ownLast(bars);
  const h: Harpoons = {
    shots: [],
    yank: 0,
    reel: 0,
    boom: 0,
    gun: { x: 0, y: 0 },
    own: { x: 0, y: 0 },
    reeling: () => h.gun,
  };
  h.shots = Array.from({ length: HP_SHOTS }, (_, i) => {
    const fired = HP_IN_MS + 20 + i * HP_EVERY_MS;
    const s: Shot = {
      bar: order[i % order.length],
      side: (holeHash(i, 960) * 2 - 1) * 0.75,
      fired,
      lands: fired + HP_FLY_MS,
      at: { x: 0, y: 0 },
      tip: () => s.at,
    };
    s.tip = (t) => {
      const u = clamp01((t - s.fired) / HP_FLY_MS);
      return { x: lerp(h.gun.x, s.at.x, u), y: lerp(h.gun.y, s.at.y, u) };
    };
    return s;
  });
  h.yank = h.shots[HP_SHOTS - 1].lands + HP_YANK_MS;
  h.reel =
    h.yank +
    (HP_SHOTS - 1) * HP_RUN_STAGGER_MS +
    HP_RUN.length * HP_RUN_MS +
    HP_REEL_GAP_MS;
  h.boom = h.reel + HP_REEL_MS;
  h.reeling = (t) => {
    const u = clamp01((t - h.reel) / HP_REEL_MS) ** 2;
    return { x: lerp(h.gun.x, h.own.x, u), y: lerp(h.gun.y, h.own.y, u) };
  };
  return h;
}

registerFloorCrit("harpoonsCrit", {
  plan(r, bars, hit) {
    const h = planHarpoons(bars);
    volleys.set(r, h);
    for (const s of h.shots) {
      hit(s.bar, s.lands, 0);
      hit(s.bar, h.yank, 0);
    }
    hit(0, h.boom, 1);
    HP_CLUSTER.forEach((_, k) => hit(0, h.boom + (k + 1) * HP_CLUSTER_MS, 0));
  },
  draw(ctx, r, ms, bars) {
    const h = volleys.get(r);
    if (!h) return;
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    h.gun.x = w * HP_GUN.x;
    h.gun.y = w * HP_GUN.y;
    h.own.x = bars[0].x;
    h.own.y = bars[0].y;
    for (const s of h.shots) {
      const at = along(r, bars, s.bar, s.side);
      s.at.x = at.x;
      s.at.y = at.y;
    }
    if (ms < HP_IN_MS) {
      const p = (ms / HP_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        h.gun.x * p,
        h.gun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= h.yank && r.kicked < HP_KICKED_YANK) {
      r.kicked = HP_KICKED_YANK;
      r.shake(HP_YANK_SHAKE);
    }
    if (ms >= h.boom && r.kicked < HP_KICKED_BOOM) {
      r.kicked = HP_KICKED_BOOM;
      playExplosion();
    }

    const burn = 1 - clamp01((ms - h.yank - HP_TAUT_MS) / HP_BURN_MS);
    const taut =
      ms >= h.yank ? 1 + HP_TAUT * Math.exp(-(ms - h.yank) / HP_TAUT_MS) : 1;
    for (let i = 0; i < h.shots.length; i++) {
      const s = h.shots[i];
      if (ms >= s.fired && burn > 0)
        drawBeam(ctx, h.gun, s.tip(ms), HP_LINE * taut, HP_LINE_ALPHA * burn);
      drawWispBetween(
        ctx,
        s.tip,
        ms,
        now,
        WISP_SIZE * HP_TIP_SIZE,
        1,
        s.fired,
        h.yank + HP_TAUT_MS,
      );
      drawMuzzleFlash(
        ctx,
        h.gun,
        Math.atan2(s.at.y - h.gun.y, s.at.x - h.gun.x),
        (ms - s.fired) / HP_MUZZLE_MS,
        HP_MUZZLE,
      );
      drawDetonation(ctx, s.at, ms - s.lands, HP_THUNK, now);
      drawDetonation(ctx, s.at, ms - h.yank, HP_YANK_BLAST, now);
      for (let j = 0; j < HP_RUN.length; j++) {
        const since =
          ms - h.yank - HP_RUN_MS - i * HP_RUN_STAGGER_MS - j * HP_RUN_MS;
        if (since < 0 || since >= DETONATION_MS) continue;
        const u = HP_RUN[j];
        drawDetonation(
          ctx,
          { x: lerp(s.at.x, h.gun.x, u), y: lerp(s.at.y, h.gun.y, u) },
          since,
          HP_RUN_BLAST,
          now,
        );
      }
    }
    drawWispBetween(
      ctx,
      h.reeling,
      ms,
      now,
      WISP_SIZE * HP_GUN_SIZE,
      0.6,
      HP_IN_MS,
      h.boom,
    );
    drawDetonation(ctx, bars[0], ms - h.boom, HP_BOOM, now);
    for (let k = 0; k < HP_CLUSTER.length; k++)
      drawDetonation(
        ctx,
        along(r, bars, 0, HP_CLUSTER[k]),
        ms - h.boom - (k + 1) * HP_CLUSTER_MS,
        HP_CLUSTER_BLAST,
        now,
      );
  },
  tailMs: HP_TAIL_MS,
  shake: (step) => HP_SHAKES[step] ?? HP_SHAKES[0],
});
