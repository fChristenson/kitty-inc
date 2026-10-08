// the "Jack-in-the-Box" event (experiment: a jack-in-the-box; a free floor):
// it covers its crit, whose click freezes the screen while a crank wisp
// winds round the clicked floor's button, its tune ticking ever quicker and
// the screen rumbling harder, a teasing "NOT YET..." halfway, until "POP!"
// slams up in huge text and a jack wisp springs out on a coil of glitter,
// shooting up the screen floor by floor, bobbing at each, until it bonks
// into the building's locked floor in a huge blast and shake and the floor
// bursts open, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";
import { COLOR } from "../../../../palette";

const KEY = "jackInTheBox";
const TICKS = 14;
const TEASE = 8;
const CRANK_R = 80;
const POP_GAP_MS = 80;
const TEXT_UP = 230;
const CALL_MS = 340;
const TEASE_STYLE = { fontSize: 50, strokeWidth: 8 };
const POP_STYLE = { fontSize: 120, strokeWidth: 16 };
const COILS = 30;
const COIL_TURNS = 7;
const COIL_R = 34;
const COIL_GLITTER = 9;
const COIL_FADE_MS = 240;
const CRANK = 0.4;
const JACK = 0.75;
const TICK_SHAKE: [number, number] = [0.15, 0.7];
const STOP_SHAKE: [number, number] = [0.6, 1.1];

export const forceJackInTheBoxEvent = registerWispEvent(
  KEY,
  "Jack-in-the-Box",
  () => CONFIG.jackInTheBoxEvent.chance,
  (floor, context) => {
    const { windMs, springMs, holdMs, mergeMs } = CONFIG.jackInTheBoxEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    // quarter turns of the crank, each tick quicker than the last
    const ticks = Array.from(
      { length: TICKS },
      (_, k) => windMs * Math.sqrt((k + 1) / TICKS),
    );
    const tease = ticks[TEASE - 1];
    const popAt = windMs + POP_GAP_MS;
    const crankAt: Point = { x: 0, y: 0 };
    const crank = (ms: number): Point => {
      const u = clamp01(ms / windMs);
      const a = -Math.PI / 2 + (Math.PI / 2) * TICKS * u * u;
      crankAt.x = button.x + Math.cos(a) * CRANK_R;
      crankAt.y = button.y + Math.sin(a) * CRANK_R * 0.6;
      return crankAt;
    };
    const stops = Math.max(
      1,
      Math.round(Math.abs(lock.y - button.y) / FLOOR_H),
    );
    let clock = popAt;
    let from: Point = button;
    const legs = Array.from({ length: stops }, (_, j) => {
      const u = (j + 1) / stops;
      const to: Point = {
        x: lerp([button.x, lock.x], u),
        y: lerp([button.y, lock.y], u),
      };
      const leaves = clock;
      clock += lerp(springMs, j / Math.max(1, stops - 1));
      const leg = { from, to, leaves, lands: clock, final: j === stops - 1 };
      from = to;
      return leg;
    });
    const endAt = legs[legs.length - 1].lands;
    const jackAt: Point = { x: 0, y: 0 };
    const jack = (ms: number): Point => {
      let l = legs[0];
      for (const leg of legs) if (ms >= leg.leaves) l = leg;
      // springing up and bobbing past each floor before settling
      const u = clamp01((ms - l.leaves) / (l.lands - l.leaves));
      const s = l.final ? u * u : easeOutBack(u);
      jackAt.x = lerp([l.from.x, l.to.x], s);
      jackAt.y = lerp([l.from.y, l.to.y], s);
      return jackAt;
    };
    const textAt: Point = { x: button.x, y: button.y - TEXT_UP };
    const teaseText = createCritTextSprite(
      "NOT YET...",
      COLOR.heavenlyGold,
      TEASE_STYLE,
    );
    const popText = createCritTextSprite("POP!", COLOR.heavenlyGold, POP_STYLE);

    const ticking = createBeats(
      ticks,
      (ms) => ms,
      (ms, k) => {
        if (!cover?.isLive()) return;
        playBloop();
        shakeScreen(lerp(TICK_SHAKE, k / (TICKS - 1)));
        if (ms === tease) cover.burst(button, 0.4);
      },
    );
    const popping = createBeats(
      [popAt],
      (ms) => ms,
      () => {
        cover!.burst(button, 1.2);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(1.2);
      },
    );
    const bobbing = createBeats(
      legs,
      (l) => l.lands,
      (l, j) => {
        if (l.final) {
          cover!.blast(lock);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(l.to, 0.5);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(STOP_SHAKE, j / Math.max(1, stops - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          ticking.tick(ms, now);
          popping.tick(ms, now);
          bobbing.tick(ms, now);
        },
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + COIL_FADE_MS + CALL_MS) return;
          const t = (ms - tease) / CALL_MS;
          if (t >= 0 && t < 1 && ms < popAt) {
            ctx.globalAlpha = 1 - t * t;
            drawCritTextSprite(
              ctx,
              teaseText,
              textAt.x,
              textAt.y,
              1 + 0.3 * (1 - clamp01(t * 3)),
            );
            ctx.globalAlpha = 1;
          }
          const p = (ms - popAt) / (CALL_MS * 2);
          if (p >= 0 && p < 1) {
            ctx.globalAlpha = 1 - p * p;
            drawCritTextSprite(
              ctx,
              popText,
              textAt.x,
              textAt.y,
              1 + 0.7 * (1 - clamp01(p * 4)),
            );
            ctx.globalAlpha = 1;
          }
          drawWispBetween(
            ctx,
            crank,
            ms,
            now,
            WISP_SIZE * CRANK,
            0.5,
            0,
            popAt,
          );
          if (ms < popAt) return;
          // the spring: glitter coiling from the button up to the jack
          const head = jack(Math.min(ms, endAt));
          const hx = head.x;
          const hy = head.y;
          const fade = 1 - clamp01((ms - endAt) / COIL_FADE_MS);
          const dx = hx - button.x;
          const dy = hy - button.y;
          const d = Math.hypot(dx, dy) || 1;
          for (let i = 0; i < COILS; i++) {
            const u = i / (COILS - 1);
            const s = Math.sin(u * Math.PI * 2 * COIL_TURNS) * COIL_R;
            drawGlitterLight(
              ctx,
              button.x + dx * u - (dy / d) * s,
              button.y + dy * u + (dx / d) * s,
              COIL_GLITTER,
              i,
              fade,
              now,
            );
          }
          drawWispBetween(
            ctx,
            jack,
            ms,
            now,
            WISP_SIZE * JACK,
            0.8,
            popAt,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
