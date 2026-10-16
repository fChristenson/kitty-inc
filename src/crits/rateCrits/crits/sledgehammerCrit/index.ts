// Sledgehammer, a rate crit: a glitter wisp sits on every bar's readout and
// a huge glowing sledgehammer swings up over the top one and slams it flat:
// a crack of light, contact lines, glitter spraying out both sides, the
// readout turning over; it swings on down the building, readout by readout,
// the swings quickening and the slams driving deeper; over its own readout it
// rears back highest, trembling and glowing white-hot, the rumble rising, and
// drops the hardest slam of all in the big blast. Each bar's next few fills
// run fast, the last of them landing one huge payout
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  crushAt,
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  planCrush,
  squashScale,
  type Crush,
  type CrushPose,
} from "../../../../shared/animationStyles/crush";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { smoothstep } from "../../../../shared/easing";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import { COLOR } from "../../../../palette";
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
const SHOW_MS = 120;
// the readouts READOUT of a bar's half width out, CONTACT_Y off its middle
const READOUT = 0.6;
const CONTACT_Y = -20;
// a slam a readout from FIRST_MS, the gaps closing over GAPS_MS; the climax
// wound up over CLIMAX_MS
const FIRST_MS = 380;
const GAPS_MS: [number, number] = [280, 120];
const CLIMAX_MS = 440;
// the wisps R round (its own OWN_R), crushed DEPTH flat first to last (its
// own all the way), hanging on flat GONE_MS; GLINTS glimmers round each
const R = 40;
const OWN_R = 58;
const DEPTH: [number, number] = [0.55, 0.9];
const GONE_MS = 110;
const WISP = WISP_SIZE * 1.2;
const GLINTS = 8;
const GLINT = 22;
const SPIN = 0.005;
// each slam's flash FLASH round over FLASH_MS, cracks CRACK px long over
// CRACK_MS, contact lines POWER strong first to last
const FLASH = 120;
const OWN_FLASH = 220;
const FLASH_MS = 160;
const CRACK = 90;
const OWN_CRACK = 170;
const CRACK_MS = 320;
const POWER: [number, number] = [0.5, 1];
const OWN_BLAST = 300;
// the hammer: its head HEAD_W by HEAD_H on a HANDLE px handle, swung back
// up to SWING radians round the hand, the hand rising RISE px with it; OWN
// times as big over its own readout, trembling TREMBLE px as it rears back
const HEAD_W = 200;
const HEAD_H = 100;
const HANDLE = 170;
const HANDLE_W = 24;
const FACE = HANDLE + HEAD_H / 2;
const SWING = 2.4;
const RISE = 60;
const OWN = 1.4;
const TREMBLE = 10;
const HEAT = 260;
// GHOSTS smears GHOST_MS apart behind each downswing
const GHOSTS = 3;
const GHOST_MS = 14;
// the hammer resting on the flattened readout HOLD_MS, fading over FADE_MS
const HOLD_MS = 120;
const FADE_MS = 200;
// the climax's rumble kicks, as shares of its wind-up
const RUMBLES = [0.4, 0.62, 0.78, 0.9];
const TAIL_MS = DETONATION_MS;
// shakes by step: a rumble, a slam, its own
const SHAKES = [0.35, 1.1, 3];

// the sprite: PAD round the hammer, RES px a unit, the hand at its origin
const PAD = 34;
const RES = 2;
const SPR_X = -HEAD_W / 2 - PAD;
const SPR_Y = -PAD;
const SPR_W = HEAD_W + 2 * PAD;
const SPR_H = FACE + 2 * PAD;

const FLASH_STOPS = fadeStops(COLOR.white, 0.2);
const HEAT_STOPS = fadeStops(COLOR.heavenlyGold, 0.25);

interface Target {
  bar: number;
  own: boolean;
  depth: number;
}
interface State {
  crush: Crush;
  targets: Target[];
  swooshed: number;
}
const states = new WeakMap<Running, State>();
const pose: CrushPose = { crush: 0, lift: 0, since: Infinity, press: -1 };
const ghost: CrushPose = { crush: 0, lift: 0, since: Infinity, press: -1 };
const squash: Point = { x: 1, y: 1 };
const hammerSquash: Point = { x: 1, y: 1 };
const jig: Point = { x: 0, y: 0 };
const centre: Point = { x: 0, y: 0 };
const contact: Point = { x: 0, y: 0 };
const atCentre = () => centre;
let hammer: HTMLCanvasElement | null = null;

// the bar's next `left` fills run fast, the last paying `smash` times over
const blows = defineBarEffect<{ left: number; smash: number }>({
  speed: () => meta.values.speed,
  payout: (v) => (v.left === 1 ? v.smash : 1),
  onPayout: (v) =>
    v.left > 1 ? { left: v.left - 1, smash: v.smash } : undefined,
});

// the sledgehammer, hand at the origin and head hanging below it, drawn once
function buildHammer(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SPR_W * RES;
  canvas.height = SPR_H * RES;
  const g = canvas.getContext("2d")!;
  g.scale(RES, RES);
  g.translate(-SPR_X, -SPR_Y);
  // a gold halo round the head
  g.save();
  g.translate(0, HANDLE);
  g.scale(SPR_W / 2 / (HEAD_H / 2 + PAD), 1);
  const halo = g.createRadialGradient(0, 0, 0, 0, 0, HEAD_H / 2 + PAD);
  halo.addColorStop(0, `${COLOR.heavenlyGold}cc`);
  halo.addColorStop(0.55, `${COLOR.heavenlyGold}55`);
  halo.addColorStop(1, `${COLOR.heavenlyGold}00`);
  g.fillStyle = halo;
  g.fillRect(
    -HEAD_H / 2 - PAD,
    -HEAD_H / 2 - PAD,
    HEAD_H + 2 * PAD,
    HEAD_H + 2 * PAD,
  );
  g.restore();
  // the handle
  g.beginPath();
  g.roundRect(-HANDLE_W / 2, -PAD / 2, HANDLE_W, HANDLE + PAD / 2, 10);
  g.fillStyle = COLOR.amber;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = COLOR.white;
  g.stroke();
  g.fillStyle = COLOR.heavenlyGold;
  g.fillRect(-HANDLE_W / 6, -PAD / 2 + 6, HANDLE_W / 3, HANDLE - 6);
  // the head: white-hot through the middle, banded, its face glaring
  const top = HANDLE - HEAD_H / 2;
  g.beginPath();
  g.roundRect(-HEAD_W / 2, top, HEAD_W, HEAD_H, 16);
  const body = g.createLinearGradient(0, top, 0, top + HEAD_H);
  body.addColorStop(0, COLOR.heavenlyGold);
  body.addColorStop(0.45, COLOR.white);
  body.addColorStop(1, COLOR.amber);
  g.fillStyle = body;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = COLOR.white;
  g.stroke();
  g.fillStyle = COLOR.amber;
  g.fillRect(-HEAD_W / 2 + 22, top + 3, 12, HEAD_H - 6);
  g.fillRect(HEAD_W / 2 - 34, top + 3, 12, HEAD_H - 6);
  g.fillStyle = COLOR.white;
  g.fillRect(-HEAD_W / 2 + 10, top + HEAD_H - 16, HEAD_W - 20, 9);
  return canvas;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// a target's readout x, and the y its wisp sits on
function readoutX(r: Running, bars: Point[], t: Target): number {
  return bars[t.bar].x + r.play.barHalfWidth * READOUT;
}
function baseY(bars: Point[], t: Target): number {
  return bars[t.bar].y + CONTACT_Y;
}

// how crushed target i's wisp is at ms
function crushOf(crush: Crush, i: number, depth: number, ms: number): number {
  const since = ms - crush.slams[i];
  return since < 0 ? 0 : depth * clamp01(since / 45);
}

// the top of target i's wisp at ms, squashed as it is
function topOf(state: State, bars: Point[], i: number, ms: number): number {
  const t = state.targets[i];
  squashScale(crushOf(state.crush, i, t.depth, ms), squash);
  return baseY(bars, t) - 2 * (t.own ? OWN_R : R) * squash.y;
}

registerFloorCrit("sledgehammerCrit", {
  reward(t) {
    t.flipRate();
    const v = meta.values;
    const left = t.own ? v.ownBlows : v.blows;
    const smash = t.own ? v.ownSmash : v.smash;
    const had = blows.get(t.floor);
    blows.set(t.floor, {
      left: Math.max(left, had?.left ?? 0),
      smash: Math.max(smash, had?.smash ?? 0),
    });
  },
  plan(r, bars, hit) {
    if (bars.length === 0) return;
    hammer ??= buildHammer();
    const order = ownLast(bars);
    const n = order.length;
    const lastGap = n > 2 ? GAPS_MS[1] : GAPS_MS[0];
    const crush = planCrush(
      n > 1 ? FIRST_MS : IN_MS + CLIMAX_MS,
      n,
      GAPS_MS,
      CLIMAX_MS / lastGap,
      { bang: false, lift: [0.45, 0.75], hold: 0.25 },
    );
    const targets: Target[] = [];
    for (let i = 0; i < n; i++) {
      const own = order[i] === 0;
      targets.push({
        bar: order[i],
        own,
        depth: own ? 1 : lerp(DEPTH[0], DEPTH[1], i / Math.max(1, n - 2)),
      });
      hit(order[i], crush.slams[i], own ? 2 : 1);
    }
    // the rumble rising as it rears back over its own readout
    const end = crush.slams[n - 1];
    const from = n > 1 ? crush.slams[n - 2] : IN_MS;
    for (const k of RUMBLES) hit(0, from + (end - from) * k, 0);
    states.set(r, { crush, targets, swooshed: 0 });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state || !hammer) return;
    const { crush, targets } = state;
    const slams = crush.slams;
    const n = targets.length;
    const last = n - 1;
    if (n === 0 || slams.length !== n) return;
    for (let i = 0; i < n; i++) if (!bars[targets[i].bar]) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    const show = clamp01((ms - IN_MS) / SHOW_MS);
    if (show <= 0) return;
    const slamMs = crush.style.slamMs;
    while (state.swooshed < n && ms >= slams[state.swooshed] - slamMs) {
      state.swooshed++;
      playSwoosh();
    }

    // the wisps' glitter, all in one batch
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = show;
    beginLightBatch(ctx);
    for (let i = 0; i < n; i++) {
      const t = targets[i];
      if (ms - slams[i] >= GONE_MS) continue;
      squashScale(crushOf(crush, i, t.depth, ms), squash);
      const radius = (t.own ? OWN_R : R) * 1.2;
      const x = readoutX(r, bars, t);
      const cy = baseY(bars, t) - (t.own ? OWN_R : R) * squash.y;
      for (let g = 0; g < GLINTS; g++) {
        const a = (g / GLINTS) * Math.PI * 2 + ms * SPIN;
        stampGlimmer(
          ctx,
          x + Math.cos(a) * radius * squash.x,
          cy + Math.sin(a) * radius * squash.y,
          GLINT * (t.own ? 1.3 : 1),
          g + i * GLINTS,
          g % 3 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    // the wisps, and each slam's flash, cracks and contact
    for (let i = 0; i < n; i++) {
      const t = targets[i];
      const own = t.own;
      const since = ms - slams[i];
      const radius = own ? OWN_R : R;
      squashScale(crushOf(crush, i, t.depth, ms), squash);
      const x = readoutX(r, bars, t);
      const base = baseY(bars, t);
      if (since < GONE_MS) {
        centre.x = x;
        centre.y = base - radius * squash.y;
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.scale(squash.x, squash.y);
        ctx.translate(-centre.x, -centre.y);
        drawWispHead(
          ctx,
          atCentre,
          ms,
          now,
          WISP * (own ? 1.4 : 1),
          crushOf(crush, i, t.depth, ms),
          show,
        );
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (since < 0) continue;
      const width = 2 * radius * squash.x;
      contact.x = x;
      contact.y = base;
      if (since < CRACK_MS)
        drawCrushStrain(
          ctx,
          contact,
          Math.PI / 2,
          width,
          t.depth * (1 - since / CRACK_MS),
          own ? OWN_CRACK : CRACK,
          now,
        );
      if (since < FLASH_MS) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1 - since / FLASH_MS;
        drawGlow(
          ctx,
          FLASH_STOPS,
          x,
          base,
          Math.max(0, (own ? OWN_FLASH : FLASH) * (1.4 - since / FLASH_MS)),
        );
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = previous;
      }
      contact.y = base - 2 * radius * squash.y;
      drawCrushContact(
        ctx,
        contact,
        Math.PI / 2,
        width * 1.2,
        since,
        own ? 1.6 : lerp(POWER[0], POWER[1], i / Math.max(1, n - 1)),
        now,
      );
      if (own) {
        contact.y = base;
        drawCrushBurst(ctx, contact, Math.PI / 2, width, since, now);
        drawDetonation(ctx, contact, since, OWN_BLAST, now);
      }
    }

    // the hammer: swinging from the readout it last hit to the next
    const fade = 1 - clamp01((ms - slams[last] - HOLD_MS) / FADE_MS);
    if (fade <= 0) return;
    crushAt(crush, ms, pose);
    const k = pose.press;
    const j = Math.min(k + 1, last);
    const from = k < 0 ? 0 : Math.min(k, last);
    let lift = pose.lift;
    let move = 1;
    if (k < 0) {
      const top = slams[0] - slamMs;
      lift *= smoothstep(clamp01((ms - IN_MS) / Math.max(1, top - IN_MS)));
    } else if (k < last) {
      const top = slams[j] - slamMs;
      const rise = slams[k] + (top - slams[k]) * crush.style.hold;
      move = smoothstep(clamp01((ms - rise) / Math.max(1, top - rise)));
    }
    const a = targets[from];
    const b = targets[j];
    const scale = mix(a.own ? OWN : 1, b.own ? OWN : 1, move);
    const faceY = mix(
      topOf(state, bars, from, ms),
      topOf(state, bars, j, ms),
      move,
    );
    let hx = mix(readoutX(r, bars, a), readoutX(r, bars, b), move);
    let hy = faceY - (FACE + RISE * lift) * scale;
    // rearing back over its own readout: trembling, glowing white-hot
    const heat = j === last && k === last - 1 ? lift : 0;
    if (heat > 0) {
      trembleAt(heat, ms, TREMBLE, jig);
      hx += jig.x;
      hy += jig.y;
    }
    crusherScale(crush, ms, hammerSquash);
    const alpha = show * fade;
    const slamming = k < last && ms >= slams[j] - slamMs;
    ctx.globalCompositeOperation = "lighter";
    if (slamming)
      for (let g = GHOSTS; g >= 1; g--) {
        crushAt(crush, ms - g * GHOST_MS, ghost);
        ctx.globalAlpha = (alpha * 0.4) / g;
        drawHammer(ctx, hx, hy, ghost.lift * SWING, scale, hammerSquash);
      }
    if (heat > 0) {
      const angle = lift * SWING;
      ctx.globalAlpha = alpha * heat;
      drawGlow(
        ctx,
        HEAT_STOPS,
        hx - Math.sin(angle) * HANDLE * scale,
        hy + Math.cos(angle) * HANDLE * scale,
        Math.max(0, HEAT * scale * heat * (1 + 0.15 * Math.sin(now * 0.06))),
      );
    }
    ctx.globalCompositeOperation = previous;
    ctx.globalAlpha = alpha;
    drawHammer(ctx, hx, hy, lift * SWING, scale, hammerSquash);
    ctx.globalAlpha = 1;
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});

// the hammer, hand at (hx, hy), swung `angle` back round it, squashed about
// its face
function drawHammer(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  angle: number,
  scale: number,
  sq: Point,
): void {
  if (!hammer) return;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(angle);
  ctx.translate(0, FACE * scale);
  ctx.scale(sq.x * scale, sq.y * scale);
  ctx.translate(0, -FACE);
  ctx.drawImage(hammer, SPR_X, SPR_Y, SPR_W, SPR_H);
  ctx.restore();
}
