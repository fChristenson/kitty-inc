// the "Interceptors" event (experiment: the Missile Command game; cash): it
// covers its crit, whose click freezes the screen while missile wisps come
// streaking down out of the top of the screen at slanting angles; the
// clicked floor's button fires interceptors up at them, and every one
// bursts in a blast right in a missile's path, catching it, the missile
// going up in its own blast that catches the next, explosions chaining
// across the sky, each a bang, a jolt and a spray of coins; the last wave
// all goes up at once in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { drawDetonation } from "../../../../shared/explosion";

const KEY = "interceptors";
const REWARD = 4;
const WAVES = 3;
const PER_WAVE = 3;
const EDGE = 100;
const TOP = 150;
// missiles fall FALL px in fallMs; interceptors reach them in UP_MS
const FALL: [number, number] = [0.45, 0.6];
const UP_MS = 220;
const CHAIN_MS = 110;
const MISSILE = 0.3;
const INTERCEPTOR = 0.25;
const SKY_BLAST = 190;
const FINALE_BLAST = 300;
const COINS = 14;
const COIN_REACH: [number, number] = [30, 120];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceInterceptorsEvent = registerWispEvent(
  KEY,
  "Interceptors",
  () => CONFIG.interceptorsEvent.chance,
  (floor, context, area) => {
    const { wavesMs, fallMs, holdMs, mergeMs } = CONFIG.interceptorsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const h = area.bottom - top;
    const blasts: Blast[] = [];
    const missiles: {
      at: (ms: number) => Point;
      drops: number;
      dies: number;
    }[] = [];
    const interceptors: {
      at: (ms: number) => Point;
      fires: number;
      dies: number;
    }[] = [];
    let clock = 0;
    for (let w = 0; w < WAVES; w++) {
      const final = w === WAVES - 1;
      const drops = clock;
      // the first catch, then the rest of the wave caught by its blast in a chain
      const catches = drops + fallMs * 0.6;
      for (let m = 0; m < PER_WAVE; m++) {
        const from: Point = {
          x: lerp([left, right], (m + 0.5 + (w % 2) * 0.3) / (PER_WAVE + 0.3)),
          y: area.top + 40,
        };
        const to: Point = {
          x: from.x + (m - 1) * 120,
          y: top + h * lerp(FALL, Math.random()) * 2,
        };
        const dies = final ? catches : catches + m * CHAIN_MS;
        const u = (dies - drops) / fallMs;
        const caught: Point = {
          x: lerp([from.x, to.x], u),
          y: lerp([from.y, to.y], u),
        };
        const at: Point = { x: 0, y: 0 };
        missiles.push({
          drops,
          dies,
          at: (ms: number): Point => {
            const v = (ms - drops) / fallMs;
            at.x = lerp([from.x, to.x], v);
            at.y = lerp([from.y, to.y], v);
            return at;
          },
        });
        blasts.push({
          at: caught,
          ms: dies,
          size: final ? FINALE_BLAST : SKY_BLAST,
          shake: final ? 1.5 : 0.7 + 0.15 * m,
        });
        // only the first of a chain needs an interceptor; the final wave gets one each
        if (m === 0 || final) {
          const fires = dies - UP_MS;
          const shot: Point = { x: 0, y: 0 };
          interceptors.push({
            fires,
            dies,
            at: (ms: number): Point => {
              const v = easeOut(clamp01((ms - fires) / UP_MS));
              shot.x = lerp([button.x, caught.x], v);
              shot.y = lerp([button.y, caught.y], v);
              return shot;
            },
          });
        }
      }
      clock += final ? 0 : lerp(wavesMs, w / (WAVES - 2));
    }
    const lastBlast = blasts[blasts.length - 1];
    const endAt = lastBlast.ms;
    const sky: Point = { x: (left + right) / 2, y: top + h * 0.35 };
    let lastBang = -Infinity;

    const firing = createBeats(
      interceptors,
      (i) => i.fires,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(b.at, ringTargets(b.at, COINS, COIN_REACH));
        if (b === lastBlast) {
          cover!.blast(sky);
          return;
        }
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const m of missiles)
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MISSILE,
              1,
              m.drops,
              m.dies,
            );
          for (const i of interceptors)
            drawWispBetween(
              ctx,
              i.at,
              ms,
              now,
              WISP_SIZE * INTERCEPTOR,
              0.6,
              i.fires,
              i.dies,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
