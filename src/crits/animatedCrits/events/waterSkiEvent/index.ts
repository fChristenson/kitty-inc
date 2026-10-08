// the "Water Ski" event (mix; cash): it covers its crit, whose click
// freezes the screen while a boat wisp roars in off the bottom left, carving
// big S-bends up the screen and churning a spreading wake of cash behind
// it; a skier wisp on a tow rope of light swings wide side to side across
// the wake, jumping it every crossing in a splash, a jolt and a spray of
// coins; the boat roars into the total, the skier lets go and flies in after
// it in a huge blast, and the whole wake pours in. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { alongRoute, bezier } from "../../../../shared/curves";
import { clamp01, easeIn, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { ringTargets } from "../../../../shared/coinTargets";
import type { CoinPath } from "../../../../floors/coins";
import { totalSpot } from "../../cashFlow";

const KEY = "waterSki";
const REWARD = 4;
// the wake: this many coins trailing WAKE_MS of the boat's run behind it,
// fanning out to SPREAD px either side
const COINS = 300;
const WAKE_MS = 600;
const SPREAD = 90;
// the skier trails ROPE ms behind, swinging SWING px out SWINGS times
const ROPE = 160;
const SWING = 120;
const SWINGS = 3;
const HOP = 40;
const HOP_MS = 160;
const BOAT = WISP_SIZE;
const SKIER = WISP_SIZE * 0.7;
const ROPE_W = 3;
const JUMP_COINS = 6;
const JUMP_RING: [number, number] = [40, 90];
const JUMP_SHAKE = 0.5;
const FINISH_SHAKE = 1;

export const forceWaterSkiEvent = registerWispEvent(
  KEY,
  "Water Ski",
  () => CONFIG.waterSkiEvent.chance,
  (floor, context, area) => {
    const { runMs, letGoMs, holdMs, mergeMs } = CONFIG.waterSkiEvent;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const w = area.right - area.left;
    const h = area.bottom - area.top;
    const route: Point[] = [
      { x: area.left - 120, y: area.top + h * 0.9 },
      { x: area.left + w * 0.8, y: area.top + h * 0.75 },
      { x: area.left + w * 0.2, y: area.top + h * 0.52 },
      { x: area.left + w * 0.8, y: area.top + h * 0.3 },
      fallback,
    ];
    // the run, easing up to full throttle
    const uAt = (ms: number) => {
      const t = clamp01(ms / runMs);
      return t < 0.15
        ? smoothstep(t / 0.15) * 0.075
        : 0.075 + (t - 0.15) * (0.925 / 0.85);
    };
    const on = (ms: number, into: Point) => alongRoute(route, uAt(ms), into);
    // the side of the course at ms (a unit normal), for the wake and the skier
    const ahead: Point = { x: 0, y: 0 };
    const normalAt = (ms: number, at: Point, into: Point): Point => {
      alongRoute(route, Math.min(1, uAt(ms) + 0.004), ahead);
      const dx = ahead.x - at.x;
      const dy = ahead.y - at.y;
      const d = Math.hypot(dx, dy) || 1;
      into.x = -dy / d;
      into.y = dx / d;
      return into;
    };
    const swingAt = (ms: number) =>
      Math.sin((ms / runMs) * SWINGS * Math.PI * 2);
    const jumps = Array.from(
      { length: SWINGS * 2 - 1 },
      (_, k) => ((k + 1) * runMs) / (SWINGS * 2) + ROPE,
    );
    const letGo = runMs + letGoMs;
    const lastIn = runMs + WAKE_MS;

    const n: Point = { x: 0, y: 0 };
    const skierSpot = (ms: number, into: Point): Point => {
      const t = Math.max(0, ms - ROPE);
      on(t, into);
      normalAt(t, into, n);
      const s = swingAt(t) * SWING;
      into.x += n.x * s;
      into.y += n.y * s;
      for (const j of jumps) {
        const since = ms - j;
        if (since > -HOP_MS / 2 && since < HOP_MS / 2)
          into.y -= HOP * Math.cos((since / HOP_MS) * Math.PI);
      }
      return into;
    };
    const release: Point = skierSpot(runMs, { x: 0, y: 0 });

    // the wake: each coin rides the boat's line a lag behind, fanned out
    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const lag = (WAKE_MS * (i + 1)) / COINS;
      const side = (i % 2 ? 1 : -1) * (0.3 + 0.7 * Math.random());
      const at: Point = { x: 0, y: 0 };
      const nn: Point = { x: 0, y: 0 };
      return (f: number) => {
        const t = f * lastIn - lag;
        if (t < 0) return { x: route[0].x, y: route[0].y, scale: 0 };
        if (t >= runMs) return { ...total(), scale: 0 };
        on(t, at);
        normalAt(t, at, nn);
        const fan =
          side *
          SPREAD *
          clamp01(lag / WAKE_MS) *
          (1 - clamp01(uAt(t) - 0.85) / 0.15);
        return { x: at.x + nn.x * fan, y: at.y + nn.y * fan };
      };
    });

    const starting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const jumping = createBeats(
      jumps,
      (ms) => ms,
      (ms) => {
        const at = skierSpot(ms, { x: 0, y: 0 });
        cover!.burst(at, 0.4);
        cover!.launchFrom(at, ringTargets(at, JUMP_COINS, JUMP_RING));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(JUMP_SHAKE);
      },
    );
    const finishing = createBeats(
      [runMs, letGo],
      (ms) => ms,
      (ms) => {
        if (ms >= letGo) {
          cover!.blast(total());
          return;
        }
        cover!.burst(total(), 0.8);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FINISH_SHAKE);
      },
    );

    const boat: Point = { x: 0, y: 0 };
    const skier: Point = { x: 0, y: 0 };
    const boatAt = (ms: number): Point | null =>
      ms < 0 || ms > runMs ? null : on(ms, boat);
    const skierAt = (ms: number): Point | null => {
      if (ms < 0 || ms > letGo) return null;
      if (ms <= runMs) return skierSpot(ms, skier);
      return bezier(
        release,
        { x: release.x, y: release.y - 200 },
        total(),
        easeIn((ms - runMs) / letGoMs),
        skier,
      );
    };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastIn + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          starting.tick(ms, now);
          jumping.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > letGo) return;
          const b = boatAt(ms);
          const s = skierAt(ms);
          if (b && s) drawBeam(ctx, b, s, ROPE_W, 0.6);
          drawWisp(ctx, skierAt, ms, now, SKIER, 0.7);
          drawWisp(ctx, boatAt, ms, now, BOAT, 1);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, lastIn);
    playBoostEventStream();
  },
);
