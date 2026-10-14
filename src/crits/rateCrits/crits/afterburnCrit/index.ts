// Afterburn, a rate crit: the number drops onto the top bar's end as a lit
// wisp and a chain of blasts runs along the bar, each setting off the next,
// a big blast on its readout as it passes; at the bar's end it leaps to the
// bar below and runs back the other way, snaking down the building faster
// and faster, its own readout bursting in a cluster: every bar it passes
// runs three times as fast, fading back over a while
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping onto the top bar's end as the fuse, fizzing FUSE_MS
const DROP_MS = 200;
const FUSE_MS = 220;
const FUSE = WISP_SIZE * 1.4;
// along each bar: LINKS blasts INSET from its ends, the one at its middle
// the readout's; the gaps between blasts closing from GAP_MS[0] to [1]
const LINKS = 5;
const MIDDLE = 2;
const INSET = 30;
const GAP_MS: [number, number] = [110, 45];
const LINK: [number, number] = [70, 100];
const READOUT = 170;
const OWN_READOUT = 230;
// the leap down to the next bar, a streak LEAP px wide
const LEAP = 40;
// its own readout's cluster: CLUSTER blasts REACH px round it, EVERY ms apart
const CLUSTER = 5;
const REACH = 120;
const CLUSTER_EVERY = 45;
const CLUSTER_BLAST = 100;
const TAIL_MS = 900;
// shakes by step: a link, a readout, its own
const SHAKES = [0.3, 0.9, 2.2];

interface Blast {
  bar: number;
  // from the bar's middle
  dx: number;
  dy: number;
  at: number;
  size: number;
}
interface State {
  blasts: Blast[];
  start: number;
  startX: number;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const to: Point = { x: 0, y: 0 };
const atFuse = () => at;

registerFloorCrit("afterburnCrit", {
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth - INSET;
    const order = bars.map((_, i) => i).sort((a, b) => bars[a].y - bars[b].y);
    const total = order.length * LINKS;
    const blasts: Blast[] = [];
    let t = DROP_MS + FUSE_MS;
    order.forEach((bar, k) => {
      const dir = k % 2 ? -1 : 1;
      for (let j = 0; j < LINKS; j++) {
        const g = blasts.length / Math.max(1, total - 1);
        const readout = j === MIDDLE;
        const own = bar === 0;
        const dx = dir * lerp(-half, half, j / (LINKS - 1));
        blasts.push({
          bar,
          dx,
          dy: 0,
          at: t,
          size: readout
            ? own
              ? OWN_READOUT
              : READOUT
            : lerp(LINK[0], LINK[1], g),
        });
        hit(bar, t, readout ? (own ? 2 : 1) : 0);
        if (readout && own)
          for (let c = 0; c < CLUSTER; c++) {
            const a = (c / CLUSTER) * Math.PI * 2 + 0.4;
            blasts.push({
              bar,
              dx: dx + Math.cos(a) * REACH,
              dy: Math.sin(a) * REACH * 0.6,
              at: t + (c + 1) * CLUSTER_EVERY,
              size: CLUSTER_BLAST,
            });
          }
        t += lerp(GAP_MS[0], GAP_MS[1], g);
      }
    });
    states.set(r, {
      blasts,
      start: order[0],
      startX: -half,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const first = bars[state.start];
    at.x = first.x + state.startX;
    at.y = first.y;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, at.x, p),
        lerp(0, at.y, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    } else if (ms < DROP_MS + FUSE_MS) {
      const fizz = clamp01((ms - DROP_MS) / FUSE_MS);
      drawWispHead(ctx, atFuse, ms, now, FUSE * (1 + 0.5 * fizz), fizz);
    }
    const { blasts } = state;
    for (let i = 0; i < blasts.length; i++) {
      const b = blasts[i];
      const since = ms - b.at;
      if (since < 0 || since > DETONATION_MS) continue;
      const bar = bars[b.bar];
      at.x = bar.x + b.dx;
      at.y = bar.y + b.dy;
      drawDetonation(ctx, at, since, b.size, now);
    }
    // the leap down from one bar's last link to the next bar's first
    for (let i = LINKS - 1; i < blasts.length - 1; i++) {
      const b = blasts[i];
      const next = blasts[i + 1];
      if (next.bar === b.bar || next.dy !== 0) continue;
      const u = clamp01((ms - b.at) / (next.at - b.at));
      if (u <= 0 || u >= 1) continue;
      from.x = bars[b.bar].x + b.dx;
      from.y = bars[b.bar].y;
      to.x = lerp(from.x, bars[next.bar].x + next.dx, u * u);
      to.y = lerp(from.y, bars[next.bar].y, u * u);
      drawBeam(ctx, from, to, LEAP, 1);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
