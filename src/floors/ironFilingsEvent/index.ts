// the "Iron Filings" event (clutter; levels): it covers its crit, whose
// click freezes the screen while gold filings are sprinkled over all of it;
// the clicked floor's bar turns into a bar magnet, its two ends glowing
// poles, and pulse after pulse its field drags the filings along curving
// field lines, the whole mess streaming in arcs over and under the bar,
// every pulse a hum and a jolt, piling up in two heaps on the poles; then
// the heaps slam together into the middle of the bar in a big blast,
// landing free levels. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { bezier } from "../../shared/curves";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { stampGlimmer } from "../../shared/twinkle";
import { scatterEvenly, simulateClean } from "../../shared/clutter";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "ironFilings";
const BITS = 420;
const BIT = 9;
const MARGIN = 40;
const DROP = 220;
const PULSES = 4;
// the field's steady pull and each pulse's kick (px/ms² at full), and how
// long a kick lasts; the poles catch filings within CORE px
const PULL = 0.004;
const KICK = 0.03;
const KICK_MS = 180;
const CORE = 34;
const POLE = WISP_SIZE * 0.9;
const POLE_IN = 24;
const LIFT = 160;
const PULSE_SHAKE: [number, number] = [0.4, 0.9];

export const forceIronFilingsEvent = registerWispEvent(
  KEY,
  "Iron Filings",
  () => CONFIG.ironFilingsEvent.chance,
  (floor, context, area) => {
    const { sprinkleMs, pullMs, slamMs, levelShare, holdMs, mergeMs } =
      CONFIG.ironFilingsEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const north: Point = { x: bar.box.x + POLE_IN, y: bar.center.y };
    const south: Point = {
      x: bar.box.x + bar.box.width - POLE_IN,
      y: bar.center.y,
    };
    const spots = scatterEvenly(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      BITS,
    );
    const drops = spots.map(() => Math.random() * sprinkleMs * 0.5);
    const fallMs = sprinkleMs * 0.5;
    const pulses = Array.from(
      { length: PULSES },
      (_, k) => sprinkleMs + pullMs * (1 - (1 - (k + 0.5) / PULSES) ** 1.4),
    );
    const doneAt = sprinkleMs + pullMs;
    const strength = (ms: number) => {
      let kick = 0;
      for (const p of pulses)
        if (ms >= p) kick = Math.max(kick, 1 - (ms - p) / KICK_MS);
      return PULL + KICK * Math.max(0, kick);
    };

    // the bar magnet's field: out of the north pole, into the south; filings
    // slide along it toward whichever pole is nearer
    const swept = simulateClean(
      spots,
      [
        {
          kind: "hole",
          at: (_, into) => Object.assign(into, north),
          pull: 0,
          core: CORE,
        },
        {
          kind: "hole",
          at: (_, into) => Object.assign(into, south),
          pull: 0,
          core: CORE,
        },
        {
          kind: "force",
          push: (x, y, ms, into) => {
            const nx = x - north.x;
            const ny = y - north.y;
            const sx = x - south.x;
            const sy = y - south.y;
            const n2 = nx * nx + ny * ny || 1;
            const s2 = sx * sx + sy * sy || 1;
            let fx = nx / n2 - sx / s2;
            let fy = ny / n2 - sy / s2;
            const f = Math.hypot(fx, fy) || 1;
            const toward = s2 < n2 ? 1 : -1;
            const a = strength(ms) * toward;
            fx = (fx / f) * a;
            fy = (fy / f) * a;
            into.x = fx;
            into.y = fy;
            return into;
          },
        },
      ],
      sprinkleMs,
      doneAt,
    );
    // the two heaps slam into the middle of the bar
    const slamAt = doneAt;
    const landAt = slamAt + slamMs;
    const lift: Point[] = [north, south].map((p) => ({
      x: (p.x + bar.center.x) / 2,
      y: p.y - LIFT,
    }));
    const levels = levelsFor(bar.floor, levelShare, 3);

    const sprinkling = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const pulsing = createBeats(
      pulses,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(PULSE_SHAKE, k / (PULSES - 1)));
      },
    );
    const slamming = createBeats(
      [slamAt, landAt],
      (ms) => ms,
      (ms) => {
        if (ms >= landAt) {
          cover!.levels(bar, levels, bar.center);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const poleAt = [north, south].map((p) => () => p);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: landAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          sprinkling.tick(ms, now);
          pulsing.tick(ms, now);
          slamming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms >= landAt) return;
          const glow = clamp01((ms - sprinkleMs * 0.5) / 300);
          for (const p of poleAt)
            drawWisp(ctx, p, ms, now, POLE * (0.5 + 0.5 * glow), glow);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const slam = easeIn(clamp01((ms - slamAt) / slamMs));
          for (let i = 0; i < spots.length; i++) {
            if (ms < drops[i]) continue;
            if (ms < sprinkleMs) {
              bit.x = spots[i].x;
              bit.y = lerp(
                [spots[i].y - DROP, spots[i].y],
                easeIn(clamp01((ms - drops[i]) / fallMs)),
              );
            } else if (ms < slamAt) swept.at(i, ms, bit);
            else {
              const end = swept.end(i);
              const pole =
                Math.hypot(end.x - north.x, end.y - north.y) <
                Math.hypot(end.x - south.x, end.y - south.y)
                  ? 0
                  : 1;
              bezier(end, lift[pole], bar.center, slam, bit);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i * 1.3 + ms * 0.004,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
