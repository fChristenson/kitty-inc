// the "Jetpack" event: it covers its crit, whose click freezes the screen
// while a wisp blasts off the clicked floor's button riding a roaring jet of
// cash that sprays down out of it like rocket exhaust and splashes into a
// pool along the screen's bottom; it climbs wobbling from side to side as the
// screen rumbles and slams into the total-income readout in a huge blast and
// shake, and the whole pool of cash erupts up after it into the total. Pays
// floor income × floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "jetpack";
const REWARD = 4;
// the exhaust: COINS sprayed down out of the wisp at SPEED px/ms, fanned
// SPREAD px/ms sideways, falling under GRAVITY px/ms² into a pool GROUND of
// the screen's height up from its bottom, POOL deep
const COINS = 1_100;
const SPEED: [number, number] = [0.45, 0.85];
const SPREAD = 0.18;
const GRAVITY = 0.0012;
const GROUND = 0.05;
const POOL = 0.04;
const COIN = 0.8;
// the climb wobbles SWAY of the screen's width side to side, WOBBLES times
const SWAY = 0.2;
const WOBBLES = 1.5;
const WISP: [number, number] = [0.06, 0.09];
const RUMBLE_MS = 70;
const RUMBLE: [number, number] = [0.4, 1.3];

export const forceJetpackEvent = registerWispEvent(
  KEY,
  "Jetpack",
  () => CONFIG.jetpackEvent.chance,
  (floor, context, area) => {
    const { flyMs, sweepMs, flightMs, holdMs, mergeMs } = CONFIG.jetpackEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const button = getButtonCenter(context.isGroundFloor);
    const fallback = totalSpot(area);
    const ground = area.bottom - height * GROUND;
    const way = Math.random() < 0.5 ? 1 : -1;
    const travelMs = flyMs + sweepMs + flightMs;
    const jet = (ms: number, into: Point, total: Point): Point => {
      const u = clamp01(ms / flyMs);
      const up = smoothstep(u);
      into.x =
        button.x +
        (total.x - button.x) * up +
        way * width * SWAY * Math.sin(Math.PI * 2 * WOBBLES * u) * (1 - u);
      into.y = button.y + (total.y - button.y) * up;
      return into;
    };
    const wisp = { x: 0, y: 0 };
    const jetAt = (ms: number): Point | null =>
      ms < 0 || ms >= flyMs ? null : jet(ms, wisp, cover?.total() ?? fallback);

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const emit = Math.random() * flyMs * 0.95;
      const from = jet(emit, { x: 0, y: 0 }, fallback);
      const vy = between(SPEED);
      const vx = (Math.random() - 0.5) * SPREAD * 2;
      const floorY = ground - Math.random() * height * POOL;
      const drop = Math.max(0, floorY - from.y);
      const landAge = (-vy + Math.sqrt(vy * vy + 2 * GRAVITY * drop)) / GRAVITY;
      const leave = flyMs + Math.random() * sweepMs;
      const at = (ms: number): Point => {
        const age = Math.min(ms - emit, landAge);
        return {
          x: Math.min(area.right, Math.max(area.left, from.x + vx * age)),
          y: Math.min(floorY, from.y + vy * age + 0.5 * GRAVITY * age * age),
        };
      };
      return (f) => {
        const ms = f * travelMs;
        if (ms < emit) return { x: from.x, y: from.y, scale: 0 };
        if (ms < leave) return { ...at(ms), scale: COIN };
        const start = at(leave);
        const total = cover?.total() ?? fallback;
        const p = bezier(
          start,
          { x: start.x, y: total.y },
          total,
          easeIn(clamp01((ms - leave) / flightMs)),
          {
            x: 0,
            y: 0,
          },
        );
        return { x: p.x, y: p.y, scale: COIN };
      };
    });

    let lastRumble = -Infinity;
    const finale = createBeats(
      [flyMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          finale.tick(ms, now);
          if (ms < flyMs && now - lastRumble >= RUMBLE_MS && cover?.isLive()) {
            lastRumble = now;
            shakeScreen(lerp(RUMBLE, ms / flyMs));
          }
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / flyMs);
          drawWispBetween(
            ctx,
            jetAt,
            ms,
            now,
            Math.max(WISP_SIZE, width * lerp(WISP, heat)),
            heat,
            0,
            flyMs,
          );
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
