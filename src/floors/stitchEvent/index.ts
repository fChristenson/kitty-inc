// the "Stitch" event (mix; cash and free upgrade levels): it covers its
// crit, whose click freezes the screen while a white-hot wisp needle darts in
// from off its side trailing a thread of flowing cash and stitches it
// through every income bar in view, top to bottom, in one end and out the
// other, looping back round for the next; every bar it runs through jolts
// with a flash, a bloop and free upgrade levels tallied over it; then the
// thread pulls tight and every bar slams in a huge blast and shake, the cash
// running on into the total. Pays floor income × floor number × REWARD, plus
// the levels
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { alongRoute } from "../../shared/curves";
import { createBeats } from "../../shared/eventBeats";
import {
  measure,
  pourDurationMs,
  pourLine,
  riverHead,
  sampleLine,
  type Pour,
} from "../cashFlow";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "stitch";
const REWARD = 2;
const MAX_BARS = 4;
// the thread runs PAST px beyond each bar's ends and loops LOOP px out
const PAST = 30;
const LOOP = 70;
const NEEDLE = 0.75;
const PASS_SHAKE: [number, number] = [0.8, 1.6];

export const forceStitchEvent = registerWispEvent(
  KEY,
  "Stitch",
  () => CONFIG.stitchEvent.chance,
  (floor, context, area) => {
    const { travelMs, streamMs, levelShare, holdMs, mergeMs } =
      CONFIG.stitchEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const first = Math.random() < 0.5 ? 1 : -1;
    // through each bar, alternating ways, looping round between them
    const route: Point[] = [];
    const exits: Point[] = [];
    bars.forEach((bar, k) => {
      const way = k % 2 === 0 ? first : -first;
      const left = bar.box.x - PAST;
      const right = bar.box.x + bar.box.width + PAST;
      const [from, to] = way > 0 ? [left, right] : [right, left];
      const y = bar.center.y;
      if (k === 0)
        route.push({
          x: way > 0 ? area.left - 60 : area.right + 60,
          y: y - 90,
        });
      else
        route.push({
          x: from - way * LOOP,
          y: (route[route.length - 1].y + y) / 2,
        });
      route.push({ x: from, y }, { x: (from + to) / 2, y }, { x: to, y });
      exits.push({ x: to, y });
    });
    const out = route[route.length - 1];
    const lastWay = (bars.length - 1) % 2 === 0 ? first : -first;
    route.push({ x: out.x + lastWay * LOOP, y: out.y + 80 });
    const line = sampleLine((u) => alongRoute(route, u, { x: 0, y: 0 }), 160);
    const along = measure(line);
    const length = along[along.length - 1];
    // when the needle comes out of each bar
    const passes = exits.map((exit) => {
      let best = 0;
      line.forEach((p, i) => {
        if (
          Math.hypot(p.x - exit.x, p.y - exit.y) <
          Math.hypot(line[best].x - exit.x, line[best].y - exit.y)
        )
          best = i;
      });
      return (along[best] / length) * travelMs;
    });
    const pour: Pour = { coinsAlong: 260, width: 20, streamMs, travelMs };
    const needle = riverHead(line, travelMs);

    const passing = createBeats(
      passes,
      (ms) => ms,
      (_, k) => {
        const bar = bars[k];
        const t = k / Math.max(1, bars.length - 1);
        cover!.levels(bar, levelsFor(bar.floor, levelShare), exits[k]);
        cover!.burst(exits[k], 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PASS_SHAKE, t));
      },
    );
    const tight = createBeats(
      [travelMs],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(exits[exits.length - 1]);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(0, pour),
          travelMs + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        endOnTotal: false,
        bars,
        tick: (ms, now) => {
          passing.tick(ms, now);
          tight.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            needle,
            ms,
            now,
            WISP_SIZE * NEEDLE,
            clamp01(ms / travelMs),
            0,
            travelMs,
          ),
      },
    );
    if (!cover) return;
    pourLine(cover, line, pour);
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
