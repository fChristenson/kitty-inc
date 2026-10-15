// Rolling Start, a button crit: the number bursts into glitter strewn in a
// lane beside every button; a little ball shoots off down each lane,
// quicker each, every speck it touches sticking on, the ball swelling as it
// tears along, and slams into its button's end, bursting in a blast: the
// button turns over, each of its next taps also levelling the floor with
// the fewest upgrades; its own last, the longest lane, biggest ball and blast
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { flingOut } from "../../../../shared/animationStyles/clutter";
import {
  drawSnowball,
  planSnowball,
  rollAt,
  snowballRadius,
  type Snowball,
} from "../../../../shared/animationStyles/snowball";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 110;
// the lanes: LANE px long (its own OWN_LANE), ending GAP px off the
// button's left end, the glitter JITTER px off them, LANE_SPECKS of it,
// flung out over FLING_MS
const LANE = 520;
const OWN_LANE = 760;
const EDGE = 50;
const GAP = 16;
const JITTER = 22;
const LANE_SPECKS = 30;
const FLING_MS = 170;
const SPECK = 18;
// the balls: each rolling ROLL_MS (quicker each, its own OWN_ROLL_MS), the
// next STAGGER_MS on; BALL px round, growing GROW a sqrt of a speck
const ROLL_MS: [number, number] = [230, 160];
const OWN_ROLL_MS = 220;
const STAGGER_MS = 60;
const BALL = 12;
const GROW = 6;
const REACH = 40;
const BLAST = 190;
const OWN_BLAST = 380;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 3];

interface Lane {
  bar: number;
  own: boolean;
  ball: Snowball;
  end: number;
  hitAt: Point;
}
interface State {
  lanes: Lane[];
  // every lane's glitter, for flinging it out
  specks: Point[];
  from: Point;
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };
const bit: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const ball: Point = { x: 0, y: 0 };
const ballAt = () => ball;

// each tap also levelling the open floor with the fewest upgrades
const rollTaps = defineTapPerk("Roll", (t) => {
  let least: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!least || floor.upgradeCount < least.upgradeCount)
    )
      least = floor;
  if (least) t.levelUp(least, 1, "+1 Lvl");
});

registerFloorCrit("rollingStartCrit", {
  reward(t) {
    rollTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const base = bars[0];
    const order = ownLast(bars);
    const screenLeft = -r.viewportWidth / 2 + EDGE - base.x;
    const lanes: Lane[] = [];
    let t = IN_MS + FLING_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const y = bars[bar].y - base.y;
      const to = { x: bars[bar].x - base.x - BTN_W / 2 - GAP, y };
      const from = {
        x: Math.max(screenLeft, to.x - (own ? OWN_LANE : LANE)),
        y,
      };
      const ms = own
        ? OWN_ROLL_MS
        : lerp(ROLL_MS[0], ROLL_MS[1], k / Math.max(1, order.length - 2));
      const start = t;
      const specks: Point[] = [];
      for (let i = 0; i < LANE_SPECKS; i++)
        specks.push({
          x: lerp(
            from.x + 20,
            to.x,
            (i + holeHash(k * 50 + i, 6110)) / LANE_SPECKS,
          ),
          y: y + (holeHash(k * 50 + i, 6111) * 2 - 1) * JITTER,
        });
      const roll = planSnowball(
        [{ from, to, startMs: start, endMs: start + ms }],
        specks,
        REACH,
      );
      lanes.push({ bar, own, ball: roll, end: start + ms, hitAt: to });
      hit(bar, start + ms, own ? 2 : 1);
      t += STAGGER_MS;
    });
    states.set(r, {
      lanes,
      specks: lanes.flatMap((lane) => lane.ball.specks),
      from: { x: -base.x, y: -base.y },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const base = bars[0];
    if (ms < IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
    ctx.save();
    ctx.translate(base.x, base.y);
    drawDetonation(ctx, state.from, ms - IN_MS, BLAST, now);
    const flung = (ms - IN_MS) / FLING_MS;
    if (flung >= 0 && flung < 1) {
      // the glitter blown out of the number into every lane
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      const { specks } = state;
      for (let i = 0; i < specks.length; i++) {
        flingOut(state.from, specks[i], holeHash(i, 6112), flung, bit);
        stampGlimmer(
          ctx,
          bit.x,
          bit.y,
          SPECK,
          i,
          i % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }
    for (let k = 0; k < state.lanes.length; k++) {
      const lane = state.lanes[k];
      const size = lane.own ? 1.5 : 1;
      if (flung >= 1 && ms < lane.end) {
        rollAt(lane.ball, ms, at);
        const radius = snowballRadius(lane.ball, ms, BALL * size, GROW * size);
        drawSnowball(ctx, lane.ball, ms, at, radius, SPECK);
        ball.x = at.x;
        ball.y = at.y;
        drawWispHead(ctx, ballAt, ms, now, WISP_SIZE * size, 0.8);
      }
      blast.x = lane.hitAt.x;
      blast.y = lane.hitAt.y;
      drawDetonation(
        ctx,
        blast,
        ms - lane.end,
        lane.own ? OWN_BLAST : BLAST,
        now,
      );
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
