// the "Clockwork" event: it covers its crit, whose click freezes the screen
// while a hub wisp lights up in the middle of it and the wisp ticks round it
// like a clock's second hand, snapping from hour to hour, each tick a flash,
// a click and a coin dropped on the hour, the ticks coming ever faster into a
// whirl; on its second stroke of midnight every hour flashes at once and the
// hub blows in a huge blast and shake, and the coins sweep into the total.
// Pays floor income × floor number × REWARD (see ../moneyCover)
import { CONFIG } from "../../config";
import { playBloop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  between,
  clamp01,
  easeOutBack,
  easeOutCubic,
  lerp,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";

const KEY = "clockwork";
const REWARD = 4;
const HOURS = 12;
const TICKS = HOURS * 2;
// the dial RADIUS of the screen's width (or height, if less) round; each
// tick's snap takes at most SNAP of the gap before it
const RADIUS = 0.36;
const SNAP = 0.6;
const SNAP_MS = 70;
const POP_MS = 180;
// the wisps, as shares of the screen's width; the hub swells to HUB[1]
const HAND = 0.05;
const HUB: [number, number] = [0.05, 0.1];
// each tick: a burst, a click, a jolt and a coin dropped just outside the hour
const TICK_BURST: [number, number] = [0.15, 0.35];
const TICK_SHAKE: [number, number] = [0.25, 1];
const DROP: [number, number] = [15, 45];
const HOUR_BURST = 0.6;

export const forceClockworkEvent = registerWispEvent(
  KEY,
  "Clockwork",
  () => CONFIG.clockworkEvent.chance,
  (floor, context, area) => {
    const { tickMs, holdMs, mergeMs } = CONFIG.clockworkEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const middle = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const radius = Math.min(width, height) * RADIUS;
    const hand = Math.max(WISP_SIZE, width * HAND);
    const hub = HUB.map((s) => Math.max(WISP_SIZE, width * s)) as [
      number,
      number,
    ];
    const angleOf = (hour: number) =>
      -Math.PI / 2 + (hour / HOURS) * Math.PI * 2;
    const hours = Array.from({ length: HOURS }, (_, h) => ({
      x: middle.x + Math.cos(angleOf(h)) * radius,
      y: middle.y + Math.sin(angleOf(h)) * radius,
    }));

    const tickAt: number[] = [];
    let at = POP_MS;
    for (let k = 1; k <= TICKS; k++) {
      at += lerp(tickMs, ((k - 1) / (TICKS - 1)) ** 0.7);
      tickAt.push(at);
    }
    const blastAt = at;

    const point = { x: 0, y: 0 };
    // resting on an hour, then snapping on round to the next
    const handAt = (ms: number): Point | null => {
      if (ms < 0 || ms >= blastAt) return null;
      let from = 0;
      let fromMs = 0;
      for (let k = 0; k < TICKS; k++) {
        if (ms < tickAt[k]) {
          const snap = Math.min(SNAP_MS, (tickAt[k] - fromMs) * SNAP);
          const u = easeOutCubic(clamp01((ms - (tickAt[k] - snap)) / snap));
          const angle = angleOf(from + u);
          point.x = middle.x + Math.cos(angle) * radius;
          point.y = middle.y + Math.sin(angle) * radius;
          return point;
        }
        from = k + 1;
        fromMs = tickAt[k];
      }
      return null;
    };
    const hubAt = (ms: number): Point | null =>
      ms < 0 || ms >= blastAt ? null : middle;

    const ticks = createBeats(
      tickAt,
      (ms) => ms,
      (_, k) => ticked(k),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: blastAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => ticks.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          const heat = clamp01(ms / blastAt);
          const pop = easeOutBack(clamp01(ms / POP_MS));
          drawWispBetween(
            ctx,
            hubAt,
            ms,
            now,
            lerp(hub, heat) * pop,
            heat,
            0,
            blastAt,
          );
          drawWispBetween(ctx, handAt, ms, now, hand * pop, heat, 0, blastAt);
        },
      },
    );
    if (!cover) return;

    function ticked(k: number): void {
      const spot = hours[(k + 1) % HOURS];
      if (k === TICKS - 1) {
        for (const h of hours) cover!.burst(h, HOUR_BURST);
        cover!.blast(middle);
        return;
      }
      const t = k / (TICKS - 1);
      cover!.burst(spot, lerp(TICK_BURST, t));
      const out = between(DROP);
      const dx = spot.x - middle.x;
      const dy = spot.y - middle.y;
      cover!.launchFrom(spot, [
        { x: spot.x + (dx / radius) * out, y: spot.y + (dy / radius) * out },
      ]);
      if (!cover!.isLive()) return;
      if (k < HOURS || k % 2 === 0) playBloop();
      shakeScreen(lerp(TICK_SHAKE, t));
    }
  },
);
