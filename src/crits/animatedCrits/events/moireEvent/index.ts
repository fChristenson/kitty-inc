// the "Moiré" event (beam; a crit tier): it covers its crit, whose click
// freezes the screen while two fans of thin beams blaze up from the screen's
// bottom corners and swing back and forth in opposite directions; where
// they cross, the overlapping beams shimmer into rippling moiré patterns
// that slide and bloom with every swing, each turn of the fans a whoosh and
// a jolt, the fans narrowing and the swings tightening onto the clicked
// floor's bar until every beam locks onto it at once in a blazing flare and
// it jumps a crit tier in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "moire";
const BEAMS = 16;
// the fans' width (rad) at the start, how far they swing either way, and
// how many swings (half periods) they make while closing in
const SPREAD = 1.1;
const SWING = 0.5;
const SWINGS = 5;
// px in from the corners, and how far past the screen the beams reach
const CORNER = 30;
const LENGTH = 2600;
const BEAM_W = 7;
const BEAM_ALPHA = 0.32;
const LOCK_MS = 260;
const FLARE = 70;
const SWING_SHAKE: [number, number] = [0.3, 0.9];

export const forceMoireEvent = registerWispEvent(
  KEY,
  "Moiré",
  () => CONFIG.moireEvent.chance,
  (floor, context, area) => {
    const { growMs, sweepMs, holdMs, mergeMs } = CONFIG.moireEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const target = bar.center;
    const emitters: Point[] = [
      { x: area.left + CORNER, y: area.bottom - CORNER },
      { x: area.right - CORNER, y: area.bottom - CORNER },
    ];
    const aims = emitters.map((e) =>
      Math.atan2(target.y - e.y, target.x - e.x),
    );
    const lockAt = growMs + sweepMs;
    const endAt = lockAt + LOCK_MS;
    // closing in: 1 while sweeping wide, easing down to 0 as they lock on
    const open = (ms: number) => 1 - easeIn(clamp01((ms - growMs) / sweepMs));
    const swingAt = (ms: number) =>
      Math.cos(Math.PI * SWINGS * clamp01((ms - growMs) / sweepMs));
    // the fans turn back at the end of every swing
    const turns = Array.from(
      { length: SWINGS - 1 },
      (_, s) => growMs + (sweepMs * (s + 1)) / SWINGS,
    );
    const end: Point = { x: 0, y: 0 };

    const growing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const turning = createBeats(
      turns,
      (ms) => ms,
      (_, s) => {
        cover!.levels(bar, 0, emitters[s % 2]);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SWING_SHAKE, s / Math.max(1, SWINGS - 2)));
      },
    );
    const locking = createBeats(
      [lockAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, emitters[0]);
        cover!.slam(bar);
        cover!.blast(target);
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
          growing.tick(ms, now);
          turning.tick(ms, now);
          locking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const grow = easeOut(clamp01(ms / growMs));
          const o = open(ms);
          const fade = 1 - clamp01((ms - lockAt) / LOCK_MS);
          const locked = ms >= lockAt;
          for (let side = 0; side < 2; side++) {
            const e = emitters[side];
            const swing = (side === 0 ? 1 : -1) * SWING * o * swingAt(ms);
            const spread = SPREAD * o;
            for (let k = 0; k < BEAMS; k++) {
              const a = aims[side] + swing + spread * (k / (BEAMS - 1) - 0.5);
              // once locked every beam ends on the bar; till then they run on
              const reach = locked
                ? Math.hypot(target.x - e.x, target.y - e.y)
                : LENGTH * grow;
              end.x = e.x + Math.cos(a) * reach;
              end.y = e.y + Math.sin(a) * reach;
              drawBeam(
                ctx,
                e,
                end,
                BEAM_W * (1 + (1 - o) * 1.5),
                (BEAM_ALPHA + 0.4 * (1 - o)) * fade,
              );
            }
          }
          if (o < 0.3)
            drawBeamFlare(ctx, target, FLARE * (1 - o / 0.3), fade, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
