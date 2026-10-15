// Steamroller, a floor crit: a row of glitter balls sits along the top of
// every bar in view; the number turns into a heavy drum of light that drops
// onto the top bar and rolls along it, rumbling, riding up onto each ball and
// crushing it flat (a contact line, glitter squirting out both sides, a crack
// and a jolt), then drops onto the next bar and rolls back, bigger, quicker
// and heavier each, each bar's last ball a hit that levels it; on its own bar
// the drum is huge and stalls on one big ball, trembling, swelling, light
// pulled in, crushing it in jolts until the hardest crunch and the big blast
import { COLOR } from "../../../../palette";
import {
  crusherScale,
  drawCrushBurst,
  drawCrushContact,
  drawCrushStrain,
  squashScale,
  tickCrush,
  type Crush,
  type CrushStyle,
} from "../../../../shared/animationStyles/crush";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playBarExplosion } from "../../../../shared/explosionBang";
import { drawGlow } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../critPlayer";
import { BAR_HALF_H, ownLast } from "../../critPlayer/shared";

const TAU = Math.PI * 2;
const DOWN = Math.PI / 2;
const IN_MS = 160;
// the drum leaving the number ENTRY_R round, arcing ARC px over each hop
const ENTRY_R = 30;
const ARC = 70;
// the other bars' rolls: PASS_MS a weight (QUICKEN first to last), squeezed
// into OTHERS_MS with their drops but never under MIN_UNIT; DROP_MS a drop
const PASS_MS = 200;
const MIN_UNIT = 100;
const OTHERS_MS = 1250;
const QUICKEN: [number, number] = [1.3, 0.65];
const DROP_MS = 90;
const DROP_SPIN = 2;
const INSET = 70;
// its own bar: OWN_ROLL_MS to the big ball, stalling STALL_MS on it, jolting
// at JOLTS of the stall, crushing it from PRE to STALL_CRUSH
const OWN_ROLL_MS = 240;
const STALL_MS = 320;
const JOLTS = [0.3, 0.55, 0.74, 0.88];
const PRE = 0.45;
const STALL_CRUSH = 0.8;
const FADE_MS = 150;
// the drum's radius, first bar to last other bar, and on its own
const ROLLER: [number, number] = [55, 90];
const OWN_R = 150;
const RUMBLE: [number, number] = [2, 6];
const OWN_RUMBLE = 8;
const STALL_RUMBLE = 18;
const STALL_SWELL = 0.5;
const ROLLER_GLOW = 0.6;
const RIM = 16;
const SPOKES = 3;
const SPARKS = 8;
const STREAKS = 14;
// the balls: BALLS a bar across BALL_SPAN of the roll, BALL round, the last
// END_BALL; its own bar's at OWN_FRACS, the last BIG_BALL in its middle
const BALLS = 4;
const BALL_SPAN: [number, number] = [0.15, 0.88];
const BALL = 20;
const END_BALL = 27;
const OWN_FRACS = [0.3, 0.62, 1];
const OWN_BALL = 24;
const BIG_BALL = 50;
const BALL_GLOW = 0.5;
const GLINTS = 4;
const SHIVER = 3;
const APPEAR_MS = 120;
const SMEAR_MS = 320;
// each crush's contact: a small ball's width (of its radius) and power, a
// bar's last and its flash, its own, the climax
const CONTACT_MS = 260;
const SMALL_W = 4;
const SMALL_POWER: [number, number] = [0.35, 0.7];
const END_W = 220;
const END_POWER: [number, number] = [0.8, 1.2];
const END_FLASH = 240;
const END_FLASH_MS = 200;
const OWN_W = 460;
const OWN_POWER = 1.6;
const BIG_STRAIN = 300;
const BURST = 620;
const OWN_BLAST = 440;
// shakes by step (each crush shakes itself): a bar's last ball, its own
const SHAKES = [0.25, 0.6];

const STYLE: Required<CrushStyle> = {
  curve: 1,
  slamMs: 45,
  hold: 0.3,
  lift: [0, 0],
  spring: 0,
  shake: [0.25, 1.3],
  buzz: [8, 35],
  climaxShake: 3.4,
  bang: true,
};

const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);
const FLAT: Point = squashScale(1, { x: 0, y: 0 });

interface State {
  crush: Crush;
  // each roll: its bar, from and to off the bar's middle, rolling from start
  // to arrive, done at end (its own stalls), the drum's radius and its turn
  passBar: number[];
  passFrom: number[];
  passTo: number[];
  passStart: number[];
  passArrive: number[];
  passEnd: number[];
  passR: number[];
  passSpin: number[];
  // each ball: its roll, off its bar's middle, radius, crushed at, kind (0 a
  // ball, 1 a bar's last, 2 its own big one), and how crushed this frame
  ballPass: number[];
  ballDx: number[];
  ballR: number[];
  ballAt: number[];
  ballKind: number[];
  ballCrush: Float32Array;
  joltAt: number[];
  sounded: number;
}
const states = new WeakMap<Running, State>();
const stretch: Point = { x: 1, y: 1 };
const squash: Point = { x: 1, y: 1 };
const contact: Point = { x: 0, y: 0 };
const textOpts = { alpha: 1 };

registerFloorCrit("steamrollerCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const last = order.length - 1;
    const reach = r.play.barHalfWidth - INSET;
    const weights: number[] = [];
    let sum = 0;
    for (let k = 0; k < last; k++) {
      const w = lerp(QUICKEN[0], QUICKEN[1], last > 1 ? k / (last - 1) : 0);
      weights.push(w);
      sum += w;
    }
    const unit =
      last > 0
        ? Math.max(
            MIN_UNIT,
            Math.min(PASS_MS, (OTHERS_MS - DROP_MS * last) / sum),
          )
        : 0;
    const s: State = {
      crush: { slams: [], depths: [], style: STYLE, ticked: 0 },
      passBar: [],
      passFrom: [],
      passTo: [],
      passStart: [],
      passArrive: [],
      passEnd: [],
      passR: [],
      passSpin: [],
      ballPass: [],
      ballDx: [],
      ballR: [],
      ballAt: [],
      ballKind: [],
      ballCrush: new Float32Array(0),
      joltAt: [],
      sounded: 0,
    };
    const slams = s.crush.slams;
    let t = IN_MS;
    let x = -reach;
    let spin = 0;
    for (let k = 0; k <= last; k++) {
      const own = k === last;
      if (k > 0) {
        t += DROP_MS;
        spin +=
          (s.passTo[k - 1] - s.passFrom[k - 1]) / s.passR[k - 1] + DROP_SPIN;
      }
      // landing on the bar
      slams.push(t);
      const radius = own
        ? OWN_R
        : lerp(ROLLER[0], ROLLER[1], last > 1 ? k / (last - 1) : 0);
      const from = x;
      const to = own ? 0 : -x;
      const arrive = t + (own ? OWN_ROLL_MS : weights[k] * unit);
      const end = own ? arrive + STALL_MS : arrive;
      s.passBar.push(order[k]);
      s.passFrom.push(from);
      s.passTo.push(to);
      s.passStart.push(t);
      s.passArrive.push(arrive);
      s.passEnd.push(end);
      s.passR.push(radius);
      s.passSpin.push(spin);
      const count = own ? OWN_FRACS.length : BALLS;
      for (let i = 0; i < count; i++) {
        const f = own
          ? OWN_FRACS[i]
          : lerp(BALL_SPAN[0], BALL_SPAN[1], i / (BALLS - 1));
        const kind = i < count - 1 ? 0 : own ? 2 : 1;
        const at = kind === 2 ? end : t + (arrive - t) * f;
        s.ballPass.push(k);
        s.ballDx.push(from + (to - from) * f);
        s.ballR.push(
          kind === 2 ? BIG_BALL : kind === 1 ? END_BALL : own ? OWN_BALL : BALL,
        );
        s.ballAt.push(at);
        s.ballKind.push(kind);
        if (kind !== 2) slams.push(at);
      }
      if (own)
        for (const j of JOLTS) {
          s.joltAt.push(arrive + STALL_MS * j);
          slams.push(arrive + STALL_MS * j);
        }
      hit(order[k], s.ballAt[s.ballAt.length - 1], own ? 1 : 0);
      x = to;
      t = end;
    }
    // the climax last
    slams.sort((p, q) => p - q);
    slams.push(t);
    for (let i = 0; i < slams.length; i++) s.crush.depths.push(1);
    s.ballCrush = new Float32Array(s.ballAt.length);
    states.set(r, s);
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      textOpts.alpha = 1 - p;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.3 * p),
        textOpts,
      );
    }
    tickCrush(s.crush, ms, r.shake);
    const last = s.passBar.length - 1;
    const balls = s.ballAt.length;
    while (s.sounded < balls && ms >= s.ballAt[s.sounded]) {
      const j = s.sounded++;
      const f = s.ballPass[j] / Math.max(1, last);
      if (s.ballKind[j] === 0) playSpinTick(lerp(1.4, 2, f));
      else if (s.ballKind[j] === 1) playBarExplosion(lerp(1, 1.4, f));
    }
    crusherScale(s.crush, ms, stretch);

    // the drum: dropping onto roll k, or rolling along it
    let k = 0;
    while (k < last && ms >= s.passEnd[k]) k++;
    const bar = bars[s.passBar[k]];
    const top = bar.y - BAR_HALF_H;
    const start = s.passStart[k];
    const from = s.passFrom[k];
    const to = s.passTo[k];
    const onBar = ms >= start;
    let radius: number;
    let x: number;
    let y = 0;
    let spin: number;
    let q = 0;
    let alpha = 1;
    if (!onBar) {
      const off = k > 0 ? s.passEnd[k - 1] : 0;
      const p = clamp01((ms - off) / (start - off));
      const r0 = k > 0 ? s.passR[k - 1] : ENTRY_R;
      radius = lerp(r0, s.passR[k], p);
      let x0 = 0;
      let y0 = 0;
      if (k > 0) {
        const prev = bars[s.passBar[k - 1]];
        x0 = prev.x + s.passTo[k - 1];
        y0 = prev.y - BAR_HALF_H - r0;
      }
      const x1 = bar.x + from;
      const y1 = top - s.passR[k];
      const up = k === 0 || y1 < y0;
      const arc = up ? Math.max(0, y0 - y1) * 0.35 + ARC : 0;
      x = lerp(x0, x1, p);
      y = lerp(y0, y1, up ? p : p * p) - arc * 4 * p * (1 - p);
      spin = s.passSpin[k] - (1 - p) * DROP_SPIN;
    } else {
      const u = clamp01((ms - start) / (s.passArrive[k] - start));
      x = bar.x + from + (to - from) * u;
      radius = s.passR[k];
      spin = s.passSpin[k] + ((to - from) * u) / radius;
      if (k === last) {
        q = clamp01((ms - s.passArrive[k]) / STALL_MS);
        alpha = 1 - clamp01((ms - s.passEnd[k]) / FADE_MS);
      }
    }

    // each ball's crush, and how high the drum rides on the one under it
    let bump = 0;
    let jolts = 0;
    while (jolts < s.joltAt.length && ms >= s.joltAt[jolts]) jolts++;
    for (let j = 0; j < balls; j++) {
      let c = 0;
      if (ms >= s.ballAt[j]) c = 1;
      else if (onBar && s.ballPass[j] === k) {
        const b = s.ballR[j];
        const dx = Math.abs(x - bar.x - s.ballDx[j]);
        if (s.ballKind[j] === 2 && ms >= s.passArrive[k])
          c = PRE + ((STALL_CRUSH - PRE) * jolts) / JOLTS.length;
        else {
          const cover = clamp01(1 - dx / (radius + b));
          c = PRE * cover * cover;
        }
        const h = b * squashScale(c, squash).y;
        const reach = radius + h;
        if (dx < reach) {
          const ride = h + Math.sqrt(reach * reach - dx * dx) - radius;
          if (ride > bump) bump = ride;
        }
      }
      s.ballCrush[j] = c;
    }
    if (onBar) y = top - bump - radius * stretch.y;
    const amp =
      k === last && onBar
        ? OWN_RUMBLE + STALL_RUMBLE * q * q
        : lerp(RUMBLE[0], RUMBLE[1], last > 0 ? k / last : 1);
    const rollX = x + Math.sin(now * 0.091) * amp;
    const rollY = y + Math.cos(now * 0.137) * amp * 0.6;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    // the balls, the crushed ones a flat smear fading
    const show = clamp01((ms - 30) / APPEAR_MS);
    for (let j = 0; j < balls; j++) {
      const b = bars[s.passBar[s.ballPass[j]]];
      const bx = b.x + s.ballDx[j];
      const base = b.y - BAR_HALF_H;
      const size = s.ballR[j];
      const since = ms - s.ballAt[j];
      if (since >= 0) {
        if (since >= SMEAR_MS) continue;
        ctx.globalAlpha = 0.8 * (1 - since / SMEAR_MS);
        drawGlow(
          ctx,
          GOLD,
          bx,
          base - size * FLAT.y,
          size * FLAT.x * 1.5,
          FLAT.y / FLAT.x,
        );
        continue;
      }
      if (show <= 0) continue;
      const c = s.ballCrush[j];
      squashScale(c, squash);
      const rx = size * squash.x;
      const ry = size * squash.y;
      let cx = bx;
      let cy = base - ry;
      if (s.ballPass[j] === k) {
        const shiver = SHIVER * (0.4 + c * 3);
        cx += Math.sin(now * 0.08 + j * 1.7) * shiver;
        cy += Math.cos(now * 0.11 + j) * shiver * 0.5;
      }
      ctx.globalAlpha = show * BALL_GLOW;
      drawGlow(ctx, GOLD, cx, cy, rx * 1.8, ry / rx);
      ctx.globalAlpha = show;
      drawGlow(ctx, WHITE, cx, cy, rx * 0.8, ry / rx);
      for (let g = 0; g < GLINTS; g++) {
        const a = hash01(j, g + 1) * TAU + now * 0.004;
        stampGlimmer(
          ctx,
          cx + Math.cos(a) * rx * 0.6,
          cy + Math.sin(a) * ry * 0.6,
          size * 0.7 * (0.6 + 0.4 * Math.sin(now * 0.02 + g + j)),
          j * GLINTS + g,
          g % 2 ? COLOR.heavenlyGold : COLOR.white,
        );
      }
    }
    // the drum, its rim and spokes turning as it rolls
    if (alpha > 0 && (ms >= IN_MS * 0.3 || k > 0)) {
      const rx = radius * stretch.x;
      const ry = radius * stretch.y;
      const swell = 1 + STALL_SWELL * q * q;
      ctx.globalAlpha = alpha * ROLLER_GLOW;
      drawGlow(ctx, GOLD, rollX, rollY, rx * 1.7 * swell, ry / rx);
      ctx.globalAlpha = alpha;
      drawGlow(ctx, WHITE, rollX, rollY, rx * 0.8 * swell, ry / rx);
      for (let i = 0; i < RIM; i++) {
        const a = spin + (i * TAU) / RIM;
        stampGlimmer(
          ctx,
          rollX + Math.cos(a) * rx * 0.95,
          rollY + Math.sin(a) * ry * 0.95,
          radius * 0.34,
          i,
          i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
      for (let i = 0; i < SPOKES; i++) {
        const a = spin + (i * TAU) / SPOKES;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        stampGlimmer(
          ctx,
          rollX + ca * rx * 0.35,
          rollY + sa * ry * 0.35,
          radius * 0.26,
          i,
          COLOR.white,
        );
        stampGlimmer(
          ctx,
          rollX + ca * rx * 0.65,
          rollY + sa * ry * 0.65,
          radius * 0.26,
          i + 7,
          COLOR.heavenlyGold,
        );
      }
      if (onBar) {
        // grinding on the bar: a white-hot contact and sparks spat out behind
        const foot = rollY + ry;
        drawGlow(ctx, WHITE, rollX, foot, rx * (0.8 + 0.4 * q), 0.18);
        const back = to > from ? -1 : 1;
        for (let i = 0; i < SPARKS; i++) {
          const life = (now * 0.004 + hash01(i, 9)) % 1;
          stampGlimmer(
            ctx,
            rollX + back * life * radius * 1.4,
            foot -
              Math.sin(life * Math.PI) * radius * 0.5 * (0.5 + hash01(i, 10)),
            radius * 0.22 * (1 - life),
            i + 3,
            i % 2 ? COLOR.white : COLOR.heavenlyGold,
          );
        }
      }
      // light pulled in as it stalls on the big ball
      if (q > 0 && q < 1)
        for (let i = 0; i < STREAKS; i++) {
          const p = (q * 2.5 + hash01(i, 21)) % 1;
          const a = hash01(i, 22) * TAU;
          const d = radius * (2.8 - 1.9 * p * p);
          stampGlimmer(
            ctx,
            rollX + Math.cos(a) * d,
            rollY + Math.sin(a) * d,
            radius * 0.3 * p,
            i + 11,
            i % 3 ? COLOR.heavenlyGold : COLOR.white,
          );
        }
    }
    ctx.globalAlpha = 1;
    endLightBatch(ctx);
    ctx.restore();

    // each crush: cracks under the drum, the contact, a bar's flash, the climax
    for (let j = 0; j < balls; j++) {
      const since = ms - s.ballAt[j];
      const kind = s.ballKind[j];
      const b = bars[s.passBar[s.ballPass[j]]];
      contact.x = b.x + s.ballDx[j];
      contact.y = b.y - BAR_HALF_H;
      if (since < 0) {
        const c = s.ballCrush[j];
        if (kind === 0 || c <= 0) continue;
        squashScale(c, squash);
        const size = s.ballR[j];
        contact.y -= size * squash.y * 2;
        drawCrushStrain(
          ctx,
          contact,
          DOWN,
          size * squash.x * 2.4,
          c,
          kind === 2 ? BIG_STRAIN : size * 3,
          now,
        );
        continue;
      }
      if (since >= CONTACT_MS && kind !== 2) continue;
      const f = s.ballPass[j] / Math.max(1, last);
      if (kind === 0)
        drawCrushContact(
          ctx,
          contact,
          DOWN,
          s.ballR[j] * SMALL_W,
          since,
          lerp(SMALL_POWER[0], SMALL_POWER[1], f),
          now,
        );
      else if (kind === 1) {
        drawCrushContact(
          ctx,
          contact,
          DOWN,
          END_W,
          since,
          lerp(END_POWER[0], END_POWER[1], f),
          now,
        );
        if (since < END_FLASH_MS) {
          const u = since / END_FLASH_MS;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = (1 - u) * (1 - u);
          drawGlow(
            ctx,
            GOLD,
            contact.x,
            contact.y,
            END_FLASH * (0.6 + 0.4 * u),
          );
          ctx.restore();
        }
      } else {
        drawCrushContact(ctx, contact, DOWN, OWN_W, since, OWN_POWER, now);
        drawCrushBurst(ctx, contact, DOWN, BURST, since, now);
        drawDetonation(ctx, contact, since, OWN_BLAST, now);
      }
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
