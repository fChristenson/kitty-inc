// Heavy Hand, a button crit: a wisp sits on top of every button under a slab
// of light, and all the slabs wind up and slam down together, in unison,
// quicker and deeper each, the wisps squashing flat, glitter squeezed out;
// the last slam crushes them all at once and each button turns over: its
// next taps each land three levels
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
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
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const IN_MS = 160;
// the slams: SLAMS of them from FIRST_MS, the gaps closing, the last wound
// up WIND_UP times as long
const FIRST_MS = IN_MS + 340;
const SLAMS = 6;
const GAPS: [number, number] = [320, 140];
const WIND_UP = 1.8;
const CLIMAX_SHAKE = 2.6;
// each wisp R round, GAP over its button's top; its slab THICK, the
// button's width, winding up LIFT px
const R = 55;
const GAP = 10;
const WISP = WISP_SIZE * 1.8;
const THICK = 40;
const LIFT = 170;
const POWER: [number, number] = [0.4, 1];
const BURST = BTN_W * 0.9;
const BLAST = 110;
const OWN_BLAST = 200;
const FADE_MS = 200;
const TAIL_MS = 900;
// shakes by step: a slam's jolt (the slams shake themselves), a button, its
// own
const SHAKES = [0.15, 0.6, 1];

interface State {
  crush: Crush;
  pose: CrushPose;
  last: number;
}
const states = new WeakMap<Running, State>();
const base: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const squash: Point = { x: 1, y: 1 };
const head: Point = { x: 0, y: 0 };
const left: Point = { x: 0, y: 0 };
const right: Point = { x: 0, y: 0 };
const atHead = () => head;

// each tap landing three levels
const heavyTaps = defineTapPerk(
  "Heavy",
  (t) => t.levelUp(t.floor, 2, "+3 Lvl"),
  true,
);

registerFloorCrit("heavyHandCrit", {
  // heavy taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * meta.values.taps));
    heavyTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const crush = planCrush(FIRST_MS, SLAMS, GAPS, WIND_UP, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const last = crush.slams[SLAMS - 1];
    for (const at of crush.slams.slice(0, -1)) hit(0, at, 0);
    bars.forEach((_, bar) => hit(bar, last, bar === 0 ? 2 : 1));
    states.set(r, {
      crush,
      pose: { crush: 0, lift: 0, since: Infinity, press: -1 },
      last,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const { crush, pose, last } = state;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCrush(crush, ms, r.shake);
    crushAt(crush, ms, pose);
    squashScale(pose.crush, squash);
    const show = clamp01((ms - IN_MS) / 160);
    const alpha = show * (1 - clamp01((ms - last) / FADE_MS));
    const power = lerp(
      POWER[0],
      POWER[1],
      Math.max(0, pose.press) / (SLAMS - 2),
    );
    for (let i = 0; i < bars.length; i++) {
      const button = bars[i];
      base.x = contact.x = button.x;
      base.y = button.y - BTN_H / 2 - GAP;
      contact.y = base.y - 2 * R * squash.y;
      if (ms < last && show > 0) {
        head.x = base.x;
        head.y = base.y - R * squash.y;
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.scale(squash.x, squash.y);
        ctx.translate(-head.x, -head.y);
        drawWispHead(ctx, atHead, ms, now, WISP, 0.3 + 0.7 * pose.crush);
        ctx.restore();
        drawCrushStrain(
          ctx,
          contact,
          Math.PI / 2,
          2 * R * squash.x,
          pose.crush,
          R * 1.4,
          now,
        );
        if (pose.press >= 0)
          drawCrushContact(
            ctx,
            contact,
            Math.PI / 2,
            2 * R * squash.x,
            pose.since,
            power,
            now,
          );
      }
      left.x = button.x - BTN_W / 2;
      right.x = button.x + BTN_W / 2;
      left.y = right.y = contact.y - THICK / 2 - pose.lift * LIFT;
      drawSlab(ctx, left, right, THICK, alpha, now);
      drawCrushBurst(ctx, base, Math.PI / 2, BURST, ms - last, now);
      drawDetonation(ctx, base, ms - last, i === 0 ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
