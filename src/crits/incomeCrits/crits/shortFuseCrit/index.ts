// Short Fuse, an income crit: the green amount drops under the total and
// swells into a lit bomb, throbbing; every throb spits a fireball straight
// up into the readout in a blast and a share, the throbs closing up faster
// and faster, the bomb swelling, trembling and burning brighter; then it
// rockets up into the total itself and blows: the finale
import {
  DETONATION_MS,
  drawDetonation,
  drawLitFuse,
} from "../../../../shared/animationStyles/explosion";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale, readoutSpot } from "../shared";

// the bomb BOMB px under the total, the amount dropping there over DROP_MS,
// swelling SWELL and trembling up to TREMBLE px as it burns down
const DROP_MS = 150;
const BOMB = 480;
const SIZE = WISP_SIZE * 1.4;
const SWELL = 0.8;
const TREMBLE = 14;
const FUSE = 120;
// the throbs: THROBS from FIRST_MS, GAPS_MS apart (closing), each spitting a
// fireball up over SPIT_MS; a throb's own pop THROB
const FIRST_MS = DROP_MS + 180;
const THROBS = 10;
const GAPS_MS: [number, number] = [230, 55];
const SPIT_MS = 90;
const FIREBALL = WISP_SIZE * 0.9;
const THROB = 90;
const BLAST: [number, number] = [110, 190];
// the bomb rocketing up into the total over UP_MS, UP_GAP_MS after the last
const UP_GAP_MS = 120;
const UP_MS = 110;
// shakes by step: a fireball in, the finale
const SHAKES = [0.7, 2.8];

interface State {
  throbs: number[];
  spots: Point[];
  fireballs: ((ms: number) => Point)[];
  upAt: number;
  endMs: number;
  rocket: (ms: number) => Point;
}
const states = new WeakMap<Running, State>();
const BOMB_AT: Point = { x: 0, y: BOMB };
const bomb: Point = { x: 0, y: 0 };
const atBomb = () => bomb;
const shiver: Point = { x: 0, y: 0 };

registerFloorCrit("shortFuseCrit", {
  plan(r, _bars, hit) {
    const throbs: number[] = [];
    let t = FIRST_MS;
    for (let k = 0; k < THROBS; k++) {
      throbs.push(t);
      hit(0, t + SPIT_MS);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / (THROBS - 1));
    }
    const upAt = throbs[THROBS - 1] + UP_GAP_MS;
    const endMs = upAt + UP_MS;
    hit(0, endMs, 1);
    const spots = throbs.map((_, k) => readoutSpot({ x: 0, y: 0 }, k, 5510));
    const fireballs = throbs.map((at, k) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const u = clamp01((ms - at) / SPIT_MS);
        p.x = lerp(0, spots[k].x, u);
        p.y = lerp(BOMB, spots[k].y, u);
        return p;
      };
    });
    const up: Point = { x: 0, y: 0 };
    states.set(r, {
      throbs,
      spots,
      fireballs,
      upAt,
      endMs,
      rocket: (ms) => {
        up.y = BOMB * (1 - clamp01((ms - upAt) / UP_MS) ** 2);
        return up;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { throbs, spots, fireballs, upAt, endMs } = state;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y + BOMB, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    // the bomb burning down: swelling, trembling, throbbing faster
    if (ms >= DROP_MS && ms < upAt) {
      const burn = clamp01((ms - DROP_MS) / (upAt - DROP_MS));
      trembleAt(burn, ms, TREMBLE, shiver);
      bomb.x = BOMB_AT.x + shiver.x;
      bomb.y = BOMB_AT.y + shiver.y;
      drawLitFuse(ctx, bomb, burn, FUSE * (1 + SWELL * burn), now);
      drawWispHead(ctx, atBomb, ms, now, SIZE * (1 + SWELL * burn), burn);
    }
    for (let k = 0; k < throbs.length; k++) {
      drawDetonation(ctx, BOMB_AT, ms - throbs[k], THROB, now);
      drawWispBetween(
        ctx,
        fireballs[k],
        ms,
        now,
        FIREBALL,
        1,
        throbs[k],
        throbs[k] + SPIT_MS,
      );
      drawDetonation(
        ctx,
        spots[k],
        ms - throbs[k] - SPIT_MS,
        lerp(BLAST[0], BLAST[1], k / (throbs.length - 1)),
        now,
      );
    }
    drawWispBetween(
      ctx,
      state.rocket,
      ms,
      now,
      SIZE * (1 + SWELL),
      1,
      upAt,
      endMs,
    );
    ctx.restore();
    drawFinale(ctx, to, ms - endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
