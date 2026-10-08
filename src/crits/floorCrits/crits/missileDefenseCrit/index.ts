// the missile defense floor crit: meteors streak down at the building and
// the number, down by the street, fires interceptors that blow each one
// apart in mid-air, its debris showering down onto the bars in view
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
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
import { quadratic, holeHash, groundY } from "../../critPlayer/shared";

const DEFENSE_IN_MS = 250;
const DEFENSE_FIRST_MS = DEFENSE_IN_MS + 100;
const DEFENSE_EVERY_MS = 170;
const DEFENSE_METEORS = 5;
// a meteor's whole fall, how far through it it's shot down, and the
// interceptor's flight up to it
const DEFENSE_FALL_MS = 1000;
const DEFENSE_MEETS = 0.55;
const DEFENSE_UP_MS = 340;
const DEFENSE_FONT = 110;
// the launcher: off to the right, by the street (of the viewport's width)
const DEFENSE_SIDE = 0.36;
const DEFENSE_BELOW = 250;
// where the meteors come from: up and right of their bars
const DEFENSE_SKY = 1.3;
const DEFENSE_OFFSET: [number, number] = [600, 800];
const DEFENSE_CURVE = 200;
const DEFENSE_METEOR = 1.8;
const DEFENSE_MISSILE = 0.8;
const DEFENSE_FLASH_MS = 120;
const DEFENSE_FLASH = 120;
const DEFENSE_BLAST = 240;
const DEFENSE_BLAST_SHAKE = 1.4;
// the debris: bits off each blast arcing onto the meteor's bar
const DEFENSE_BITS = 3;
const DEFENSE_BIT_FALL_MS = 260;
const DEFENSE_BIT_EVERY_MS = 60;
const DEFENSE_BIT_ARC = 120;
const DEFENSE_BIT = 0.6;
const DEFENSE_HIT_BLAST = 90;
const DEFENSE_SHAKE = 0.6;
const DEFENSE_TAIL_MS = 900;

const startsAt = (i: number) => DEFENSE_FIRST_MS + i * DEFENSE_EVERY_MS;
const meetsAt = (i: number) => startsAt(i) + DEFENSE_FALL_MS * DEFENSE_MEETS;
const firesAt = (i: number) => meetsAt(i) - DEFENSE_UP_MS;
const bitLandsAt = (i: number, j: number) =>
  meetsAt(i) + DEFENSE_BIT_FALL_MS + j * DEFENSE_BIT_EVERY_MS;

const launcher = (r: Running, bars: Point[]): Point => ({
  x: r.viewportWidth * DEFENSE_SIDE,
  y: groundY(r, bars, DEFENSE_BELOW),
});

// meteor i: its bar, its fall, where it's shot down, and its debris' spots
function meteor(r: Running, bars: Point[], order: number[], i: number) {
  const bar = order[i % order.length];
  const to = along(r, bars, bar, holeHash(i, 2301) * 2 - 1);
  const from = {
    x: to.x + lerp(DEFENSE_OFFSET[0], DEFENSE_OFFSET[1], holeHash(i, 2302)),
    y: -r.viewportWidth * DEFENSE_SKY,
  };
  const at = (t: number): Point => {
    const p = clamp01((t - startsAt(i)) / DEFENSE_FALL_MS);
    return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p) };
  };
  return {
    bar,
    at,
    blast: at(meetsAt(i)),
    bits: Array.from({ length: DEFENSE_BITS }, (_, j) =>
      along(r, bars, bar, holeHash(i * DEFENSE_BITS + j, 2303) * 2 - 1),
    ),
  };
}

registerFloorCrit("missileDefenseCrit", {
  plan(_r, bars, hit) {
    const order = byHeight(bars);
    for (let i = 0; i < DEFENSE_METEORS; i++)
      for (let j = 0; j < DEFENSE_BITS; j++)
        hit(order[i % order.length], bitLandsAt(i, j));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const l = launcher(r, bars);
    if (ms < firesAt(DEFENSE_METEORS - 1) + 200) {
      const p = smoothstep(clamp01(ms / DEFENSE_IN_MS));
      drawText(
        ctx,
        r.glyphs,
        r.label,
        l.x * p,
        l.y * p,
        lerp(r.flashFont, DEFENSE_FONT, p),
      );
    }
    let due = 0;
    for (let i = 0; i < DEFENSE_METEORS; i++) if (ms >= meetsAt(i)) due++;
    while (r.kicked < due) {
      r.kicked++;
      r.shake(DEFENSE_BLAST_SHAKE);
      playExplosion();
    }
    for (let i = 0; i < DEFENSE_METEORS; i++) {
      const m = meteor(r, bars, order, i);
      drawWispBetween(
        ctx,
        m.at,
        ms,
        now,
        WISP_SIZE * DEFENSE_METEOR,
        0.9,
        startsAt(i),
        meetsAt(i),
      );
      drawMuzzleFlash(
        ctx,
        l,
        Math.atan2(m.blast.y - l.y, m.blast.x - l.x),
        (ms - firesAt(i)) / DEFENSE_FLASH_MS,
        DEFENSE_FLASH,
      );
      const pull = {
        x: (l.x + m.blast.x) / 2 + DEFENSE_CURVE,
        y: (l.y + m.blast.y) / 2,
      };
      drawWispBetween(
        ctx,
        (t) =>
          quadratic(
            l,
            pull,
            m.blast,
            clamp01((t - firesAt(i)) / DEFENSE_UP_MS) ** 2,
          ),
        ms,
        now,
        WISP_SIZE * DEFENSE_MISSILE,
        0.7,
        firesAt(i),
        meetsAt(i),
      );
      drawDetonation(ctx, m.blast, ms - meetsAt(i), DEFENSE_BLAST, now);
      m.bits.forEach((to, j) => {
        const lands = bitLandsAt(i, j);
        const falls = lands - DEFENSE_BIT_FALL_MS;
        const lift = {
          x: (m.blast.x + to.x) / 2,
          y: Math.min(m.blast.y, to.y) - DEFENSE_BIT_ARC,
        };
        drawWispBetween(
          ctx,
          (t) =>
            quadratic(
              m.blast,
              lift,
              to,
              clamp01((t - falls) / DEFENSE_BIT_FALL_MS),
            ),
          ms,
          now,
          WISP_SIZE * DEFENSE_BIT,
          0.9,
          falls,
          lands,
        );
        drawDetonation(ctx, to, ms - lands, DEFENSE_HIT_BLAST, now);
      });
    }
  },
  tailMs: DEFENSE_TAIL_MS,
  shake: () => DEFENSE_SHAKE,
});
