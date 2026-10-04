// the "Metronome" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while a blazing beam stands up from the bottom of the
// screen like a metronome's arm, a wisp weight riding it, and starts to
// tick from side to side, every tick a click and a jolt, ever faster; on
// each swing after the first two it sweeps across the next income bar,
// which flares as it jumps a crit tier, the last in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars } from "../eventRewards";

const KEY = "metronome";
const MAX_BARS = 4;
const WARMUP = 2;
const BEAM = 30;
const CORE = 10;
// how far up the arm its weight rides
const WEIGHT = 0.55;
const FLARE = 70;
const FLARE_MS = 280;
const TICK_SHAKE: [number, number] = [0.2, 0.5];
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Swing {
  starts: number;
  ends: number;
  side: number;
}

export const forceMetronomeEvent = registerWispEvent(
  KEY,
  "Metronome",
  () => CONFIG.metronomeEvent.chance,
  (floor, context, area) => {
    const { ticksMs, holdMs, mergeMs } = CONFIG.metronomeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const pivot: Point = {
      x: (area.left + area.right) / 2,
      y: area.bottom + 60,
    };
    const length = area.bottom - area.top + 160;
    const angleOf = (p: Point) => Math.atan2(p.x - pivot.x, pivot.y - p.y);
    const reach = Math.min(
      1.1,
      Math.max(0.55, ...bars.map((b) => Math.abs(angleOf(b.center)) + 0.25)),
    );
    const count = bars.length + WARMUP;
    const swings: Swing[] = [];
    let clock: number = 0;
    for (let k = 0; k < count; k++) {
      const ms = lerp(ticksMs, k / Math.max(1, count - 1));
      swings.push({ starts: clock, ends: clock + ms, side: k % 2 ? 1 : -1 });
      clock += ms;
    }
    // each swing ticking from one side over to the other
    const angleAt = (ms: number) => {
      const swing =
        swings.find((s) => ms < s.ends) ?? swings[swings.length - 1];
      const u = clamp01((ms - swing.starts) / (swing.ends - swing.starts));
      return swing.side * reach * Math.cos(Math.PI * u);
    };
    // when the beam sweeps across each bar, one bar a swing after the warmup
    const hits = bars.map((bar, k) => {
      const swing = swings[WARMUP + k];
      const u =
        Math.acos(
          Math.max(-1, Math.min(1, angleOf(bar.center) / (swing.side * reach))),
        ) / Math.PI;
      return { bar, ms: lerp([swing.starts, swing.ends], u) };
    });
    const last = hits[hits.length - 1];
    const endAt = last.ms + FLARE_MS;
    const tip: Point = { x: 0, y: 0 };
    const tipAt = (ms: number): Point => {
      const a = angleAt(ms);
      tip.x = pivot.x + Math.sin(a) * length;
      tip.y = pivot.y - Math.cos(a) * length;
      return tip;
    };
    const weight: Point = { x: 0, y: 0 };
    const weightAt = (ms: number): Point | null => {
      if (ms < 0 || ms > endAt) return null;
      const a = angleAt(ms);
      weight.x = pivot.x + Math.sin(a) * length * WEIGHT;
      weight.y = pivot.y - Math.cos(a) * length * WEIGHT;
      return weight;
    };

    const ticking = createBeats(
      swings.filter((s) => s.ends < last.ms),
      (s) => s.ends,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TICK_SHAKE, k / Math.max(1, count - 1)));
      },
    );
    const sweeping = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.tierUp(h.bar, h.bar.center);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
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
          ticking.tick(ms, now);
          sweeping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - last.ms) / FLARE_MS);
          const end = tipAt(ms);
          drawBeam(ctx, pivot, end, BEAM, 0.75 * fade);
          drawBeam(ctx, pivot, end, CORE, fade);
          for (const h of hits) {
            const t = (ms - h.ms) / FLARE_MS;
            if (t >= 0 && t < 1)
              drawBeamFlare(ctx, h.bar.center, FLARE, 1 - t, now);
          }
          drawWisp(ctx, weightAt, ms, now, WISP_SIZE * 0.7, 0.8);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
