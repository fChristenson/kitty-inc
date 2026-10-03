// the "Woodpecker" event (wisp; crit tiers): it covers its crit, whose click
// freezes the screen while a woodpecker wisp darts out of the clicked
// floor's button, clings to the end of an income bar and hammers it, a
// rat-a-tat of pecks, each a pop and a tremble, then one last hard peck: a
// bang, a big jolt and the bar jumps a crit tier; it flits to the next bar
// and drills faster still, the last peck landing in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars } from "../eventRewards";

const KEY = "woodpecker";
const MAX_BARS = 3;
const PECKS = 6;
const PERCH = 34;
const JAB = 16;
const MOVE_MS = 170;
const BIRD = 0.45;
const BANG_GAP_MS = 60;
const HIT_SHAKE: [number, number] = [0.9, 1.4];

export const forceWoodpeckerEvent = registerWispEvent(
  KEY,
  "Woodpecker",
  () => CONFIG.woodpeckerEvent.chance,
  (floor, context) => {
    const { pecksMs, holdMs, mergeMs } = CONFIG.woodpeckerEvent;
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
    const drills = bars.map((bar, k) => {
      const side = k % 2 === 0 ? 1 : -1;
      const end: Point = {
        x: side > 0 ? bar.box.x + bar.box.width : bar.box.x,
        y: bar.center.y,
      };
      const perch: Point = { x: end.x + side * PERCH, y: end.y };
      const peckMs = lerp(pecksMs, k / Math.max(1, bars.length - 1));
      const moves = clock;
      const starts = moves + MOVE_MS;
      const pecks = Array.from(
        { length: PECKS },
        (_, i) => starts + (i + 1) * peckMs,
      );
      clock = pecks[PECKS - 1];
      const drill = {
        bar,
        end,
        perch,
        side,
        from,
        moves,
        starts,
        peckMs,
        pecks,
        hits: clock,
      };
      from = perch;
      return drill;
    });
    const last = drills[drills.length - 1];
    const endAt = last.hits;
    const birdAt: Point = { x: 0, y: 0 };
    const bird = (ms: number): Point => {
      let d = drills[0];
      for (const drill of drills) if (ms >= drill.moves) d = drill;
      if (ms < d.starts) {
        const u = easeOut(clamp01((ms - d.moves) / MOVE_MS));
        birdAt.x = lerp([d.from.x, d.perch.x], u);
        birdAt.y = lerp([d.from.y, d.perch.y], u);
        return birdAt;
      }
      // a jab in toward the bar, landing on each peck
      const f = ((ms - d.starts) / d.peckMs) % 1;
      birdAt.x = d.perch.x - d.side * JAB * Math.sin(f * Math.PI) ** 4;
      birdAt.y = d.perch.y;
      return birdAt;
    };
    const pecks = drills.flatMap((d) =>
      d.pecks.slice(0, -1).map((ms) => ({ ms, at: d.end })),
    );
    let lastBang = -Infinity;

    const pecking = createBeats(
      pecks,
      (p) => p.ms,
      (p) => {
        cover!.burst(p.at, 0.2);
        if (!cover!.isLive() || p.ms - lastBang < BANG_GAP_MS) return;
        lastBang = p.ms;
        playBloop();
        shakeScreen(0.3);
      },
    );
    const drilling = createBeats(
      drills,
      (d) => d.hits,
      (d, k) => {
        cover!.tierUp(d.bar, d.perch);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.end);
          return;
        }
        cover!.burst(d.end, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, drills.length - 1)));
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
          pecking.tick(ms, now);
          drilling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              bird,
              ms,
              now,
              WISP_SIZE * BIRD,
              0.8,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
