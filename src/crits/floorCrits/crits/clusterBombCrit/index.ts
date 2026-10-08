// the cluster bomb floor crit: the number turns into a blinking bomb that
// drops and bursts in mid-air into bomblets, which arc down onto the bars in
// view and each burst again into a cluster of blasts along the bar
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWisp, drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
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
import { quadratic, holeHash, skyY } from "../../critPlayer/shared";

const CLUSTER_IN_MS = 250;
const CLUSTER_DROP_MS = 500;
const CLUSTER_BURST_MS = CLUSTER_IN_MS + CLUSTER_DROP_MS;
const CLUSTER_FONT = 40;
// where it bursts (over the top bar, below the HUD), dropping this far first
const CLUSTER_ABOVE = 260;
const CLUSTER_DROP = 250;
const CLUSTER_SIDE = 40;
const CLUSTER_FUSE = 80;
const CLUSTER_SIZE = 1.4;
const CLUSTER_BURST_BLAST = 260;
const CLUSTER_BURST_SHAKE = 2;
// the bomblets: two a bar (six at least), each falling longer the further
// down its bar, arcing up first
const CLUSTER_PER_BAR = 2;
const CLUSTER_LEAST = 6;
const CLUSTER_FALL_MS = 320;
const CLUSTER_FALL_PER_BAR_MS = 110;
const CLUSTER_ARC: [number, number] = [160, 280];
const CLUSTER_BOMBLET_FUSE = 40;
const CLUSTER_BOMBLET = 0.8;
// each bomblet's cluster: blasts either side of where it lands, one after
// another
const CLUSTER_POPS = [-90, 0, 90];
const CLUSTER_POP_DELAY_MS = 70;
const CLUSTER_POP_EVERY_MS = 60;
const CLUSTER_POP_BLAST = 90;
const CLUSTER_POP_SHAKE = 0.3;
const CLUSTER_BLAST = 140;
const CLUSTER_SHAKE = 0.9;
const CLUSTER_TAIL_MS = 1100;

const countOf = (bars: number) =>
  Math.max(CLUSTER_LEAST, CLUSTER_PER_BAR * bars);

function bomb(r: Running, bars: Point[]) {
  const burst = {
    x: bars[0].x + CLUSTER_SIDE,
    y: skyY(r, bars, CLUSTER_ABOVE),
  };
  return { burst, from: { x: bars[0].x, y: burst.y - CLUSTER_DROP } };
}

// bomblet i: its bar, where on it it lands, when, and its arc there
function bomblet(r: Running, bars: Point[], order: number[], i: number) {
  const k = i % order.length;
  const bar = order[k];
  const to = along(r, bars, bar, holeHash(i, 2201) * 2 - 1);
  const fall = CLUSTER_FALL_MS + k * CLUSTER_FALL_PER_BAR_MS;
  const { burst } = bomb(r, bars);
  const pull = {
    x: (burst.x + to.x) / 2,
    y:
      Math.min(burst.y, to.y) -
      lerp(CLUSTER_ARC[0], CLUSTER_ARC[1], holeHash(i, 2202)),
  };
  return {
    bar,
    to,
    fall,
    lands: CLUSTER_BURST_MS + fall,
    at: (t: number): Point =>
      quadratic(burst, pull, to, clamp01((t - CLUSTER_BURST_MS) / fall)),
  };
}

const popsAt = (lands: number, j: number) =>
  lands + CLUSTER_POP_DELAY_MS + j * CLUSTER_POP_EVERY_MS;

registerFloorCrit("clusterBombCrit", {
  plan(r, bars, hit) {
    const order = byHeight(bars);
    for (let i = 0; i < countOf(bars.length); i++) {
      const b = bomblet(r, bars, order, i);
      hit(b.bar, b.lands);
    }
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const order = byHeight(bars);
    const { burst, from } = bomb(r, bars);
    if (ms < CLUSTER_IN_MS) {
      const p = smoothstep(ms / CLUSTER_IN_MS);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        from.x * p,
        from.y * p,
        lerp(r.flashFont, CLUSTER_FONT, p),
      );
    }
    const bombAt = (t: number): Point => {
      const p = clamp01((t - CLUSTER_IN_MS) / CLUSTER_DROP_MS);
      return { x: lerp(from.x, burst.x, p), y: lerp(from.y, burst.y, p * p) };
    };
    if (ms >= CLUSTER_IN_MS * 0.6 && ms < CLUSTER_BURST_MS) {
      const burn = clamp01((ms - CLUSTER_IN_MS) / CLUSTER_DROP_MS);
      drawLitFuse(ctx, bombAt(ms), burn, CLUSTER_FUSE, now);
      drawWisp(ctx, bombAt, ms, now, WISP_SIZE * CLUSTER_SIZE, burn);
    }
    const count = countOf(bars.length);
    // the burst's bang, then each cluster pop's rattle
    let due = ms >= CLUSTER_BURST_MS ? 1 : 0;
    const bomblets = Array.from({ length: count }, (_, i) =>
      bomblet(r, bars, order, i),
    );
    for (const b of bomblets)
      CLUSTER_POPS.forEach((_, j) => {
        if (ms >= popsAt(b.lands, j)) due++;
      });
    while (r.kicked < due) {
      if (r.kicked++ === 0) {
        r.shake(CLUSTER_BURST_SHAKE);
        playExplosion();
      } else r.shake(CLUSTER_POP_SHAKE);
    }
    drawDetonation(ctx, burst, ms - CLUSTER_BURST_MS, CLUSTER_BURST_BLAST, now);
    for (const b of bomblets) {
      if (ms >= CLUSTER_BURST_MS && ms < b.lands)
        drawLitFuse(
          ctx,
          b.at(ms),
          (ms - CLUSTER_BURST_MS) / b.fall,
          CLUSTER_BOMBLET_FUSE,
          now,
        );
      drawWispBetween(
        ctx,
        b.at,
        ms,
        now,
        WISP_SIZE * CLUSTER_BOMBLET,
        0.7,
        CLUSTER_BURST_MS,
        b.lands,
      );
      drawDetonation(ctx, b.to, ms - b.lands, CLUSTER_BLAST, now);
      CLUSTER_POPS.forEach((dx, j) =>
        drawDetonation(
          ctx,
          { x: b.to.x + dx, y: b.to.y },
          ms - popsAt(b.lands, j),
          CLUSTER_POP_BLAST,
          now,
        ),
      );
    }
  },
  tailMs: CLUSTER_TAIL_MS,
  shake: () => CLUSTER_SHAKE,
});
