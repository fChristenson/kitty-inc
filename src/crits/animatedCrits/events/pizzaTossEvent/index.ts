// the "Pizza Toss" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a wisp spins a disc of cash on its
// tip over an income bar like pizza dough, faster and faster, then tosses it
// high, the disc stretching wider as it spins up and over; it comes down and
// slaps flat across the bar with a bang and a jolt, the bar jumping a crit
// tier, as the wisp darts to the next bar with a fresh disc, quicker each
// time; the last slap a huge blast and shake as all the cash pours into the
// total. Pays floor income × floor number × REWARD, plus the tiers
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "pizzaToss";
const REWARD = 2;
const MAX_BARS = 4;
const DISC_COINS = 150;
const COIN = 0.5;
// the disc's radius, stretching as it's tossed, seen from TILT above
const DISC: [number, number] = [80, 150];
const TILT = 0.3;
const SPIN: [number, number] = [1.5, 4];
const BELOW = 40;
const HOLD = 240;
const TOSS = 360;
const SLAP_MS = 110;
const WISP = 0.55;
const SLAP_SHAKE: [number, number] = [0.8, 1.6];

interface Toss {
  bar: RewardBar;
  tip: Point;
  forms: number;
  tossed: number;
  peaks: number;
  slaps: number;
}

export const forcePizzaTossEvent = registerWispEvent(
  KEY,
  "Pizza Toss",
  () => CONFIG.pizzaTossEvent.chance,
  (floor, context, area) => {
    const { formMs, spinsMs, tossMs, holdMs, mergeMs } = CONFIG.pizzaTossEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const tosses: Toss[] = bars.map((bar, k) => {
      const forms = clock;
      const tossed =
        forms + formMs + lerp(spinsMs, k / Math.max(1, bars.length - 1));
      const peaks = tossed + tossMs * 0.55;
      const slaps = tossed + tossMs;
      clock = tossed;
      return {
        bar,
        tip: {
          x: bar.center.x,
          y: Math.max(area.top + TOSS + 80, bar.center.y - HOLD),
        },
        forms,
        tossed,
        peaks,
        slaps,
      };
    });
    const last = tosses[tosses.length - 1];
    const endAt = last.slaps;
    const travel = endAt + SLAP_MS + 100;
    const disc: Point = { x: 0, y: 0 };
    // the disc's middle at ms, and how far it's stretched
    const discAt = (t: Toss, ms: number): number => {
      if (ms < t.tossed) {
        disc.x = t.tip.x;
        disc.y = t.tip.y - BELOW;
        return 0;
      }
      if (ms < t.peaks) {
        const u = easeOut((ms - t.tossed) / (t.peaks - t.tossed));
        disc.x = t.tip.x;
        disc.y = t.tip.y - BELOW - TOSS * u;
        return u;
      }
      const u = easeIn(clamp01((ms - t.peaks) / (t.slaps - t.peaks)));
      disc.x = t.tip.x;
      disc.y = lerp([t.tip.y - BELOW - TOSS, t.bar.center.y], u);
      return 1;
    };
    // the spin's angle, quickening till it's tossed
    const spinAt = (t: Toss, ms: number) => {
      const s = Math.max(0, ms - t.forms) / 1000;
      const span = Math.max(0.001, (t.slaps - t.forms) / 1000);
      return (
        Math.PI * 2 * (SPIN[0] * s + ((SPIN[1] - SPIN[0]) * s * s) / (2 * span))
      );
    };

    const paths: CoinPath[] = tosses.flatMap((t) =>
      Array.from({ length: DISC_COINS }, () => {
        const r = Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const flat = {
          x: t.bar.box.x + Math.random() * t.bar.box.width,
          y: t.bar.center.y + (Math.random() - 0.5) * t.bar.box.height,
        };
        return (f: number) => {
          const ms = f * travel;
          if (ms < t.forms) return { x: button.x, y: button.y, scale: 0 };
          const stretch = discAt(t, Math.min(ms, t.slaps));
          const spin = a + spinAt(t, Math.min(ms, t.slaps));
          const big = lerp(DISC, stretch) * r;
          const onX = disc.x + Math.cos(spin) * big;
          const onY = disc.y + Math.sin(spin) * big * TILT;
          if (ms < t.forms + formMs) {
            const u = easeOut((ms - t.forms) / formMs);
            return {
              x: lerp([button.x, onX], u),
              y: lerp([button.y, onY], u),
              scale: COIN * u,
            };
          }
          if (ms < t.slaps) return { x: onX, y: onY, scale: COIN };
          // slapped flat across the bar
          const u = smoothstep(clamp01((ms - t.slaps) / SLAP_MS));
          return {
            x: lerp([onX, flat.x], u),
            y: lerp([onY, flat.y], u),
            scale: COIN,
          };
        };
      }),
    );
    const at: Point = { x: 0, y: 0 };
    const wisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      let t = tosses[0];
      for (const toss of tosses) if (ms >= toss.forms) t = toss;
      const k = tosses.indexOf(t);
      const prev = tosses[k - 1];
      // darting over from the last bar as the disc forms
      const u = prev ? smoothstep(clamp01((ms - t.forms) / (formMs * 0.7))) : 1;
      at.x = prev ? lerp([prev.tip.x, t.tip.x], u) : t.tip.x;
      at.y = prev ? lerp([prev.tip.y, t.tip.y], u) : t.tip.y;
      return at;
    };

    const slapping = createBeats(
      tosses,
      (t) => t.slaps,
      (t, k) => {
        cover!.tierUp(t.bar, t.tip);
        if (t === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.bar.center);
          return;
        }
        cover!.burst(t.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAP_SHAKE, k / Math.max(1, tosses.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => slapping.tick(ms, now),
        drawOver: (ctx, ms, now) =>
          drawWispBetween(ctx, wisp, ms, now, WISP_SIZE * WISP, 0.6, 0, endAt),
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
