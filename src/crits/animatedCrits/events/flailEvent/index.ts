// the "Flail" event (lightning; crit tiers): it covers its crit, whose click
// freezes the screen while a handle wisp hangs over an income bar with a
// ball wisp swung round it on a crackling chain of lightning; it whirls
// faster and faster, the bolt crackling and stretching, then smashes down
// onto the bar in a blinding strike, a crack and a jolt, bolts racing out
// along the bar as it jumps a crit tier; the flail swings on to the next
// bar, whirling quicker each time, the last smash a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "flail";
const MAX_BARS = 4;
const CHAIN = 180;
const TURNS = 1.75;
// the share of a whirl spent swinging the handle over from the last bar
const GLIDE = 0.25;
const CRACKLE_MS = 180;
const HANDLE = 0.4;
const BALL = 0.65;
const SMASH_SHAKE: [number, number] = [0.8, 1.6];

interface Swing {
  bar: RewardBar;
  hub: Point;
  starts: number;
  smashes: number;
  crackles: Bolt[];
}

export const forceFlailEvent = registerWispEvent(
  KEY,
  "Flail",
  () => CONFIG.flailEvent.chance,
  (floor, context) => {
    const { whirlsMs, holdMs, mergeMs } = CONFIG.flailEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let clock = 0;
    const swings: Swing[] = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(whirlsMs, k / Math.max(1, bars.length - 1));
      return {
        bar,
        hub: { x: bar.center.x, y: bar.center.y - CHAIN },
        starts,
        smashes: clock,
        crackles: [-1, 1].map((side) =>
          createBolt(
            bar.center,
            { x: bar.center.x + (side * bar.box.width) / 2, y: bar.center.y },
            1,
          ),
        ),
      };
    });
    const last = swings[swings.length - 1];
    const endAt = last.smashes;
    const swingAt = (ms: number) => {
      let current = swings[0];
      for (const s of swings) if (ms >= s.starts) current = s;
      return current;
    };
    const hubAt: Point = { x: 0, y: 0 };
    const hub = (ms: number): Point => {
      const s = swingAt(Math.max(0, ms));
      const k = swings.indexOf(s);
      const prev = swings[k - 1];
      const u = smoothstep(
        clamp01((ms - s.starts) / ((s.smashes - s.starts) * GLIDE)),
      );
      hubAt.x = prev ? lerp([prev.hub.x, s.hub.x], u) : s.hub.x;
      hubAt.y = prev ? lerp([prev.hub.y, s.hub.y], u) : s.hub.y;
      return hubAt;
    };
    const ballAt: Point = { x: 0, y: 0 };
    const ball = (ms: number): Point => {
      const s = swingAt(Math.max(0, ms));
      const h = hub(ms);
      // whirling up to speed, ending straight down on the bar
      const u = easeIn(clamp01((ms - s.starts) / (s.smashes - s.starts)));
      const a = Math.PI / 2 - Math.PI * 2 * TURNS * (1 - u);
      ballAt.x = h.x + Math.cos(a) * CHAIN;
      ballAt.y = h.y + Math.sin(a) * CHAIN;
      return ballAt;
    };
    const chain = createBolt({ x: 0, y: 0 }, { x: 0, y: 0 }, 0);

    const smashing = createBeats(
      swings,
      (s) => s.smashes,
      (s, k) => {
        cover!.tierUp(s.bar, s.hub);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, k / Math.max(1, swings.length - 1)));
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
        tick: (ms, now) => smashing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + CRACKLE_MS) return;
          for (const s of swings) {
            const t = (ms - s.smashes) / CRACKLE_MS;
            if (t < 0 || t >= 1) continue;
            for (const bolt of s.crackles) drawBolt(ctx, bolt, 1 - t, 0.6);
            drawStrike(ctx, s.bar.center, 1 - t, 1.3, now);
          }
          if (ms >= endAt) return;
          const s = swingAt(ms);
          const spin = clamp01((ms - s.starts) / (s.smashes - s.starts));
          const h = hub(ms);
          chain.from.x = h.x;
          chain.from.y = h.y;
          const b = ball(ms);
          chain.to.x = b.x;
          chain.to.y = b.y;
          drawBolt(ctx, chain, 0.6 + 0.4 * spin, 0.35 + 0.25 * spin);
          drawWispBetween(ctx, hub, ms, now, WISP_SIZE * HANDLE, 0.4, 0, endAt);
          drawWispBetween(ctx, ball, ms, now, WISP_SIZE * BALL, spin, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
