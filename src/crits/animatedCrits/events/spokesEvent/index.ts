// the "Spokes" event (beam; crit tiers): it covers its crit, whose click
// freezes the screen while a wheel of blazing beam spokes drops onto the
// left end of each income bar in turn and rolls along the top of it,
// faster and faster, sparks spraying where it grinds the bar; at the far end
// its spokes burst outward in a flash and a jolt and the bar jumps a crit
// tier, the wheels finishing one after another, the last in a huge blast
// and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  easeOutBack,
  lerp,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "spokes";
const MAX_BARS = 4;
const SPOKES = 8;
const RADIUS = 56;
const SPOKE_W = 9;
const DROP_MS = 160;
const BURST_MS = 200;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Wheel {
  bar: RewardBar;
  starts: number;
  ends: number;
}

export const forceSpokesEvent = registerWispEvent(
  KEY,
  "Spokes",
  () => CONFIG.spokesEvent.chance,
  (floor, context) => {
    const { staggerMs, rollMs, holdMs, mergeMs } = CONFIG.spokesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const wheels: Wheel[] = bars.map((bar, k) => {
      const starts = k * staggerMs;
      return {
        bar,
        starts,
        ends: starts + DROP_MS + lerp(rollMs, k / Math.max(1, bars.length - 1)),
      };
    });
    const last = wheels.reduce((a, b) => (b.ends > a.ends ? b : a));
    const endAt = last.ends;
    const hub: Point = { x: 0, y: 0 };
    const rim: Point = { x: 0, y: 0 };
    const contact: Point = { x: 0, y: 0 };

    const finishing = createBeats(
      wheels.slice().sort((a, b) => a.ends - b.ends),
      (w) => w.ends,
      (w, k) => {
        const at: Point = {
          x: w.bar.box.x + w.bar.box.width - RADIUS,
          y: w.bar.box.y - RADIUS,
        };
        cover!.tierUp(w.bar, at);
        if (w === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, wheels.length - 1)));
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
        tick: (ms, now) => finishing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + BURST_MS) return;
          for (const w of wheels) {
            const t = ms - w.starts;
            if (t < 0) continue;
            const { box } = w.bar;
            const burst = (ms - w.ends) / BURST_MS;
            if (burst >= 1) continue;
            const x0 = box.x + RADIUS;
            const x1 = box.x + box.width - RADIUS;
            const roll = easeIn(
              clamp01((t - DROP_MS) / (w.ends - w.starts - DROP_MS)),
            );
            hub.x = lerp([x0, x1], roll);
            hub.y =
              box.y - RADIUS - (1 - easeOutBack(clamp01(t / DROP_MS))) * 140;
            const turn = (hub.x - x0) / RADIUS;
            const r = burst > 0 ? RADIUS * (1 + 1.5 * easeOut(burst)) : RADIUS;
            const alpha = burst > 0 ? 1 - burst : 0.6 + 0.4 * roll;
            for (let i = 0; i < SPOKES; i++) {
              const a = turn + (i / SPOKES) * Math.PI * 2;
              rim.x = hub.x + Math.cos(a) * r;
              rim.y = hub.y + Math.sin(a) * r;
              drawBeam(ctx, hub, rim, SPOKE_W, alpha);
            }
            drawBeamFlare(ctx, hub, 14, alpha, now);
            if (burst > 0 || t < DROP_MS) continue;
            contact.x = hub.x;
            contact.y = box.y;
            drawBeamFlare(ctx, contact, 10 + 18 * roll, 0.5 + 0.5 * roll, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
