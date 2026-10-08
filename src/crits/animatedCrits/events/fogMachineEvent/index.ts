// the "Fog Machine" event (spray; free upgrade levels): it covers its crit,
// whose click freezes the screen while two fog-machine nozzles hiss up in
// the bottom corners and pump out billowing gold mist; a bank of glittering
// fog rolls in and rises up the screen like a tide, and as it swallows each
// income bar the bar is coated gold and flashes with a jolt of free levels,
// the last as the fog tops the screen in a huge blast and shake. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../../../shared/spray";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "fogMachine";
const MAX_BARS = 4;
const INSET = 70;
const UP = 50;
// mist puffs along the fog's top, and how far it billows
const PUFFS = 8;
const BILLOW = 26;
const MIST = WISP_SIZE * 2.2;
const DROPLET = WISP_SIZE * 1.2;
const NOZZLE = 0.5;
const FLASH_MS = 260;
const COAT = 0.55;
const HIT_SHAKE: [number, number] = [0.5, 1.1];

export const forceFogMachineEvent = registerWispEvent(
  KEY,
  "Fog Machine",
  () => CONFIG.fogMachineEvent.chance,
  (floor, context, area) => {
    const { riseMs, levelShare, holdMs, mergeMs } = CONFIG.fogMachineEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const top = Math.max(area.top + 60, bars[0].box.y - 80);
    const fogAt = (ms: number) =>
      lerp([area.bottom + 40, top], smoothstep(clamp01(ms / riseMs)));
    const nozzles: Point[] = [
      { x: area.left + INSET, y: area.bottom - UP },
      { x: area.right - INSET, y: area.bottom - UP },
    ];
    const sprays: Spray[] = nozzles.map((from, k) =>
      planSpray(
        from,
        (ms) =>
          -Math.PI / 2 + (k ? -1 : 1) * (0.5 + 0.15 * Math.sin(ms * 0.006)),
        {
          startMs: 0,
          endMs: riseMs,
          reach: height * 0.35,
          spread: 0.35,
          flightMs: 500,
        },
      ),
    );
    // when the rising fog swallows each bar, bottom up
    const swallows = bars
      .map((bar) => {
        let lo = 0;
        let hi: number = riseMs;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (fogAt(mid) > bar.center.y) lo = mid;
          else hi = mid;
        }
        return { bar, ms: hi };
      })
      .sort((a, b) => a.ms - b.ms);
    const last = swallows[swallows.length - 1];
    const endAt = Math.max(riseMs, last.ms) + FLASH_MS;
    const puff: Point = { x: 0, y: 0 };
    const nozzleAts = nozzles.map((n) => () => n);

    const starting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const swallowing = createBeats(
      swallows,
      (s) => s.ms,
      (s, k) => {
        cover!.levels(
          s.bar,
          levelsFor(s.bar.floor, levelShare, 2),
          s.bar.center,
        );
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, swallows.length - 1)));
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
          starting.tick(ms, now);
          swallowing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - Math.max(riseMs, last.ms)) / FLASH_MS);
          for (const s of swallows) {
            if (ms < s.ms) continue;
            const flash = 1 - clamp01((ms - s.ms) / FLASH_MS);
            drawSprayCoat(
              ctx,
              s.bar.center,
              s.bar.box.width,
              s.bar.box.height * 2,
              COAT * fade,
              flash,
            );
          }
          // the billowing top of the fog bank
          const y = fogAt(ms);
          for (let i = 0; i < PUFFS; i++) {
            puff.x =
              area.left +
              (width * (i + 0.5)) / PUFFS +
              Math.sin(ms * 0.004 + i) * BILLOW;
            puff.y = y + Math.cos(ms * 0.005 + i * 1.7) * BILLOW;
            drawSprayMist(ctx, puff, ms + i * 90, 0.9 * fade, MIST, now);
          }
          for (const s of sprays) drawSpray(ctx, s, ms, now, DROPLET);
          if (ms <= riseMs)
            for (const at of nozzleAts)
              drawWispHead(ctx, at, ms, now, WISP_SIZE * NOZZLE, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
