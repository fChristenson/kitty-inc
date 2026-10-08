// the "Bottleneck" event (bounce; free upgrade levels): it covers its crit,
// whose click freezes the screen while a funnel of light, two walls closing
// to a narrow neck, draws itself over the clicked floor's bar; a ball wisp
// drops in at its mouth and ricochets wall to wall down it, every bounce a
// splash, a boing and a jolt of free levels, quicker and quicker as the
// walls close in, then shoots out of the neck onto the bar in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import { drawBounceSplash, ricochetThrough } from "../../../../shared/bounce";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "bottleneck";
const BOUNCES = 10;
// the funnel: its mouth's half-width as a share of the screen, its neck's
const MOUTH = 0.38;
const NECK = 26;
const ABOVE = 70;
// each bounce this share lower toward the neck than the last's gap
const DROP = 0.72;
const DRAW_MS = 220;
const WALL = 12;
const BALL = 0.55;
const SPLASH = 90;
const BLOOP_GAP_MS = 50;
const BOUNCE_SHAKE: [number, number] = [0.25, 0.9];

export const forceBottleneckEvent = registerWispEvent(
  KEY,
  "Bottleneck",
  () => CONFIG.bottleneckEvent.chance,
  (floor, context, area) => {
    const { legsMs, levelShare, holdMs, mergeMs } = CONFIG.bottleneckEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const x = bar.center.x;
    const neckY = bar.box.y - ABOVE;
    const mouthY = Math.max(
      area.top + 40,
      neckY - (area.bottom - area.top) * 0.6,
    );
    const mouth = width * MOUTH;
    // the walls' half-width at height y
    const halfAt = (y: number) =>
      lerp([NECK, mouth], clamp01((neckY - y) / (neckY - mouthY)));
    const walls = [-1, 1].map((side) => [
      { x: x + side * mouth, y: mouthY },
      { x: x + side * NECK, y: neckY },
    ]);
    const points: Point[] = [{ x: x - mouth * 0.3, y: area.top - 60 }];
    let gap = neckY - mouthY;
    let y = mouthY + gap * 0.15;
    for (let k = 0; k < BOUNCES; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      points.push({ x: x + side * halfAt(y), y });
      gap *= DROP;
      y = neckY - gap;
    }
    points.push({ x, y: bar.center.y });
    const path = ricochetThrough(points, legsMs, DRAW_MS);
    const hits = path.bounces.slice(0, -1);
    const endAt = path.endMs + 400;
    const ballAt = (ms: number): Point | null =>
      ms < DRAW_MS || ms > path.endMs ? null : path.at(ms);

    let bloop = -Infinity;
    const bouncing = createBeats(
      hits,
      (b) => b.ms,
      (b, k) => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), b.at);
        if (!cover!.isLive()) return;
        if (b.ms - bloop >= BLOOP_GAP_MS) {
          bloop = b.ms;
          playBloop();
        }
        shakeScreen(lerp(BOUNCE_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const landing = createBeats(
      [path.endMs],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 6, 4), bar.center);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );
    const tip: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          bouncing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const drawn = clamp01(ms / DRAW_MS);
          const fade = 1 - clamp01((ms - path.endMs) / 300);
          for (const [from, to] of walls) {
            tip.x = lerp([from.x, to.x], drawn);
            tip.y = lerp([from.y, to.y], drawn);
            drawBeam(ctx, from, tip, WALL, 0.6 * fade);
          }
          for (const b of hits)
            drawBounceSplash(ctx, b, ms - b.ms, SPLASH, now);
          drawWisp(ctx, ballAt, ms, now, WISP_SIZE * BALL, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
