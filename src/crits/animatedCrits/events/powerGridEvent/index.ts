// the "Power Grid" event (lightning; free upgrade levels): it covers its
// crit, whose click freezes the screen while pylon wisps spark up at the
// ends of the income bars and power surges out of the clicked floor's
// button like a grid coming online: a bolt cracks out to the first pylon,
// then arcs along the bar to the pylon at its other end, the bar jolting
// with free levels as it powers up, then cracks up to the next bar's pylon,
// zigzagging up the stack, every line left crackling; at the top the whole
// grid surges at once in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "powerGrid";
const MAX_BARS = 4;
const PYLON_OUT = 24;
const PYLON_UP = 34;
const PYLON = WISP_SIZE * 0.45;
const STRIKE_MS = 220;
const SURGE_MS = 320;
const LINK_SHAKE = 0.3;
const SPAN_SHAKE: [number, number] = [0.6, 1.2];

interface Line {
  bolt: Bolt;
  ms: number;
  bar: RewardBar | null;
}

export const forcePowerGridEvent = registerWispEvent(
  KEY,
  "Power Grid",
  () => CONFIG.powerGridEvent.chance,
  (floor, context) => {
    const { linksMs, levelShare, holdMs, mergeMs } = CONFIG.powerGridEvent;
    // bottom up
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS).reverse();
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const ends = bars.map((bar) => [
      { x: bar.box.x - PYLON_OUT, y: bar.box.y - PYLON_UP },
      { x: bar.box.x + bar.box.width + PYLON_OUT, y: bar.box.y - PYLON_UP },
    ]);
    // in at the first bar's end nearest the button, then zigzagging up
    let side =
      Math.abs(ends[0][0].x - button.x) < Math.abs(ends[0][1].x - button.x)
        ? 0
        : 1;
    const legs: { from: Point; to: Point; bar: RewardBar | null }[] = [];
    let at: Point = button;
    bars.forEach((bar, k) => {
      legs.push({ from: at, to: ends[k][side], bar: null });
      legs.push({ from: ends[k][side], to: ends[k][1 - side], bar });
      at = ends[k][1 - side];
      side = 1 - side;
    });
    let clock: number = 0;
    const lines: Line[] = legs.map((leg, k) => {
      clock += lerp(linksMs, k / Math.max(1, legs.length - 1));
      return {
        bolt: createBolt(leg.from, leg.to, leg.bar ? 2 : 1),
        ms: clock,
        bar: leg.bar,
      };
    });
    const lastLine = lines[lines.length - 1];
    const surgeAt = lastLine.ms;
    const endAt = surgeAt + SURGE_MS;
    const pylons = ends.flatMap((pair, k) =>
      pair.map((p) => ({
        at: () => p,
        // lit once a line reaches it
        lit: Math.min(
          ...lines
            .filter((l) => l.bolt.to === p || l.bolt.from === p)
            .map((l) => l.ms),
        ),
        k,
      })),
    );

    const striking = createBeats(
      lines,
      (l) => l.ms,
      (l) => {
        if (l.bar) {
          cover!.levels(
            l.bar,
            levelsFor(l.bar.floor, levelShare, 2),
            l.bolt.to,
          );
          if (l === lastLine) {
            for (const bar of bars) cover!.slam(bar);
            cover!.blast(l.bar.center);
            return;
          }
          cover!.burst(l.bar.center, 0.5);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(
            lerp(
              SPAN_SHAKE,
              bars.indexOf(l.bar) / Math.max(1, bars.length - 1),
            ),
          );
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(LINK_SHAKE);
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          // the whole grid surging at the end, then gone
          const surge = clamp01((ms - surgeAt) / SURGE_MS);
          const scale = 1 + Math.sin(Math.PI * surge) * 1.2;
          const alpha = ms < surgeAt ? 0.85 : 1 - surge * surge;
          for (const l of lines) {
            if (ms < l.ms) continue;
            drawBolt(ctx, l.bolt, alpha, l.bar ? scale : scale * 0.7);
            const t = (ms - l.ms) / STRIKE_MS;
            if (t < 1)
              drawStrike(ctx, l.bolt.to, 1 - t, l.bar ? 1.2 : 0.8, now);
          }
          for (const p of pylons)
            if (ms >= p.lit) drawWispHead(ctx, p.at, ms, now, PYLON, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
