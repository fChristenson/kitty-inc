// the "Bank Shot" event (beam; free upgrade levels): it covers its crit, whose
// click freezes the screen while a blazing beam fires out of the clicked
// floor's button and banks off the screen's side walls from edge to edge,
// lengthening one leg at a time, every bounce landing level with an income
// bar, which blazes with a flash and a jolt and gets free levels; the beam
// races faster with every bank, and its last bounce flares in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "bankShot";
const MAX_BARS = 5;
const EDGE = 20;
const BEAM = 16;
const FLARE = 30;
const BANK_SHAKE: [number, number] = [0.6, 1.4];

export const forceBankShotEvent = registerWispEvent(
  KEY,
  "Bank Shot",
  () => CONFIG.bankShotEvent.chance,
  (floor, context, area) => {
    const { legsMs, holdMs, mergeMs } = CONFIG.bankShotEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const ordered = [...bars].sort(
      (a, b) =>
        Math.abs(a.center.y - button.y) - Math.abs(b.center.y - button.y),
    );
    let side = Math.random() < 0.5;
    let clock = 0;
    let from: Point = button;
    const legs = ordered.map((bar, k) => {
      const to: Point = {
        x: side ? area.left + EDGE : area.right - EDGE,
        y: bar.center.y,
      };
      side = !side;
      const starts = clock;
      clock += lerp(legsMs, k / Math.max(1, ordered.length - 1));
      const leg = { bar, from, to, starts, banks: clock };
      from = to;
      return leg;
    });
    const last = legs[legs.length - 1];
    const endAt = last.banks;
    const tip: Point = { x: 0, y: 0 };

    const banking = createBeats(
      legs,
      (l) => l.banks,
      (l, k) => {
        cover!.levels(l.bar, levelsFor(l.bar.floor), l.to);
        if (l === last) {
          cover!.slam(l.bar);
          cover!.blast(l.to);
          return;
        }
        cover!.burst(l.to, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BANK_SHAKE, k / Math.max(1, legs.length - 1)));
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
        tick: (ms, now) => banking.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 300) return;
          const fade = ms > endAt ? 1 - (ms - endAt) / 300 : 1;
          for (const l of legs) {
            if (ms < l.starts) break;
            const u = clamp01((ms - l.starts) / (l.banks - l.starts));
            tip.x = lerp([l.from.x, l.to.x], u);
            tip.y = lerp([l.from.y, l.to.y], u);
            drawBeam(ctx, l.from, tip, BEAM, 0.7 * fade);
            if (u < 1) drawBeamFlare(ctx, tip, FLARE * 0.6, fade, now);
            else if (ms - l.banks < 250)
              drawBeamFlare(
                ctx,
                l.to,
                FLARE * (1 - (ms - l.banks) / 250),
                fade,
                now,
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
