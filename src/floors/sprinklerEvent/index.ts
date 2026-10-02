// the "Sprinkler" event: it covers its crit, whose click freezes the screen
// while the clicked floor's button turns into a lawn sprinkler: a wisp on it
// sweeps back and forth, ever faster, spitting a stream of little wisps that
// arc up and rain down across the screen, each landing as a coin with a
// sparkle; then it whirls round once, spraying a ring of them every way, and
// as they land it blows in a huge blast and shake, and the coins sweep into
// the total. Pays floor income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playBloop, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { getButtonCenter } from "../upgradeButton";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";

const KEY = "sprinkler";
const REWARD = 4;
// the sweep: SWEEP rad either side of straight up, CYCLES times back and
// forth, picking up pace by SPEEDUP
const SWEEP = 1.05;
const CYCLES = 3;
const SPEEDUP = 0.5;
// each drop flies FLIGHT_MS, launched at LAUNCH of the screen's height a
// second, falling back to its start height over that time if shot straight up
const FLIGHT_MS = 560;
const LAUNCH = 1.7;
// the last whirl: RING drops every way at once
const RING = 10;
// the wisps, as shares of the screen's width
const NOZZLE = 0.06;
const DROP = 0.03;
// each landing: a burst and a jolt
const LAND_BURST = 0.15;
const LAND_SHAKE: [number, number] = [0.2, 0.6];

interface Drop {
  at: number;
  angle: number;
  path: (ms: number) => Point | null;
  landing: Point;
}

export const forceSprinklerEvent = registerWispEvent(
  KEY,
  "Sprinkler",
  () => CONFIG.sprinklerEvent.chance,
  (floor, context, area) => {
    const { sprayMs, emitMs, holdMs, mergeMs } = CONFIG.sprinklerEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const nozzle = getButtonCenter(context.isGroundFloor);
    const nozzleSize = Math.max(WISP_SIZE, width * NOZZLE);
    const dropSize = Math.max(WISP_SIZE * 0.6, width * DROP);
    const speed = (height * LAUNCH) / 1000;
    const gravity = (2 * speed) / FLIGHT_MS;
    const side = Math.random() < 0.5 ? 1 : -1;

    const aimAt = (ms: number) => {
      const u = clamp01(ms / sprayMs);
      const phase =
        Math.PI * 2 * CYCLES * ((1 - SPEEDUP) * u + SPEEDUP * u * u);
      return -Math.PI / 2 + side * SWEEP * Math.sin(phase);
    };
    const flight = (angle: number, tau: number, into: Point): Point => {
      into.x = nozzle.x + Math.cos(angle) * speed * tau;
      into.y =
        nozzle.y + Math.sin(angle) * speed * tau + 0.5 * gravity * tau * tau;
      return into;
    };
    const dropOf = (at: number, angle: number): Drop => {
      const point = { x: 0, y: 0 };
      return {
        at,
        angle,
        path: (ms) =>
          ms < at || ms >= at + FLIGHT_MS
            ? null
            : flight(angle, ms - at, point),
        landing: flight(angle, FLIGHT_MS, { x: 0, y: 0 }),
      };
    };
    const drops: Drop[] = [];
    for (let ms = 0; ms < sprayMs; ms += lerp(emitMs, ms / sprayMs))
      drops.push(dropOf(ms, aimAt(ms)));
    for (let i = 0; i < RING; i++)
      drops.push(dropOf(sprayMs, -Math.PI / 2 + (i / RING) * Math.PI * 2));
    const blastAt = sprayMs + FLIGHT_MS;

    const nozzleAt = (ms: number): Point | null =>
      ms < 0 || ms >= blastAt ? null : nozzle;
    const spits = createBeats(
      drops.filter((_, i) => i % 3 === 0),
      (d) => d.at,
      () => cover!.isLive() && playBloop(),
    );
    const lands = createBeats(
      drops,
      (d) => d.at + FLIGHT_MS,
      (d, k) => landed(d, k),
    );
    const finale = createBeats(
      [sprayMs, blastAt],
      (ms) => ms,
      (_, k) =>
        k === 0 ? cover!.isLive() && playSwoosh() : cover!.blast(nozzle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          spits.tick(ms, now);
          lands.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          for (const d of drops)
            drawWispBetween(
              ctx,
              d.path,
              ms,
              now,
              dropSize,
              heat,
              d.at,
              d.at + FLIGHT_MS,
            );
          drawWispBetween(ctx, nozzleAt, ms, now, nozzleSize, heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function landed(d: Drop, k: number): void {
      cover!.burst(d.landing, LAND_BURST);
      cover!.launchFrom(d.landing, [d.landing]);
      if (cover!.isLive() && k % 2 === 0)
        shakeScreen(lerp(LAND_SHAKE, k / drops.length));
    }
  },
);
