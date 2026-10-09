// the solar flare floor crit: the number flies up into a sun blazing over the
// roof, which lashes the bars in view with loops of flare, each whipping down
// onto a bar in a run of blasts, quicker and quicker; then it hurls one fat
// beam of flare straight down onto its own bar and a huge blast
import { COLOR } from "../../../../palette";
import { drawBeam } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";
import { holeHash, otherBars, quadratic, skyY } from "../../critPlayer/shared";

const SF_IN_MS = 220;
const SF_FIRST_MS = SF_IN_MS + 80;
const SF_LASHES = 9;
// the gaps between lashes, quickening
const SF_GAP: [number, number] = [120, 60];
const SF_GROW_MS = 90;
const SF_HOLD_MS = 90;
const SF_FADE_MS = 120;
// the sun over the top bar, its glow and wisp (of the viewport's width),
// and where a lash leaves it and how wide it loops
const SF_ABOVE = 500;
const SF_GLOW = 0.42;
const SF_GLOW_PULSE = 0.03;
const SF_SUN = 4;
const SF_LASH_FROM: Point = { x: 0.1, y: 0.08 };
const SF_LOOP = 0.4;
const SF_LASH = 40;
const SF_SEGMENTS = 14;
// each lash's run of blasts along its bar
const SF_RUN = 3;
const SF_RUN_SPREAD = 0.15;
const SF_EVERY_MS = 45;
const SF_BLAST = 130;
// the fat beam onto its own bar, then a run along it and a huge blast
const SF_BEAM_AT_MS = 120;
const SF_BEAM_GROW_MS = 80;
const SF_BEAM_FADE_MS = 180;
const SF_BEAM = 160;
const SF_LAND_BLAST = 200;
const SF_OWN_RUN = 5;
const SF_OWN_BLAST = 170;
const SF_BOOM = 440;
const SF_FADE_SUN_MS = 300;
const SF_KICKED_BOOM = 1e6;
// shakes by step: a blast, the last one
const SF_SHAKES = [0.5, 3];
const SF_TAIL_MS = 1000;

interface Lash {
  bar: number;
  side: number;
  // which way it loops out, and when it whips down
  turn: number;
  at: number;
}
interface Flare {
  lashes: Lash[];
  beam: number;
  boom: number;
}
const flares = new WeakMap<Running, Flare>();

const landAt = (lash: Lash) => lash.at + SF_GROW_MS;
const runSide = (lash: Lash, j: number) =>
  lash.side + (j - 1) * SF_RUN_SPREAD * lash.turn;

function planFlare(bars: Point[]): Flare {
  const others = otherBars(bars);
  const lashes: Lash[] = [];
  let at = SF_FIRST_MS;
  for (let i = 0; i < SF_LASHES; i++) {
    lashes.push({
      bar: others[Math.floor(holeHash(i, 870) * others.length)],
      side: (holeHash(i, 871) * 2 - 1) * 0.8,
      turn: i % 2 ? 1 : -1,
      at,
    });
    at += lerp(...SF_GAP, i / (SF_LASHES - 1));
  }
  const beam =
    landAt(lashes[SF_LASHES - 1]) + (SF_RUN - 1) * SF_EVERY_MS + SF_BEAM_AT_MS;
  return {
    lashes,
    beam,
    boom: beam + SF_BEAM_GROW_MS + SF_OWN_RUN * SF_EVERY_MS,
  };
}

registerFloorCrit("solarFlareCrit", {
  plan(r, bars, hit) {
    const f = planFlare(bars);
    flares.set(r, f);
    for (const lash of f.lashes)
      for (let j = 0; j < SF_RUN; j++)
        hit(lash.bar, landAt(lash) + j * SF_EVERY_MS, 0);
    const land = f.beam + SF_BEAM_GROW_MS;
    for (let j = 0; j < SF_OWN_RUN; j++) hit(0, land + j * SF_EVERY_MS, 0);
    hit(0, f.boom, 1);
  },
  draw(ctx, r, ms, bars) {
    const f = flares.get(r);
    if (!f) return;
    const now = r.startedAt + ms;
    const w = r.viewportWidth;
    const sun = { x: 0, y: skyY(r, bars, SF_ABOVE) };
    if (ms < SF_IN_MS) {
      const p = (ms / SF_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        sun.x * p,
        sun.y * p,
        lerp(r.flashFont, 0, p),
      );
    }
    if (ms >= f.boom && r.kicked < SF_KICKED_BOOM) {
      r.kicked = SF_KICKED_BOOM;
      playExplosion();
    }

    // the sun, fading once its beam has landed
    const shine = 1 - clamp01((ms - f.beam) / SF_FADE_SUN_MS);
    if (ms >= SF_IN_MS && shine > 0) {
      const grow = clamp01((ms - SF_IN_MS) / SF_GROW_MS);
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = shine;
      drawGlow(
        ctx,
        glowStops(COLOR.heavenlyGold),
        sun.x,
        sun.y,
        w * (SF_GLOW + SF_GLOW_PULSE * Math.sin(ms * 0.03)) * grow,
      );
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = previous;
      drawWisp(ctx, () => sun, ms, now, WISP_SIZE * SF_SUN * shine * grow, 1);
    }

    // the lashes whipping down onto the bars
    for (const lash of f.lashes) {
      const t = ms - lash.at;
      if (t < 0 || t > SF_GROW_MS + SF_HOLD_MS + SF_FADE_MS) continue;
      const to = along(r, bars, lash.bar, lash.side);
      const from = {
        x: sun.x + lash.turn * w * SF_LASH_FROM.x,
        y: sun.y + w * SF_LASH_FROM.y,
      };
      const pull = {
        x: (from.x + to.x) / 2 + lash.turn * w * SF_LOOP,
        y: (from.y + to.y) / 2,
      };
      const grown = clamp01(t / SF_GROW_MS);
      const fade =
        t < SF_GROW_MS + SF_HOLD_MS
          ? 1
          : 1 - (t - SF_GROW_MS - SF_HOLD_MS) / SF_FADE_MS;
      let a = from;
      for (let i = 1; i <= SF_SEGMENTS * grown; i++) {
        const b = quadratic(from, pull, to, Math.min(grown, i / SF_SEGMENTS));
        drawBeam(ctx, a, b, SF_LASH, fade);
        a = b;
      }
    }

    // the fat beam onto its own bar
    const bt = ms - f.beam;
    if (bt >= 0 && bt < SF_BEAM_GROW_MS + SF_BEAM_FADE_MS) {
      const grown = clamp01(bt / SF_BEAM_GROW_MS);
      drawBeam(
        ctx,
        sun,
        { x: lerp(sun.x, bars[0].x, grown), y: lerp(sun.y, bars[0].y, grown) },
        SF_BEAM,
        1 - clamp01((bt - SF_BEAM_GROW_MS) / SF_BEAM_FADE_MS),
      );
    }

    for (const lash of f.lashes)
      for (let j = 0; j < SF_RUN; j++)
        drawDetonation(
          ctx,
          along(r, bars, lash.bar, runSide(lash, j)),
          ms - landAt(lash) - j * SF_EVERY_MS,
          SF_BLAST,
          now,
        );
    const land = f.beam + SF_BEAM_GROW_MS;
    drawDetonation(ctx, bars[0], ms - land, SF_LAND_BLAST, now);
    for (let j = 0; j < SF_OWN_RUN; j++)
      drawDetonation(
        ctx,
        along(r, bars, 0, (j / (SF_OWN_RUN - 1)) * 2 - 1),
        ms - land - j * SF_EVERY_MS,
        SF_OWN_BLAST,
        now,
      );
    drawDetonation(ctx, bars[0], ms - f.boom, SF_BOOM, now);
  },
  tailMs: SF_TAIL_MS,
  shake: (step) => SF_SHAKES[step] ?? SF_SHAKES[0],
});
