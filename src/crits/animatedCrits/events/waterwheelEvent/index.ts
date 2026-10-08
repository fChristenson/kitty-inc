// the "Waterwheel" event: it covers its crit, whose click freezes the screen
// while a wheel of six wisps round a glowing hub lights up in the middle of
// it and a waterfall of cash pours down onto its rim from a top corner; the
// cash rides the wheel round and spills off its bottom in a river that
// swings up into the total-income readout, the wheel spinning faster and
// faster, each paddle through the falls a flash and a jolt, until it flies
// apart in a huge blast and shake, its paddles flung off, and the coins
// sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "waterwheel";
const REWARD = 4;
// the wheel: PADDLES wisps RADIUS of the screen's width (or height, if less)
// out from a hub DROP of its height under its middle, spinning up to TURNS
const PADDLES = 6;
const RADIUS = 0.24;
const DROP = 0.08;
const TURNS = 3;
// the cash lands on the rim at ENTRY degrees (0 = right, -90 = top) and rides
// it round to the bottom, RIM px outside the paddles
const ENTRY = -125;
const RIM = 16;
// the wisps, as shares of the screen's width
const PADDLE = 0.05;
const HUB = 0.07;
const POP_MS = 200;
const POP_GAP_MS = 40;
// flung off FLING of the screen's width over FLING_MS
const FLING = 0.6;
const FLING_MS = 300;
// each paddle through the falls: a burst and a jolt, growing
const SPLASH_BURST: [number, number] = [0.3, 0.7];
const SPLASH_SHAKE: [number, number] = [0.4, 1.4];

export const forceWaterwheelEvent = registerWispEvent(
  KEY,
  "Waterwheel",
  () => CONFIG.waterwheelEvent.chance,
  (floor, context, area) => {
    const { streamMs, travelMs, holdMs, mergeMs } = CONFIG.waterwheelEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const way = Math.random() < 0.5 ? 1 : -1;
    const hub = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + height * DROP,
    };
    const r = Math.min(width, height) * RADIUS;
    const rim = (deg: number, into: Point = { x: 0, y: 0 }): Point => {
      const a = (deg * Math.PI) / 180;
      into.x = hub.x + way * Math.cos(a) * (r + RIM);
      into.y = hub.y + Math.sin(a) * (r + RIM);
      return into;
    };
    const source = {
      x: hub.x - way * width * 0.42,
      y: area.top + height * 0.12,
    };
    const entry = rim(ENTRY);
    const exit = rim(90);
    const line = [
      ...sampleLine(
        (u) =>
          bezier(source, { x: entry.x, y: source.y }, entry, u, { x: 0, y: 0 }),
        30,
      ),
      ...sampleLine((u) => rim(lerp([ENTRY, 90], u)), 50).slice(1),
      ...sampleLine(
        (u) =>
          bezier(
            exit,
            { x: hub.x + way * width * 0.55, y: exit.y + height * 0.05 },
            total,
            u,
            { x: 0, y: 0 },
          ),
        40,
      ).slice(1),
    ];
    const pour: Pour = { coinsAlong: 1_500, width: 56, streamMs, travelMs };
    const breakAt = streamMs + travelMs * 0.4;
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      breakAt + holdMs + mergeMs,
    );
    // the wheel's turn (in turns) ms in, speeding up
    const turn = (ms: number) => TURNS * clamp01(ms / breakAt) ** 2;
    // each paddle through the top-left falls
    const splashes: number[] = [];
    for (let ms = 0, last = 0; ms < breakAt; ms += 8) {
      const n = Math.floor(turn(ms) * PADDLES);
      if (n > last) splashes.push(ms);
      last = n;
    }
    const paddles = Array.from({ length: PADDLES }, (_, k) => {
      const into = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < k * POP_GAP_MS || ms >= breakAt + FLING_MS) return null;
        const a = (turn(Math.min(ms, breakAt)) + k / PADDLES) * Math.PI * 2;
        const out =
          r + width * FLING * easeOut(clamp01((ms - breakAt) / FLING_MS));
        into.x = hub.x + way * Math.cos(a) * out;
        into.y = hub.y + Math.sin(a) * out;
        return into;
      };
    });
    const hubAt = (ms: number): Point | null =>
      ms < 0 || ms >= breakAt ? null : hub;

    const splashing = createBeats(
      splashes,
      (ms) => ms,
      (_, k) => {
        const t = k / Math.max(1, splashes.length - 1);
        cover!.burst(entry, lerp(SPLASH_BURST, t));
        if (cover!.isLive()) shakeScreen(lerp(SPLASH_SHAKE, t));
      },
    );
    const finale = createBeats(
      [breakAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          splashing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / breakAt);
          const paddle = Math.max(WISP_SIZE, width * PADDLE);
          paddles.forEach((at, k) => {
            const from = k * POP_GAP_MS;
            const size = paddle * easeOutBack(clamp01((ms - from) / POP_MS));
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              size,
              heat,
              from,
              breakAt + FLING_MS,
            );
          });
          const hubSize =
            Math.max(WISP_SIZE, width * HUB) *
            easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(ctx, hubAt, ms, now, hubSize, heat, 0, breakAt);
        },
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
);
