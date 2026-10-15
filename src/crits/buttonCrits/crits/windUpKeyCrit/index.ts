// Wind-Up Key, a button crit: the number fades and a big clockwork key of
// light pops out of the left end of every button in view; all of them turn
// together in quarter-turn clicks, each a tick and a jolt, quicker and
// quicker, the spring winding tighter: trembling harder, glowing hotter,
// light streaking in, the rumble rising; at the climax the keys spin free in
// a blur and the stored energy bursts down each shaft into its button in a
// quick ripple down the column, a flash on each, its own last with the
// biggest burst and blast: each of their next taps also boosts every worker
// on the open floors just above and below the tapped one
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { activateBoosted, type Floor } from "../../../../gameState";
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
import { playBloop, playSpinTick, playSwoosh } from "../../../../sound";
import { BTN_W } from "../../../../floors/upgradeButton";
import { clickWorker, getRenderedWorkerCount } from "../../../../floors/worker";
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
// each key pops out APPEAR_MS, the next APPEAR_STAGGER after
const APPEAR_MS = 130;
const APPEAR_STAGGER = 25;
const CHARGE_MS = 1150;
// wound in CLICKS quarter turns, each snapping round over SNAP_MS, its flash
// and jolt (JOLT px kicked back off the button) dying over CLICK_MS
const CLICKS = 10;
const SNAP_MS = 55;
const CLICK_MS = 110;
const JOLT = 14;
// at rest each bow is turned this far, so every quarter turn sweeps it
// through edge-on and back
const REST = Math.PI / 4;
// the key: its tip BIT px off the button's left end, the shaft SHAFT long,
// a collar COLLAR px up and down, then the bow BOW_L long and BOW_H up and
// down each lobe (its own scaled OWN_SCALE)
const BIT = 16;
const SHAFT = 70;
const COLLAR = 26;
const BOW_L = 120;
const BOW_H = 74;
const OWN_SCALE = 1.3;
const SHAFT_W = 14;
const COLLAR_W = 12;
const LOBE_W = 12;
const TREMBLE = 7;
const OWN_TREMBLE = 12;
const GLOW = 190;
const STREAK_REACH = 160;
// spinning free SPIN_MS after the climax before the first burst, at
// SPIN_RATE rad/ms rising by SPIN_GAIN rad/ms²; ghosts GHOST rad behind
const SPIN_MS = 200;
const SPIN_RATE = 0.035;
const SPIN_GAIN = 0.0001;
const GHOST = 0.45;
const CLIMAX_FLASH_MS = 170;
const CLIMAX_FLASH = 110;
// the bursts: GAPS_MS apart down the column (closing), its own OWN_PAUSE
// after the rest; each running down its shaft RUN_MS, the key fading FADE_MS
const GAPS_MS: [number, number] = [60, 32];
const OWN_PAUSE = 90;
const RUN_MS = 60;
const FADE_MS = 200;
const PULSE_W = 26;
const HEAD = WISP_SIZE * 0.6;
// a burst's hit: a flash FLASH px round over FLASH_MS; its own a blast
const FLASH_MS = 220;
const FLASH = 90;
const OWN_FLASH = 170;
const OWN_BLAST = 380;
const CLIMAX_SHAKE = 1.6;
// shakes by step: a jolt, a button, its own
const SHAKES = [0.3, 0.9, 3];

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.25);

interface Key {
  bar: number;
  own: boolean;
  scale: number;
  burst: number;
}
interface State {
  charge: Charge;
  // in bursting order, its own last
  keys: Key[];
  clicks: number;
  clickAt: number;
  burst: number;
}
const states = new WeakMap<Running, State>();
const shiver: Point = { x: 0, y: 0 };
const a: Point = { x: 0, y: 0 };
const b: Point = { x: 0, y: 0 };
const p0: Point = { x: 0, y: 0 };
const p1: Point = { x: 0, y: 0 };
const p2: Point = { x: 0, y: 0 };
const p3: Point = { x: 0, y: 0 };
const bow: Point = { x: 0, y: 0 };
const collar: Point = { x: 0, y: 0 };
const edge: Point = { x: 0, y: 0 };
// the burst running down a shaft that drawWispHead follows: from run0 to
// run1 from runAt
const run0: Point = { x: 0, y: 0 };
const run1: Point = { x: 0, y: 0 };
let runAt = 0;
const head: Point = { x: 0, y: 0 };
const runHead = (ms: number): Point => {
  const u = clamp01((ms - runAt) / RUN_MS);
  head.x = lerp(run0.x, run1.x, u * u);
  head.y = lerp(run0.y, run1.y, u * u);
  return head;
};

// every worker on an open floor boosted as if tapped; how many
function windUp(floor: Floor | undefined, now: number): number {
  if (!floor?.unlocked) return 0;
  const count = getRenderedWorkerCount(floor);
  for (let i = 0; i < count; i++) {
    clickWorker(floor, i, now);
    activateBoosted(floor, i, now);
  }
  return count;
}

// each tap also boosting every worker on the open floors just above and below
const windTaps = defineTapPerk("Wind", (t) => {
  const k = t.floors.indexOf(t.floor);
  const now = Date.now();
  if (windUp(t.floors[k + 1], now) + windUp(t.floors[k - 1], now) > 0)
    playBloop();
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

// the key's butterfly bow from hub (x) leftwards, turned theta round the
// shaft: its lobes squashed by the turn, the nearer one thicker
function drawBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  theta: number,
  width: number,
  alpha: number,
): void {
  if (alpha <= 0) return;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const l = BOW_L * s;
  for (let side = -1; side <= 1; side += 2) {
    const h = side * BOW_H * s * cos;
    const w = width * (1 + 0.3 * side * sin);
    p0.x = x;
    p0.y = y + h * 0.18;
    p1.x = x - l * 0.12;
    p1.y = y + h;
    p2.x = x - l * 0.88;
    p2.y = y + h;
    p3.x = x - l;
    p3.y = y + h * 0.18;
    drawBeam(ctx, p0, p1, w, alpha);
    drawBeam(ctx, p1, p2, w, alpha);
    drawBeam(ctx, p2, p3, w, alpha);
  }
  a.x = b.x = x - l;
  a.y = y - BOW_H * s * 0.18 * cos;
  b.y = y + BOW_H * s * 0.18 * cos;
  drawBeam(ctx, a, b, width, alpha);
}

registerFloorCrit("windUpKeyCrit", {
  reward(t) {
    windTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const charge = planCharge(IN_MS, CHARGE_MS, {
      climaxShake: CLIMAX_SHAKE,
      bang: false,
    });
    const keys: Key[] = [];
    let t = charge.climaxMs + SPIN_MS;
    for (let k = 0; k < order.length; k++) {
      const bar = order[k];
      const own = bar === 0;
      if (own && k > 0) t += OWN_PAUSE;
      keys.push({ bar, own, scale: own ? OWN_SCALE : 1, burst: t });
      hit(bar, t + RUN_MS, own ? 2 : 1);
      t += lerp(GAPS_MS[0], GAPS_MS[1], k / Math.max(1, order.length - 2));
    }
    states.set(r, { charge, keys, clicks: 0, clickAt: -1e9, burst: 0 });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { charge, keys } = state;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    if (tickCharge(charge, ms, r.shake)) playSwoosh();
    const c = chargeAt(charge, ms);
    // the quarter-turn clicks, quickening as the charge builds
    const notch = Math.min(CLICKS, Math.floor(c * (CLICKS + 0.5)));
    if (notch > state.clicks) {
      state.clicks = notch;
      state.clickAt = ms;
      playSpinTick(0.8 + (0.8 * notch) / CLICKS);
      r.shake(0.15 + 0.5 * c);
    }
    const climax = charge.climaxMs;
    const spun = ms - climax;
    const theta =
      spun >= 0
        ? REST + (Math.PI / 2) * CLICKS + spun * (SPIN_RATE + SPIN_GAIN * spun)
        : state.clicks === 0
          ? REST
          : REST +
            (Math.PI / 2) *
              (state.clicks -
                1 +
                popIn(Math.min(1, (ms - state.clickAt) / SNAP_MS)));
    const clickGlow = Math.max(0, 1 - (ms - state.clickAt) / CLICK_MS);
    while (state.burst < keys.length && ms >= keys[state.burst].burst) {
      const key = keys[state.burst++];
      playSpinTick(key.own ? 2.6 : 2.2);
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const button = bars[key.bar];
      if (!button) continue;
      const since = ms - key.burst;
      const shown = clamp01((ms - IN_MS - i * APPEAR_STAGGER) / APPEAR_MS);
      const fade = since < 0 ? 1 : 1 - since / FADE_MS;
      const left = button.x - BTN_W / 2;
      edge.x = left + 12;
      edge.y = button.y;
      if (shown > 0 && fade > 0) {
        const s = key.scale * popIn(shown);
        trembleAt(
          spun < 0 ? c : 1,
          ms + i * 53,
          key.own ? OWN_TREMBLE : TREMBLE,
          shiver,
        );
        const ox = left - BIT * s + shiver.x - JOLT * s * clickGlow * clickGlow;
        const oy = button.y + shiver.y;
        const heat = spun < 0 ? c : 1;
        const glow = 0.7 + 0.6 * heat;
        const alpha = (0.45 + 0.55 * heat) * fade * Math.min(1, shown * 2);
        collar.x = ox - SHAFT * s;
        collar.y = oy;
        a.x = ox;
        a.y = oy;
        drawBeam(ctx, a, collar, SHAFT_W * s * glow, alpha);
        a.x = b.x = collar.x;
        a.y = oy - COLLAR * s;
        b.y = oy + COLLAR * s;
        drawBeam(ctx, a, b, COLLAR_W * s * glow, alpha);
        const hub = collar.x - 8 * s;
        drawBow(ctx, hub, oy, s, theta, LOBE_W * s * glow, alpha);
        bow.x = hub - BOW_L * s * 0.5;
        bow.y = oy;
        if (spun < 0) {
          drawChargeStreaks(ctx, bow, c, STREAK_REACH * s, ms + i * 97);
          drawChargeGlow(ctx, bow, c * shown, GLOW * s, now);
          if (clickGlow > 0)
            flash(ctx, collar, 34 * s, clickGlow * (0.4 + 0.6 * c));
        } else {
          // spinning free: a blur of ghost bows behind it
          drawBow(ctx, hub, oy, s, theta - GHOST, LOBE_W * s, alpha * 0.45);
          drawBow(ctx, hub, oy, s, theta - GHOST * 2, LOBE_W * s, alpha * 0.2);
          drawChargeGlow(ctx, bow, fade, GLOW * s, now);
          if (spun < CLIMAX_FLASH_MS)
            flash(ctx, bow, CLIMAX_FLASH * s, 1 - spun / CLIMAX_FLASH_MS);
        }
        if (since < 0) continue;
        run0.x = collar.x;
        run0.y = oy;
      } else if (since < 0) continue;
      // the stored energy bursting down the shaft into the button
      const s = key.scale;
      run1.x = edge.x;
      run1.y = edge.y;
      runAt = key.burst;
      const land = since - RUN_MS;
      if (land < 0) {
        runHead(ms);
        drawBeam(ctx, run0, head, PULSE_W * s, 0.9);
        drawWispHead(ctx, runHead, ms, now, HEAD * s, 1);
        continue;
      }
      if (land < FLASH_MS) {
        const u = land / FLASH_MS;
        flash(
          ctx,
          edge,
          (key.own ? OWN_FLASH : FLASH) * (1 + 0.5 * u),
          (1 - u) * (1 - u),
        );
      }
      if (key.own) drawDetonation(ctx, edge, land, OWN_BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
