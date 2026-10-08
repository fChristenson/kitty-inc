// the artillery barrage floor crit: the number dives off the edge and shells
// come whistling in from off it in high arcs, the barrage walking up the
// building bar by bar, then one last huge salvo on every bar in view
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
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

const BARRAGE_IN_MS = 250;
const BARRAGE_FIRST_MS = BARRAGE_IN_MS + 300;
const BARRAGE_FLIGHT_MS = 520;
const BARRAGE_PER_BAR = 3;
const BARRAGE_EVERY_MS = 110;
// each bar's shells come a little quicker than the last bar's
const BARRAGE_QUICKEN_MS = 15;
const BARRAGE_SALVO_GAP_MS = 300;
const BARRAGE_SALVO_EVERY_MS = 25;
const BARRAGE_FONT = 120;
// the guns: off the left edge, down by the street (of the viewport's width)
const BARRAGE_SIDE = 0.75;
const BARRAGE_ARC = 900;
const BARRAGE_SHELL = 0.9;
const BARRAGE_BIG_SHELL = 1.3;
const BARRAGE_BLAST = 120;
const BARRAGE_SALVO_BLAST = 260;
const BARRAGE_SHAKE = 0.6;
const BARRAGE_SALVO_SHAKE = 1.2;
const BARRAGE_SALVO_KICK = 2;
const BARRAGE_TAIL_MS = 1100;

// shell j onto the k-th bar from the bottom, then each bar's salvo shell
const landsAt = (k: number, j: number) =>
  BARRAGE_FIRST_MS +
  (k * BARRAGE_PER_BAR + j) * BARRAGE_EVERY_MS -
  k * BARRAGE_QUICKEN_MS * j;
const salvoAt = (bars: number) =>
  landsAt(bars - 1, BARRAGE_PER_BAR - 1) + BARRAGE_SALVO_GAP_MS;

interface Shell {
  bar: number;
  to: Point;
  lands: number;
  salvo: boolean;
}

function shells(r: Running, bars: Point[]): Shell[] {
  const order = byHeight(bars).reverse();
  const salvo = salvoAt(bars.length);
  const out: Shell[] = [];
  order.forEach((bar, k) => {
    for (let j = 0; j < BARRAGE_PER_BAR; j++)
      out.push({
        bar,
        to: along(
          r,
          bars,
          bar,
          holeHash(k * BARRAGE_PER_BAR + j, 3201) * 2 - 1,
        ),
        lands: landsAt(k, j),
        salvo: false,
      });
  });
  order.forEach((bar, k) =>
    out.push({
      bar,
      to: along(r, bars, bar, (holeHash(k, 3301) * 2 - 1) * 0.5),
      lands: salvo + k * BARRAGE_SALVO_EVERY_MS,
      salvo: true,
    }),
  );
  return out;
}

const guns = (r: Running, bars: Point[]): Point => ({
  x: -r.viewportWidth * BARRAGE_SIDE,
  y: groundY(r, bars, 0),
});

registerFloorCrit("artilleryBarrageCrit", {
  plan(r, bars, hit) {
    for (const s of shells(r, bars)) hit(s.bar, s.lands, s.salvo ? 1 : 0);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const from = guns(r, bars);
    if (ms < BARRAGE_IN_MS) {
      const p = (ms / BARRAGE_IN_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        from.x * p,
        from.y * p,
        lerp(r.flashFont, BARRAGE_FONT, p),
        { rot: -0.5 * p },
      );
    }
    if (ms >= salvoAt(bars.length) && r.kicked === 0) {
      r.kicked = 1;
      r.shake(BARRAGE_SALVO_KICK);
      playExplosion();
    }
    for (const s of shells(r, bars)) {
      const pull = {
        x: (from.x + s.to.x) / 2,
        y: Math.min(from.y, s.to.y) - BARRAGE_ARC,
      };
      drawWispBetween(
        ctx,
        (t) =>
          quadratic(
            from,
            pull,
            s.to,
            clamp01((t - s.lands + BARRAGE_FLIGHT_MS) / BARRAGE_FLIGHT_MS),
          ),
        ms,
        now,
        WISP_SIZE * (s.salvo ? BARRAGE_BIG_SHELL : BARRAGE_SHELL),
        0.8,
        s.lands - BARRAGE_FLIGHT_MS,
        s.lands,
      );
      drawDetonation(
        ctx,
        s.to,
        ms - s.lands,
        s.salvo ? BARRAGE_SALVO_BLAST : BARRAGE_BLAST,
        now,
      );
    }
  },
  tailMs: BARRAGE_TAIL_MS,
  shake: (step) => (step ? BARRAGE_SALVO_SHAKE : BARRAGE_SHAKE),
});
