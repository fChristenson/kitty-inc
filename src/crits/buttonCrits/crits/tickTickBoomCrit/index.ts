// Tick Tick Boom, a button crit: the number bursts into a time bomb of light
// that lands left of its own button and beeps, each beep a throb, a flash
// and a jolt, closing up faster and faster, every button in view glowing
// brighter on each; then it blows and its blast wave rolls up and down the
// column from its button, quickening, each button it reaches blowing in a
// cluster of blasts and turning over, its own in the biggest blast: each of
// its next taps also levels the floor three above
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  DETONATION_MS,
  drawDetonation,
  drawTimeBomb,
  planTimeBomb,
  tickTimeBomb,
  type TimeBomb,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the bomb flies onto its spot GAP px left of its button over FLY_MS
const FLY_MS = 200;
const ARC = 180;
const GAP = 110;
const BOMB_X = -BTN_W / 2 - GAP;
const BOMB = 64;
// the countdown
const FUSE_MS = 1000;
const BEEPS = 11;
// every button's glow on a beep, brighter with each
const BEEP_MS = 150;
const BEEP_GLOW = BTN_W * 0.62;
const BEEP_SQUASH = (BTN_H / BTN_W) * 1.6;
// the bomb's blast, then its button's LAG_MS later, the wave setting off
// from it and reaching the farthest button WAVE_MS on, quickening
const BOMB_BLAST = 240;
const LAG_MS = 50;
const OWN_BLAST = 420;
const WAVE_MS = 380;
const WAVE_POW = 0.6;
const FRONT = BTN_W * 0.75;
const FRONT_SQUASH = 0.22;
const FRONT_OVER = 60;
const FRONT_FADE_MS = 120;
// each reached button's cluster: CLUSTER glows, CLUSTER_GAP_MS apart (half
// that at the column's ends), each CLUSTER_MS long
const CLUSTER = 5;
const CLUSTER_GAP_MS = 36;
const CLUSTER_MS = 240;
const CLUSTER_SIZE = 90;
const CLUSTER_X = BTN_W * 0.45;
const CLUSTER_Y = BTN_H * 0.55;
// shakes by step: the bomb blowing, a button, its own
const SHAKES = [1.6, 1, 3];

const GOLD = fadeStops(COLOR.heavenlyGold);
const CORE = fadeStops(COLOR.white, 0.35);

interface State {
  bars: Point[];
  bomb: TimeBomb;
  wave: number;
  // how far the column runs above and below its button, and the farther
  up: number;
  down: number;
  reach: number;
  // per button: when the wave reaches it, its cluster's gap and its glows'
  // spots (x, y) from its middle
  arrive: Float32Array;
  gaps: Float32Array;
  offsets: Float32Array;
  flight: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const flightSpot: Point = { x: 0, y: 0 };

// each tap also levelling the open floor three above
const boomTaps = defineTapPerk("Kaboom", (t) => {
  const up = t.floors[t.floors.indexOf(t.floor) + 3];
  if (up?.unlocked) t.levelUp(up, 1, "+1 Lvl");
});

registerFloorCrit("tickTickBoomCrit", {
  reward(t) {
    boomTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const n = bars.length;
    const own = bars[0];
    let up = 0;
    let down = 0;
    for (let i = 1; i < n; i++) {
      const d = bars[i].y - own.y;
      if (-d > up) up = -d;
      if (d > down) down = d;
    }
    const reach = Math.max(1, up, down);
    const bomb = planTimeBomb(IN_MS + FLY_MS, FUSE_MS, BEEPS);
    const wave = bomb.blowMs + LAG_MS;
    const arrive = new Float32Array(n);
    const gaps = new Float32Array(n);
    const offsets = new Float32Array(n * CLUSTER * 2);
    for (let i = 0; i < n; i++) {
      const f = Math.abs(bars[i].y - own.y) / reach;
      arrive[i] = wave + WAVE_MS * f ** WAVE_POW;
      gaps[i] = CLUSTER_GAP_MS * (1 - 0.5 * f);
      for (let j = 0; j < CLUSTER; j++) {
        const o = (i * CLUSTER + j) * 2;
        // the first blast in the middle, the rest scattered round it
        const s = j === 0 ? 0 : 1;
        offsets[o] = (holeHash(o, 4127) - 0.5) * 2 * CLUSTER_X * s;
        offsets[o + 1] = (holeHash(o, 4129) - 0.5) * 2 * CLUSTER_Y * s;
      }
      if (i > 0) hit(i, arrive[i], 1);
    }
    hit(0, bomb.blowMs, 0);
    hit(0, wave, 2);
    const state: State = {
      bars,
      bomb,
      wave,
      up,
      down,
      reach,
      arrive,
      gaps,
      offsets,
      flight: (ms) => {
        if (ms < IN_MS || ms > IN_MS + FLY_MS) return null;
        const u = (ms - IN_MS) / FLY_MS;
        const to = state.bars[0];
        flightSpot.x = (to.x + BOMB_X) * u;
        flightSpot.y = to.y * u - ARC * 4 * u * (1 - u);
        return flightSpot;
      },
    };
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - 0.6 * p), {
        alpha: 1 - p,
      });
    }
    const { bomb, wave, arrive, gaps, offsets } = state;
    const boom = bomb.blowMs;
    tickTimeBomb(bomb, ms, r.shake);
    const own = bars[0];
    spot.x = own.x + BOMB_X;
    spot.y = own.y;
    drawWispBetween(
      ctx,
      state.flight,
      ms,
      now,
      WISP_SIZE * 1.1,
      0.6,
      IN_MS,
      IN_MS + FLY_MS,
    );
    if (ms >= IN_MS + FLY_MS && ms < boom)
      drawTimeBomb(ctx, bomb, spot, ms, now, BOMB);
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    ctx.globalCompositeOperation = "lighter";
    // every button flaring on the last beep, brighter with each
    if (bomb.beeped > 0 && ms < boom) {
      const flash = 1 - (ms - bomb.beeps[bomb.beeped - 1]) / BEEP_MS;
      if (flash > 0) {
        const u = bomb.beeped / bomb.beeps.length;
        ctx.globalAlpha = alpha * flash * (0.2 + 0.6 * u);
        const size = BEEP_GLOW * (1 + 0.15 * flash) * (1 + 0.25 * u);
        for (let i = 0; i < bars.length; i++)
          drawGlow(ctx, GOLD, bars[i].x, bars[i].y, size, BEEP_SQUASH);
      }
    }
    // the wave's fronts rolling up and down the column
    const since = ms - wave;
    if (since >= 0 && since < WAVE_MS + FRONT_FADE_MS) {
      const d = state.reach * Math.min(1, since / WAVE_MS) ** (1 / WAVE_POW);
      const fade = since < WAVE_MS ? 1 : 1 - (since - WAVE_MS) / FRONT_FADE_MS;
      ctx.globalAlpha = alpha * fade;
      if (d <= state.up + FRONT_OVER) {
        drawGlow(ctx, GOLD, own.x, own.y - d, FRONT, FRONT_SQUASH);
        drawGlow(ctx, CORE, own.x, own.y - d, FRONT * 0.5, FRONT_SQUASH);
      }
      if (d <= state.down + FRONT_OVER) {
        drawGlow(ctx, GOLD, own.x, own.y + d, FRONT, FRONT_SQUASH);
        drawGlow(ctx, CORE, own.x, own.y + d, FRONT * 0.5, FRONT_SQUASH);
      }
    }
    // each reached button blowing in a cluster of small blasts
    for (let i = 1; i < bars.length; i++) {
      const from = arrive[i];
      if (ms < from || ms >= from + gaps[i] * CLUSTER + CLUSTER_MS) continue;
      const b = bars[i];
      for (let j = 0; j < CLUSTER; j++) {
        const s = ms - from - j * gaps[i];
        if (s < 0 || s >= CLUSTER_MS) continue;
        const p = s / CLUSTER_MS;
        const o = (i * CLUSTER + j) * 2;
        const x = b.x + offsets[o];
        const y = b.y + offsets[o + 1];
        const size = CLUSTER_SIZE * (j === 0 ? 1.5 : 1);
        ctx.globalAlpha = alpha * (1 - p);
        drawGlow(ctx, GOLD, x, y, size * (0.5 + 0.8 * Math.sqrt(p)));
        drawGlow(ctx, CORE, x, y, size * 0.45 * (1 - p));
      }
    }
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = previous;
    // the only two full blasts: the bomb's and its button's
    drawDetonation(ctx, spot, ms - boom, BOMB_BLAST, now);
    drawDetonation(ctx, own, ms - wave, OWN_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[1],
});
