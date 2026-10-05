// the "Gold Plating" event (spray; a crit tier): it covers its crit, whose
// click freezes the screen while four nozzle wisps fly off the clicked
// floor's button and take up a ring round its income bar; they whirl round
// it, faster and faster, every one hissing a cone of glittering gold mist
// inward, the bar jolting at every quarter turn as its gold coat builds up
// thicker and brighter, until it's plated all over, flashes white and jumps
// a crit tier in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  type Spray,
} from "../../shared/spray";
import { findRewardBars } from "../eventRewards";

const KEY = "goldPlating";
const NOZZLES = 4;
// the ring the nozzles whirl round: px clear of the bar's sides and its top
// and bottom; each aims at a ring INNER of the way out across the bar
const RING_X = 110;
const RING_Y = 100;
const INNER = 0.75;
const TURNS = 1.75;
const NOZZLE = 0.45;
const DROPLET = WISP_SIZE * 0.6;
const FLASH_MS = 240;
const FLY_SHAKE = 0.5;
const TURN_SHAKE: [number, number] = [0.25, 0.8];

export const forceGoldPlatingEvent = registerWispEvent(
  KEY,
  "Gold Plating",
  () => CONFIG.goldPlatingEvent.chance,
  (floor, context) => {
    const { flyMs, sprayMs, holdMs, mergeMs } = CONFIG.goldPlatingEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const c = bar.center;
    const rx = bar.box.width / 2 + RING_X;
    const ry = bar.box.height / 2 + RING_Y;
    const ix = (bar.box.width / 2) * INNER;
    const iy = (bar.box.height / 2) * INNER;
    const done = flyMs + sprayMs;
    const endAt = done + FLASH_MS;
    // the ring's turn at ms: still while they fly in, then whirling ever faster
    const turnAt = (ms: number) =>
      TURNS * Math.PI * 2 * easeIn(clamp01((ms - flyMs) / sprayMs));
    const nozzles = Array.from({ length: NOZZLES }, (_, k) => {
      const phase = (k / NOZZLES) * Math.PI * 2;
      const spot: Point = { x: 0, y: 0 };
      const start: Point = {
        x: c.x + Math.cos(phase) * rx,
        y: c.y + Math.sin(phase) * ry,
      };
      const at = (ms: number): Point => {
        if (ms < flyMs) {
          const u = easeOut(clamp01(ms / flyMs));
          spot.x = lerp([button.x, start.x], u);
          spot.y = lerp([button.y, start.y], u);
          return spot;
        }
        const a = phase + turnAt(ms);
        spot.x = c.x + Math.cos(a) * rx;
        spot.y = c.y + Math.sin(a) * ry;
        return spot;
      };
      // aimed at its own point on the inner ring, so the cone lands on the bar
      const aim = (ms: number): number => {
        const a = phase + turnAt(ms);
        const from = at(ms);
        return Math.atan2(
          c.y + Math.sin(a) * iy - from.y,
          c.x + Math.cos(a) * ix - from.x,
        );
      };
      const reach = Math.hypot(rx - ix, ry - iy) * 0.8;
      const spray: Spray = planSpray(at, aim, {
        startMs: flyMs,
        endMs: done,
        reach,
        spread: 0.28,
        flightMs: 260,
      });
      return { at, spray, lands: { x: 0, y: 0 } };
    });
    // a jolt every quarter turn, closer together as it speeds up
    const quarters = Math.floor(TURNS * 4);
    const turns = Array.from(
      { length: quarters },
      (_, q) => flyMs + sprayMs * Math.sqrt((q + 1) / (TURNS * 4)),
    );

    const flying = createBeats(
      [0],
      (ms) => ms,
      () => {
        cover!.burst(button, 0.5);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FLY_SHAKE);
      },
    );
    const turning = createBeats(
      turns,
      (ms) => ms,
      (ms, q) => {
        cover!.levels(bar, 0, nozzles[q % NOZZLES].at(ms));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, q / Math.max(1, quarters - 1)));
      },
    );
    const plating = createBeats(
      [done],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, button);
        cover!.slam(bar);
        cover!.blast(c);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          flying.tick(ms, now);
          turning.tick(ms, now);
          plating.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          const coverage = clamp01((ms - flyMs) / sprayMs);
          const flash = ms > done ? 1 - clamp01((ms - done) / FLASH_MS) : 0;
          if (ms <= endAt)
            drawSprayCoat(
              ctx,
              c,
              bar.box.width * 1.2,
              bar.box.height * 1.8,
              coverage,
              flash,
            );
          for (const n of nozzles) {
            drawSpray(ctx, n.spray, ms, now, DROPLET);
            if (ms >= flyMs && ms <= done)
              drawSprayMist(
                ctx,
                sprayLandsAt(n.spray, ms, n.lands),
                ms - flyMs,
                0.7,
                DROPLET,
                now,
              );
            drawWispBetween(
              ctx,
              n.at,
              ms,
              now,
              WISP_SIZE * NOZZLE,
              0.8,
              0,
              done,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
