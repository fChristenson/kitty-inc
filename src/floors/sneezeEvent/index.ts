// the "Sneeze" event (spray; crit tiers): it covers its crit, whose click
// freezes the screen while a wisp at the screen's side winds up to sneeze,
// swelling, trembling and rearing back as the screen rumbles, ah... ah...;
// then it jerks forward and sneezes a huge cloud of glittering gold mist
// across the screen onto an income bar, coating it gold with a jolt as it
// jumps a crit tier; it winds up and sneezes again onto the next, then a
// colossal sneeze onto the clicked floor's bar, which lands in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawSpray,
  drawSprayCoat,
  drawSprayMist,
  planSpray,
  type Spray,
} from "../../shared/spray";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "sneeze";
const SNEEZES = 3;
const INSET = 70;
const RISE = 50;
const FLIGHT = 420;
// the sprays in each sneeze, fanned this far apart
const PUFFS = [-0.12, 0, 0.12];
const SPREAD = [0.36, 0.36, 0.55];
const SWELL = [0.5, 0.6, 1.0];
const DROPLET = WISP_SIZE * 1.7;
const MIST = WISP_SIZE * 2.4;
const SNEEZER = WISP_SIZE * 0.9;
const REAR = 34;
const LURCH = 46;
const LURCH_MS = 200;
const MIST_MS = 500;
const COAT = 0.6;
const RUMBLE_MS = 100;
const SNEEZE_SHAKE = [0.8, 1.1, 1.6];
const LAND_SHAKE = [0.8, 1.2];

interface Sneeze {
  bar: RewardBar;
  from: Point;
  at: number;
  lands: number;
  windup: number;
  sprays: Spray[];
}

export const forceSneezeEvent = registerWispEvent(
  KEY,
  "Sneeze",
  () => CONFIG.sneezeEvent.chance,
  (floor, context, area) => {
    const { windupMs, gapMs, burstMs, holdMs, mergeMs } = CONFIG.sneezeEvent;
    const bars = findRewardBars(floor, context);
    const clicked = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!clicked) return;
    const others = bars.filter((b) => b !== clicked);
    const targets = [others[0] ?? clicked, others[1] ?? others[0] ?? clicked, clicked];
    // it sneezes from the side farther from the clicked bar's middle
    const left = clicked.center.x > (area.left + area.right) / 2;
    const x = left ? area.left + INSET : area.right - INSET;
    const sneezes: Sneeze[] = targets.map((bar, k) => {
      const from: Point = {
        x,
        y: Math.min(area.bottom - 60, Math.max(area.top + 60, bar.center.y - RISE)),
      };
      const at = windupMs + k * gapMs;
      const aim = Math.atan2(bar.center.y - from.y, bar.center.x - from.x);
      const reach =
        Math.hypot(bar.center.x - from.x, bar.center.y - from.y) *
        (k === SNEEZES - 1 ? 1.35 : 1.15);
      return {
        bar,
        from,
        at,
        lands: at + FLIGHT * 0.55,
        windup: k === 0 ? windupMs : gapMs * 0.6,
        sprays: PUFFS.map((off, j) =>
          planSpray(from, aim + off, {
            startMs: at,
            endMs: at + burstMs * (k === SNEEZES - 1 ? 1.6 : 1),
            reach: reach * (0.9 + 0.08 * j),
            spread: SPREAD[k],
            flightMs: FLIGHT,
          }),
        ),
      };
    });
    const last = sneezes[sneezes.length - 1];
    const endAt = last.lands + MIST_MS;

    // gliding to face each bar between sneezes; rearing back to wind up
    const sneezer: Point = { x: 0, y: 0 };
    const facing = (ms: number) => {
      for (let k = sneezes.length - 1; k > 0; k--) {
        const s = sneezes[k];
        const leaves = sneezes[k - 1].at + LURCH_MS;
        if (ms >= leaves)
          return lerp(
            [sneezes[k - 1].from.y, s.from.y],
            smoothstep(clamp01((ms - leaves) / (s.at - s.windup * 0.3 - leaves))),
          );
      }
      return sneezes[0].from.y;
    };
    const current = (ms: number) => {
      let k = 0;
      while (k < sneezes.length - 1 && ms >= sneezes[k].at + LURCH_MS) k++;
      return sneezes[k];
    };
    const windupOf = (ms: number) => {
      const s = current(ms);
      return clamp01((ms - (s.at - s.windup)) / s.windup);
    };
    const away = left ? -1 : 1;
    const sneezerAt = (ms: number): Point | null => {
      if (ms < 0 || ms > last.at + LURCH_MS) return null;
      const s = current(ms);
      const w = ms < s.at ? windupOf(ms) : 0;
      const lurch = ms >= s.at ? 1 - clamp01((ms - s.at) / LURCH_MS) : 0;
      const jitter = 6 * w * w;
      sneezer.x = x + away * REAR * easeIn(w) - away * LURCH * lurch + Math.sin(ms * 0.08) * jitter;
      sneezer.y = facing(ms) - REAR * 0.5 * easeIn(w) + Math.cos(ms * 0.11) * jitter;
      return sneezer;
    };

    const rumbles: { ms: number; w: number }[] = [];
    for (const s of sneezes)
      for (let ms = s.at - s.windup + RUMBLE_MS; ms < s.at; ms += RUMBLE_MS)
        rumbles.push({ ms, w: (ms - s.at + s.windup) / s.windup });
    const rumbling = createBeats(
      rumbles,
      (r) => r.ms,
      (r) => {
        if (cover!.isLive()) shakeScreen(0.1 + 0.4 * r.w * r.w);
      },
    );
    const sneezing = createBeats(
      sneezes,
      (s) => s.at,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(SNEEZE_SHAKE[k]);
      },
    );
    const landing = createBeats(
      sneezes,
      (s) => s.lands,
      (s, k) => {
        cover!.tierUp(s.bar, s.from);
        if (s === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(s.bar.center);
          return;
        }
        cover!.burst(s.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(LAND_SHAKE[k]);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [...new Set(targets)],
        tick: (ms, now) => {
          rumbling.tick(ms, now);
          sneezing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const s of sneezes) {
            if (ms < s.lands) continue;
            const t = (ms - s.lands) / MIST_MS;
            drawSprayCoat(
              ctx,
              s.bar.center,
              s.bar.box.width,
              s.bar.box.height * 2,
              COAT * (1 - clamp01((ms - last.lands) / MIST_MS)),
              1 - clamp01(t * 2),
            );
            if (t < 1) drawSprayMist(ctx, s.bar.center, ms - s.lands, 1 - t, MIST, now);
          }
          for (const s of sneezes)
            for (const spray of s.sprays) drawSpray(ctx, spray, ms, now, DROPLET);
          const s = current(ms);
          const swell = ms < s.at ? 1 + SWELL[sneezes.indexOf(s)] * windupOf(ms) ** 2 : 1;
          drawWisp(ctx, sneezerAt, ms, now, SNEEZER * swell, 0.3 + 0.6 * (swell - 1));
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
