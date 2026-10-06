// the "Katamari" event (money; cash): it covers its crit, whose click
// freezes the screen while cash spills along the top of every bar in view;
// a ball of cash drops onto the top bar and rolls along it, every coin it
// touches sticking to it so it swells as it goes, tumbling off the bar's end
// onto the next with a thud and a jolt and rolling back the other way, bar
// after bar, ever faster and bigger; off the last bar it bounces up and
// hurls itself into the total in a huge blast, its coins pouring in. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import type { CoinPath } from "../coins";
import { totalSpot } from "../cashFlow";
import { findRewardBars } from "../eventRewards";

const KEY = "katamari";
const REWARD = 4;
const MAX_BARS = 4;
const COINS_PER_BAR = 70;
// the ball: its radius bare and fully packed, its core wisp
const RADIUS: [number, number] = [26, 90];
const CORE = WISP_SIZE * 0.9;
// it rolls this far in from each bar's ends, and drops in from this high
const INSET = 20;
const DROP = 300;
const HOP = 160;
const LAND_SHAKE: [number, number] = [0.5, 1];
const SOUND_GAP_MS = 60;

interface Run {
  y: number;
  from: number;
  to: number;
  starts: number;
  ends: number;
}

export const forceKatamariEvent = registerWispEvent(
  KEY,
  "Katamari",
  () => CONFIG.katamariEvent.chance,
  (floor, context, area) => {
    const { dropMs, rollMs, fallMs, launchMs, holdMs, mergeMs } =
      CONFIG.katamariEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const fallback = totalSpot(area);
    const total = () => cover?.total() ?? fallback;
    const coinCount = COINS_PER_BAR * bars.length;
    const radiusAt = (picked: number) =>
      lerp(RADIUS, Math.sqrt(picked / coinCount));

    // a run along each bar, alternating ways, quickening; a drop between
    let clock: number = dropMs;
    const runs: Run[] = bars.map((bar, k) => {
      const ms = rollMs * lerp([1.2, 0.75], k / Math.max(1, bars.length - 1));
      const ltr = k % 2 === 0;
      const run = {
        y: bar.box.y,
        from: ltr ? bar.box.x + INSET : bar.box.x + bar.box.width - INSET,
        to: ltr ? bar.box.x + bar.box.width - INSET : bar.box.x + INSET,
        starts: clock,
        ends: clock + ms,
      };
      clock = run.ends + fallMs;
      return run;
    });
    const last = runs[runs.length - 1];
    const launchAt = last.ends;
    const inAt = launchAt + launchMs;

    // the coins lying along each run, picked up as the ball reaches them
    const coins = runs.flatMap((run) =>
      Array.from({ length: COINS_PER_BAR }, () => {
        const u = Math.random();
        const x = lerp([run.from, run.to], u);
        return {
          x,
          y: run.y - 6 - Math.random() * 10,
          picks: run.starts + (run.ends - run.starts) * u,
          angle: Math.random() * Math.PI * 2,
          depth: 0.4 + 0.6 * Math.random(),
        };
      }),
    );
    coins.sort((a, b) => a.picks - b.picks);
    const pickedBy = (ms: number) => {
      let low = 0;
      let high = coins.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (coins[mid].picks <= ms) low = mid + 1;
        else high = mid;
      }
      return low;
    };

    // the ball's middle and how far it has rolled (for its spin)
    const ball: Point = { x: 0, y: 0 };
    const ballAt = (ms: number, into: Point): number => {
      const r = radiusAt(pickedBy(ms));
      if (ms < runs[0].starts) {
        const u = easeIn(clamp01(ms / dropMs));
        into.x = runs[0].from;
        into.y = lerp([runs[0].y - DROP, runs[0].y - r], u);
        return 0;
      }
      let rolled = 0;
      for (let k = 0; k < runs.length; k++) {
        const run = runs[k];
        const span = Math.abs(run.to - run.from);
        if (ms <= run.ends) {
          const u = smoothstep(
            clamp01((ms - run.starts) / (run.ends - run.starts)),
          );
          into.x = lerp([run.from, run.to], u);
          into.y = run.y - r;
          return rolled + span * u * (run.to > run.from ? 1 : -1);
        }
        rolled += span * (run.to > run.from ? 1 : -1);
        const next = runs[k + 1];
        if (next && ms < next.starts) {
          // tumbling off the end down onto the next bar
          const u = (ms - run.ends) / (next.starts - run.ends);
          into.x = lerp([run.to, next.from], u);
          into.y = lerp([run.y, next.y], easeIn(u)) - r;
          return rolled;
        }
      }
      const u = clamp01((ms - launchAt) / launchMs);
      const to = total();
      const p = bezier(
        { x: last.to, y: last.y - r },
        { x: last.to, y: Math.min(last.y, to.y) - HOP },
        to,
        easeIn(u),
        into,
      );
      return rolled + (p.x - last.to);
    };

    // each coin: lying on its bar, then stuck to the ball, turning with it
    const paths: CoinPath[] = coins.map((c) => {
      const at: Point = { x: 0, y: 0 };
      return (f: number) => {
        const ms = f * inAt;
        if (ms < c.picks) return { x: c.x, y: c.y };
        const rolled = ballAt(ms, at);
        const r = radiusAt(pickedBy(ms)) * c.depth;
        const a = c.angle + rolled / Math.max(1, radiusAt(pickedBy(ms)));
        return {
          x: at.x + Math.cos(a) * r,
          y: at.y + Math.sin(a) * r,
          scale: ms >= inAt ? 0 : 1,
        };
      };
    });
    let soundAt = -Infinity;
    const landing = createBeats(
      runs,
      (r) => r.starts,
      (_, k, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(lerp(LAND_SHAKE, k / Math.max(1, runs.length - 1)));
        if (now - soundAt < SOUND_GAP_MS) return;
        soundAt = now;
        playBloop();
      },
    );
    const launching = createBeats(
      [launchAt, inAt],
      (ms) => ms,
      (ms) => {
        if (ms >= inAt) {
          cover!.blast(total());
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
    );

    const coreAt = (ms: number): Point | null => {
      if (ms > inAt) return null;
      ballAt(ms, ball);
      return ball;
    };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: inAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          landing.tick(ms, now);
          launching.tick(ms, now);
        },
        drawUnder: (ctx, ms, now) => {
          if (ms < 0 || ms > inAt) return;
          drawWisp(ctx, coreAt, ms, now, CORE, 0.6);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, inAt);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
