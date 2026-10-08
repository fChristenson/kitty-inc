// the "Fractal Charge" event (explosion; levels): it covers its crit, whose
// click freezes the screen while the button lobs one big fizzing bomb into
// the middle of a huge invisible triangle spanning the screen; it blows in a
// big blast that flings three bombs to the middles of the triangle's three
// corner triangles, which blow and fling three each to theirs, and so on
// down Sierpinski's triangle: 1, 3, 9, then 27 bombs, every generation
// quicker, each blast its own bang and shake and free levels on the bars
// it lands on; the last 27 go up together in a cluster and the clicked
// floor's bar slams in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeOut } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "fractalCharge";
const GENERATIONS = 4;
// the triangle's corners' reach from the screen's middle (of its smaller side)
const REACH = 0.55;
const SIZES = [380, 260, 190, 150];
const BOMBS = [1.2, 0.85, 0.65, 0.5].map((k) => k * WISP_SIZE);
const SHAKES = [1.5, 1.1, 0.75, 0.5];
const FUSE = 46;
// px a thrown bomb's arc rises over its chord
const ARC = 120;
const LOB_ARC = 260;
// each bomb's own few ms of jitter on its generation's beat
const JITTER = 50;
const SOUND_GAP_MS = 60;

interface Bomb {
  gen: number;
  from: Point;
  bend: Point;
  to: Point;
  thrown: number;
  lands: number;
  blows: number;
  spot: Point;
  at: (ms: number) => Point | null;
  rest: () => Point;
}

type Triangle = [Point, Point, Point];
const mid = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
const centroid = ([a, b, c]: Triangle): Point => ({
  x: (a.x + b.x + c.x) / 3,
  y: (a.y + b.y + c.y) / 3,
});

export const forceFractalChargeEvent = registerWispEvent(
  KEY,
  "Fractal Charge",
  () => CONFIG.fractalChargeEvent.chance,
  (floor, context, area) => {
    const { lobMs, flyMs, fuseMs, levelShare, holdMs, mergeMs } =
      CONFIG.fractalChargeEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const r = Math.min(area.right - area.left, area.bottom - area.top) * REACH;
    const corner = (k: number): Point => {
      const a = -Math.PI / 2 + (Math.PI * 2 * k) / 3;
      return { x: centre.x + Math.cos(a) * r, y: centre.y + Math.sin(a) * r };
    };
    const bombs: Bomb[] = [];
    const add = (
      gen: number,
      from: Point,
      to: Point,
      thrown: number,
      arc: number,
    ): Bomb => {
      const lands = thrown + (gen === 0 ? lobMs : flyMs[gen - 1]);
      const bomb: Bomb = {
        gen,
        from,
        bend: { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - arc },
        to,
        thrown,
        lands,
        blows: lands + fuseMs[gen] + Math.random() * JITTER,
        spot: { x: 0, y: 0 },
        at: () => null,
        rest: () => to,
      };
      bomb.at = (ms) =>
        ms > bomb.lands
          ? null
          : bezier(
              bomb.from,
              bomb.bend,
              bomb.to,
              clamp01((ms - bomb.thrown) / (bomb.lands - bomb.thrown)),
              bomb.spot,
            );
      bombs.push(bomb);
      return bomb;
    };
    // every bomb blows and throws one to the middle of each corner triangle
    const split = (t: Triangle, parent: Bomb): void => {
      if (parent.gen + 1 >= GENERATIONS) return;
      const [a, b, c] = t;
      const kids: Triangle[] = [
        [a, mid(a, b), mid(a, c)],
        [mid(a, b), b, mid(b, c)],
        [mid(a, c), mid(b, c), c],
      ];
      for (const kid of kids)
        split(
          kid,
          add(parent.gen + 1, parent.to, centroid(kid), parent.blows, ARC),
        );
    };
    const whole: Triangle = [corner(0), corner(1), corner(2)];
    split(whole, add(0, button, centroid(whole), 0, LOB_ARC));
    const lastBlow = Math.max(...bombs.map((b) => b.blows));
    const finaleAt = lastBlow + 120;

    // each generation lands its levels once on every bar one of its blasts
    // reaches, at the first that does
    const hits: { bar: RewardBar; ms: number; from: Point }[] = [];
    for (let g = 0; g < GENERATIONS; g++) {
      const reach = SIZES[g] / 2;
      for (const b of bars) {
        const first = bombs
          .filter(
            (bomb) =>
              bomb.gen === g &&
              Math.abs(bomb.to.y - b.center.y) < reach + b.box.height / 2,
          )
          .sort((p, q) => p.blows - q.blows)[0];
        if (first) hits.push({ bar: b, ms: first.blows, from: first.to });
      }
    }
    let soundAt = -Infinity;

    const lobbing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const blowing = createBeats(
      bombs,
      (b) => b.blows,
      (b, _, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(SHAKES[b.gen]);
        if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playExplosion();
        }
      },
    );
    const leveling = createBeats(
      hits,
      (h) => h.ms,
      (h) =>
        cover!.levels(h.bar, levelsFor(h.bar.floor, levelShare, 1), h.from),
    );
    const finale = createBeats(
      [finaleAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare * 2, 2), centre);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finaleAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          lobbing.tick(ms, now);
          blowing.tick(ms, now);
          leveling.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > finaleAt + 900) return;
          for (const b of bombs) {
            const size = BOMBS[b.gen];
            drawWispBetween(ctx, b.at, ms, now, size, 0.6, b.thrown, b.lands);
            if (ms >= b.lands && ms < b.blows) {
              const burn = clamp01((ms - b.lands) / (b.blows - b.lands));
              const grow = 1 + 0.25 * easeOut(burn);
              drawLitFuse(ctx, b.to, burn, FUSE * (size / WISP_SIZE), now);
              drawWispHead(ctx, b.rest, ms, now, size * grow, burn);
            }
            drawDetonation(ctx, b.to, ms - b.blows, SIZES[b.gen], now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
