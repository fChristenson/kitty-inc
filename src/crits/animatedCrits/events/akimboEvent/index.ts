// the "Akimbo" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while two gun wisps burst out of the clicked
// floor's button and fly apart to the screen's two sides; they slide up
// and down the edges in lockstep, stop level with an income bar in view
// and both rattle off a burst at it from either side, muzzles flashing,
// the wisp bullets meeting in its middle in a flurry of pops that jumps it
// a crit tier with a bang and a jolt, bar after bar, ever faster; the last
// burst ends in a huge blast and shake that slams every bar. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "akimbo";
const MAX_BARS = 4;
const EDGE = 30;
const SHOTS = 4;
const FIRE_MS = 50;
const SPEED = 2.6;
const BULLET = WISP_SIZE * 0.3;
const GUN = 0.7;
const MUZZLE = 40;
const FLASH_MS = 50;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceAkimboEvent = registerWispEvent(
  KEY,
  "Akimbo",
  () => CONFIG.akimboEvent.chance,
  (floor, context, area) => {
    const { splitMs, movesMs, holdMs, mergeMs } = CONFIG.akimboEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const leftX = area.left + EDGE;
    const rightX = area.right - EDGE;
    // the guns stop level with each bar in turn, then fire
    let clock: number = splitMs;
    const stops = bars.map((bar, k) => {
      const fires = clock;
      const leaves = fires + SHOTS * FIRE_MS;
      clock = leaves + lerp(movesMs, k / Math.max(1, bars.length - 1));
      return { bar, fires, leaves };
    });
    const gunY = (ms: number) => {
      let k = 0;
      while (k < stops.length - 1 && ms >= stops[k + 1].fires) k++;
      const s = stops[k];
      if (ms <= s.leaves || k === stops.length - 1) return s.bar.center.y;
      const next = stops[k + 1];
      return lerp(
        [s.bar.center.y, next.bar.center.y],
        smoothstep((ms - s.leaves) / (next.fires - s.leaves)),
      );
    };
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const hits = stops.map((s) => {
      let last = 0;
      for (let i = 0; i < SHOTS; i++) {
        for (const side of [leftX, rightX]) {
          const firedAt =
            s.fires + i * FIRE_MS + (side === rightX ? FIRE_MS / 2 : 0);
          const from: Point = { x: side, y: s.bar.center.y };
          const b = aimBullet(from, s.bar.center, firedAt, SPEED);
          bullets.push(b);
          flashes.push({
            at: firedAt,
            from,
            angle: side === leftX ? 0 : Math.PI,
          });
          last = Math.max(last, b.hitAt);
        }
      }
      return { bar: s.bar, at: last };
    });
    const endAt = Math.max(...hits.map((h) => h.at));
    const lastFire = stops[stops.length - 1].leaves;
    const guns = [leftX, rightX].map((x) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        if (ms < splitMs) {
          const u = easeOut(ms / splitMs);
          at.x = lerp([button.x, x], u);
          at.y = lerp([button.y, stops[0].bar.center.y], u);
        } else {
          at.x = x;
          at.y = gunY(ms);
        }
        return at;
      };
    });

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.1),
    );
    const leveling = createBeats(
      hits,
      (h) => h.at,
      (h, k) => {
        cover!.tierUp(h.bar, h.bar.center);
        if (k === hits.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const sliding = createBeats(
      stops.slice(1),
      (s) => s.fires - 120,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          pinging.tick(ms, now);
          leveling.tick(ms, now);
          sliding.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          if (ms <= lastFire + FLASH_MS) {
            for (const f of flashes)
              drawMuzzleFlash(
                ctx,
                f.from,
                f.angle,
                (ms - f.at) / FLASH_MS,
                MUZZLE,
              );
          }
          for (const gun of guns)
            drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
