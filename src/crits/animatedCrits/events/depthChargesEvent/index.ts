// the "Depth Charges" event (explosion; cash): it covers its crit, whose
// click freezes the screen while the clicked floor's button floods the
// bottom of the screen with a pool of cash; bomb wisps, fuses fizzing, drop
// out of the sky one after another, splash into it and sink, then go off
// under the surface, each blasting a towering geyser of cash up out of the
// pool with a bang and a big jolt, ever faster; then the whole pool erupts
// into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  between,
  clamp01,
  easeIn,
  easeOut,
  lerp,
} from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { totalSpot } from "../../cashFlow";

const KEY = "depthCharges";
const REWARD = 4;
const COINS = 1_300;
const COIN = 0.5;
const CHARGES = 4;
// the pool is POOL px deep; a charge sinks SINK px into it, blasting coins
// within REACH px of it up at LAUNCH px per ms under GRAVITY
const POOL = 110;
const SINK = 50;
const REACH = 110;
const LAUNCH: [number, number] = [0.7, 1.3];
const GRAVITY = 0.005;
const MAX_AIR = (2 * LAUNCH[1]) / GRAVITY;
const POUR_MS = 300;
const SKY = 60;
const BOMB = 0.45;
const FUSE = 22;
const BLAST = 160;
const SURGE_SPREAD = 280;
const LIFT = 70;
const BOOM_SHAKE: [number, number] = [1, 1.8];

export const forceDepthChargesEvent = registerWispEvent(
  KEY,
  "Depth Charges",
  () => CONFIG.depthChargesEvent.chance,
  (floor, context, area) => {
    const { dropsMs, fallMs, sinkMs, flightMs, holdMs, mergeMs } =
      CONFIG.depthChargesEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const surface = area.bottom - POOL;
    let clock: number = POUR_MS;
    const charges = Array.from({ length: CHARGES }, (_, k) => {
      const drops = clock;
      clock += lerp(dropsMs, k / (CHARGES - 1));
      const x = area.left + width * (0.15 + 0.7 * ((k * 0.37 + 0.2) % 1));
      const splashes = drops + fallMs;
      const booms = splashes + sinkMs;
      const at: Point = { x, y: 0 };
      return {
        x,
        drops,
        splashes,
        booms,
        under: { x, y: surface + SINK },
        at: (ms: number): Point | null => {
          if (ms < drops || ms >= booms) return null;
          if (ms < splashes)
            at.y = lerp(
              [area.top - SKY, surface],
              easeIn((ms - drops) / fallMs),
            );
          else
            at.y = lerp(
              [surface, surface + SINK],
              easeOut((ms - splashes) / sinkMs),
            );
          return at;
        },
      };
    });
    const lastBoom = charges[CHARGES - 1].booms;
    const surgeAt = lastBoom + MAX_AIR;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;

    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const pours = Math.random() * POUR_MS;
      const rest: Point = {
        x: area.left + Math.random() * width,
        y: surface + Math.random() * POOL,
      };
      // the nearest charge throws it up if it's close enough
      const charge = charges.find(
        (c) => Math.abs(c.x - rest.x) < REACH * Math.random(),
      );
      const vy = -between(LAUNCH);
      const vx = charge ? (rest.x - charge.x) * 0.002 : 0;
      const air = (-2 * vy) / GRAVITY;
      const leaves = surgeAt + Math.random() * SURGE_SPREAD;
      const landed: Point = { x: rest.x + vx * air, y: rest.y };
      const lift: Point = { x: landed.x, y: landed.y - LIFT };
      const at: Point = { x: 0, y: 0 };
      return (f) => {
        const ms = f * endAt;
        if (ms < pours) return { x: button.x, y: button.y, scale: 0 };
        if (ms < pours + POUR_MS) {
          const u = easeOut((ms - pours) / POUR_MS);
          return {
            x: lerp([button.x, rest.x], u),
            y: lerp([button.y, rest.y], u),
            scale: COIN,
          };
        }
        if (ms < leaves) {
          if (charge && ms > charge.booms && ms < charge.booms + air) {
            const t = ms - charge.booms;
            return {
              x: rest.x + vx * t,
              y: rest.y + vy * t + 0.5 * GRAVITY * t * t,
              scale: COIN,
            };
          }
          const x = charge && ms >= charge.booms + air ? landed.x : rest.x;
          return { x, y: rest.y, scale: COIN };
        }
        const total = cover?.total() ?? fallback;
        bezier(
          charge ? landed : rest,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const booming = createBeats(
      charges,
      (c) => c.booms,
      (c, k) => {
        cover!.burst({ x: c.x, y: surface }, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / (CHARGES - 1)));
      },
    );
    const erupting = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          booming.tick(ms, now);
          erupting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > lastBoom + DETONATION_MS) return;
          for (const c of charges) {
            const p = c.at(ms);
            if (p)
              drawLitFuse(
                ctx,
                p,
                clamp01((ms - c.drops) / (c.booms - c.drops)),
                FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              c.drops,
              c.booms,
            );
            drawDetonation(ctx, c.under, ms - c.booms, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
