// the "Chunnel" event (drill; free upgrade levels): it covers its crit, whose
// click freezes the screen while two drill-headed wisps scream in from
// either side of the screen and bite into both ends of the clicked floor's
// bar with a bang; they stall, grinding and juddering in gushes of
// white-hot sparks, then bore in toward each other through the bar shove by
// shove like the two halves of a tunnel, the bored tunnel glowing behind
// them, every shove a jolt of free levels; they meet in its middle and
// break through into each other in a huge blast and shake. Then the crit's
// tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawGrind,
  planDrill,
  planGrind,
  type Grind,
} from "../../../../shared/drill";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "chunnel";
const SIZE = WISP_SIZE * 1.2;
const SPRAY = WISP_SIZE * 1.3;
const PUSHES = 8;
const FROM = 320;
const INSET = 8;
// the right drill a beat behind, so the shoves alternate
const OFFSET = 70;
const TUNNEL = 14;
const MEET_FLARE = 90;
const MEET_MS = 450;
const MEET_SHARE = 6;
const BITE_SHAKE = 0.9;
const RUMBLE_SHAKE = 0.25;
const PUSH_SHAKE: [number, number] = [0.35, 0.8];

export const forceChunnelEvent = registerWispEvent(
  KEY,
  "Chunnel",
  () => CONFIG.chunnelEvent.chance,
  (floor, context) => {
    const { approachMs, stallMs, boreMs, levelShare, holdMs, mergeMs } =
      CONFIG.chunnelEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const y = bar.center.y;
    const ends: Point[] = [
      { x: bar.box.x + INSET, y },
      { x: bar.box.x + bar.box.width - INSET, y },
    ];
    const reach = (ends[1].x - ends[0].x) / 2;
    const middle: Point = { x: (ends[0].x + ends[1].x) / 2, y };
    const grinds: Grind[] = ends.map((end, k) =>
      planGrind(
        planDrill({ x: end.x + (k ? FROM : -FROM), y }, end, {
          approachMs,
          boreMs,
          pushes: PUSHES,
          reach,
          startMs: k * OFFSET,
        }),
        stallMs,
      ),
    );
    const meetAt = Math.max(...grinds.map((g) => g.through));
    const endAt = meetAt + MEET_MS;
    const shoves = grinds
      .flatMap((g) => g.pushes.map((ms) => ({ ms, at: g.drill.target })))
      .sort((p, q) => p.ms - q.ms);
    const tip = (g: Grind, ms: number) =>
      g.drill.at(ms < g.gives ? g.bites + 1 : ms - g.stallMs);

    const biting = createBeats(
      grinds,
      (g) => g.bites,
      (g) => {
        cover!.burst(g.drill.target, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(BITE_SHAKE);
      },
    );
    const rumbling = createBeats(
      grinds[0].rumbles,
      (ms) => ms,
      () => {
        if (cover!.isLive()) shakeScreen(RUMBLE_SHAKE);
      },
    );
    const shoving = createBeats(
      shoves,
      (s) => s.ms,
      (s, k) => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 1), s.at);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PUSH_SHAKE, k / Math.max(1, shoves.length - 1)));
      },
    );
    const meeting = createBeats(
      [meetAt],
      (ms) => ms,
      () => {
        cover!.levels(
          bar,
          levelsFor(bar.floor, levelShare * MEET_SHARE, 5),
          middle,
        );
        cover!.slam(bar);
        cover!.blast(middle);
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
          biting.tick(ms, now);
          rumbling.tick(ms, now);
          shoving.tick(ms, now);
          meeting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - meetAt) / MEET_MS);
          for (const g of grinds)
            if (ms >= g.bites && fade > 0)
              drawBeam(
                ctx,
                g.drill.target,
                ms >= meetAt ? middle : tip(g, ms),
                TUNNEL,
                0.7 * fade,
              );
          for (const g of grinds) drawGrind(ctx, g, ms, now, SIZE, SPRAY);
          const t = (ms - meetAt) / MEET_MS;
          if (t >= 0 && t < 1)
            drawBeamFlare(ctx, middle, MEET_FLARE * (1 + t), 1 - t, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
