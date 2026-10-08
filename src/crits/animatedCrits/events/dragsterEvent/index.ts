// the "Dragster" event (mix; cash): it covers its crit, whose click freezes
// the screen while a dragster wisp revs at the left end of the bottom of the
// screen, shaking ever harder and spitting coin sparks; then it launches
// along the bottom in a blur, a roaring tail of cash spewing out behind it,
// a nitro kick (a flash, a bang and a jolt) every third of the way, each
// third faster; at the finish a parachute of coins blooms open behind it,
// then the whole tail of cash whips up into the total in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { sprayTargets } from "../../../../shared/coinTargets";
import { totalSpot } from "../../cashFlow";

const KEY = "dragster";
const REWARD = 4;
const EDGE = 70;
const BOTTOM = 80;
const TAIL_COINS = 1_000;
const CHUTE_COINS = 260;
// each tail coin is flung back and up off the track, settling over SPEW_MS
const SPEW_MS = 240;
const SPEW_BACK: [number, number] = [20, 170];
const SPEW_UP: [number, number] = [-70, 12];
const CHUTE = 110;
const CHUTE_BACK = 150;
const ROLL = 40;
const REV_SHAKE = 9;
const SPARKS = [0.15, 0.35, 0.52, 0.66, 0.78, 0.88, 0.95];
const SPARK_COINS = 16;
const NITRO_SHAKE: [number, number] = [0.9, 1.4];
const COIN = 0.7;
const CAR = 0.6;

export const forceDragsterEvent = registerWispEvent(
  KEY,
  "Dragster",
  () => CONFIG.dragsterEvent.chance,
  (floor, context, area) => {
    const { revMs, thirdsMs, chuteMs, whipMs, holdMs, mergeMs } =
      CONFIG.dragsterEvent;
    const y = area.bottom - BOTTOM;
    const start: Point = { x: area.left + EDGE, y };
    const finish: Point = { x: area.right - EDGE - ROLL, y };
    const total = totalSpot(area);
    const thirds = [0, 1, 2].map((k) => lerp(thirdsMs, k / 2));
    const kicks = [revMs, revMs + thirds[0], revMs + thirds[0] + thirds[1]];
    const finishes = kicks[2] + thirds[2];
    const whips = finishes + chuteMs;
    const endAt = whips + whipMs;
    const runX = (ms: number): number => {
      if (ms <= revMs) return start.x;
      if (ms >= finishes)
        return finish.x + ROLL * easeOut(clamp01((ms - finishes) / chuteMs));
      let k = 0;
      while (k < 2 && ms >= kicks[k + 1]) k++;
      const u = (k + (ms - kicks[k]) / thirds[k]) / 3;
      return lerp([start.x, finish.x], u);
    };
    const car = (ms: number, into: Point): Point => {
      const t = Math.max(0, ms);
      const rev = clamp01(t / revMs);
      const jitter = t < revMs ? REV_SHAKE * rev * rev : 0;
      into.x = runX(t) + Math.sin(t * 0.9) * jitter;
      into.y = y + Math.cos(t * 1.3) * jitter * 0.6;
      return into;
    };
    const head: Point = { x: 0, y: 0 };
    const carWisp = (ms: number): Point => car(ms, head);
    const whipCtrl = (from: Point): Point => ({
      x: (from.x + total.x) / 2,
      y: Math.min(from.y, total.y) - 120,
    });

    // a coin's flight from its resting spot up into the total
    const whip = (rest: Point, whipsAt: number, flightMs: number) => {
      const ctrl = whipCtrl(rest);
      return (ms: number): { x: number; y: number; scale: number } => {
        const into = { x: 0, y: 0, scale: COIN };
        bezier(
          rest,
          ctrl,
          total,
          easeIn(clamp01((ms - whipsAt) / flightMs)),
          into,
        );
        return into;
      };
    };
    const tail: CoinPath[] = Array.from({ length: TAIL_COINS }, (_, i) => {
      const s = i / TAIL_COINS;
      const born = revMs + (finishes - revMs) * s;
      const from = car(born, { x: 0, y: 0 });
      const back = lerp(SPEW_BACK, Math.random());
      const up = lerp(SPEW_UP, Math.random());
      const rest: Point = { x: from.x - back, y: from.y + up };
      // the front of the tail whips first, the back last
      const flightMs = whipMs * 0.55;
      const flies = whip(rest, whips + (1 - s) * (whipMs - flightMs), flightMs);
      return (f) => {
        const ms = f * endAt;
        if (ms < born) return { x: from.x, y: from.y, scale: 0 };
        if (ms < whips) {
          const p = easeOutCubic(clamp01((ms - born) / SPEW_MS));
          return {
            x: from.x - back * p,
            y: from.y + up * p - Math.sin(Math.PI * p) * 30,
            scale: COIN,
          };
        }
        return flies(ms);
      };
    });
    const chute: CoinPath[] = Array.from({ length: CHUTE_COINS }, (_, i) => {
      // the canopy's arc, and the shroud lines down to the car
      const onCanopy = i % 3 !== 0;
      const a = -Math.PI * (0.1 + 0.8 * Math.random());
      const r = onCanopy ? CHUTE * (0.92 + 0.12 * Math.random()) : 0;
      const mid: Point = { x: finish.x - CHUTE_BACK, y: y - CHUTE * 0.6 };
      const edge: Point = {
        x: mid.x + Math.cos(a) * CHUTE,
        y: mid.y + Math.sin(a) * CHUTE * 0.7,
      };
      const line = Math.random();
      const rest: Point = onCanopy
        ? { x: mid.x + Math.cos(a) * r, y: mid.y + Math.sin(a) * r * 0.7 }
        : {
            x: lerp([finish.x, edge.x], line),
            y: lerp([y, edge.y], line),
          };
      const flies = whip(
        rest,
        whips + Math.random() * whipMs * 0.3,
        whipMs * 0.7,
      );
      return (f) => {
        const ms = f * endAt;
        if (ms < finishes) return { x: finish.x, y, scale: 0 };
        if (ms < whips) {
          const p = easeOutBack(clamp01((ms - finishes) / chuteMs));
          return {
            x: lerp([finish.x, rest.x], p),
            y: lerp([y, rest.y], p),
            scale: COIN,
          };
        }
        return flies(ms);
      };
    });

    let lastSpark = -Infinity;
    const revving = createBeats(
      SPARKS,
      (s) => s * revMs,
      (s) => {
        cover!.launchFrom(
          start,
          sprayTargets(start, SPARK_COINS, [40, 170], -Math.PI * 0.85, 0.9),
        );
        if (!cover!.isLive()) return;
        shakeScreen(0.2 + 0.6 * s);
        if (s * revMs - lastSpark >= 60) {
          lastSpark = s * revMs;
          playBloop();
        }
      },
    );
    const kicking = createBeats(
      kicks,
      (ms) => ms,
      (ms, k) => {
        cover!.burst(car(ms, { x: 0, y: 0 }), 0.7 + 0.2 * k);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(NITRO_SHAKE, k / 2));
      },
    );
    const finishing = createBeats(
      [finishes, endAt],
      (ms) => ms,
      (ms) => {
        if (ms === endAt) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(finish, 0.6);
        if (cover!.isLive()) playSwoosh();
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
          revving.tick(ms, now);
          kicking.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            carWisp,
            ms,
            now,
            WISP_SIZE * CAR,
            ms < revMs ? clamp01(ms / revMs) : 1,
            0,
            whips,
          ),
      },
    );
    if (!cover) return;
    cover.trace([...tail, ...chute], endAt);
    playBoostEventStream();
  },
);
