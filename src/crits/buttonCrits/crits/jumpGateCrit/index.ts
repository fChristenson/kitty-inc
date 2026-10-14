// Jump Gate, a button crit: for every button in view a pair of gold rings
// opens, the pairs all different: the near ring right by its button (high
// over it, just over it, or out to its side) and its twin far off across
// the screen, each ring its own look; the number arcs as a wisp across the
// screen into the far ring and shoots out of the near one at once, keeping
// its speed, slamming into the button in a blast, which turns over: each of
// its next taps also levels the floor two up; it bounces off on a long
// bowed hop to the next far ring, and on down the buttons, every hop quicker,
// a pop, a jolt and a whoosh at every pass; its own last and hardest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  drawPortal,
  drawPortalPass,
  planWarp,
  portalLook,
  type Warp,
  type WarpLeg,
  type WarpSpot,
} from "../../../../shared/animationStyles/portal";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 150;
// the far rings, in turn: across the screen (a share of its width from the
// middle) and up or down from their button
const FAR: readonly { x: number; dy: number; size: number }[] = [
  { x: -0.4, dy: -640, size: 120 },
  { x: 0.36, dy: 560, size: 95 },
  { x: -0.12, dy: 820, size: 140 },
  { x: 0.4, dy: -860, size: 105 },
  { x: -0.42, dy: 280, size: 90 },
];
// the near rings, in turn: over the button or out to its side, so far off it
const NEAR: readonly { side: boolean; gap: number; size: number }[] = [
  { side: false, gap: 340, size: 80 },
  { side: true, gap: 260, size: 90 },
  { side: false, gap: 120, size: 70 },
  { side: true, gap: 480, size: 100 },
];
const CLOSE_MS = 140;
// px a ms: across to each far ring (quicker each), out of each near one
const HOP_SPEED: [number, number] = [3.2, 6.5];
const OUT_SPEED: [number, number] = [2.4, 4.5];
const MIN_LEG_MS = 90;
// the hops bowed BOW of their length, either way in turn
const BOW = 0.22;
const WISP = WISP_SIZE * 1.1;
const PASS_SHAKE: [number, number] = [0.3, 0.8];
const BLAST = 140;
const OWN_BLAST = 300;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1, 2.6];

interface Gate {
  bar: number;
  farSize: number;
  near: (typeof NEAR)[number];
  farAt: () => Point;
  nearAt: () => Point;
  hitAt: () => Point;
  // when it dives into the far ring (and shoots out of the near one)
  passMs: number;
  slamMs: number;
  // ms its rings open before the pass
  openMs: number;
}
interface State {
  // the buttons this frame: the run's spots read them
  live: { bars: Point[] };
  warp: Warp;
  gates: Gate[];
  runner: (ms: number) => Point | null;
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };
const centre: Point = { x: 0, y: 0 };

// each tap also levelling the floor two up
const jumpTaps = defineTapPerk("Jump", (t) => {
  const up = t.floors[t.floors.indexOf(t.floor) + 2];
  if (up) t.levelUp(up, 1, "+1 Lvl");
});

// a ring flat, or stood on its edge for a run going sideways
function ring(
  ctx: CanvasRenderingContext2D,
  at: Point,
  size: number,
  open: number,
  since: number,
  side: boolean,
  look: number,
  now: number,
): void {
  if (!side) {
    drawPortal(ctx, at, size, open, now, 1, portalLook(look));
    drawPortalPass(ctx, at, since, size);
    return;
  }
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.PI / 2);
  drawPortal(ctx, centre, size, open, now, 1, portalLook(look));
  drawPortalPass(ctx, centre, since, size);
  ctx.restore();
}

registerFloorCrit("jumpGateCrit", {
  reward(t) {
    jumpTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const live = { bars };
    const width = r.viewportWidth;
    // a live spot off a button, so a scroll carries the run along
    const off = (bar: number, dx: number, fixedX: boolean, dy: number) => {
      const p: Point = { x: 0, y: 0 };
      return () => {
        const b = live.bars[bar];
        p.x = fixedX ? dx : b.x + dx;
        p.y = b.y + dy;
        return p;
      };
    };
    const legs: WarpLeg[] = [];
    const gates: Gate[] = [];
    let t = IN_MS;
    let from: WarpSpot = { x: 0, y: 0 };
    let was: Point = { x: 0, y: 0 };
    order.forEach((bar, k) => {
      const u = k / Math.max(1, order.length - 1);
      const b = bars[bar];
      const far = FAR[k % FAR.length];
      const near = NEAR[k % NEAR.length];
      const farAt = off(bar, far.x * width, true, far.dy);
      const nearAt = near.side
        ? off(bar, -BTN_W / 2 - near.gap, false, 0)
        : off(bar, 0, false, -BTN_H / 2 - near.gap);
      const hitAt = near.side
        ? off(bar, -BTN_W / 2, false, 0)
        : off(bar, 0, false, -BTN_H / 2);
      // the hop across to the far ring, bowed, quicker each
      const to = { x: far.x * width, y: b.y + far.dy };
      const length = Math.hypot(to.x - was.x, to.y - was.y);
      const hopMs = Math.max(
        MIN_LEG_MS,
        length / lerp(HOP_SPEED[0], HOP_SPEED[1], u),
      );
      legs.push({
        from,
        to: farAt,
        startMs: t,
        endMs: t + hopMs,
        arc: (k % 2 ? -1 : 1) * BOW * length,
      });
      const passMs = t + hopMs;
      // out of the near ring and into the button
      const outMs = Math.max(
        MIN_LEG_MS,
        near.gap / lerp(OUT_SPEED[0], OUT_SPEED[1], u),
      );
      legs.push({
        from: nearAt,
        to: hitAt,
        startMs: passMs,
        endMs: passMs + outMs,
        fall: !near.side,
      });
      const slamMs = passMs + outMs;
      gates.push({
        bar,
        farSize: far.size,
        near,
        farAt,
        nearAt,
        hitAt,
        passMs,
        slamMs,
        openMs: Math.min(hopMs * 0.7, 400),
      });
      hit(bar, slamMs, bar === 0 ? 2 : 1);
      t = slamMs;
      from = hitAt;
      was = near.side
        ? { x: b.x - BTN_W / 2, y: b.y }
        : { x: b.x, y: b.y - BTN_H / 2 };
    });
    const warp = planWarp(legs);
    states.set(r, { live, warp, gates, runner: (ms) => warp.at(ms, spot) });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    state.live.bars = bars;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - (0.6 * ms) / IN_MS),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    const { gates, warp } = state;
    // a whoosh and a jolt at every pass, harder each
    while (r.kicked < gates.length && ms >= gates[r.kicked].passMs) {
      r.shake(
        lerp(
          PASS_SHAKE[0],
          PASS_SHAKE[1],
          r.kicked / Math.max(1, gates.length - 1),
        ),
      );
      playSwoosh();
      r.kicked++;
    }
    for (let k = 0; k < gates.length; k++) {
      const g = gates[k];
      const open = Math.min(
        clamp01((ms - g.passMs + g.openMs) / (g.openMs * 0.5)),
        1 - clamp01((ms - g.passMs - CLOSE_MS) / CLOSE_MS),
      );
      if (open > 0) {
        ring(
          ctx,
          g.farAt(),
          g.farSize,
          open,
          ms - g.passMs,
          false,
          2 * k + 1,
          now,
        );
        ring(
          ctx,
          g.nearAt(),
          g.near.size,
          open,
          ms - g.passMs,
          g.near.side,
          2 * k + 2,
          now,
        );
      }
      drawDetonation(
        ctx,
        g.hitAt(),
        ms - g.slamMs,
        g.bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    drawWispBetween(
      ctx,
      state.runner,
      ms,
      now,
      WISP,
      1,
      warp.startMs,
      warp.endMs,
    );
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
