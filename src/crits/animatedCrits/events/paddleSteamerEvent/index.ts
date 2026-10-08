// the "Paddle Steamer" event (mix; cash): it covers its crit, whose click
// freezes the screen while a paddle wheel of six wisps rolls along the
// bottom of the screen, spinning faster and faster; every paddle that comes
// over the top flings an arc of cash up and back over the wheel with a
// splash, a bloop and a jolt, the arcs tumbling into the total; at the far
// side the wheel's hub launches a river of cash straight up into the total
// in a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "paddleSteamer";
const REWARD = 4;
const PADDLES = 6;
const WHEEL_R = 70;
const SPINS = 4;
const BOTTOM = 160;
const EDGE = 120;
const FLING_UP = 300;
const FLING_BACK = 170;
const PADDLE = 0.38;
const HUB = 0.6;
const POP_GAP_MS = 70;
const FLING_SHAKE: [number, number] = [0.3, 0.8];

export const forcePaddleSteamerEvent = registerWispEvent(
  KEY,
  "Paddle Steamer",
  () => CONFIG.paddleSteamerEvent.chance,
  (floor, context, area) => {
    const { crossMs, holdMs, mergeMs } = CONFIG.paddleSteamerEvent;
    const total = totalSpot(area);
    const x0 = area.left + EDGE;
    const x1 = area.right - EDGE;
    const y = area.bottom - BOTTOM;
    const hubAt = (ms: number, into: Point): Point => {
      const u = clamp01(ms / crossMs);
      into.x = lerp([x0, x1], u);
      into.y = y + Math.sin(u * Math.PI * 6) * 8;
      return into;
    };
    const turnOf = (ms: number) => Math.PI * 2 * SPINS * clamp01(ms / crossMs);
    // each paddle tops the wheel where its angle comes round to straight up
    const flings: { ms: number; line: Point[]; from: Point }[] = [];
    const turns = Math.PI * 2 * SPINS;
    for (let i = 0; i < PADDLES; i++)
      for (let k = 0; k <= SPINS; k++) {
        const a =
          (Math.PI * 3) / 2 - (Math.PI * 2 * i) / PADDLES + Math.PI * 2 * k;
        if (a <= 0 || a >= turns) continue;
        const ms = (a / turns) * crossMs;
        const hub = hubAt(ms, { x: 0, y: 0 });
        const from: Point = { x: hub.x, y: hub.y - WHEEL_R };
        const bend: Point = { x: from.x - 40, y: from.y - FLING_UP * 1.2 };
        const to: Point = {
          x: from.x - FLING_BACK,
          y: from.y - FLING_UP * 0.4,
        };
        flings.push({
          ms,
          from,
          line: sampleLine(
            (u) => bezier(from, bend, to, u, { x: 0, y: 0 }),
            24,
          ),
        });
      }
    flings.sort((a, b) => a.ms - b.ms);
    const flingPour: Pour = {
      coinsAlong: 120,
      width: 26,
      streamMs: 120,
      travelMs: 380,
    };
    const end = hubAt(crossMs, { x: 0, y: 0 });
    const launch = sampleLine(
      (u) => ({ x: lerp([end.x, total.x], u), y: lerp([end.y, total.y], u) }),
      30,
    );
    const launchPour: Pour = {
      coinsAlong: 500,
      width: 60,
      streamMs: 300,
      travelMs: 420,
    };
    const endAt = crossMs + launchPour.travelMs;
    const durationMs = Math.max(
      pourDurationMs(crossMs, launchPour),
      endAt + holdMs + mergeMs,
    );
    let lastPop = -Infinity;

    const flinging = createBeats(
      flings,
      (f) => f.ms,
      (f, k) => {
        pourLine(cover!, f.line, flingPour);
        cover!.burst(f.from, 0.3);
        if (!cover!.isLive() || f.ms - lastPop < POP_GAP_MS) return;
        lastPop = f.ms;
        playBloop();
        shakeScreen(lerp(FLING_SHAKE, k / Math.max(1, flings.length - 1)));
      },
    );
    const launching = createBeats(
      [crossMs],
      (ms) => ms,
      () => {
        pourLine(cover!, launch, launchPour);
        cover!.burst(end, 1);
        if (cover!.isLive()) shakeScreen(1.2);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const hubPoint: Point = { x: 0, y: 0 };
    const hub = (ms: number): Point => hubAt(Math.max(0, ms), hubPoint);
    const paddles = Array.from({ length: PADDLES }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const t = Math.max(0, ms);
        hubAt(t, at);
        const a = turnOf(t) + (Math.PI * 2 * i) / PADDLES;
        at.x += Math.cos(a) * WHEEL_R;
        at.y += Math.sin(a) * WHEEL_R;
        return at;
      };
    });

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          flinging.tick(ms, now);
          launching.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > crossMs) return;
          for (const paddle of paddles)
            drawWispBetween(
              ctx,
              paddle,
              ms,
              now,
              WISP_SIZE * PADDLE,
              0.4,
              0,
              crossMs,
            );
          drawWispBetween(
            ctx,
            hub,
            ms,
            now,
            WISP_SIZE * HUB,
            ms / crossMs,
            0,
            crossMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
