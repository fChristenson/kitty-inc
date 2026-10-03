// the "Sumo" event (experiment: a sumo bout; cash): it covers its crit,
// whose click freezes the screen while a ring of light flashes up in the
// middle of the screen and two big wrestler wisps charge in from either
// side and crash together, each clash a bang, a jolt and a spray of coins,
// shoving each other back and forth across the ring; on the last charge
// one heaves the other clean out of the ring: "YOKOZUNA!", in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { drawBeam } from "../../shared/beam";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { COLOR } from "../../palette";

const KEY = "sumo";
const REWARD = 4;
const CLASHES = 4;
const RING = 200;
const SIDES = 24;
const RING_WIDTH = 9;
const BACK = 0.8;
const SHOVE = 60;
const SETUP_MS = 260;
const CALL_MS = 500;
const WRESTLER = 0.9;
const COINS = 30;
const COIN_REACH: [number, number] = [40, 170];
const CLASH_SHAKE: [number, number] = [0.8, 1.4];

export const forceSumoEvent = registerWispEvent(
  KEY,
  "Sumo",
  () => CONFIG.sumoEvent.chance,
  (floor, context, area) => {
    const { clashesMs, holdMs, mergeMs } = CONFIG.sumoEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 40,
    };
    const ring = Array.from({ length: SIDES + 1 }, (_, i): Point => {
      const a = (i / SIDES) * Math.PI * 2;
      return {
        x: hub.x + Math.cos(a) * RING,
        y: hub.y + Math.sin(a) * RING * 0.55,
      };
    });
    const yokozuna = createCritTextSprite("YOKOZUNA!", COLOR.heavenlyGold, {
      fontSize: 66,
      strokeWidth: 10,
    });
    // each clash meets at a point shoved a little further one way or the other
    let clock: number = SETUP_MS;
    const clashes = Array.from({ length: CLASHES }, (_, k) => {
      const charges = clock;
      const ms = lerp(clashesMs, k / (CLASHES - 1));
      const meets = charges + ms * 0.55;
      clock = charges + ms;
      const final = k === CLASHES - 1;
      const at: Point = {
        x:
          hub.x +
          (final ? RING * 0.4 : (k % 2 === 0 ? -1 : 1) * SHOVE * (k + 1) * 0.5),
        y: hub.y,
      };
      return { charges, meets, at, final };
    });
    const last = clashes[CLASHES - 1];
    const out: Point = { x: hub.x + RING * 1.5, y: hub.y };
    const endAt = last.meets + 260;
    // the two wrestlers, each backing off then charging into the clash point
    const wrestlers = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      const home: Point = { x: hub.x + side * RING * BACK, y: hub.y };
      return (ms: number): Point => {
        if (ms < SETUP_MS) {
          const u = easeOut(clamp01(ms / SETUP_MS));
          at.x = lerp([button.x, home.x], u);
          at.y = lerp([button.y, home.y], u);
          return at;
        }
        let c = clashes[0];
        for (const clash of clashes) if (ms >= clash.charges) c = clash;
        const touch = c.at.x + side * WISP_SIZE * WRESTLER * 0.4;
        if (c.final && ms >= c.meets && side > 0) {
          // thrown out of the ring
          const u = easeOut(clamp01((ms - c.meets) / 260));
          at.x = lerp([touch, out.x], u);
          at.y = hub.y - Math.sin(u * Math.PI) * 80;
          return at;
        }
        if (ms < c.meets) {
          // backing off from the last clash, then charging in
          const prev = clashes[clashes.indexOf(c) - 1];
          const was = prev
            ? prev.at.x + side * WISP_SIZE * WRESTLER * 0.4
            : home.x;
          const u = clamp01((ms - c.charges) / (c.meets - c.charges));
          at.x =
            u < 0.4
              ? lerp([was, home.x], easeOut(u / 0.4))
              : lerp([home.x, touch], easeIn((u - 0.4) / 0.6));
        } else
          at.x =
            touch +
            side * Math.sin(clamp01((ms - c.meets) / 120) * Math.PI) * 14;
        at.y = hub.y;
        return at;
      };
    });

    const clashing = createBeats(
      clashes,
      (c) => c.meets,
      (c, k) => {
        cover!.launchFrom(c.at, ringTargets(c.at, COINS, COIN_REACH));
        cover!.burst(c.at, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CLASH_SHAKE, k / (CLASHES - 1)));
      },
    );
    const throwing = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        cover!.launchFrom(out, ringTargets(out, COINS * 2, COIN_REACH));
        cover!.blast(out);
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
          clashing.tick(ms, now);
          throwing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          const show =
            clamp01(ms / SETUP_MS) * (1 - clamp01((ms - endAt) / CALL_MS));
          for (let i = 1; i <= SIDES; i++)
            drawBeam(ctx, ring[i - 1], ring[i], RING_WIDTH, show * 0.7);
          const c = (ms - endAt) / CALL_MS;
          if (c >= 0 && c < 1) {
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              yokozuna,
              hub.x,
              hub.y - RING * 0.8,
              1 + 0.5 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms > endAt) return;
          for (const w of wrestlers)
            drawWispBetween(
              ctx,
              w,
              ms,
              now,
              WISP_SIZE * WRESTLER,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
