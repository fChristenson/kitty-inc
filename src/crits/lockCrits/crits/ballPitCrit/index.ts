// Ball Pit, a lock crit: the number arcs onto the top of the dark locked
// floor and opens a chute there; glowing balls pour in one after another,
// quicker and quicker, ricocheting round the floor off its walls, floor and
// ceiling at speed, every wall hit a flash and every clash a spark, each
// bounce faster than the last; the floor fills, its rim glowing and bulging,
// the lock trembling and glowing hotter, until it can't hold them: the lock
// bursts open in one big blast and the balls spray out, bouncing across the
// new floor onto its button: the opened floor's next payouts each arm a crit
// on it
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import { armCritUpgrade } from "../../../floorCrits/upgradeCrit";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import {
  hops,
  ricochet,
  type BouncePath,
} from "../../../../shared/animationStyles/bounce";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawGlow,
  fadeStops,
  glowSprite,
  type FadeStops,
} from "../../../../shared/glowSprite";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { processWhenIdle } from "../../../../shared/idle";
import { hash01 } from "../../../../shared/twinkle";
import { liveEffect } from "../../../../shared/detachedJob";
import { COLOR } from "../../../../palette";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { getLockCenter } from "../../../../floors/floorLock";
import {
  flipUpgradeButton,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";

const LOCK = getLockCenter();
const BUTTON_AT = getButtonCenter(false);
const BUTTON: Point = { x: BUTTON_AT.x - LOCK.x, y: BUTTON_AT.y - LOCK.y };
// the floor's room from the lock's middle: its side walls, ceiling and floor
const HALF_W = FLOOR_W / 2 - 70;
const TOP = -FLOOR_H / 2 + 60;
const FLOOR_Y = FLOOR_H / 2 - 130;
// a ball's solid radius, and its glow's
const BALL = 24;
const BALL_GLOW = 58;
const BOX = {
  left: -HALF_W + BALL,
  right: HALF_W - BALL,
  top: TOP + BALL,
  bottom: FLOOR_Y - BALL,
};
const MOUTH: Point = { x: 0, y: BOX.top };

const ARC_MS = 150;
const ARC_RISE = 120;
// BALLS poured in over POUR_MS (quickening), each fired down off the chute
// at SPEED px/ms (later ones faster), GAIN faster every bounce
const BALLS = 26;
const POUR_MS = 900;
const OPEN_AT = ARC_MS + 1250;
const SPEED: [number, number] = [1.5, 2.7];
const GAIN = 1.05;
const BOUNCES = 30;
const FAN = 1.1;
// a ball's smear SMEAR_MS behind it, popping in over GROW_MS
const SMEAR_MS = 22;
const GROW_MS = 90;
// a wall hit's flash, a clash's spark
const FLASH_MS = 150;
const FLASH: [number, number] = [70, 130];
const CLASH = BALL * 2;
// the rim bulging BULGE px, the lock trembling SHIVER px and glowing
const BULGE = 46;
const SHIVER = 16;
const LOCK_GLOW = 360;
const OPEN_BLAST = 560;
// the spray: each ball flung off where it was onto the new floor, a hop on
// and onto the button, up to STAGGER ms late
const STAGGER = 70;
const SPRAY_MS: [number, number] = [210, 130];
const SPRAY_LIFT: [number, number] = [260, 120];
const LAND_FLASH = 90;
const BUTTON_BLAST = 260;
// shakes by step: a beat of the pour, the lock bursting, onto the button
const SHAKES = [0.7, 3.6, 1.4];

const COLORS = [
  COLOR.red,
  COLOR.blue,
  COLOR.heavenlyGold,
  COLOR.moneyGreen,
  COLOR.purple,
  COLOR.peppermintPink,
  COLOR.cyan,
  COLOR.orange,
];
// a ball in one stamp: white-hot core, solid colour, glow fading out
const BALL_STOPS = COLORS.map(
  (c): FadeStops => [
    [0, COLOR.white],
    [0.16, COLOR.white],
    [0.3, c],
    [0.42, `${c}cc`],
    [1, `${c}00`],
  ],
);
processWhenIdle(BALL_STOPS, glowSprite);
const WHITE = fadeStops(COLOR.white, 0.25);
const GOLD = fadeStops(COLOR.heavenlyGold);

// every ball's pour time, ricochet round the room and spray onto the button
const SPAWN = new Float32Array(BALLS);
const PATHS: BouncePath[] = [];
const SPRAY: BouncePath[] = [];
let LAND_AT = 0;
for (let i = 0; i < BALLS; i++) {
  const u = i / (BALLS - 1);
  SPAWN[i] = ARC_MS + POUR_MS * Math.sqrt(u);
  const angle = Math.PI / 2 + (hash01(i, 7101) * 2 - 1) * FAN;
  const path = ricochet(MOUTH, angle, BOX, {
    bounces: BOUNCES,
    speed: lerp(SPEED[0], SPEED[1], u),
    gain: GAIN,
    startMs: SPAWN[i],
  });
  PATHS.push(path);
  const at = path.at(OPEN_AT);
  const from: Point = { x: at.x, y: at.y };
  const side = hash01(i, 7102) * 2 - 1;
  const out: Point = {
    x: Math.max(-HALF_W, Math.min(HALF_W, from.x * 1.3 + side * 160)),
    y: FLOOR_Y,
  };
  const on: Point = {
    x: lerp(out.x, BUTTON.x, 0.55),
    y: FLOOR_Y,
  };
  const land: Point = {
    x: BUTTON.x + side * 90,
    y: BUTTON.y + (hash01(i, 7103) * 2 - 1) * 30,
  };
  const spray = hops(
    [from, out, on, land],
    SPRAY_MS,
    SPRAY_LIFT,
    OPEN_AT + STAGGER * hash01(i, 7104),
  );
  SPRAY.push(spray);
  LAND_AT = Math.max(LAND_AT, spray.endMs);
}

// where the live balls are this frame, for their clashes
const BX = new Float32Array(BALLS);
const BY = new Float32Array(BALLS);
const ORIGIN: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };

// the opened floor's next `left` payouts each arming a crit on its button
const flipButton = liveEffect(flipUpgradeButton);
const pits = defineBarEffect<{ floor: Floor; left: number }>({
  onPayout: (v) => {
    if (isFloorMaxed(v.floor)) return undefined;
    armCritUpgrade(v.floor, "crit");
    flipButton(v.floor);
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

// a ball at path's spot at ms, with its smear behind it
function stampBall(
  ctx: CanvasRenderingContext2D,
  path: BouncePath,
  ms: number,
  stops: FadeStops,
  size: number,
): Point {
  const tail = path.at(ms - SMEAR_MS);
  const tx = tail.x;
  const ty = tail.y;
  ctx.globalAlpha = 0.4;
  drawGlow(ctx, stops, tx, ty, size * 0.8);
  const p = path.at(ms);
  ctx.globalAlpha = 1;
  drawGlow(ctx, stops, p.x, p.y, size);
  return p;
}

// the wall hits of path in the last FLASH_MS (before `until`), each a flash
// flattened along the floor or ceiling
function stampFlashes(
  ctx: CanvasRenderingContext2D,
  path: BouncePath,
  ms: number,
  until: number,
  size: number,
): void {
  const bounces = path.bounces;
  for (let k = 0; k < bounces.length; k++) {
    const b = bounces[k];
    if (b.ms > ms || b.ms >= until) break;
    const since = ms - b.ms;
    if (since >= FLASH_MS) continue;
    const fade = 1 - since / FLASH_MS;
    ctx.globalAlpha = fade;
    const flat = Math.abs(Math.sin(b.normal)) > 0.7;
    drawGlow(
      ctx,
      WHITE,
      b.at.x,
      b.at.y,
      size * (flat ? 1.4 : 0.9) * (1.2 - 0.4 * fade),
      flat ? 0.35 : 1,
    );
  }
}

// the room's rim, bowing out `bulge` px at each side's middle
function strokeRim(
  ctx: CanvasRenderingContext2D,
  bulge: number,
  fill: number,
): void {
  const l = -HALF_W + shiver.x;
  const r = HALF_W + shiver.x;
  const t = TOP + shiver.y;
  const b = FLOOR_Y + shiver.y;
  const mx = shiver.x;
  const my = (t + b) / 2;
  ctx.beginPath();
  ctx.moveTo(l, t);
  ctx.quadraticCurveTo(mx, t - bulge * 2, r, t);
  ctx.quadraticCurveTo(r + bulge * 2, my, r, b);
  ctx.quadraticCurveTo(mx, b + bulge * 2, l, b);
  ctx.quadraticCurveTo(l - bulge * 2, my, l, t);
  ctx.closePath();
  ctx.strokeStyle = COLOR.heavenlyGold;
  ctx.globalAlpha = 0.2 + 0.6 * fill;
  ctx.lineWidth = 6 + 12 * fill;
  ctx.stroke();
}

registerFloorCrit("ballPitCrit", {
  reward(t) {
    const payouts = t.count * meta.values.payouts;
    const left = (pits.get(t.floor)?.left ?? 0) + payouts;
    pits.set(t.floor, { floor: t.floor, left });
    t.flipButton();
    t.punch(`Crit Pit x${payouts}`);
  },
  plan(r, _bars, hit) {
    for (let i = 3; i < BALLS; i += 3) hit(0, SPAWN[i], 0);
    hit(0, OPEN_AT, 1);
    hit(0, LAND_AT, 2);
    r.play.hideBars?.([0]);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + MOUTH.x) * p,
        (lock.y + MOUTH.y) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
      );
    }
    const fill = clamp01((ms - ARC_MS) / (OPEN_AT - ARC_MS));
    const heat = fill * fill;
    const previous = ctx.globalCompositeOperation;
    ctx.save();
    ctx.translate(lock.x, lock.y);

    if (ms < OPEN_AT) {
      // the lock trembling and washing white, the rim bulging, the pit glowing
      trembleAt(fill, ms, SHIVER, shiver);
      ctx.save();
      ctx.translate(shiver.x, shiver.y);
      r.play.drawBar?.(ctx, 0, heat * 0.8);
      ctx.restore();
      ctx.globalCompositeOperation = "lighter";
      const throb = 0.7 + 0.3 * Math.sin(ms * (0.02 + 0.05 * fill));
      strokeRim(ctx, BULGE * heat * throb, fill);
      beginLightBatch(ctx);
      ctx.globalAlpha = heat * 0.6;
      drawGlow(ctx, GOLD, shiver.x, shiver.y, LOCK_GLOW * (0.5 + 0.7 * fill));
      ctx.globalAlpha = fill * 0.5;
      drawGlow(ctx, GOLD, 0, FLOOR_Y, HALF_W * (0.4 + 0.7 * fill), 0.3);
      // the chute glowing while it pours
      if (ms >= ARC_MS && ms < SPAWN[BALLS - 1] + FLASH_MS) {
        ctx.globalAlpha = 0.8;
        drawGlow(ctx, GOLD, MOUTH.x, MOUTH.y, 90 + 40 * throb, 0.6);
      }
      const size = BALL_GLOW * (1 + 0.25 * fill);
      const flash = lerp(FLASH[0], FLASH[1], fill);
      let n = 0;
      for (let i = 0; i < BALLS; i++) {
        if (ms < SPAWN[i]) continue;
        const path = PATHS[i];
        stampFlashes(ctx, path, ms, OPEN_AT, flash);
        const grow = clamp01((ms - SPAWN[i]) / GROW_MS);
        const p = stampBall(
          ctx,
          path,
          ms,
          BALL_STOPS[i % BALL_STOPS.length],
          size * grow,
        );
        BX[n] = p.x;
        BY[n] = p.y;
        n++;
      }
      // balls clashing: a white spark between them
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++) {
          const dx = BX[b] - BX[a];
          const dy = BY[b] - BY[a];
          const d2 = dx * dx + dy * dy;
          if (d2 >= CLASH * CLASH) continue;
          ctx.globalAlpha = 1 - Math.sqrt(d2) / CLASH;
          drawGlow(ctx, WHITE, BX[a] + dx / 2, BY[a] + dy / 2, BALL * 3);
        }
      endLightBatch(ctx);
    } else {
      // the spray: flung out across the new floor, hopping onto its button
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      for (let i = 0; i < BALLS; i++) {
        const path = SPRAY[i];
        if (ms > path.endMs) {
          const since = ms - path.endMs;
          if (since >= LAND_FLASH) continue;
          ctx.globalAlpha = 1 - since / LAND_FLASH;
          drawGlow(ctx, WHITE, path.bounces[2].at.x, path.bounces[2].at.y, 70);
          continue;
        }
        stampFlashes(ctx, path, ms, path.endMs, FLASH[1]);
        stampBall(
          ctx,
          path,
          ms,
          BALL_STOPS[i % BALL_STOPS.length],
          BALL_GLOW * 1.2,
        );
      }
      endLightBatch(ctx);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = previous;
    drawDetonation(ctx, ORIGIN, ms - OPEN_AT, OPEN_BLAST, now);
    drawDetonation(ctx, BUTTON, ms - LAND_AT, BUTTON_BLAST, now);
    ctx.restore();
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
