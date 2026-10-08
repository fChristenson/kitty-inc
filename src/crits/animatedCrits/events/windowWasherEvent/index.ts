// the "Window Washer" event (spray; levels): it covers its crit, whose click
// freezes the screen while a window washer's platform of light drops in on
// two ropes from the top of the screen and stops just above the first bar;
// its nozzle wisp hisses a fan of glittering mist back and forth along the
// bar, coating it gold, then a squeegee blade of light wipes it clean in one
// stroke, the bar flashing for free levels with a jolt; then the platform
// drops to the next bar and does it again, floor after floor, the last wipe
// slamming its bar. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  sprayLandsAt,
  sweepAim,
} from "../../../../shared/spray";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "windowWasher";
const MAX_STOPS = 4;
// the platform hangs this far above the bar it washes, overhanging its ends
const ABOVE = 150;
const OVERHANG = 40;
const PLATFORM_W = 12;
const ROPE_W = 4;
const ROPE_ALPHA = 0.4;
const NOZZLE = WISP_SIZE * 0.9;
const DROPLET = WISP_SIZE * 0.9;
const MIST = 90;
// the squeegee blade's reach above and below the bar
const BLADE = 40;
const BLADE_W = 10;
const FLASH_MS = 220;
const WIPE_SHAKE: [number, number] = [0.5, 0.9];

export const forceWindowWasherEvent = registerWispEvent(
  KEY,
  "Window Washer",
  () => CONFIG.windowWasherEvent.chance,
  (floor, context, area) => {
    const { enterMs, sprayMs, wipeMs, dropMs, levelShare, holdMs, mergeMs } =
      CONFIG.windowWasherEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_STOPS);
    if (bars.length === 0) return;
    const left = Math.min(...bars.map((b) => b.box.x)) - OVERHANG;
    const right =
      Math.max(...bars.map((b) => b.box.x + b.box.width)) + OVERHANG;
    const cx = (left + right) / 2;
    const stopMs = sprayMs + wipeMs + dropMs;
    const stops = bars.map((bar, k) => {
      const at = enterMs + k * stopMs;
      const nozzle: Point = { x: cx, y: bar.box.y - ABOVE };
      const ends = [
        { x: bar.box.x, y: bar.center.y },
        { x: bar.box.x + bar.box.width, y: bar.center.y },
        { x: bar.box.x, y: bar.center.y },
      ];
      return {
        bar,
        y: nozzle.y,
        sprayAt: at,
        wipeAt: at + sprayMs,
        doneAt: at + sprayMs + wipeMs,
        levels: levelsFor(bar.floor, levelShare, 3),
        spray: planSpray(nozzle, sweepAim(nozzle, ends, at, sprayMs / 2), {
          startMs: at,
          endMs: at + sprayMs,
          reach: Math.hypot(bar.box.width / 2, ABOVE),
          spread: 0.12,
        }),
      };
    });
    const last = stops[stops.length - 1];
    const endMs = last.doneAt;
    const platformY = (ms: number): number => {
      if (ms < enterMs)
        return lerp(
          [area.top - 80, stops[0].y],
          easeOut(clamp01(ms / enterMs)),
        );
      const k = Math.min(stops.length - 1, Math.floor((ms - enterMs) / stopMs));
      const s = stops[k];
      const next = stops[k + 1];
      if (!next || ms < s.doneAt) return s.y;
      return lerp([s.y, next.y], smoothstep(clamp01((ms - s.doneAt) / dropMs)));
    };

    const spraying = createBeats(
      stops,
      (s) => s.sprayAt,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const wiping = createBeats(
      stops,
      (s) => s.doneAt,
      (s, k) => {
        cover!.levels(s.bar, s.levels, { x: right, y: s.bar.center.y });
        if (s === last) {
          cover!.slam(s.bar);
          cover!.blast({ x: right - OVERHANG, y: s.bar.center.y });
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(WIPE_SHAKE, k / Math.max(1, stops.length - 1)));
      },
    );

    const nozzle: Point = { x: cx, y: 0 };
    const nozzleAt = () => nozzle;
    const ropeTop: Point = { x: 0, y: area.top };
    const ropeFoot: Point = { x: 0, y: 0 };
    const plankLeft: Point = { x: left, y: 0 };
    const plankRight: Point = { x: right, y: 0 };
    const bladeTop: Point = { x: 0, y: 0 };
    const bladeFoot: Point = { x: 0, y: 0 };
    const lands: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          spraying.tick(ms, now);
          wiping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endMs + FLASH_MS) return;
          // each bar's coat: building while sprayed, wiped off by the blade
          for (const s of stops) {
            if (ms < s.sprayAt || ms > s.doneAt + FLASH_MS) continue;
            const { box, center } = s.bar;
            const wiped = clamp01((ms - s.wipeAt) / (s.doneAt - s.wipeAt));
            const coverage = clamp01((ms - s.sprayAt) / (s.wipeAt - s.sprayAt));
            const flash = ms > s.doneAt ? 1 - (ms - s.doneAt) / FLASH_MS : 0;
            drawSprayCoat(
              ctx,
              center,
              box.width,
              box.height * 2,
              coverage * (1 - wiped),
              flash,
            );
            if (ms < s.wipeAt || ms > s.doneAt) continue;
            bladeTop.x = bladeFoot.x = lerp([box.x, box.x + box.width], wiped);
            bladeTop.y = box.y - BLADE;
            bladeFoot.y = box.y + box.height + BLADE;
            drawBeam(ctx, bladeTop, bladeFoot, BLADE_W, 0.9);
          }
          if (ms > endMs) return;
          const y = platformY(ms);
          for (const x of [left, right]) {
            ropeTop.x = ropeFoot.x = x;
            ropeFoot.y = y;
            drawBeam(ctx, ropeTop, ropeFoot, ROPE_W, ROPE_ALPHA);
          }
          plankLeft.y = plankRight.y = y;
          drawBeam(ctx, plankLeft, plankRight, PLATFORM_W, 0.8);
          for (const s of stops) {
            drawSpray(ctx, s.spray, ms, now, DROPLET);
            if (ms >= s.sprayAt && ms <= s.wipeAt)
              drawSprayMist(
                ctx,
                sprayLandsAt(s.spray, ms, lands),
                ms - s.sprayAt,
                1,
                MIST,
                now,
              );
          }
          nozzle.y = y;
          drawWisp(ctx, nozzleAt, ms, now, NOZZLE, 0.6);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
