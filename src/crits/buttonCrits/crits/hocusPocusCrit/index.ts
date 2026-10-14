// Hocus Pocus, a button crit: a pen of light draws a magic circle flat on
// the ground under every button in view, one after another, quicker each,
// then its inner ring and a star; the circles turn slow, then whip round
// faster and faster, a jolt and a tick at every turn, glitter rising off
// them quicker, until a pillar of light erupts out of each through its
// button in a blast: the button turns over, each of its next taps also
// landing levels on a random floor; its own last, the biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playSpinTick } from "../../../../sound";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// each circle RADIUS of the button's width round (its own OWN_RADIUS), DOWN
// px under its bottom edge, turning TURNS times over SPELL_MS (quicker each),
// the next starting STAGGER_MS on (closing)
const RADIUS = 0.55;
const OWN_RADIUS = 0.72;
const DOWN = 16;
const TURNS = 5;
const OWN_TURNS = 7;
const SPELL_MS: [number, number] = [1000, 720];
const OWN_SPELL_MS = 1250;
const STAGGER_MS: [number, number] = [170, 90];
const PILLAR = 720;
const OWN_PILLAR = 980;
const BLAST = 150;
const OWN_BLAST = 320;
const REV_SHAKE = 0.25;
const OWN_REV_SHAKE = 0.45;
// the levels a magic tap lands on its random floor
const MAGIC_LEVELS = 2;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.2, 3];

interface Circle {
  bar: number;
  own: boolean;
  summon: Summon;
}
interface State {
  circles: Circle[];
  revs: { ms: number; own: boolean }[];
}
const states = new WeakMap<Running, State>();
const at: Point = { x: 0, y: 0 };

// each tap also landing levels on a random floor that can take them
const magicTaps = defineTapPerk("Magic", (t) => {
  let pick: Floor | null = null;
  let seen = 0;
  for (const floor of t.floors)
    if (floor.unlocked && !isFloorMaxed(floor) && Math.random() * ++seen < 1)
      pick = floor;
  if (pick) t.levelUp(pick, MAGIC_LEVELS, `+${MAGIC_LEVELS} Lvl`);
});

const centre = (button: Point, into: Point): Point => {
  into.x = button.x;
  into.y = button.y + BTN_H / 2 + DOWN;
  return into;
};

registerFloorCrit("hocusPocusCrit", {
  reward(t) {
    magicTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const circles: Circle[] = [];
    const revs: State["revs"] = [];
    let t = IN_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const ms = own ? OWN_SPELL_MS : lerp(SPELL_MS[0], SPELL_MS[1], u);
      const summon = planSummon(
        t,
        t + ms,
        own ? OWN_TURNS : TURNS,
        summonLook(own ? 4 : k + 5),
      );
      circles.push({ bar, own, summon });
      for (const rev of summon.revs) revs.push({ ms: rev, own });
      hit(bar, summon.eruptMs, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    revs.sort((a, b) => a.ms - b.ms);
    states.set(r, { circles, revs });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    // a jolt and a tick at every turn, quicker and quicker
    while (r.kicked < state.revs.length && ms >= state.revs[r.kicked].ms) {
      const rev = state.revs[r.kicked++];
      r.shake(rev.own ? OWN_REV_SHAKE : REV_SHAKE);
      playSpinTick(rev.own ? 1.4 : 1);
    }
    for (const c of state.circles) {
      centre(bars[c.bar], at);
      const radius = BTN_W * (c.own ? OWN_RADIUS : RADIUS);
      drawSummon(ctx, c.summon, ms, at, radius);
      drawSummonPillar(
        ctx,
        c.summon,
        ms,
        at,
        radius,
        c.own ? OWN_PILLAR : PILLAR,
      );
      drawDetonation(
        ctx,
        at,
        ms - c.summon.eruptMs,
        c.own ? OWN_BLAST : BLAST,
        now,
      );
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
