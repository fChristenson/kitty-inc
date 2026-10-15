// Tunnel Meet, a floor crit: two drill heads swing in onto both ends of every
// bar in view at once, facing each other, bite and stall there rumbling and
// juddering, then bore in towards the middle together in eight quickening
// shoves, sparks gushing out above and below each; they break through and
// meet in the middle of each bar, top to bottom, its own bar last: a blinding
// flash where the tips touch, a bang, a blast and a burst of sparks, the hit
// that levels the bar
import { COLOR } from "../../../../palette";
import { drawDrillHead } from "../../../../shared/animationStyles/drill";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { easeIn, easeOut } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../critPlayer";
import { holeHash, ownLast } from "../../critPlayer/shared";

const IN_MS = 150;
// each pair swings in over SWING_MS from SWING_OUT px past the bar's end and
// SWING_UP px above (left) or below (right) it
const SWING_MS = 190;
const SWING_OUT = 240;
const SWING_UP = 230;
const STALL_MS = 420;
// the meetings spread top to bottom, at most MEET_SPREAD ms in all; the
// swings a share of that; its own bar held a beat longer
const MEET_STAGGER = 55;
const MEET_SPREAD = 300;
const SWING_SHARE = 0.4;
const OWN_HOLD = 90;
const SHOVES = 8;
const SHOVE_MS: [number, number] = [165, 75];
// the share of a shove spent lunging; the last lunge breaks through
const LUNGE = 0.4;
// they bite END_IN px in from the bar's ends and meet MEET px off its middle
const END_IN = 90;
const MEET = 6;
const SIZE = 78;
const TIP = WISP_SIZE * 0.7;
const JUDDER_STALL = 11;
const JUDDER_BORE = 4;
const JUDDER_MS = 16;
const TURN_SWING = 0.02;
const TURN_STALL = 0.08;
const TURN_BORE = 0.05;
// the tunnel bored behind each: dark, with a hot seam cooling after the meet
const TUNNEL_H = 30;
const HOT_H = 7;
const TUNNEL_FADE_MS = 520;
const HOT_COOL_MS = 380;
const TUNNEL_DARK = "#1a0d00";
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.3, 0.6];
const BITE_SHAKE = 0.7;
const SHOVE_SHAKE: [number, number] = [0.35, 0.85];
const JOLT_MERGE_MS = 35;
// shakes by step: a bar's meeting, its own bar's
const SHAKES = [1.3, 3];
// the meeting, other bars' then its own's
const FLASH_MS = 260;
const FLASH_R: [number, number] = [170, 330];
const BLAST = 290;
const BURST: [number, number] = [60, 150];
const BITE_BURST = 24;
const SHOVE_BURST = 14;
// the sparks: a ring of POOL, RATE_TOTAL a ms across all drills, at most
// RATE_MAX a ms a drill, grinding harder as they bore
const POOL = 1024;
const RATE_TOTAL = 2.2;
const RATE_MAX = 0.42;
const BORE_HARD: [number, number] = [1, 1.6];
const SPARK_LIFE: [number, number] = [220, 420];
const BURST_LIFE: [number, number] = [380, 620];
const SPARK_SPEED: [number, number] = [0.7, 1.6];
const BURST_SPEED: [number, number] = [0.9, 2.3];
const GRAVITY = 0.0028;
const STREAK_MS = 26;
const SPARK_W = 7;
const CHIP_R = 9;
// one in CHIP_EVERY is a chip (a glow) rather than a streak
const CHIP_EVERY = 5;
const MAX_DT = 50;
const TAIL_MS = DETONATION_MS;

const GOLD = fadeStops(COLOR.heavenlyGold);
const WHITE = fadeStops(COLOR.white, 0.3);

interface Bore {
  bar: number;
  own: boolean;
  swing: number;
  bite: number;
  shoves: number[];
  lands: number[];
  meet: number;
  // shove bursts fired, and whether it's bitten and met
  fired: number;
  bitten: boolean;
  met: boolean;
}
interface State {
  bores: Bore[];
  jolts: number[];
  powers: number[];
  rate: number;
  // sparks owed each drill, two a bore
  carry: Float32Array;
  lastMs: number;
}
const states = new WeakMap<Running, State>();

// the spark ring: offsets from their bar's middle at birth, px/ms
const sBar = new Int16Array(POOL);
const sX = new Float32Array(POOL);
const sY = new Float32Array(POOL);
const sVX = new Float32Array(POOL);
const sVY = new Float32Array(POOL);
const sBorn = new Float32Array(POOL);
const sLife = new Float32Array(POOL);
let next = 0;

const tip: Point = { x: 0, y: 0 };
const tipAt = () => tip;
const head: Point = { x: 0, y: 0 };
const tail: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };

function spawn(
  bar: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  born: number,
  life: number,
): void {
  const i = next;
  next = (next + 1) % POOL;
  sBar[i] = bar;
  sX[i] = x;
  sY[i] = y;
  sVX[i] = vx;
  sVY[i] = vy;
  sBorn[i] = born;
  sLife[i] = life;
}

// count sparks flung back out of a bite facing `facing` (±1 along x), up and
// down off the bar, born over the last dt ms
function gush(
  bar: number,
  x: number,
  y: number,
  facing: number,
  count: number,
  ms: number,
  dt: number,
  hard: number,
): void {
  for (let n = 0; n < count; n++) {
    const up = Math.random() < 0.5 ? -1 : 1;
    const back = 0.15 + 0.85 * Math.random();
    const norm = 1 / Math.sqrt(1 + back * back);
    const speed = lerp(SPARK_SPEED[0], SPARK_SPEED[1], Math.random()) * hard;
    spawn(
      bar,
      x - facing * 4 * Math.random(),
      y + (Math.random() - 0.5) * 12,
      -facing * back * norm * speed,
      up * norm * speed,
      ms - Math.random() * dt,
      lerp(SPARK_LIFE[0], SPARK_LIFE[1], Math.random()),
    );
  }
}

// count sparks blown out every way from where the tips meet
function burst(bar: number, x: number, count: number, ms: number): void {
  for (let n = 0; n < count; n++) {
    const a = Math.random() * Math.PI * 2;
    const speed = lerp(BURST_SPEED[0], BURST_SPEED[1], Math.random());
    spawn(
      bar,
      x,
      0,
      Math.cos(a) * speed,
      Math.sin(a) * speed,
      ms,
      lerp(BURST_LIFE[0], BURST_LIFE[1], Math.random()),
    );
  }
}

// how far in it's bored at ms, 0 (biting) to 1 (met)
function bored(b: Bore, ms: number): number {
  if (ms < b.shoves[0]) return 0;
  if (ms >= b.meet) return 1;
  let k = 0;
  while (k < SHOVES - 1 && ms >= b.shoves[k + 1]) k++;
  const lunge = b.lands[k] - b.shoves[k];
  return (k + easeOut(clamp01((ms - b.shoves[k]) / lunge))) / SHOVES;
}

registerFloorCrit("tunnelMeetCrit", {
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const n = order.length;
    const stagger = n > 1 ? Math.min(MEET_STAGGER, MEET_SPREAD / (n - 1)) : 0;
    const bores: Bore[] = [];
    const times: { at: number; power: number }[] = [];
    let firstShove = Infinity;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const swing = IN_MS + k * stagger * SWING_SHARE;
      const bite = swing + SWING_MS;
      let t = bite + STALL_MS + k * stagger * (1 - SWING_SHARE);
      if (own && n > 1) t += OWN_HOLD;
      firstShove = Math.min(firstShove, t);
      const shoves: number[] = [];
      const lands: number[] = [];
      for (let s = 0; s < SHOVES; s++) {
        const q = s / (SHOVES - 1);
        const len = lerp(SHOVE_MS[0], SHOVE_MS[1], q);
        shoves.push(t);
        lands.push(t + LUNGE * len);
        if (s < SHOVES - 1)
          times.push({
            at: t + LUNGE * len,
            power: lerp(SHOVE_SHAKE[0], SHOVE_SHAKE[1], q),
          });
        t += len;
      }
      const meet = lands[SHOVES - 1];
      bores.push({
        bar,
        own,
        swing,
        bite,
        shoves,
        lands,
        meet,
        fired: 0,
        bitten: false,
        met: false,
      });
      hit(bar, meet, own ? 1 : 0);
    });
    const bite = bores[0].bite;
    times.push({ at: bite, power: BITE_SHAKE });
    for (let t = bite + RUMBLE_MS; t < firstShove; t += RUMBLE_MS)
      times.push({
        at: t,
        power: lerp(RUMBLE[0], RUMBLE[1], (t - bite) / (firstShove - bite)),
      });
    times.sort((a, b) => a.at - b.at);
    const jolts: number[] = [];
    const powers: number[] = [];
    for (const j of times) {
      const last = jolts.length - 1;
      if (last >= 0 && j.at - jolts[last] < JOLT_MERGE_MS) {
        powers[last] = Math.max(powers[last], j.power);
        continue;
      }
      jolts.push(j.at);
      powers.push(j.power);
    }
    sBorn.fill(-1e9);
    states.set(r, {
      bores,
      jolts,
      powers,
      rate: Math.min(RATE_MAX, RATE_TOTAL / (2 * n)),
      carry: new Float32Array(2 * n),
      lastMs: 0,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { bores, jolts, powers, carry } = state;
    const dt = Math.max(0, Math.min(MAX_DT, ms - state.lastMs));
    state.lastMs = ms;
    if (ms < IN_MS) {
      const p = ms / IN_MS;
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 + 0.4 * p), {
        alpha: 1 - p,
      });
    }
    while (r.kicked < jolts.length && ms >= jolts[r.kicked])
      r.shake(powers[r.kicked++]);
    const end = r.play.barHalfWidth - END_IN;
    const previous = ctx.globalCompositeOperation;

    // the tunnels, dark behind the tips, with their hot seams
    for (let i = 0; i < bores.length; i++) {
      const b = bores[i];
      if (ms < b.bite || ms > b.meet + TUNNEL_FADE_MS) continue;
      const bar = bars[b.bar];
      const reach = lerp(end, MEET, bored(b, ms));
      const fade = 1 - clamp01((ms - b.meet) / TUNNEL_FADE_MS);
      const w = end - reach + SIZE * 0.2;
      ctx.globalCompositeOperation = previous;
      ctx.globalAlpha = 0.6 * fade;
      ctx.fillStyle = TUNNEL_DARK;
      ctx.fillRect(bar.x - end, bar.y - TUNNEL_H / 2, w, TUNNEL_H);
      ctx.fillRect(
        bar.x + reach - SIZE * 0.2,
        bar.y - TUNNEL_H / 2,
        w,
        TUNNEL_H,
      );
      const heat =
        ms < b.meet
          ? 0.55 + 0.25 * Math.sin(now * 0.05 + i)
          : 1 - clamp01((ms - b.meet) / HOT_COOL_MS);
      if (heat <= 0) continue;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = heat;
      ctx.fillStyle = ms < b.meet ? COLOR.heavenlyGold : COLOR.white;
      ctx.fillRect(bar.x - end, bar.y - HOT_H / 2, w, HOT_H);
      ctx.fillRect(bar.x + reach - SIZE * 0.2, bar.y - HOT_H / 2, w, HOT_H);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;

    // the drills: swinging in, stalled on the bite, boring in
    for (let i = 0; i < bores.length; i++) {
      const b = bores[i];
      if (ms < b.swing || ms >= b.meet) {
        if (ms >= b.meet && !b.met) {
          b.met = true;
          burst(b.bar, 0, b.own ? BURST[1] : BURST[0], b.meet);
        }
        continue;
      }
      const bar = bars[b.bar];
      const stalled = ms >= b.bite && ms < b.shoves[0];
      if (ms >= b.bite && !b.bitten) {
        b.bitten = true;
        gush(b.bar, -end, 0, 1, BITE_BURST, ms, dt, 1.2);
        gush(b.bar, end, 0, -1, BITE_BURST, ms, dt, 1.2);
      }
      while (b.fired < SHOVES - 1 && ms >= b.lands[b.fired]) {
        const reach = lerp(end, MEET, (b.fired + 1) / SHOVES);
        gush(b.bar, -reach, 0, 1, SHOVE_BURST, ms, dt, 1.4);
        gush(b.bar, reach, 0, -1, SHOVE_BURST, ms, dt, 1.4);
        b.fired++;
      }
      const d = bored(b, ms);
      const reach = lerp(end, MEET, d);
      const hard = stalled ? BORE_HARD[0] : lerp(BORE_HARD[0], BORE_HARD[1], d);
      const turn =
        ms * (ms < b.bite ? TURN_SWING : stalled ? TURN_STALL : TURN_BORE);
      for (let side = -1; side <= 1; side += 2) {
        let angle = side < 0 ? 0 : Math.PI;
        let alpha = 1;
        if (ms < b.bite) {
          // a curve from out past the end and above (or below), onto it
          const u = easeIn(clamp01((ms - b.swing) / SWING_MS));
          const ox = side * (end + SWING_OUT);
          const oy = side * SWING_UP;
          const v = 1 - u;
          tip.x = bar.x + v * v * ox + 2 * v * u * ox + u * u * side * end;
          tip.y = bar.y + v * v * oy;
          angle =
            side < 0
              ? lerp(Math.PI / 2, 0, u)
              : lerp(-Math.PI / 2, -Math.PI, u);
          alpha = clamp01(u * 4);
        } else {
          const salt = b.bar * 2 + (side > 0 ? 1 : 0);
          const judder = stalled ? JUDDER_STALL : JUDDER_BORE;
          const frame = Math.floor(ms / JUDDER_MS);
          tip.x =
            bar.x + side * reach + (holeHash(frame, 31 + salt) - 0.5) * judder;
          tip.y = bar.y + (holeHash(frame, 57 + salt) - 0.5) * judder * 1.4;
          // the gush out of the bite, and its white-hot contact
          const c = (side + 1) >> 1;
          const owed = carry[i * 2 + c] + state.rate * hard * dt;
          const count = Math.floor(owed);
          carry[i * 2 + c] = owed - count;
          gush(b.bar, tip.x - bar.x, tip.y - bar.y, -side, count, ms, dt, hard);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now * 0.09 + side);
          drawGlow(ctx, GOLD, tip.x, tip.y, SIZE * 0.9 * hard);
          drawGlow(ctx, WHITE, tip.x, tip.y, SIZE * 0.35 * hard);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = previous;
        }
        drawDrillHead(ctx, tip, angle, SIZE, turn, now, alpha);
        drawWispHead(ctx, tipAt, ms, now, TIP, stalled ? 1 : d, alpha);
      }
    }

    // the sparks: streaks flung out and falling, every few a chip
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < POOL; i++) {
      const age = ms - sBorn[i];
      const life = sLife[i];
      if (age < 0 || age >= life) continue;
      const bar = bars[sBar[i]];
      if (!bar) continue;
      const fade = 1 - age / life;
      const fall = 0.5 * GRAVITY;
      head.x = bar.x + sX[i] + sVX[i] * age;
      head.y = bar.y + sY[i] + sVY[i] * age + fall * age * age;
      if (i % CHIP_EVERY === 0) {
        ctx.globalAlpha = fade;
        drawGlow(ctx, GOLD, head.x, head.y, CHIP_R * (0.5 + 0.5 * fade));
        continue;
      }
      const back = Math.max(0, age - STREAK_MS);
      tail.x = bar.x + sX[i] + sVX[i] * back;
      tail.y = bar.y + sY[i] + sVY[i] * back + fall * back * back;
      drawBeam(ctx, tail, head, SPARK_W * (0.4 + 0.6 * fade), fade);
    }
    ctx.globalAlpha = 1;

    // the meetings: a blinding flash where the tips touch, light shot down
    // the tunnel both ways
    for (let i = 0; i < bores.length; i++) {
      const b = bores[i];
      const since = ms - b.meet;
      if (since < 0 || since >= FLASH_MS) continue;
      const bar = bars[b.bar];
      const p = since / FLASH_MS;
      const glare = (1 - p) * (1 - p);
      const radius =
        (b.own ? FLASH_R[1] : FLASH_R[0]) *
        (0.5 + 0.5 * easeOut(clamp01(since / 60)));
      ctx.globalAlpha = glare;
      drawGlow(ctx, GOLD, bar.x, bar.y, radius);
      drawGlow(ctx, WHITE, bar.x, bar.y, radius * 0.55);
      from.x = bar.x - end;
      from.y = bar.y;
      at.x = bar.x + end;
      at.y = bar.y;
      drawBeam(ctx, from, at, TUNNEL_H * 1.6 * (1 - p), glare);
    }
    endLightBatch(ctx);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    // the other bars' meetings land in their flash and burst; its own detonates
    for (let i = 0; i < bores.length; i++) {
      const b = bores[i];
      if (b.own) drawDetonation(ctx, bars[b.bar], ms - b.meet, BLAST, now);
    }
  },
  tailMs: TAIL_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
