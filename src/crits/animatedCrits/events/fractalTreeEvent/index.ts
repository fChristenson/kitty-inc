// the "Fractal Tree" event (beam; free upgrade levels): it covers its crit,
// whose click freezes the screen while a trunk of blazing light shoots up
// out of the clicked floor's button and forks in two with a flare and a
// jolt, each branch forking again and again, quicker every time, into a
// glowing tree of beams; its last branches lash out onto the income bars,
// each striking its bar with a jolt of free levels, the last in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "fractalTree";
const MAX_BARS = 4;
const FORKS = 3;
const TRUNK = 220;
const SHRINK = 0.68;
const SPLAY = [0.55, 0.45, 0.38];
const WIDTH = 12;
const FLARE_MS = 160;
const FADE_MS = 300;
const FORK_SHAKE: [number, number] = [0.4, 0.9];
const HIT_SHAKE: [number, number] = [0.7, 1.4];

interface Branch {
  from: Point;
  to: Point;
  starts: number;
  ends: number;
  width: number;
  bar: RewardBar | null;
}

export const forceFractalTreeEvent = registerWispEvent(
  KEY,
  "Fractal Tree",
  () => CONFIG.fractalTreeEvent.chance,
  (floor, context, area) => {
    const { growsMs, lashMs, levelShare, holdMs, mergeMs } =
      CONFIG.fractalTreeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const branches: Branch[] = [];
    // grown generation by generation: [tip, heading, length]
    let tips: { at: Point; heading: number }[] = [
      { at: button, heading: -Math.PI / 2 },
    ];
    let length = TRUNK;
    let clock = 0;
    for (let g = 0; g <= FORKS; g++) {
      const growMs = lerp(growsMs, g / FORKS);
      const next: typeof tips = [];
      for (const tip of tips) {
        const headings =
          g === 0
            ? [tip.heading]
            : [tip.heading - SPLAY[g - 1], tip.heading + SPLAY[g - 1]];
        for (const heading of headings) {
          const to: Point = {
            x: Math.max(
              area.left + 20,
              Math.min(area.right - 20, tip.at.x + Math.cos(heading) * length),
            ),
            y: Math.max(area.top + 20, tip.at.y + Math.sin(heading) * length),
          };
          branches.push({
            from: tip.at,
            to,
            starts: clock,
            ends: clock + growMs,
            width: WIDTH * SHRINK ** g,
            bar: null,
          });
          next.push({ at: to, heading });
        }
      }
      tips = next;
      clock += growMs;
      length *= SHRINK;
    }
    // the lashes out of the nearest tips onto the bars, one after another
    const lashes: Branch[] = bars
      .slice()
      .sort((a, b) => b.center.y - a.center.y)
      .map((bar, k) => {
        let best = tips[0].at;
        for (const tip of tips)
          if (
            Math.hypot(tip.at.x - bar.center.x, tip.at.y - bar.center.y) <
            Math.hypot(best.x - bar.center.x, best.y - bar.center.y)
          )
            best = tip.at;
        const starts = clock + k * lashMs * 0.5;
        return {
          from: best,
          to: bar.center,
          starts,
          ends: starts + lashMs,
          width: WIDTH * SHRINK ** FORKS,
          bar,
        };
      });
    branches.push(...lashes);
    const last = lashes[lashes.length - 1];
    const endAt = last.ends;
    const growths = Array.from({ length: FORKS }, (_, g) => {
      let ms = 0;
      for (let i = 0; i <= g; i++) ms += lerp(growsMs, i / FORKS);
      return ms;
    });
    const tip: Point = { x: 0, y: 0 };

    const forking = createBeats(
      growths,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(FORK_SHAKE, k / Math.max(1, FORKS - 1)));
      },
    );
    const lashing = createBeats(
      lashes,
      (l) => l.ends,
      (l, k) => {
        const bar = l.bar!;
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), bar.center);
        if (l === last) {
          for (const b of bars) cover!.slam(b);
          cover!.blast(bar.center);
          return;
        }
        cover!.burst(bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, lashes.length - 1)));
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
          forking.tick(ms, now);
          lashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + FADE_MS) return;
          const fade = 1 - clamp01((ms - endAt) / FADE_MS);
          const flare = Math.max(0, 1 - Math.abs(ms - endAt) / FADE_MS);
          for (const b of branches) {
            if (ms < b.starts) continue;
            const u = easeOut(clamp01((ms - b.starts) / (b.ends - b.starts)));
            tip.x = lerp([b.from.x, b.to.x], u);
            tip.y = lerp([b.from.y, b.to.y], u);
            drawBeam(ctx, b.from, tip, b.width * (1 + flare), fade);
            if (u < 1) drawBeamFlare(ctx, tip, b.width * 1.6, fade, now);
            const t = (ms - b.ends) / FLARE_MS;
            if (t >= 0 && t < 1)
              drawBeamFlare(ctx, b.to, b.width * 3, 1 - t, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
