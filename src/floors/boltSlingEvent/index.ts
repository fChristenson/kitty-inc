// the "Bolt Sling" event (lightning; crit tiers): it covers its crit, whose
// click freezes the screen while two post wisps fly out of the clicked
// floor's button and hold a bolt of lightning between them like a
// slingshot's elastic; a third wisp is drawn back in its middle, stretching
// it into a crackling V with a rising rumble, then let go: it rockets into
// an income bar in a blinding strike, a bang and a big jolt, and the bar
// jumps a crit tier; the sling reloads and swings round to the next bar,
// each shot harder, the last landing in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "boltSling";
const MAX_BARS = 3;
const BASE = 230;
const ARM = 110;
const PULL = 120;
const PULL_GROW = 0.25;
const RELOAD_MS = 200;
const SNAP_MS = 220;
const TREMBLE = 4;
const RUMBLES = 4;
const STRIKE_MS = 200;
const POST = 0.38;
const SHOT = 0.48;
const HIT_SHAKE: [number, number] = [1, 1.6];

interface Shot {
  bar: RewardBar;
  left: Point;
  right: Point;
  rest: Point;
  pulled: Point;
  aim: Point;
  starts: number;
  set: number;
  release: number;
  hits: number;
  last: boolean;
}

export const forceBoltSlingEvent = registerWispEvent(
  KEY,
  "Bolt Sling",
  () => CONFIG.boltSlingEvent.chance,
  (floor, context, area) => {
    const { pullMs, flyMs, holdMs, mergeMs } = CONFIG.boltSlingEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const rest: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom - BASE,
    };
    let clock = 0;
    const shots: Shot[] = bars.map((bar, k) => {
      const t = k / Math.max(1, bars.length - 1);
      const aim: Point = { x: bar.center.x, y: bar.center.y };
      const dx = aim.x - rest.x;
      const dy = aim.y - rest.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = PULL * (1 + PULL_GROW * k);
      const starts = clock;
      const set = starts + RELOAD_MS;
      const release = set + lerp(pullMs, t);
      const hits = release + lerp(flyMs, t);
      clock = hits;
      return {
        bar,
        left: { x: rest.x - (dy / d) * ARM, y: rest.y + (dx / d) * ARM },
        right: { x: rest.x + (dy / d) * ARM, y: rest.y - (dx / d) * ARM },
        rest,
        pulled: { x: rest.x - (dx / d) * pull, y: rest.y - (dy / d) * pull },
        aim,
        starts,
        set,
        release,
        hits,
        last: k === bars.length - 1,
      };
    });
    const last = shots[shots.length - 1];
    const endAt = last.hits + SNAP_MS;
    const shotAt = (ms: number): Shot => {
      let s = shots[0];
      for (const shot of shots) if (ms >= shot.starts) s = shot;
      return s;
    };
    const post = (side: "left" | "right") => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const s = shotAt(ms);
        const k = shots.indexOf(s);
        const from = k === 0 ? button : shots[k - 1][side];
        const u = easeOut(clamp01((ms - s.starts) / RELOAD_MS));
        at.x = lerp([from.x, s[side].x], u);
        at.y = lerp([from.y, s[side].y], u);
        return at;
      };
    };
    const leftPost = post("left");
    const rightPost = post("right");
    // the shot wisp: back from its last bar, drawn back, then let fly
    const stoneAt: Point = { x: 0, y: 0 };
    const stone = (ms: number): Point => {
      ms = Math.max(0, ms);
      const s = shotAt(ms);
      const k = shots.indexOf(s);
      if (ms < s.set) {
        const from = k === 0 ? button : shots[k - 1].aim;
        const u = easeOut(clamp01((ms - s.starts) / RELOAD_MS));
        stoneAt.x = lerp([from.x, s.rest.x], u);
        stoneAt.y = lerp([from.y, s.rest.y], u);
      } else if (ms < s.release) {
        const u = easeOut(clamp01((ms - s.set) / (s.release - s.set)));
        const tremble = TREMBLE * u * Math.sin(ms * 0.9);
        stoneAt.x = lerp([s.rest.x, s.pulled.x], u) + tremble;
        stoneAt.y = lerp([s.rest.y, s.pulled.y], u) - tremble;
      } else {
        const u = easeIn(clamp01((ms - s.release) / (s.hits - s.release)));
        stoneAt.x = lerp([s.pulled.x, s.aim.x], u);
        stoneAt.y = lerp([s.pulled.y, s.aim.y], u);
      }
      return stoneAt;
    };
    // the elastic's middle: with the stone while drawn, then twanging round rest
    const pocket: Point = { x: rest.x, y: rest.y };
    const setPocket = (ms: number): void => {
      const s = shotAt(ms);
      if (ms >= s.set && ms < s.release) {
        const p = stone(ms);
        pocket.x = p.x;
        pocket.y = p.y;
        return;
      }
      const since = ms - s.release;
      const twang =
        since > 0 ? Math.cos(since * 0.06) * Math.exp(-since / 90) : 0;
      pocket.x = lerp([s.rest.x, s.pulled.x], twang);
      pocket.y = lerp([s.rest.y, s.pulled.y], twang);
    };
    const elastic = [
      createBolt({ ...shots[0].left }, pocket, 1),
      createBolt(pocket, { ...shots[0].right }, 1),
    ];
    const rumbles = shots.flatMap((s) =>
      Array.from({ length: RUMBLES }, (_, i) => ({
        ms: lerp([s.set, s.release], (i + 1) / (RUMBLES + 1)),
        shake: 0.15 + 0.1 * i,
      })),
    );

    const rumbling = createBeats(
      rumbles,
      (r) => r.ms,
      (r) => {
        if (cover?.isLive()) shakeScreen(r.shake);
      },
    );
    const hitting = createBeats(
      shots,
      (s) => s.hits,
      (s, k) => {
        cover!.tierUp(s.bar, s.pulled);
        if (s.last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.aim);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(s.aim, 0.8);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, shots.length - 1)));
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
          rumbling.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          const s = shotAt(ms);
          setPocket(ms);
          const l = leftPost(ms);
          elastic[0].from.x = l.x;
          elastic[0].from.y = l.y;
          const r = rightPost(ms);
          elastic[1].to.x = r.x;
          elastic[1].to.y = r.y;
          const tension =
            ms >= s.set && ms < s.release
              ? (ms - s.set) / (s.release - s.set)
              : 0;
          const on = clamp01((ms - shots[0].starts) / RELOAD_MS);
          for (const bolt of elastic)
            drawBolt(
              ctx,
              bolt,
              on * (0.6 + 0.4 * Math.random()),
              0.4 + 0.6 * tension,
            );
          for (const shot of shots) {
            const t = (ms - shot.hits) / STRIKE_MS;
            if (t >= 0 && t < 1)
              drawStrike(ctx, shot.aim, 1 - t, shot.last ? 3 : 1.8, now);
          }
          drawWispBetween(
            ctx,
            leftPost,
            ms,
            now,
            WISP_SIZE * POST,
            0.5,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            rightPost,
            ms,
            now,
            WISP_SIZE * POST,
            0.5,
            0,
            endAt,
          );
          drawWispBetween(
            ctx,
            stone,
            ms,
            now,
            WISP_SIZE * SHOT,
            tension,
            0,
            last.hits,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
