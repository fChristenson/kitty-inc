// Splash Zone, a button crit: drops of light fall a short way onto the tops
// of the buttons in view, each landing in a splash and a flat ring rippling
// out over its button, a drizzle quickening to a downpour; then one huge drop
// from high lands on its own button with the biggest blast and a double
// ring, and every button turns over: its next taps also level the floors
// above and below it
import { defineTapPerk } from "../../buttonBonus";
import { CONFIG } from "../../../../config";
import {
  drawDrop,
  drawRipple,
  drawSplash,
  rainTimes,
} from "../../../../shared/animationStyles/ripple";
import { drawDetonation } from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the drops: DROPS_EACH a button in a hashed order from FIRST_MS, the gaps
// closing, each falling FALL px over FALL_MS onto a spot along its top
const FIRST_MS = IN_MS + 240;
const DROPS_EACH = 4;
const MIN_DROPS = 10;
const GAPS: [number, number] = [230, 50];
const FALL = 220;
const FALL_MS = 180;
const DROP = 36;
const SPLASH = 20;
const RIPPLE = BTN_W * 0.6;
const RIPPLE_W = 12;
// the huge drop from BIG_FALL px up, BIG_GAP_MS after the last
const BIG_GAP_MS = 280;
const BIG_FALL = 620;
const BIG_FALL_MS = 260;
const BIG_DROP = 80;
const BIG_RIPPLE = BTN_W * 1.3;
const BIG_RIPPLE_W = 26;
const BIG_RIPPLE_MS = 640;
const BIG_SPLASH = 44;
const BIG_SPLASH_N = 12;
const BIG_SPLASH_MS = 480;
// every button's turn-over after the huge drop, top down
const TURN_EVERY = 45;
const BLAST = 110;
const BIG_BLAST = 230;
const TAIL_MS = 900;
// shakes by step: a drop's tick, a button, the huge drop
const SHAKES = [0.25, 0.5, 2.4];

interface Drop {
  bar: number;
  at: number;
  // where along the button's top, -1..1
  along: number;
}
interface State {
  drops: Drop[];
  bigAt: number;
  turns: { bar: number; at: number }[];
}
const states = new WeakMap<Running, State>();
const spot: Point = { x: 0, y: 0 };

// the spot on bar's button top `along` (-1..1) of the way across
function topOf(button: Point, along: number, into: Point): Point {
  into.x = button.x + along * BTN_W * 0.35;
  into.y = button.y - BTN_H / 2;
  return into;
}

// each tap levelling the floors above and below too
const splashTaps = defineTapPerk("Splash", (t) => {
  const index = t.floors.indexOf(t.floor);
  for (const near of [index - 1, index + 1]) {
    const other = t.floors[near];
    if (other) t.levelUp(other, 1, "+1 Lvl");
  }
});

registerFloorCrit("splashZoneCrit", {
  // splashing taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * CONFIG.crit.splashZoneTaps));
    splashTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const count = Math.max(MIN_DROPS, bars.length * DROPS_EACH);
    const drops = rainTimes(count, FIRST_MS, GAPS).map((at, k) => ({
      bar: Math.floor(holeHash(k, 5100) * bars.length),
      at,
      along: holeHash(k, 5101) * 2 - 1,
    }));
    for (const d of drops) hit(d.bar, d.at, 0);
    const bigAt = drops[drops.length - 1].at + BIG_GAP_MS;
    hit(0, bigAt, 2);
    const turns = bars
      .map((_, i) => i)
      .filter((i) => i !== 0)
      .sort((a, b) => bars[a].y - bars[b].y)
      .map((bar, k) => ({ bar, at: bigAt + (k + 1) * TURN_EVERY }));
    for (const t of turns) hit(t.bar, t.at, 1);
    states.set(r, { drops, bigAt, turns });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const own = bars[0];
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const d of state.drops)
      drawRipple(
        ctx,
        topOf(bars[d.bar], d.along, spot),
        ms - d.at,
        RIPPLE,
        RIPPLE_W,
      );
    topOf(own, 0, spot);
    drawRipple(
      ctx,
      spot,
      ms - state.bigAt,
      BIG_RIPPLE,
      BIG_RIPPLE_W,
      2,
      BIG_RIPPLE_MS,
    );
    beginLightBatch(ctx);
    for (const d of state.drops) {
      topOf(bars[d.bar], d.along, spot);
      drawDrop(ctx, spot, d.at - ms, FALL_MS, FALL, DROP);
      drawSplash(ctx, spot, ms - d.at, SPLASH);
    }
    topOf(own, 0, spot);
    drawDrop(ctx, spot, state.bigAt - ms, BIG_FALL_MS, BIG_FALL, BIG_DROP);
    drawSplash(
      ctx,
      spot,
      ms - state.bigAt,
      BIG_SPLASH,
      BIG_SPLASH_N,
      BIG_SPLASH_MS,
    );
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, spot, ms - state.bigAt, BIG_BLAST, now);
    for (const t of state.turns) {
      topOf(bars[t.bar], 0, spot);
      drawDetonation(ctx, spot, ms - t.at, BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
