// the "Blowhole" event (money; free upgrade levels and cash): it covers its
// crit, whose click freezes the screen while a heaving sea of cash rolls in
// along the bottom, its swells rising higher and higher; with every swell a
// jet of cash blasts straight up through a blowhole under an income bar and
// slams into it with a jolt of free levels, each jet taller than the last;
// then the whole sea surges up one last jet into the total in a huge blast
// and shake. Pays floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import type { CoinPath } from "../coins";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { bezier } from "../../shared/curves";
import { findRewardBars, levelsFor } from "../eventRewards";
import { pourLine, sampleLine, totalSpot, type Pour } from "../cashFlow";

const KEY = "blowhole";
const REWARD = 2;
const MAX_BARS = 4;
const COINS = 520;
const COIN = 0.5;
const SEA_LOW = 50;
const SEA_DEEP = 110;
const SWELL: [number, number] = [10, 46];
const WAVE_K = 0.012;
const WAVE_MS = 0.006;
const RISE_MS = 300;
const JET: Pour = { coinsAlong: 140, width: 26, streamMs: 220, travelMs: 260 };
const FINAL: Pour = {
  coinsAlong: 220,
  width: 40,
  streamMs: 300,
  travelMs: 520,
};
const HIT_SHAKE: [number, number] = [0.6, 1.3];
const FINAL_SHAKE = 1.6;

export const forceBlowholeEvent = registerWispEvent(
  KEY,
  "Blowhole",
  () => CONFIG.blowholeEvent.chance,
  (floor, context, area) => {
    const { swellMs, jetsMs, levelShare, holdMs, mergeMs } =
      CONFIG.blowholeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    const width = area.right - area.left;
    const seaY = area.bottom - SEA_LOW;
    const total = totalSpot(area);
    let clock = swellMs;
    const jets = bars.map((bar, k) => {
      const starts = clock;
      clock += lerp(jetsMs, k / Math.max(1, bars.length - 1));
      const base: Point = {
        x: bar.center.x + (k % 2 ? 1 : -1) * bar.box.width * 0.2,
        y: seaY,
      };
      return {
        bar,
        starts,
        hits: starts + JET.travelMs,
        base,
        line: sampleLine(
          (u) => ({ x: base.x, y: lerp([base.y, bar.center.y], u) }),
          12,
        ),
      };
    });
    const surgesAt = clock;
    const finalBase: Point = { x: area.left + width / 2, y: seaY };
    const into: Point = { x: 0, y: 0 };
    const bend: Point = {
      x: finalBase.x,
      y: lerp([finalBase.y, total.y], 0.5),
    };
    const finalLine = sampleLine(
      (u) => ({ ...bezier(finalBase, bend, total, u, into) }),
      24,
    );
    const drainMs = 520;
    const travel = surgesAt + drainMs;
    const swellAt = (ms: number) => lerp(SWELL, clamp01(ms / surgesAt));
    const paths: CoinPath[] = Array.from({ length: COINS }, () => {
      const x = area.left - 20 + Math.random() * (width + 40);
      const depth = Math.random() * SEA_DEEP;
      const rises = Math.random() * RISE_MS;
      const leaves =
        surgesAt + (Math.abs(x - finalBase.x) / width) * drainMs * 0.6;
      const to: Point = { x: finalBase.x, y: seaY };
      return (f) => {
        const ms = f * travel;
        const y =
          seaY +
          depth -
          SEA_DEEP / 2 +
          Math.sin(x * WAVE_K - ms * WAVE_MS) *
            swellAt(ms) *
            (1 - depth / SEA_DEEP);
        if (ms < leaves) {
          const up = easeOut(clamp01((ms - rises) / RISE_MS));
          return { x, y: lerp([area.bottom + 40, y], up), scale: COIN * up };
        }
        // rushed along the sea to the last jet, then up it into the total
        const u = clamp01((ms - leaves) / (travel - leaves));
        if (u < 0.4) {
          const t = easeIn(u / 0.4);
          return { x: lerp([x, to.x], t), y: lerp([y, to.y], t), scale: COIN };
        }
        const p = bezier(finalBase, bend, total, easeIn((u - 0.4) / 0.6), into);
        return { x: p.x, y: p.y, scale: COIN };
      };
    });
    const last = jets[jets.length - 1];

    const jetting = createBeats(
      jets,
      (j) => j.starts,
      (j) => {
        pourLine(cover!, j.line, JET);
        cover!.burst(j.base, 0.4);
        if (cover!.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      jets,
      (j) => j.hits,
      (j, k) => {
        cover!.levels(
          j.bar,
          levelsFor(j.bar.floor, levelShare, 2),
          j.bar.center,
        );
        if (j === last) for (const bar of bars) cover!.slam(bar);
        cover!.burst(j.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jets.length - 1)));
      },
    );
    const surging = createBeats(
      [surgesAt, travel],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        pourLine(cover!, finalLine, FINAL);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(FINAL_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          jetting.tick(ms, now);
          hitting.tick(ms, now);
          surging.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
