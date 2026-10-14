// Two Up, a lock crit: the number bursts into bomb wisps lobbed onto the
// locked floor and the one above it, sticking there on lit fuses; they blow
// in a chain, the first floor bursting open, then the next in the biggest
// blast: two floors free (one when the building's last floor is next)
import { drawDetonation, drawLitFuse } from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";

const POP_MS = 100;
const POP_BLAST = 120;
// bombs lobbed one after another, each flying FLY_MS on an arc ARC high
const LOB_GAP_MS = 55;
const FLY_MS = 260;
const ARC = 240;
// where they stick: spread across the floor, alternately high and low
const SPREAD_X = 480;
const SPREAD_Y = 100;
// the fuses burn this long after the last lands, then the bombs blow a beat
// apart, each floor bursting open just after its last
const FUSE_MS = 450;
const CHAIN_MS: [number, number] = [75, 60];
const OPEN_GAP_MS = 130;
const NEXT_GAP_MS = 220;
const FUSE = 60;
const BOMB_BLAST = 100;
const OPEN_BLAST = 230;
const LAST_BLAST = 300;
const CLUSTER = 4;
const CLUSTER_MS = 60;
const CLUSTER_BLAST = 130;
const TAIL_MS = 900;

interface Bomb {
  bar: number;
  at: Point;
  launch: number;
  lands: number;
  blows: number;
  path: (ms: number) => Point | null;
}

interface State {
  bars: Point[];
  bombs: Bomb[];
  opens: number[];
}

const states = new WeakMap<Running, State>();
const ORIGIN: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

registerFloorCrit("twoUpCrit", {
  twoFloors: true,
  plan(r, bars, hit) {
    const state: State = { bars, bombs: [], opens: [] };
    const perFloor = bars.length > 1 ? 4 : 6;
    let launch = POP_MS;
    for (let bar = 0; bar < bars.length; bar++)
      for (let k = 0; k < perFloor; k++) {
        const offset = {
          x: (k / (perFloor - 1) - 0.5) * 2 * SPREAD_X,
          y: k % 2 ? SPREAD_Y : -SPREAD_Y,
        };
        const lands = launch + FLY_MS;
        const pos: Point = { x: 0, y: 0 };
        const bomb: Bomb = {
          bar,
          at: offset,
          launch,
          lands,
          blows: 0,
          // lobbed onto its live spot, then stuck there till it blows
          path: (ms) => {
            if (ms < bomb.launch || ms >= bomb.blows) return null;
            const to = state.bars[bar];
            const u = Math.min(1, (ms - bomb.launch) / FLY_MS);
            const tx = to.x + offset.x;
            const ty = to.y + offset.y;
            pos.x = tx * u;
            pos.y = ty * u - (Math.max(0, -ty) * 0.2 + ARC) * 4 * u * (1 - u);
            return pos;
          },
        };
        state.bombs.push(bomb);
        launch += LOB_GAP_MS;
      }
    // the chain: each floor's bombs in turn, the floor bursting after its last
    let t = state.bombs[state.bombs.length - 1].lands + FUSE_MS;
    for (let bar = 0; bar < bars.length; bar++) {
      for (let k = 0; k < perFloor; k++) {
        state.bombs[bar * perFloor + k].blows = t;
        hit(bar, t, 0);
        t += CHAIN_MS[bar ? 1 : 0];
      }
      const open = t - CHAIN_MS[bar ? 1 : 0] + OPEN_GAP_MS;
      state.opens.push(open);
      hit(bar, open, bar === bars.length - 1 ? 2 : 1);
      t = open + NEXT_GAP_MS;
    }
    hit(0, POP_MS, 0);
    states.set(r, state);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const state = states.get(r)!;
    state.bars = bars;
    if (ms < POP_MS) drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont);
    drawDetonation(ctx, ORIGIN, ms - POP_MS, POP_BLAST, now);
    for (const bomb of state.bombs) {
      const home = bars[bomb.bar];
      spot.x = home.x + bomb.at.x;
      spot.y = home.y + bomb.at.y;
      if (ms >= bomb.lands && ms < bomb.blows)
        drawLitFuse(
          ctx,
          spot,
          (ms - bomb.lands) / (bomb.blows - bomb.lands),
          FUSE,
          now,
        );
      drawDetonation(ctx, spot, ms - bomb.blows, BOMB_BLAST, now);
      drawWispBetween(
        ctx,
        bomb.path,
        ms,
        now,
        WISP_SIZE * 1.15,
        0.5,
        bomb.launch,
        bomb.blows,
      );
    }
    const last = state.opens.length - 1;
    for (let bar = 0; bar <= last; bar++) {
      const since = ms - state.opens[bar];
      drawDetonation(
        ctx,
        bars[bar],
        since,
        bar === last ? LAST_BLAST : OPEN_BLAST,
        now,
      );
      if (bar !== last) continue;
      // the last one bursting into a cluster round it
      for (let k = 0; k < CLUSTER; k++) {
        const a = (k / CLUSTER) * Math.PI * 2 + 0.6;
        spot.x = bars[bar].x + Math.cos(a) * SPREAD_X * 0.7;
        spot.y = bars[bar].y + Math.sin(a) * SPREAD_Y * 2;
        drawDetonation(
          ctx,
          spot,
          since - (k + 1) * CLUSTER_MS,
          CLUSTER_BLAST,
          now,
        );
      }
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => (step === 2 ? 3 : step === 1 ? 1.9 : 0.8),
});
