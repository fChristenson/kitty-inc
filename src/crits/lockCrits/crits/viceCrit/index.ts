// Vice, a lock crit: the number drops into the dark locked floor as a big
// wisp and two slabs of light close in on it from both sides like a vice,
// slamming in quicker and harder each, squeezing it thinner and taller,
// glitter spurting out above and below; the last squeeze crushes it to a
// sliver and it bursts, the floor opening, its button charged with levels
import { CONFIG } from "../../../../config";
import { addButtonCharge } from "../../../buttonCrits/buttonBonus";
import {
  crushAt,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  drawSlab,
  planCrush,
  squashScale,
  tickCrush,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { FLOOR_X_MAX, FLOOR_X_MIN } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

// the number dropping into the floor's middle, shrinking into the wisp
const DROP_MS = 260;
const DROP_SHRINK = 0.3;
// the slams: SLAMS of them from FIRST_MS, the gaps closing, the last wound
// out WIND_UP times as long
const FIRST_MS = DROP_MS + 420;
const SLAMS = 7;
const GAPS: [number, number] = [340, 140];
const WIND_UP = 1.8;
const CLIMAX_SHAKE = 2.6;
// the wisp: R px round; the slabs THICK, LONG either side of its middle,
// sliding in from SLIDE px out, winding out LIFT px
const R = 110;
const WISP = WISP_SIZE * 3.2;
const THICK = 56;
const LONG = 150;
const SLIDE = 300;
const SLIDE_MS = 160;
const LIFT = 320;
const POWER: [number, number] = [0.5, 1.2];
const OPEN_GAP_MS = 60;
const PAY_GAP_MS = 400;
const OPEN_BLAST = 240;
const FADE_MS = 200;
const TAIL_MS = 900;
// shakes by step: a slam's jolt (the slams shake themselves), the opening,
// the charge
const SHAKES = [0.2, 1.2, 1];
const SIDES = [-1, 1];

interface State {
  crush: Crush;
  pose: CrushPose;
  offset: Point;
  last: number;
  openAt: number;
}
const states = new WeakMap<Running, State>();
const room: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const squash: Point = { x: 1, y: 1 };
const top: Point = { x: 0, y: 0 };
const bottom: Point = { x: 0, y: 0 };
const ORIGIN: Point = { x: 0, y: 0 };
const atOrigin = () => ORIGIN;

registerFloorCrit("viceCrit", {
  // the floor it opened has its button charged with levels
  reward(t) {
    addButtonCharge(t.floor, t.count * CONFIG.crit.viceCharge);
    t.flipButton();
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const crush = planCrush(FIRST_MS, SLAMS, GAPS, WIND_UP, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const last = crush.slams[SLAMS - 1];
    const openAt = last + OPEN_GAP_MS;
    for (const at of crush.slams.slice(0, -1)) hit(0, at, 0);
    hit(0, openAt, 1);
    hit(0, openAt + PAY_GAP_MS, 2);
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      offset: { x: (FLOOR_X_MIN + FLOOR_X_MAX) / 2 - lock.x, y: 0 },
      last,
      openAt,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { crush, pose, last } = state;
    const now = r.startedAt + ms;
    room.x = bars[0].x + state.offset.x;
    room.y = bars[0].y + state.offset.y;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, room.x, p),
        lerp(0, room.y, p),
        r.flashFont * lerp(1, DROP_SHRINK, p),
      );
    }
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    squashScale(pose.crush, squash);
    // pressed across: thinner across, taller along
    const half = R * squash.y;
    if (ms >= DROP_MS && ms < last) {
      ctx.save();
      ctx.translate(room.x, room.y);
      ctx.scale(squash.y, squash.x);
      drawWispHead(ctx, atOrigin, ms, now, WISP, 0.4 + 0.6 * pose.crush);
      ctx.restore();
    }
    const show = clamp01((ms - DROP_MS) / SLIDE_MS);
    const alpha = show * (1 - clamp01((ms - last) / FADE_MS));
    for (const side of SIDES) {
      const angle = side < 0 ? 0 : Math.PI;
      contact.x = room.x + side * half;
      contact.y = room.y;
      top.x = bottom.x =
        contact.x + side * (THICK / 2 + pose.lift * LIFT + (1 - show) * SLIDE);
      top.y = room.y - LONG;
      bottom.y = room.y + LONG;
      drawSlab(ctx, top, bottom, THICK, alpha, now);
      if (ms < last && ms >= DROP_MS) {
        drawCrushStrain(
          ctx,
          contact,
          angle,
          2 * R * squash.x,
          pose.crush,
          R,
          now,
        );
        if (pose.press >= 0)
          drawCrushContact(
            ctx,
            contact,
            angle,
            2 * R * squash.x,
            pose.since,
            lerp(POWER[0], POWER[1], pose.press / (SLAMS - 2)),
            now,
          );
      }
    }
    drawCrushBurst(ctx, room, 0, 2 * R, ms - last, now);
    drawDetonation(ctx, room, ms - state.openAt, OPEN_BLAST, now);
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
