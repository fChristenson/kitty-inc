// the "Prize Wheel" event (wisp; levels + crit tier): it covers its crit,
// whose click freezes the screen while a ring of wisps flies out into a huge
// wheel round the middle of the screen and spins flat out past a pointer
// wisp, every one going by kicking it aside with a tick; the wheel slows,
// crawls and tips onto the winner, which flares white; then the wheel blows
// apart, every wisp slamming onto a bar with its levels, and the winner
// dives last onto the clicked one, climbing a crit tier in a huge blast
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playBoostEventStream, playSpinTick } from "../../../../sound";
import { drawBeam } from "../../../../shared/beam";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { levelsFor } from "../../../../gameState";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { registerWispEvent, startWispCover } from "../../wispCover";

const KEY = "prizeWheel";
const WISPS = 12;
const GAP = (Math.PI * 2) / WISPS;
// the wheel, of the screen's width (or height, if that's tighter)
const RADIUS = 0.36;
const RADIUS_OF_HEIGHT = 0.28;
const GROW_MS = 300;
const POINTER_GAP = 0.09;
const POINTER_KICK = 0.03;
const POINTER = WISP_SIZE * 1.6;
const SPOKE = 10;
const SPOKE_ALPHA = 0.3;
const RIM = 16;
const RIM_ALPHA = 0.55;
const HUB_GLOW = 0.5;
const WISP = WISP_SIZE * 1.4;
const WINNER = WISP_SIZE * 2;
// ticks: their pitch rising with the wheel's speed
const TICK_RATE: [number, number] = [0.8, 1.6];
// the winner flaring on the pointer, then the wheel blowing apart
const WIN_LAG_MS = 80;
const WIN_BLAST = 120;
const WIN_SHAKE = 1.6;
const WIN_GLOW = 0.2;
const BREAK_LAG_MS = 380;
const BREAK_BLAST = 200;
const BREAK_SHAKE = 1.2;
const LAUNCH_GAP_MS = 45;
const FLY_LIFT = 0.17;
const LAND_BLAST = 80;
const LAND_SHAKE = 0.4;
// the winner rising off the wheel and diving onto the clicked bar
const WIN_FLY_MS = 420;
const WIN_RISE = 0.25;
const WIN_OVER = 0.55;
const BOOM_LAG_MS = 220;
const BOOM_BLAST = 270;
const BOOM_SHAKE = 3;
const SOUND_GAP_MS = 55;

export const forcePrizeWheelEvent = registerWispEvent(
  KEY,
  "Prize Wheel",
  () => CONFIG.prizeWheelEvent.chance,
  (floor, context, area) => {
    const { spinMs, turns, flyMs, levelShare, winnerShare, holdMs, mergeMs } =
      CONFIG.prizeWheelEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius = Math.min(width * RADIUS, height * RADIUS_OF_HEIGHT);
    const pointer: Point = {
      x: center.x,
      y: center.y - radius - width * POINTER_GAP,
    };

    // how far round the wheel has turned ms in: flat out, slowing to a crawl
    const angle = (ms: number) => {
      const u = clamp01((ms - GROW_MS / 2) / (spinMs - GROW_MS / 2));
      return turns * Math.PI * 2 * (1 - (1 - u) ** 4);
    };
    const ringAt = (k: number, ms: number, into: Point): Point => {
      const r = radius * (1 - (1 - clamp01(ms / GROW_MS)) ** 3);
      const a = angle(ms) + k * GAP - Math.PI / 2;
      into.x = center.x + Math.cos(a) * r;
      into.y = center.y + Math.sin(a) * r;
      return into;
    };

    const top = ringAt(0, spinMs, { x: 0, y: 0 });
    const winAt = spinMs + WIN_LAG_MS;
    const breakAt = spinMs + BREAK_LAG_MS;
    // every other wisp onto a bar, cycling top to bottom, the clicked one
    // only if it's alone
    const others = bars
      .filter((b) => b !== clicked)
      .sort((a, b) => a.center.y - b.center.y);
    const pool = others.length > 0 ? others : [clicked];
    const flights = Array.from({ length: WISPS - 1 }, (_, i) => {
      const bar = pool[i % pool.length];
      const side = ((i * 7) % 11) / 10;
      return {
        k: i + 1,
        bar,
        launch: breakAt + i * LAUNCH_GAP_MS,
        land: breakAt + i * LAUNCH_GAP_MS + flyMs,
        to: {
          x: bar.box.x + bar.box.width * (0.1 + 0.8 * side),
          y: bar.center.y,
        },
        from: { x: 0, y: 0 },
      };
    });
    for (const f of flights) ringAt(f.k, f.launch, f.from);
    const boomAt = flights[flights.length - 1].land + BOOM_LAG_MS;
    const winLaunch = boomAt - WIN_FLY_MS;
    const winFrom = ringAt(0, winLaunch, { x: 0, y: 0 });
    const winRise: Point = { x: winFrom.x, y: winFrom.y - width * WIN_RISE };
    const winOver: Point = {
      x: clicked.center.x,
      y: clicked.center.y - width * WIN_OVER,
    };
    const endMs = boomAt + DETONATION_MS;

    // each wisp's path: round the wheel, then off it onto its bar
    const paths = Array.from({ length: WISPS }, (_, k) => {
      const at: Point = { x: 0, y: 0 };
      if (k === 0)
        return (ms: number): Point | null => {
          const t = (ms - winLaunch) / WIN_FLY_MS;
          if (t < 0) return ringAt(0, Math.max(0, ms), at);
          if (t >= 1) return null;
          const p = t ** 1.6;
          const u = 1 - p;
          const to = clicked.center;
          at.x =
            u * u * u * winFrom.x +
            3 * u * u * p * winRise.x +
            3 * u * p * p * winOver.x +
            p * p * p * to.x;
          at.y =
            u * u * u * winFrom.y +
            3 * u * u * p * winRise.y +
            3 * u * p * p * winOver.y +
            p * p * p * to.y;
          return at;
        };
      const f = flights[k - 1];
      return (ms: number): Point | null => {
        if (ms < f.launch) return ringAt(k, Math.max(0, ms), at);
        const t = (ms - f.launch) / flyMs;
        if (t >= 1) return null;
        const e = t * t;
        at.x = lerp([f.from.x, f.to.x], e);
        at.y = lerp([f.from.y, f.to.y], e) - 4 * t * (1 - t) * width * FLY_LIFT;
        return at;
      };
    });

    let soundAt = -Infinity;
    const bang = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };
    const levels = new Map<RewardBar, number>(
      bars.map((b) => [b, levelsFor(b.floor, levelShare, 1)]),
    );
    let passed = 0;
    const landing = createBeats(
      flights,
      (f) => f.land,
      (f, _, now) => {
        cover!.levels(f.bar, levels.get(f.bar)!, f.to);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        bang(now);
      },
    );
    const beats = createBeats(
      [winAt, breakAt, boomAt],
      (ms) => ms,
      (_, i, now) => {
        if (i === 2) {
          cover!.levels(clicked, levelsFor(clicked.floor, winnerShare, 1));
          cover!.tierUp(clicked, clicked.center);
          for (const bar of bars) cover!.slam(bar);
        }
        if (!cover!.isLive()) return;
        shakeScreen([WIN_SHAKE, BREAK_SHAKE, BOOM_SHAKE][i]);
        bang(now);
      },
    );

    const kick = (ms: number) => {
      if (ms < GROW_MS || ms >= spinMs) return 0;
      let p = (angle(ms) / GAP) % 1;
      if (p < 0) p += 1;
      return width * POINTER_KICK * Math.max(0, 1 - p * 5);
    };
    const tip: Point = { x: 0, y: 0 };
    const pointerAt = () => tip;
    const spoke: Point = { x: 0, y: 0 };
    const next: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: boomAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          // a tick for every wisp passing the pointer, higher the faster
          const count = Math.floor(angle(Math.min(ms, spinMs)) / GAP);
          if (count > passed && cover?.isLive()) {
            const speed = 1 - clamp01(ms / spinMs);
            playSpinTick(lerp(TICK_RATE, speed));
          }
          passed = Math.max(passed, count);
          landing.tick(ms, now);
          beats.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const spinning = ms < breakAt;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          if (spinning) {
            stampGlimmer(
              ctx,
              center.x,
              center.y,
              radius * HUB_GLOW,
              3,
              COLOR.heavenlyGold,
            );
            // the spokes and the rim, so it reads as a wheel
            for (let k = 0; k < WISPS; k++) {
              ringAt(k, ms, spoke);
              ringAt((k + 1) % WISPS, ms, next);
              drawBeam(ctx, center, spoke, SPOKE, SPOKE_ALPHA);
              drawBeam(ctx, spoke, next, RIM, RIM_ALPHA);
            }
          }
          // the winner flaring under the pointer, all the way down
          const flaring = ms >= winAt && ms < boomAt;
          const win = flaring ? paths[0](ms) : null;
          if (win)
            stampGlimmer(
              ctx,
              win.x,
              win.y,
              width * WIN_GLOW * (1 + 0.2 * Math.sin(ms * 0.03)),
              5,
              COLOR.heavenlyGold,
            );
          endLightBatch(ctx);
          ctx.restore();
          if (spinning) {
            tip.x = pointer.x + kick(ms);
            tip.y = pointer.y;
            drawWisp(ctx, pointerAt, ms, now, POINTER, 1);
          }
          for (let k = 0; k < WISPS; k++)
            drawWisp(
              ctx,
              paths[k],
              ms,
              now,
              k === 0 && flaring ? WINNER : WISP,
              k === 0 && flaring ? 1 : k % 2 ? 0.2 : 0.6,
            );
          drawDetonation(ctx, top, ms - winAt, WIN_BLAST, now);
          drawDetonation(ctx, center, ms - breakAt, BREAK_BLAST, now);
          for (const f of flights)
            drawDetonation(ctx, f.to, ms - f.land, LAND_BLAST, now);
          drawDetonation(ctx, clicked.center, ms - boomAt, BOOM_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
