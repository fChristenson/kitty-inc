// Turret, a rate crit: the number shrinks into a turret wisp hovering left of
// the bars and spins up, trembling and glowing, its three barrels spraying
// spirals of wisp bullets that sweep across every readout (each crossing a
// jolt), spinning faster, the spirals denser; then it snaps still and locks
// on, firing one dead-straight volley into each readout top to bottom, each
// turning over with a blast, its own last and fattest: each bar's next
// payouts are lucky shots, any of them maybe paying five times
import meta from "./meta";
import { defineBarEffect } from "../../rateBonus";
import {
  aimBullet,
  bulletSpiral,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import {
  bottomBarY,
  holeHash,
  ownLast,
  topBarY,
} from "../../../floorCrits/critPlayer/shared";

const TAU = Math.PI * 2;
// the number shrinking into the turret, INSET in from the screen's left
// edge, halfway down the bars in view
const IN_MS = 170;
const INSET = 110;
const TURRET = WISP_SIZE * 1.6;
const HEAT_GROW = 0.5;
// the readouts READOUT of a bar's half width right of its middle
const READOUT = 0.6;
// the spin: ARMS barrels whirling from SPIN_FROM to SPIN_TO, each firing
// RATE_HZ shots a second and turning LAPS_HZ laps a second, both ramping up
const SPIN_FROM = 200;
const SPIN_TO = 1050;
const ARMS = 3;
const RATE_HZ: [number, number] = [12, 40];
const LAPS_HZ: [number, number] = [0.7, 3.2];
// px per ms; the spray dies PAST px past the bars and screen
const SPIN_SPEED = 6;
const PAST = 320;
const SPIN_ROUND = WISP_SIZE * 0.42;
const SPIN_FLASH = 70;
const FLICKER_MS = 45;
const TREMBLE = 10;
// a readout jolted no more than once every JOLT_GAP_MS
const JOLT_GAP_MS = 80;
const JOLT_SPARK = 70;
const SPARK_MS = 150;
const RUMBLE_MS = 100;
const RUMBLE: [number, number] = [0.1, 0.45];
const LOCK_SHAKE = 0.9;
// the lock: snapping still onto the top readout over SNAP_MS, then a volley
// of ROUNDS rounds ROUND_MS apart into each readout VOLLEY_GAP_MS after the
// one above, its own OWN_GAP_MS later still; each round lands in about
// FLIGHT_MS, never slower than MIN_SPEED px per ms
const LOCK_MS = 130;
const SNAP_MS = 80;
const AIM_LEAD_MS = 40;
const VOLLEY_GAP_MS = 70;
const OWN_GAP_MS = 110;
const ROUNDS = 4;
const OWN_ROUNDS = 7;
const ROUND_MS = 22;
const OWN_ROUND_MS = 20;
const FLIGHT_MS = 120;
const MIN_SPEED = 5;
const SPREAD: Point = { x: 40, y: 14 };
const VOLLEY_ROUND = WISP_SIZE * 0.6;
const OWN_ROUND = WISP_SIZE * 0.85;
const VOLLEY_FLASH = 110;
const OWN_FLASH = 170;
const FLASH_MS = 70;
const RECOIL = 30;
const RECOIL_MS = 60;
const BLAST = 170;
const OWN_BLAST = 340;
const FADE_MS = 180;
// shakes by step: a jolt, a readout turned over, its own
const SHAKES = [0.35, 1.1, 3];

interface State {
  // the own bar where planned: everything is drawn off it as the bars scroll
  x0: number;
  y0: number;
  turret: Point;
  readX: Float32Array;
  readY: Float32Array;
  // the spiral's bullets, then the volleys', by when they're fired
  bullets: Bullet[];
  spiralCount: number;
  size: Float32Array;
  angle: Float32Array;
  flash: Float32Array;
  maxFlight: number;
  bulletFrom: number;
  joltAt: Float32Array;
  joltBar: Int16Array;
  joltFrom: number;
  volleyStart: Float32Array;
  volleyAngle: Float32Array;
  blastAt: Float32Array;
  blastBar: Int16Array;
  blastSize: Float32Array;
  lastFire: number;
  endAngle: number;
  rumbleAt: Float32Array;
  rumbleShake: Float32Array;
}
const states = new WeakMap<Running, State>();
const head: Point = { x: 0, y: 0 };
const atHead = () => head;
const muzzle: Point = { x: 0, y: 0 };
const spot: Point = { x: 0, y: 0 };

const wrap = (a: number) => a - TAU * Math.round(a / TAU);

// the first barrel's angle ms into the crit, while it spins
function spinAngle(ms: number): number {
  const s = Math.max(0, Math.min(ms, SPIN_TO) - SPIN_FROM) / 1000;
  const span = (SPIN_TO - SPIN_FROM) / 1000;
  return (
    -Math.PI / 2 +
    TAU * (LAPS_HZ[0] * s + ((LAPS_HZ[1] - LAPS_HZ[0]) * s * s) / (2 * span))
  );
}

// lucky shots: payouts left, and what the coming one pays (rolled ahead, so
// the readout shows it)
interface Lucky {
  left: number;
  mult: number;
}
const roll = () =>
  Math.random() < 1 / meta.values.odds ? meta.values.lucky : 1;
const luckyShots = defineBarEffect<Lucky>({
  payout: (shots) => shots.mult,
  onPayout: (shots) =>
    shots.left > 1 ? { left: shots.left - 1, mult: roll() } : undefined,
});

registerFloorCrit("turretCrit", {
  reward(t) {
    t.flipRate();
    const left = luckyShots.get(t.floor)?.left ?? 0;
    luckyShots.set(t.floor, {
      left: left + (t.own ? meta.values.ownPayouts : meta.values.payouts),
      mult: roll(),
    });
    t.punch("Lucky Shots");
  },
  plan(r, bars, hit) {
    const half = r.play.barHalfWidth;
    const n = bars.length;
    const readX = new Float32Array(n);
    const readY = new Float32Array(n);
    for (let b = 0; b < n; b++) {
      readX[b] = bars[b].x + half * READOUT;
      readY[b] = bars[b].y;
    }
    const top = topBarY(bars);
    const bottom = bottomBarY(bars);
    const turret = { x: -r.viewportWidth / 2 + INSET, y: (top + bottom) / 2 };
    const box = {
      left: -r.viewportWidth / 2 - PAST,
      right: r.viewportWidth / 2 + PAST,
      top: top - PAST,
      bottom: bottom + PAST,
    };
    const spiral = bulletSpiral(
      turret,
      {
        arms: ARMS,
        rateHz: RATE_HZ,
        lapsHz: LAPS_HZ,
        fromMs: SPIN_FROM,
        toMs: SPIN_TO,
        turn: -Math.PI / 2,
        spin: 1,
      },
      SPIN_SPEED,
      box,
    );

    // a jolt wherever a barrel's stream sweeps across a readout
    const readAngle = new Float32Array(n);
    const readDist = new Float32Array(n);
    for (let b = 0; b < n; b++) {
      readAngle[b] = Math.atan2(readY[b] - turret.y, readX[b] - turret.x);
      readDist[b] = Math.hypot(readY[b] - turret.y, readX[b] - turret.x);
    }
    const lastJolt = new Float64Array(n).fill(-Infinity);
    const jolts: { at: number; bar: number }[] = [];
    for (let i = 0; i + ARMS < spiral.length; i++) {
      const a = Math.atan2(spiral[i].dy, spiral[i].dx);
      const b = Math.atan2(spiral[i + ARMS].dy, spiral[i + ARMS].dx);
      for (let k = 0; k < n; k++) {
        const d1 = wrap(readAngle[k] - a);
        const d2 = wrap(readAngle[k] - b);
        if (d1 * d2 > 0 || Math.abs(d1 - d2) > Math.PI) continue;
        const at = spiral[i].firedAt + readDist[k] / SPIN_SPEED;
        if (at - lastJolt[k] < JOLT_GAP_MS) continue;
        lastJolt[k] = at;
        jolts.push({ at, bar: k });
        hit(k, at, 0);
      }
    }
    jolts.sort((a, b) => a.at - b.at);
    const joltAt = new Float32Array(jolts.length);
    const joltBar = new Int16Array(jolts.length);
    for (let i = 0; i < jolts.length; i++) {
      joltAt[i] = jolts[i].at;
      joltBar[i] = jolts[i].bar;
    }

    // the volleys, top to bottom, its own last
    const order = ownLast(bars);
    const bullets = spiral.slice();
    const sizes: number[] = spiral.map(() => SPIN_ROUND);
    const flashes: number[] = spiral.map(() => 0);
    const volleyStart = new Float32Array(order.length);
    const volleyAngle = new Float32Array(order.length);
    const blastAt = new Float32Array(order.length);
    const blastBar = new Int16Array(order.length);
    const blastSize = new Float32Array(order.length);
    let t = SPIN_TO + LOCK_MS;
    let lastFire = t;
    for (let k = 0; k < order.length; k++) {
      const bar = order[k];
      const own = bar === 0;
      if (own && k > 0) t += OWN_GAP_MS - VOLLEY_GAP_MS;
      const rounds = own ? OWN_ROUNDS : ROUNDS;
      const gap = own ? OWN_ROUND_MS : ROUND_MS;
      const speed = Math.max(MIN_SPEED, readDist[bar] / FLIGHT_MS);
      volleyStart[k] = t;
      volleyAngle[k] = readAngle[bar];
      let landed = 0;
      for (let j = 0; j < rounds; j++) {
        const to = {
          x: readX[bar] + (holeHash(j + k * 20, 7101) * 2 - 1) * SPREAD.x,
          y: readY[bar] + (holeHash(j + k * 20, 7102) * 2 - 1) * SPREAD.y,
        };
        const round = aimBullet(turret, to, t + j * gap, speed);
        bullets.push(round);
        sizes.push(own ? OWN_ROUND : VOLLEY_ROUND);
        flashes.push(own ? OWN_FLASH : VOLLEY_FLASH);
        landed = round.hitAt;
        lastFire = round.firedAt;
      }
      hit(bar, landed, own ? 2 : 1);
      blastAt[k] = landed;
      blastBar[k] = bar;
      blastSize[k] = own ? OWN_BLAST : BLAST;
      t += VOLLEY_GAP_MS;
    }
    const size = new Float32Array(bullets.length);
    const angle = new Float32Array(bullets.length);
    const flash = new Float32Array(bullets.length);
    let maxFlight = 0;
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      size[i] = sizes[i];
      angle[i] = Math.atan2(b.dy, b.dx);
      flash[i] = flashes[i];
      maxFlight = Math.max(maxFlight, b.hitAt - b.firedAt);
    }

    // a rumble rising through the spin, a kick on the lock
    const rumbles: number[] = [];
    for (let ms = SPIN_FROM; ms < SPIN_TO; ms += RUMBLE_MS) rumbles.push(ms);
    const rumbleAt = new Float32Array(rumbles.length + 1);
    const rumbleShake = new Float32Array(rumbles.length + 1);
    for (let i = 0; i < rumbles.length; i++) {
      rumbleAt[i] = rumbles[i];
      rumbleShake[i] = lerp(
        RUMBLE[0],
        RUMBLE[1],
        i / Math.max(1, rumbles.length - 1),
      );
    }
    rumbleAt[rumbles.length] = SPIN_TO;
    rumbleShake[rumbles.length] = LOCK_SHAKE;

    states.set(r, {
      x0: bars[0].x,
      y0: bars[0].y,
      turret,
      readX,
      readY,
      bullets,
      spiralCount: spiral.length,
      size,
      angle,
      flash,
      maxFlight,
      bulletFrom: 0,
      joltAt,
      joltBar,
      joltFrom: 0,
      volleyStart,
      volleyAngle,
      blastAt,
      blastBar,
      blastSize,
      lastFire,
      endAngle: spinAngle(SPIN_TO),
      rumbleAt,
      rumbleShake,
    });
  },
  draw(ctx, r, ms, bars) {
    const s = states.get(r);
    if (!s) return;
    const now = r.startedAt + ms;
    while (r.kicked < s.rumbleAt.length && ms >= s.rumbleAt[r.kicked]) {
      r.shake(s.rumbleShake[r.kicked]);
      r.kicked++;
    }
    const dx = bars[0].x - s.x0;
    const dy = bars[0].y - s.y0;
    const tx = s.turret.x;
    const ty = s.turret.y;
    const grow = clamp01(ms / IN_MS);
    // the number shrinking into the turret
    if (ms < IN_MS) {
      const e = grow * grow;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (tx + dx) * e,
        (ty + dy) * e,
        r.flashFont * (1 - 0.7 * grow),
        { alpha: 1 - grow },
      );
    }
    ctx.save();
    ctx.translate(dx, dy);

    // every bullet in flight
    const { bullets } = s;
    while (
      s.bulletFrom < bullets.length &&
      bullets[s.bulletFrom].firedAt < ms - s.maxFlight
    )
      s.bulletFrom++;
    for (let i = s.bulletFrom; i < bullets.length; i++) {
      const b = bullets[i];
      if (b.firedAt > ms) break;
      if (ms < b.hitAt) drawWispHead(ctx, b.at, ms, now, s.size[i]);
    }

    // the turret: spinning up, then snapping onto each readout in turn
    let angle: number;
    let heat = 1;
    let tremble = 0;
    if (ms < SPIN_TO) {
      const spin = clamp01((ms - SPIN_FROM) / (SPIN_TO - SPIN_FROM));
      angle = spinAngle(ms);
      heat = spin;
      tremble = TREMBLE * spin * spin;
    } else {
      let k = 0;
      while (
        k + 1 < s.volleyStart.length &&
        ms >= s.volleyStart[k + 1] - AIM_LEAD_MS
      )
        k++;
      const from = k > 0 ? s.volleyAngle[k - 1] : s.endAngle;
      const start = k > 0 ? s.volleyStart[k] - AIM_LEAD_MS : SPIN_TO;
      const u = 1 - (1 - clamp01((ms - start) / SNAP_MS)) ** 3;
      angle = from + wrap(s.volleyAngle[k] - from) * u;
    }
    // each volley round's muzzle flash and the kick it gives
    let kick = 0;
    for (let i = s.spiralCount; i < bullets.length; i++) {
      const since = ms - bullets[i].firedAt;
      if (since < 0) break;
      kick = Math.exp(-since / RECOIL_MS);
      if (since < FLASH_MS) {
        muzzle.x = tx + Math.cos(s.angle[i]) * TURRET * 0.6;
        muzzle.y = ty + Math.sin(s.angle[i]) * TURRET * 0.6;
        drawMuzzleFlash(ctx, muzzle, s.angle[i], since / FLASH_MS, s.flash[i]);
      }
    }
    const fade = 1 - clamp01((ms - s.lastFire) / FADE_MS);
    const size = TURRET * grow * (1 + HEAT_GROW * heat);
    head.x =
      tx + tremble * Math.sin(ms * 0.9) - Math.cos(angle) * RECOIL * kick;
    head.y =
      ty + tremble * Math.cos(ms * 1.3) - Math.sin(angle) * RECOIL * kick;
    // the three barrels flickering as they spray
    if (ms >= SPIN_FROM && ms < SPIN_TO)
      for (let a = 0; a < ARMS; a++) {
        const arm = angle + (a / ARMS) * TAU;
        muzzle.x = head.x + Math.cos(arm) * size * 0.6;
        muzzle.y = head.y + Math.sin(arm) * size * 0.6;
        drawMuzzleFlash(
          ctx,
          muzzle,
          arm,
          ((ms + a * 15) % FLICKER_MS) / FLICKER_MS,
          SPIN_FLASH * (0.5 + 0.7 * heat),
        );
      }
    if (fade > 0) drawWispHead(ctx, atHead, ms, now, size, heat, fade);

    // a spark on every readout a stream sweeps across
    const { joltAt } = s;
    while (s.joltFrom < joltAt.length && joltAt[s.joltFrom] < ms - SPARK_MS)
      s.joltFrom++;
    if (s.joltFrom < joltAt.length && joltAt[s.joltFrom] <= ms) {
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = s.joltFrom; i < joltAt.length; i++) {
        const since = ms - joltAt[i];
        if (since < 0) break;
        const bar = s.joltBar[i];
        stampGlimmer(
          ctx,
          s.readX[bar],
          s.readY[bar],
          JOLT_SPARK * (1 - since / SPARK_MS),
          i,
          i % 2 ? COLOR.white : COLOR.heavenlyGold,
        );
      }
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
    }

    // a blast on every readout a volley turns over
    for (let k = 0; k < s.blastAt.length; k++) {
      const bar = s.blastBar[k];
      spot.x = s.readX[bar];
      spot.y = s.readY[bar];
      drawDetonation(ctx, spot, ms - s.blastAt[k], s.blastSize[k], now);
    }
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
