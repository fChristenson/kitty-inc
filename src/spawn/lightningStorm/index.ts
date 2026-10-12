// the lightning storm: every so often a ball of lightning crackles on the
// left end of a floor's income bar in view. Pressed and dragged along the
// bar, it rides under the finger and a bolt strikes the bar just behind it,
// strike after strike, money spilling out of each into the total, a
// lightning arc channelling into it from the top right all the while;
// reaching the far end, a huge arc strikes it. Let go midway, it waits where
// it is to be picked up again; left alone, it blinks and vanishes like every
// spawn
import { CONFIG } from "../../config";
import { getIncomeBarBox } from "../../floors";
import type { Floor } from "../../gameState";
import { playCoinAppear, playJackpot, playSwoosh } from "../../sound";
import { clamp01 } from "../../shared/easing";
import { drawDetonation } from "../../shared/explosion";
import { playBarExplosion, playExplosion } from "../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../shared/lightBatch";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { drawLightningArc } from "../../shared/lightningArc";
import { shakeScreen } from "../../shared/screenShake";
import { isScreenFrozen } from "../../shared/screenFreeze";
import { isSpawnGone, spawnFade } from "../../shared/spawnFade";
import {
  barFloorsInView,
  barOnScreen,
  payTotal,
  registerSpawnGame,
  spawnGameDeps,
} from "../../shared/spawnGames";
import { createSpawnRoll } from "../../shared/spawnRoll";
import { tapHits } from "../../shared/tapTarget";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";

// the ball, riding this far over the bar, its sparks crackling round it
const BALL = WISP_SIZE * 1.5;
const BALL_ABOVE = 110;
const BALL_INSET = 40;
const REACH = 90;
const SPARKS = 3;
const SPARK_REACH = 90;
const SPARK_MS = 90;
const SPARK = 0.6;
// the finger may wander this far off the bar's line and still drag the ball
const OFF_LINE = 260;
// the arc down onto the bar, this far behind the ball
const BEHIND = 70;
const BOLT = 1;
const STRIKE = 1;
const STRIKE_BLAST = 60;
const STRIKE_SHAKE = 0.5;
const STRIKE_COINS: [number, number] = [6, 9];
// the far end's huge arc
const FINAL_ARC = 2.6;
const FINAL_BLAST = 200;
const FINAL_SHAKE = 2.6;
const FINAL_MS = 300;
const END_MS = 1200;
// the arc channelling from the top right corner into the ball once it moves,
// firing there over CHANNEL_FIRE_MS
const CHANNEL = 1.1;
const CHANNEL_FIRE_MS = 120;

interface Storm {
  floor: Floor;
  isGround: boolean;
  bornAt: number;
  // how far along the bar the ball is (0..1), and the strikes made so far
  along: number;
  dragging: boolean;
  // performance.now() the arc fired into the moving ball (-1 none)
  channelAt: number;
  struck: number;
  // ms after bornAt of each strike, the last one's at the end
  strikeAt: Float32Array;
  doneAt: number;
}

let storm: Storm | null = null;
const roll = createSpawnRoll(
  CONFIG.randomSpawns.lightningStorm,
  performance.now(),
);
const bar: Point = { x: 0, y: 0 };
const ball: Point = { x: 0, y: 0 };
const hit: Point = { x: 0, y: 0 };
const spark: Point = { x: 0, y: 0 };
const corner: Point = { x: 0, y: 0 };
const sparks: Bolt[] = Array.from({ length: SPARKS }, () =>
  createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0),
);
const ballPath = () => ball;

function start(now: number): void {
  const deps = spawnGameDeps();
  if (!deps) return;
  const floors = barFloorsInView(deps);
  if (!floors.length) return;
  const floor = floors[Math.floor(Math.random() * floors.length)];
  storm = {
    floor,
    isGround: deps.floors.indexOf(floor) === 0,
    bornAt: now,
    along: 0,
    dragging: false,
    channelAt: -1,
    struck: 0,
    strikeAt: new Float32Array(CONFIG.randomSpawns.lightningStorm.strikes).fill(
      -1,
    ),
    doneAt: -1,
  };
  playCoinAppear();
}

// crackles a ball onto a bar (test button)
export function forceLightningStormSpawn(): void {
  start(performance.now());
}

// the bar's middle and the ball over it; false once its floor is gone
function place(s: Storm): boolean {
  const deps = spawnGameDeps();
  if (!deps || !barOnScreen(deps, s.floor, bar)) return false;
  const half = getIncomeBarBox(s.isGround).width / 2 - BALL_INSET;
  ball.x = bar.x - half + 2 * half * s.along;
  ball.y = bar.y - BALL_ABOVE;
  return true;
}

const barX = (s: Storm, u: number) =>
  bar.x + (getIncomeBarBox(s.isGround).width / 2 - BALL_INSET) * (2 * u - 1);

function live(s: Storm, now: number): boolean {
  return (
    s.doneAt < 0 &&
    (s.along > 0 ||
      now - s.bornAt < CONFIG.randomSpawns.lightningStorm.durationMs)
  );
}

function hitTest(x: number, y: number, now: number): boolean {
  const s = storm;
  return !!s && live(s, now) && place(s) && tapHits(x, y, ball, REACH);
}

function press(x: number, y: number, now: number): boolean {
  const s = storm;
  if (!s || !hitTest(x, y, now)) return false;
  s.dragging = true;
  playSwoosh();
  return true;
}

function strike(s: Storm, now: number): void {
  const deps = spawnGameDeps();
  const { strikes, rewardSeconds } = CONFIG.randomSpawns.lightningStorm;
  s.strikeAt[s.struck++] = now - s.bornAt;
  hit.x = ball.x - BEHIND;
  hit.y = bar.y;
  if (deps) payTotal(deps, rewardSeconds / strikes, hit, STRIKE_COINS);
  if (s.struck === strikes) {
    s.doneAt = now - s.bornAt;
    s.dragging = false;
    shakeScreen(FINAL_SHAKE);
    playExplosion();
    playJackpot();
  } else {
    shakeScreen(STRIKE_SHAKE);
    playBarExplosion(1 + s.struck / strikes);
  }
}

function move(x: number, y: number, now: number): void {
  const s = storm;
  if (!s || !s.dragging || !live(s, now) || !place(s)) return;
  if (Math.abs(y - bar.y) > OFF_LINE) return;
  const half = getIncomeBarBox(s.isGround).width / 2 - BALL_INSET;
  const u = clamp01((x - (bar.x - half)) / (2 * half));
  if (u <= s.along) return;
  s.along = u;
  if (s.channelAt < 0) s.channelAt = now;
  place(s);
  const { strikes } = CONFIG.randomSpawns.lightningStorm;
  while (s.struck < strikes && s.along >= (s.struck + 1) / strikes - 1e-6)
    strike(s, now);
}

function release(): void {
  if (!storm) return;
  storm.dragging = false;
  storm.channelAt = -1;
}

function update(now: number): void {
  if (storm) {
    roll.coolDown(now);
    return;
  }
  if (isScreenFrozen()) {
    roll.hold(now);
    return;
  }
  if (roll.procs(now)) start(now);
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  _totalAtY: number,
  now: number,
): void {
  const s = storm;
  if (!s) return;
  if (!place(s)) {
    storm = null;
    return;
  }
  const ms = now - s.bornAt;
  const { durationMs, pulseMs, strikes } = CONFIG.randomSpawns.lightningStorm;
  corner.x = w;
  corner.y = 0;

  // the strikes left behind along the bar
  for (let i = 0; i < s.struck; i++) {
    hit.x = barX(s, (i + 1) / strikes) - BEHIND;
    hit.y = bar.y;
    drawDetonation(ctx, hit, ms - s.strikeAt[i], STRIKE_BLAST, now);
  }

  if (s.doneAt >= 0) {
    const since = ms - s.doneAt;
    if (since > END_MS) {
      storm = null;
      return;
    }
    hit.x = ball.x;
    hit.y = bar.y;
    if (since < FINAL_MS) {
      const fade = 1 - since / FINAL_MS;
      const previous = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";
      beginLightBatch(ctx);
      drawLightningArc(ctx, corner, hit, fade, FINAL_ARC, now, 1);
      endLightBatch(ctx);
      ctx.globalCompositeOperation = previous;
      drawStrike(ctx, hit, fade, 2, now);
    }
    drawDetonation(ctx, hit, since, FINAL_BLAST, now);
    return;
  }

  const msLeft = s.along > 0 ? 1 : durationMs - ms;
  if (isSpawnGone(msLeft)) {
    storm = null;
    return;
  }
  const fade = spawnFade(msLeft, pulseMs, now);

  // its bolts' beam sections in one light batch
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  beginLightBatch(ctx);
  // the arc channelling into the ball from the top right while it moves
  if (s.dragging && s.channelAt >= 0)
    drawLightningArc(
      ctx,
      corner,
      ball,
      1,
      CHANNEL,
      now,
      0,
      clamp01((now - s.channelAt) / CHANNEL_FIRE_MS),
    );
  // the arc down onto the bar behind it while it's dragged
  if (s.dragging && s.along > 0) {
    hit.x = ball.x - BEHIND;
    hit.y = bar.y;
    drawLightningArc(ctx, ball, hit, 1, BOLT, now, 1);
  }
  // sparks crackling off the ball, a fresh set every SPARK_MS
  const flicker = Math.floor(now / SPARK_MS);
  for (let i = 0; i < SPARKS; i++) {
    const a = ((flicker * 7 + i * 13) % 17) * 0.37;
    const b = sparks[i];
    b.from.x = ball.x;
    b.from.y = ball.y;
    spark.x = ball.x + Math.cos(a) * SPARK_REACH * fade.scale;
    spark.y = ball.y + Math.sin(a) * SPARK_REACH * fade.scale;
    b.to.x = spark.x;
    b.to.y = spark.y;
    drawBolt(ctx, b, fade.alpha, SPARK);
  }
  endLightBatch(ctx);
  ctx.globalCompositeOperation = previous;
  if (s.dragging && s.along > 0) drawStrike(ctx, hit, 1, STRIKE, now);
  drawWisp(ctx, ballPath, ms, now, BALL * fade.scale, 1, fade.alpha);
}

registerSpawnGame({ update, draw, press, move, release, hitTest });
