// Crossbow, a button crit: the number fades and a crossbow of light pops up
// left of every button in view, its string cranked back click by click, all
// of them charging together: the bows bend further each click, trembling
// harder, glowing hotter, light streaking into their bolts, the rumble
// rising; at the climax they loose one after another down the column, a
// twang and a bolt of light streaking into each button, a flash on each, its
// own last with the biggest bolt, flash and blast: each of their next taps
// also pays out the open floor two above
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  trembleAt,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playSpinTick, playSwoosh } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// each bow pops up APPEAR_MS, the next APPEAR_STAGGER after
const APPEAR_MS = 130;
const APPEAR_STAGGER = 25;
const CHARGE_MS = 1150;
// the string cranked back in CLICKS notches, each snapping in over SNAP_MS
const CLICKS = 8;
const SNAP_MS = 45;
const CLICK_MS = 110;
// the bow's front GAP px left of its button's left end, its stock STOCK
// back, its limbs LIMB up and down, bent BEND and the string drawn DRAW at
// full crank (its own scaled OWN_SCALE)
const GAP = 150;
const STOCK = 190;
const LIMB = 92;
const BEND = 46;
const DRAW = 110;
const BOLT = 130;
const OWN_SCALE = 1.3;
const STOCK_W = 10;
const LIMB_W = 16;
const STRING_W = 6;
const BOLT_W = 14;
const TREMBLE = 7;
const OWN_TREMBLE = 12;
const GLOW = 170;
const STREAK_REACH = 150;
// the loosing: GAPS_MS apart down the column (closing), its own OWN_PAUSE
// after the rest; each bolt FLY_MS onto its button, the bow fading FADE_MS
// with its string twanging over TWANG_MS
const GAPS_MS: [number, number] = [70, 38];
const OWN_PAUSE = 90;
const FLY_MS = 60;
const FADE_MS = 240;
const TWANG_MS = 180;
const MUZZLE_MS = 140;
const MUZZLE = 70;
const TRAIL_MS = 120;
// a bolt's hit: a flash FLASH px round over FLASH_MS; its own a blast
const FLASH_MS = 220;
const FLASH = 90;
const OWN_FLASH = 160;
const OWN_BLAST = 380;
const HEAD = WISP_SIZE * 0.6;
const CLIMAX_SHAKE = 1.6;
// shakes by step: a jolt, a button, its own
const SHAKES = [0.3, 0.9, 3];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.25);

interface Bow {
  bar: number;
  own: boolean;
  scale: number;
  loose: number;
  // where its bolt's tip lay at the loose, from its button's middle
  fromX: number;
}
interface State {
  charge: Charge;
  // in loosing order, its own last
  bows: Bow[];
  clicks: number;
  clickAt: number;
  loosed: number;
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const nock: Point = { x: 0, y: 0 };
const tip: Point = { x: 0, y: 0 };
const mid: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const p: Point = { x: 0, y: 0 };
const edge: Point = { x: 0, y: 0 };
// the bolt in flight drawWispHead follows: from fly0 to fly1 from flyAt
const fly0: Point = { x: 0, y: 0 };
const fly1: Point = { x: 0, y: 0 };
let flyAt = 0;
const head: Point = { x: 0, y: 0 };
const boltAt = (ms: number): Point => {
  const u = clamp01((ms - flyAt) / FLY_MS);
  head.x = lerp(fly0.x, fly1.x, u);
  head.y = lerp(fly0.y, fly1.y, u);
  return head;
};

// each tap also paying out the open floor two above
const boltTaps = defineTapPerk("Bolt", (t) => {
  const up = t.floors[t.floors.indexOf(t.floor) + 2];
  if (up?.unlocked) t.payout(up, 1);
});

// a soft additive flash of light
function flash(
  ctx: CanvasRenderingContext2D,
  at: Point,
  r: number,
  alpha: number,
): void {
  if (alpha <= 0 || r <= 0) return;
  const previous = ctx.globalCompositeOperation;
  const was = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = was * alpha;
  drawGlow(ctx, GOLD, at.x, at.y, r * 1.6);
  drawGlow(ctx, WHITE, at.x, at.y, r * 0.7);
  ctx.globalAlpha = was;
  ctx.globalCompositeOperation = previous;
}

// overshoot into place, 0..1
const popIn = (u: number) => {
  const v = u - 1;
  return 1 + 2.7 * v * v * v + 1.7 * v * v;
};

registerFloorCrit("crossbowCrit", {
  reward(t) {
    boltTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const charge = planCharge(IN_MS, CHARGE_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const bows: Bow[] = [];
    let t = charge.climaxMs;
    for (let k = 0; k < order.length; k++) {
      const bar = order[k];
      const own = bar === 0;
      if (own && k > 0) t += OWN_PAUSE;
      const scale = own ? OWN_SCALE : 1;
      bows.push({
        bar,
        own,
        scale,
        loose: t,
        fromX: -BTN_W / 2 - GAP + (BOLT - DRAW - 8) * scale,
      });
      hit(bar, t + FLY_MS, own ? 2 : 1);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, order.length - 2));
    }
    states.set(r, { charge, bows, clicks: 0, clickAt: -1e9, loosed: 0 });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, bows } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    if (tickCharge(charge, ms, r.shake)) playSwoosh();
    const c = chargeAt(charge, ms);
    // the crank's clicks, quickening as the charge builds
    const notch = Math.min(CLICKS, Math.floor(c * (CLICKS + 0.5)));
    if (notch > state.clicks) {
      state.clicks = notch;
      state.clickAt = ms;
      playSpinTick(0.8 + (0.6 * notch) / CLICKS);
      r.shake(0.15 + 0.45 * c);
    }
    const crank =
      state.clicks === 0
        ? 0
        : (state.clicks - 1 + Math.min(1, (ms - state.clickAt) / SNAP_MS)) /
          CLICKS;
    const clickGlow = 1 - (ms - state.clickAt) / CLICK_MS;
    // the twang down the column
    while (state.loosed < bows.length && ms >= bows[state.loosed].loose) {
      const bow = bows[state.loosed++];
      playSpinTick(2.2);
      if (bow.own && state.loosed > 1) playSwoosh();
    }
    for (let i = 0; i < bows.length; i++) {
      const bow = bows[i];
      const button = bars[bow.bar];
      if (!button) continue;
      const s = bow.scale;
      const since = ms - bow.loose;
      const front = button.x - BTN_W / 2 - GAP;
      edge.x = button.x - BTN_W / 2 + 12;
      edge.y = button.y;
      // the bow, popping up, charging, then twanging and fading
      const shown = clamp01((ms - IN_MS - i * APPEAR_STAGGER) / APPEAR_MS);
      const fade = since < 0 ? 1 : 1 - since / FADE_MS;
      if (shown > 0 && fade > 0) {
        const size = s * popIn(shown);
        if (since < 0)
          trembleAt(c, ms + i * 53, bow.own ? OWN_TREMBLE : TREMBLE, shiver);
        else shiver.x = shiver.y = 0;
        const ox = front + shiver.x;
        const oy = button.y + shiver.y;
        const heat = since < 0 ? c : 1;
        // drawn back by the crank, then snapping past and quivering
        const d =
          since < 0
            ? crank
            : since < TWANG_MS
              ? -0.18 * (1 - since / TWANG_MS) * Math.sin(since * 0.15)
              : 0;
        const bend = BEND * size * d;
        const alpha = (0.45 + 0.55 * heat) * fade * Math.min(1, shown * 2);
        const glow = 0.7 + 0.6 * heat;
        a.x = ox - STOCK * size;
        a.y = oy;
        b.x = ox + 16 * size;
        b.y = oy;
        drawBeam(ctx, a, b, STOCK_W * size, alpha * 0.6);
        for (let side = -1; side <= 1; side += 2) {
          a.x = ox;
          a.y = oy;
          p.x = ox - bend * 0.4;
          p.y = oy + side * LIMB * size * 0.55;
          drawBeam(ctx, a, p, LIMB_W * size * glow, alpha);
          a.x = ox - bend;
          a.y = oy + side * LIMB * size;
          drawBeam(ctx, p, a, LIMB_W * size * 0.8 * glow, alpha);
          nock.x = ox - 8 * size - DRAW * size * Math.max(0, d);
          nock.y = oy;
          drawBeam(ctx, a, nock, STRING_W * size * glow, alpha);
        }
        if (since < 0) {
          tip.x = nock.x + BOLT * size;
          tip.y = oy;
          drawBeam(ctx, nock, tip, BOLT_W * size * glow, alpha);
          mid.x = (nock.x + tip.x) / 2;
          mid.y = oy;
          drawChargeStreaks(ctx, mid, c, STREAK_REACH * size, ms + i * 97);
          drawChargeGlow(ctx, mid, c * shown, GLOW * size, now);
          if (clickGlow > 0)
            flash(ctx, nock, 34 * size, clickGlow * (0.4 + 0.6 * c));
        }
        if (shown < 1) flash(ctx, nock, 60 * size, 1 - shown);
      }
      if (since < 0) continue;
      // the muzzle flash, the bolt streaking in and its hit
      if (since < MUZZLE_MS) {
        a.x = front;
        a.y = button.y;
        flash(ctx, a, MUZZLE * s, 1 - since / MUZZLE_MS);
      }
      fly0.x = button.x + bow.fromX;
      fly0.y = button.y;
      fly1.x = edge.x;
      fly1.y = edge.y;
      flyAt = bow.loose;
      const land = since - FLY_MS;
      if (land < TRAIL_MS) {
        boltAt(ms);
        drawBeam(
          ctx,
          fly0,
          head,
          BOLT_W * s * 0.8,
          land < 0 ? 0.7 : 0.7 * (1 - land / TRAIL_MS),
        );
      }
      if (land < 0) {
        a.x = head.x - BOLT * s;
        a.y = head.y;
        drawBeam(ctx, a, head, BOLT_W * s * 1.6, 1);
        drawWispHead(ctx, boltAt, ms, now, HEAD * s, 1);
        continue;
      }
      if (land < FLASH_MS) {
        const u = land / FLASH_MS;
        const r0 = bow.own ? OWN_FLASH : FLASH;
        flash(ctx, edge, r0 * (1 + 0.5 * u), (1 - u) * (1 - u));
      }
      if (bow.own) drawDetonation(ctx, edge, land, OWN_BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
