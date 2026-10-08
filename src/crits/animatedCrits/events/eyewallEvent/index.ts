// the "Eyewall" event (lightning; levels and a crit tier): it covers its
// crit, whose click freezes the screen while a hurricane's eyewall of gold
// glitter spins up round the clicked floor's income bar, as wide as the
// screen; lightning cracks down out of the sky onto the wall again and
// again as it whirls and tightens, every strike a blinding flash and a
// jolt, each one landing on a bar giving it free levels; the strikes come
// faster as the eye closes in, and when it shuts a colossal bolt and the
// wall's last forks slam down onto the bar together, blowing it up a crit
// tier in a huge blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { COLOR } from "../../../../palette";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "eyewall";
const STRIKES = 14;
// the wall's reach (a share of the screen's longer side), the radians it
// turns between strikes, and how near a bar a strike must land to hit it
const REACH = 0.42;
const TURN = 0.95;
const NEAR = 110;
const MARGIN = 60;
// the glitter of the wall, and the sky bolts' spread
const GLITTER = 48;
const GLITTER_SIZE = 20;
const SKY = 140;
const BOLT_MS = 170;
const FINAL_FORKS = 3;
const STRIKE_SHAKE: [number, number] = [0.45, 1.1];

interface Strike {
  ms: number;
  at: Point;
  bolt: Bolt;
  bar: RewardBar | null;
}

export const forceEyewallEvent = registerWispEvent(
  KEY,
  "Eyewall",
  () => CONFIG.eyewallEvent.chance,
  (floor, context, area) => {
    const { spinMs, gapMs, levelShare, holdMs, mergeMs } = CONFIG.eyewallEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const eye = bar.center;
    const reach =
      REACH * Math.max(area.right - area.left, area.bottom - area.top);
    const turn0 = Math.random() * Math.PI * 2;
    // the wall's radius and angle as it tightens over the strikes
    const radius = (k: number) => reach * Math.pow(1 - k / STRIKES, 0.85);
    const angle = (k: number) => turn0 + k * TURN;
    const times: number[] = [];
    let clock: number = spinMs;
    for (let k = 0; k <= STRIKES; k++) {
      times.push(clock);
      clock += lerp(gapMs, k / (STRIKES - 1));
    }
    const nearestBar = (p: Point) => {
      let best: RewardBar | null = null;
      let bestD = NEAR;
      for (const b of bars) {
        const dx = Math.max(b.box.x - p.x, 0, p.x - (b.box.x + b.box.width));
        const dy = Math.max(b.box.y - p.y, 0, p.y - (b.box.y + b.box.height));
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return best;
    };
    const strikes: Strike[] = Array.from({ length: STRIKES }, (_, k) => {
      const at: Point = {
        x: Math.min(
          area.right - MARGIN,
          Math.max(area.left + MARGIN, eye.x + Math.cos(angle(k)) * radius(k)),
        ),
        y: Math.min(
          area.bottom - MARGIN,
          Math.max(area.top + MARGIN, eye.y + Math.sin(angle(k)) * radius(k)),
        ),
      };
      return {
        ms: times[k],
        at,
        bolt: createBolt(
          { x: at.x + (k % 2 ? 1 : -1) * SKY, y: area.top - 120 },
          at,
          2,
        ),
        bar: nearestBar(at),
      };
    });
    // the eye shuts: one colossal bolt from the sky and forks off the wall
    const shutAt = times[STRIKES];
    const finale: Bolt[] = [
      createBolt({ x: eye.x, y: area.top - 160 }, eye, 4),
      ...Array.from({ length: FINAL_FORKS }, (_, i) => {
        const a = angle(STRIKES) + (i / FINAL_FORKS) * Math.PI * 2;
        const r = radius(STRIKES - 2);
        return createBolt(
          { x: eye.x + Math.cos(a) * r, y: eye.y + Math.sin(a) * r },
          eye,
          1,
        );
      }),
    ];
    const endAt = shutAt + BOLT_MS;
    // the wall now: spinning up, then eased from strike to strike
    let wallR = 0;
    let wallA = turn0;
    const placeWall = (ms: number) => {
      if (ms < spinMs) {
        wallR = reach * easeOut(clamp01(ms / spinMs));
        wallA = turn0;
        return;
      }
      let k = 0;
      while (k < STRIKES - 1 && times[k + 1] <= ms) k++;
      const u = clamp01((ms - times[k]) / (times[k + 1] - times[k]));
      wallR = lerp([radius(k), radius(k + 1)], u);
      wallA = lerp([angle(k), angle(k + 1)], u);
    };

    const spinning = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const striking = createBeats(
      strikes,
      (s) => s.ms,
      (s, k) => {
        if (s.bar)
          cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), s.at);
        else cover!.burst(s.at, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / (STRIKES - 1)));
      },
    );
    const shutting = createBeats(
      [shutAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, { x: eye.x, y: area.top });
        cover!.slam(bar);
        cover!.blast(eye);
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
          spinning.tick(ms, now);
          striking.tick(ms, now);
          shutting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 300) return;
          // the wall's glitter, whirling round the eye
          if (ms < shutAt) {
            placeWall(ms);
            const whirl = ms * 0.004;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < GLITTER; i++) {
              const g = wallA + whirl + (i / GLITTER) * Math.PI * 2;
              const wobble = 1 + 0.08 * Math.sin(i * 2.3 + ms / 90);
              stampGlimmer(
                ctx,
                eye.x + Math.cos(g) * wallR * wobble,
                eye.y + Math.sin(g) * wallR * wobble,
                GLITTER_SIZE * (i % 3 ? 1 : 1.5),
                g,
                i % 4 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            ctx.restore();
          }
          for (const s of strikes) {
            const since = ms - s.ms;
            if (since < 0 || since > BOLT_MS) continue;
            const alpha = 1 - since / BOLT_MS;
            drawBolt(ctx, s.bolt, alpha);
            drawStrike(ctx, s.at, alpha, 1, now);
          }
          const since = ms - shutAt;
          if (since >= 0 && since <= BOLT_MS) {
            const alpha = 1 - since / BOLT_MS;
            finale.forEach((b, i) => drawBolt(ctx, b, alpha, i ? 1.2 : 2.2));
            drawStrike(ctx, eye, alpha, 2.4, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
