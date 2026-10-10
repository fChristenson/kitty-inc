// the "Pitchfork" event (lightning; free upgrade levels): it covers its crit,
// whose click freezes the screen while a bolt cracks down out of the top of
// the screen and splits into a pitchfork of prongs, every prong striking an
// income bar at once in a blinding flash, a crack and a jolt that lands free
// levels; it strikes again and again, ever harder and faster, the last time
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "pitchfork";
const MAX_BARS = 3;
const ROUNDS = 3;
// the trunk forks FORK of the way down from the top to the highest bar
const FORK = 0.45;
const BOLT_MS = 180;
const STRIKE_SHAKE: [number, number] = [0.8, 1.5];

export const forcePitchforkEvent = registerWispEvent(
  KEY,
  "Pitchfork",
  () => CONFIG.pitchforkEvent.chance,
  (floor, context, area) => {
    const { leadMs, roundsMs, holdMs, mergeMs } = CONFIG.pitchforkEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const cx = (area.left + area.right) / 2;
    const top: Point = { x: cx, y: area.top - 20 };
    const highest = Math.min(...bars.map((b) => b.center.y));
    let clock: number = leadMs;
    const rounds = Array.from({ length: ROUNDS }, (_, r) => {
      const fork: Point = {
        x: cx + (Math.random() - 0.5) * 160,
        y: lerp([top.y, highest], FORK),
      };
      const at = clock;
      clock += lerp(roundsMs, r / (ROUNDS - 1));
      return {
        at,
        trunk: createBolt(top, fork, 1),
        prongs: bars.map((bar) => ({
          bar,
          spot: {
            x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.5,
            y: bar.center.y,
          } as Point,
          bolt: createBolt(fork, bar.center, 0),
        })),
      };
    });
    const last = rounds[ROUNDS - 1];
    const endAt = last.at;
    const share = Math.max(1, Math.round(levelsFor(floor) / ROUNDS));

    const striking = createBeats(
      rounds,
      (r) => r.at,
      (r, k) => {
        for (const p of r.prongs)
          cover!.levels(
            p.bar,
            Math.max(share, Math.round(levelsFor(p.bar.floor) / ROUNDS)),
            p.spot,
          );
        if (r === last) {
          for (const p of r.prongs) cover!.slam(p.bar);
          cover!.blast(r.prongs[0].bar.center);
          return;
        }
        for (const p of r.prongs) cover!.burst(p.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (ROUNDS - 1)));
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
        tick: (ms, now) => striking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (let k = 0; k < rounds.length; k++) {
            const r = rounds[k];
            const t = (ms - r.at) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            const scale = 1 + 0.3 * k;
            drawBolt(ctx, r.trunk, 1 - t, scale);
            for (const p of r.prongs) {
              drawBolt(ctx, p.bolt, 1 - t, scale * 0.8);
              drawStrike(ctx, p.bar.center, 1 - t, scale, now);
            }
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
