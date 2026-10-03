// the "Storm Crown" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while a ring of wisps bursts out of the clicked
// floor's button and forms a spinning crown over an income bar; one after
// another every wisp in the ring hurls a bolt down into the bar, crack,
// crack, crack, until the bar jumps a crit tier with a bang and a big jolt;
// the crown sweeps on to the next bar and the next, spinning and striking
// ever faster, the last volley ending in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { findRewardBars } from "../eventRewards";

const KEY = "stormCrown";
const MAX_BARS = 3;
const JEWELS = 6;
const RADIUS = 110;
const SQUASH = 0.35;
const ABOVE = 150;
const MOVE_MS = 200;
const SPIN = 0.0025;
const BOLT_MS = 140;
const JEWEL = 0.35;
const CRACK_SHAKE = 0.3;
const TIER_SHAKE: [number, number] = [0.8, 1.4];

export const forceStormCrownEvent = registerWispEvent(
  KEY,
  "Storm Crown",
  () => CONFIG.stormCrownEvent.chance,
  (floor, context) => {
    const { volleysMs, holdMs, mergeMs } = CONFIG.stormCrownEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const crowns = bars.map((bar, k) => {
      const over: Point = { x: bar.center.x, y: bar.center.y - ABOVE };
      const moves = clock;
      const volley = lerp(volleysMs, k / Math.max(1, bars.length - 1));
      clock += MOVE_MS + volley;
      const crown = {
        bar,
        from,
        over,
        moves,
        strikes: Array.from(
          { length: JEWELS },
          (_, i) => moves + MOVE_MS + (volley * (i + 1)) / JEWELS,
        ),
        done: clock,
      };
      from = over;
      return crown;
    });
    const last = crowns[crowns.length - 1];
    const endAt = last.done;
    const centerAt: Point = { x: 0, y: 0 };
    const centerOf = (ms: number): Point => {
      let c = crowns[0];
      for (const crown of crowns) if (ms >= crown.moves) c = crown;
      const u = smoothstep(clamp01((ms - c.moves) / MOVE_MS));
      centerAt.x = lerp([c.from.x, c.over.x], u);
      centerAt.y = lerp([c.from.y, c.over.y], u);
      return centerAt;
    };
    const jewelSpots: Point[] = Array.from({ length: JEWELS }, () => ({
      x: 0,
      y: 0,
    }));
    const jewels = jewelSpots.map((_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const c = centerOf(ms);
        const a =
          ms * SPIN * Math.PI * 2 * (1 + ms / endAt) +
          (i / JEWELS) * Math.PI * 2;
        at.x = c.x + Math.cos(a) * RADIUS;
        at.y = c.y + Math.sin(a) * RADIUS * SQUASH;
        return at;
      };
    });
    const cracks = crowns.flatMap((c) =>
      c.strikes.map((at, i) => ({
        crown: c,
        at,
        jewel: i,
        bolt: createBolt(jewelSpots[i], c.bar.center, 1),
      })),
    );

    const cracking = createBeats(
      cracks,
      (c) => c.at,
      (c) => {
        cover!.burst(c.crown.bar.center, 0.2);
        if (!cover!.isLive()) return;
        shakeScreen(CRACK_SHAKE);
      },
    );
    const tiering = createBeats(
      crowns,
      (c) => c.done,
      (c, k) => {
        cover!.tierUp(c.bar, c.over);
        if (c === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(TIER_SHAKE, k / Math.max(1, crowns.length - 1)));
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
          cracking.tick(ms, now);
          tiering.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + BOLT_MS) return;
          for (const c of cracks) {
            const t = (ms - c.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            const spot = jewels[c.jewel](ms);
            jewelSpots[c.jewel].x = spot.x;
            jewelSpots[c.jewel].y = spot.y;
            drawBolt(ctx, c.bolt, 1 - t, 0.9);
            drawStrike(ctx, c.crown.bar.center, 1 - t, 0.8, now);
          }
          for (const j of jewels)
            drawWispBetween(ctx, j, ms, now, WISP_SIZE * JEWEL, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
