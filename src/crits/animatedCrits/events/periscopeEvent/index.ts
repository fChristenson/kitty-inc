// the "Periscope" event (beam; a crit tier): it covers its crit, whose click
// freezes the screen while mirror wisps pop up in a zigzag climbing the
// screen, alternating sides; the clicked floor's button fires a blazing beam
// straight up into the first, which flares and bounces it across to the
// next, and on up, mirror to mirror like a periscope, ever faster, every
// bounce a flare, a ping and a jolt; at the top the last mirror swings it
// back down, the beam crashing onto the clicked floor's bar, which jumps a
// crit tier in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, easeOutBack, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars } from "../../eventRewards";

const KEY = "periscope";
const MIRRORS = 6;
// mirrors this far in from the sides, from BOTTOM up to TOP of the screen
const EDGE = 70;
const TOP = 0.08;
const BOTTOM = 0.75;
const MIRROR = WISP_SIZE * 0.8;
const BEAM_W: [number, number] = [10, 22];
const FINAL_W = 46;
const FLARE = 34;
const FINAL_FLARE = 80;
const BOUNCE_SHAKE: [number, number] = [0.3, 0.8];

export const forcePeriscopeEvent = registerWispEvent(
  KEY,
  "Periscope",
  () => CONFIG.periscopeEvent.chance,
  (floor, context, area) => {
    const { growMs, legMs, finalMs, blazeMs, holdMs, mergeMs } =
      CONFIG.periscopeEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const right = button.x > (area.left + area.right) / 2;
    // the first straight over the button, then side to side up the screen
    const mirrors: Point[] = Array.from({ length: MIRRORS }, (_, k) => {
      const y = lerp(
        [area.top, area.bottom],
        lerp([BOTTOM, TOP], k / (MIRRORS - 1)),
      );
      if (k === 0) return { x: button.x, y: Math.min(y, button.y - 160) };
      const onRight = (k % 2 === 0) === right;
      return { x: onRight ? area.right - EDGE : area.left + EDGE, y };
    });
    const path = [button, ...mirrors, bar.center];
    // each leg's start, quickening, the last leg down onto the bar slower
    const starts: number[] = [];
    let clock: number = growMs;
    for (let k = 0; k < path.length - 1; k++) {
      starts.push(clock);
      clock +=
        k === path.length - 2
          ? finalMs
          : legMs * lerp([1.3, 0.6], k / (MIRRORS - 1));
    }
    const hitAt = clock;
    const endMs = hitAt + blazeMs;

    const firing = createBeats(
      [growMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const bouncing = createBeats(
      mirrors,
      (_, k) => starts[k + 1],
      (m, k) => {
        cover!.burst(m, 0.4);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(BOUNCE_SHAKE, k / (MIRRORS - 1)));
      },
    );
    const landing = createBeats(
      [hitAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, mirrors[mirrors.length - 1]);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const tip: Point = { x: 0, y: 0 };
    const mirrorAt = mirrors.map((m) => () => m);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          firing.tick(ms, now);
          bouncing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - hitAt) / blazeMs);
          const built = ms >= hitAt;
          for (let k = 0; k < path.length - 1; k++) {
            const start = starts[k];
            if (ms < start) break;
            const end = k + 1 < starts.length ? starts[k + 1] : hitAt;
            const u = easeOut(clamp01((ms - start) / (end - start)));
            const from = path[k];
            const to = path[k + 1];
            tip.x = lerp([from.x, to.x], u);
            tip.y = lerp([from.y, to.y], u);
            const last = k === path.length - 2;
            const width = last
              ? FINAL_W
              : lerp(BEAM_W, built ? 1 : k / path.length);
            drawBeam(
              ctx,
              from,
              tip,
              width,
              (built ? 1 : 0.85) * (built ? fade : 1),
            );
            if (u < 1) drawBeamFlare(ctx, tip, FLARE, 1, now);
          }
          if (built) drawBeamFlare(ctx, bar.center, FINAL_FLARE, fade, now);
          for (let k = 0; k < MIRRORS; k++) {
            const lit = ms >= starts[k + 1];
            drawWisp(
              ctx,
              mirrorAt[k],
              ms,
              now,
              MIRROR * pop * (lit ? 1.3 : 1) * (built ? fade : 1),
              lit ? 1 : 0.3,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
