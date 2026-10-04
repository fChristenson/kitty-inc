// the "Breakthrough" event (drill; free upgrade levels and a crit tier): it
// covers its crit, whose click freezes the screen while a drill-headed wisp
// screams down out of the sky and slams into the middle of the clicked
// floor's income bar with a bang; it stalls against the bar like a bit on
// hard steel, grinding and juddering in place as a gush of white-hot sparks
// streaks out of both sides and arcs away, then starts to give, boring in
// shove by shove, each harder, the sparks spraying ever thicker and
// faster, until it punches out the underside in a huge blast and shake and
// the bar jumps a crit tier with free levels. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDrill, drawDrillSpray, planDrill } from "../../shared/drill";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "breakthrough";
const SIZE = WISP_SIZE * 1.3;
const DROP = 460;
const PUSHES = 8;
const EXIT = 150;
const EXIT_MS = 160;
const SPRAY = WISP_SIZE * 1.3;
// px the drill judders while it's stalled on the bar, and once it bites in
const JUDDER: [number, number] = [5, 2.5];
// how hard it grinds: a steady gush while stalled, building as it bores
const GRIND_STALLED = 1.0;
const GRIND_BORING: [number, number] = [0.85, 1.5];
const RUMBLE_MS = 90;
const HIT_SHAKE = 1.0;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceBreakthroughEvent = registerWispEvent(
  KEY,
  "Breakthrough",
  () => CONFIG.breakthroughEvent.chance,
  (floor, context, area) => {
    const { approachMs, stallMs, boreMs, levelShare, holdMs, mergeMs } =
      CONFIG.breakthroughEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const target: Point = { x: bar.center.x, y: bar.box.y };
    const from: Point = {
      x: target.x,
      y: Math.max(area.top - 60, target.y - DROP),
    };
    const drill = planDrill(from, target, {
      approachMs,
      boreMs,
      pushes: PUSHES,
      reach: bar.box.height,
      exit: EXIT,
      exitMs: EXIT_MS,
    });
    const hits = drill.bites;
    const gives = hits + stallMs;
    // the drill's own clock: held at the bite while it stalls, then on
    const drillMs = (ms: number) =>
      ms < hits ? ms : ms < gives ? hits + 1 : ms - stallMs;
    const pushes = drill.pushes.slice(0, -1).map((ms) => ms + stallMs);
    const through = drill.through + stallMs;
    const endAt = drill.endMs + stallMs;
    const rumbles: number[] = [];
    for (let ms = hits + RUMBLE_MS; ms < gives; ms += RUMBLE_MS)
      rumbles.push(ms);
    const under: Point = {
      x: target.x,
      y: bar.box.y + bar.box.height,
    };

    const hitting = createBeats(
      [hits],
      (ms) => ms,
      () => {
        cover!.burst(target, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(HIT_SHAKE);
      },
    );
    const rumbling = createBeats(
      rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      pushes,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, pushes.length - 1)));
      },
    );
    const breaking = createBeats(
      [through],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, under);
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 3), under);
        cover!.slam(bar);
        cover!.blast(under);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          hitting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 600) return;
          const biting = ms >= hits && ms < through;
          const judder = biting ? (ms < gives ? JUDDER[0] : JUDDER[1]) : 0;
          ctx.save();
          ctx.translate(
            Math.sin(ms * 0.9) * judder,
            Math.cos(ms * 1.3) * judder * 0.5,
          );
          drawDrill(ctx, drill, drillMs(ms), now, SIZE);
          ctx.restore();
          if (ms < hits || ms > through + 300) return;
          const grind =
            ms < gives
              ? GRIND_STALLED
              : lerp(GRIND_BORING, clamp01((ms - gives) / (through - gives)));
          const intensity = grind * (1 - clamp01((ms - through) / 300));
          drawDrillSpray(
            ctx,
            target,
            drill.angle,
            ms - hits,
            intensity,
            SPRAY,
            now,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
