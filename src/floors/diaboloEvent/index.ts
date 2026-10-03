// the "Diabolo" event (wisp; free upgrade levels): it covers its crit, whose
// click freezes the screen while two hand wisps appear over an income bar
// with a glitter string slung between them and a diabolo wisp spinning on
// it; they whip it side to side along the string, ever faster and hotter,
// then snap the string taut and fling it sky high; it plummets and smashes
// down onto the bar with a bang and a jolt, landing free levels, as the
// hands glide over to the next bar and it bounces up onto their string
// again; the last smash a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "diabolo";
const MAX_BARS = 3;
const HALF = 130;
const LIFT = 190;
const SAG = 60;
const WHIRLS = 2.5;
// the share of a whip spent bouncing back up onto the string
const REBOUND = 0.3;
const APEX = 70;
const GLITTER = 6;
const HAND = 0.35;
const DIABOLO = 0.7;
const SNAP_SHAKE = 0.5;
const SMASH_SHAKE: [number, number] = [0.8, 1.5];

interface Throw {
  bar: RewardBar;
  hands: Point;
  launch: Point;
  whips: number;
  flings: number;
  peaks: number;
  smashes: number;
}

export const forceDiaboloEvent = registerWispEvent(
  KEY,
  "Diabolo",
  () => CONFIG.diaboloEvent.chance,
  (floor, context, area) => {
    const { whipsMs, upMs, downMs, levelShare, holdMs, mergeMs } =
      CONFIG.diaboloEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const apexY = area.top + APEX;
    let clock = 0;
    const throws: Throw[] = bars.map((bar, k) => {
      const whips = clock;
      const flings = whips + lerp(whipsMs, k / Math.max(1, bars.length - 1));
      const peaks = flings + upMs;
      const smashes = peaks + downMs;
      clock = smashes;
      return {
        bar,
        hands: { x: bar.center.x, y: bar.center.y - LIFT },
        launch: { x: bar.center.x, y: bar.center.y - LIFT + SAG },
        whips,
        flings,
        peaks,
        smashes,
      };
    });
    const last = throws[throws.length - 1];
    const endAt = last.smashes;
    const throwAt = (ms: number) => {
      let current = throws[0];
      for (const t of throws) if (ms >= t.whips) current = t;
      return current;
    };
    // the hands' middle: over a bar while it whips, gliding on to the next
    const handsMid: Point = { x: 0, y: 0 };
    const handsAt = (ms: number): Point => {
      const k = throws.indexOf(throwAt(ms));
      const t = throws[k];
      const next = throws[k + 1];
      if (!next || ms < t.flings) {
        handsMid.x = t.hands.x;
        handsMid.y = t.hands.y;
        return handsMid;
      }
      const u = smoothstep(clamp01((ms - t.flings) / (t.smashes - t.flings)));
      handsMid.x = lerp([t.hands.x, next.hands.x], u);
      handsMid.y = lerp([t.hands.y, next.hands.y], u);
      return handsMid;
    };
    const hands = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const mid = handsAt(Math.max(0, ms));
        at.x = mid.x + side * HALF;
        at.y = mid.y;
        return at;
      };
    });
    const spot: Point = { x: 0, y: 0 };
    const diabolo = (ms: number): Point => {
      const t = throwAt(Math.max(0, ms));
      const k = throws.indexOf(t);
      if (ms < t.flings) {
        const u = clamp01((ms - t.whips) / (t.flings - t.whips));
        const sway = Math.sin(WHIRLS * Math.PI * 2 * u * u) * HALF * 0.7;
        const onX = t.hands.x + sway;
        const onY = t.hands.y + SAG * (1 - (sway / HALF) ** 2);
        const prev = throws[k - 1];
        if (prev && u < REBOUND) {
          const b = u / REBOUND;
          spot.x = lerp([prev.bar.center.x, onX], b);
          spot.y =
            lerp([prev.bar.center.y, onY], easeOut(b)) -
            Math.sin(Math.PI * b) * 60;
          return spot;
        }
        spot.x = onX;
        spot.y = onY;
        return spot;
      }
      const from = t.launch;
      if (ms < t.peaks) {
        const u = easeOut(clamp01((ms - t.flings) / upMs));
        spot.x = from.x;
        spot.y = lerp([from.y, apexY], u);
        return spot;
      }
      const u = easeIn(clamp01((ms - t.peaks) / downMs));
      spot.x = lerp([from.x, t.bar.center.x], u);
      spot.y = lerp([apexY, t.bar.center.y], u);
      return spot;
    };

    const snapping = createBeats(
      throws,
      (t) => t.flings,
      (t) => {
        cover!.burst(t.launch, 0.35);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SNAP_SHAKE);
      },
    );
    const smashing = createBeats(
      throws,
      (t) => t.smashes,
      (t, k) => {
        cover!.levels(t.bar, levelsFor(t.bar.floor, levelShare, 2), {
          x: t.bar.center.x,
          y: apexY,
        });
        if (t === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.bar.center);
          return;
        }
        cover!.burst(t.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SMASH_SHAKE, k / Math.max(1, throws.length - 1)));
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
          snapping.tick(ms, now);
          smashing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          if (ms < endAt) {
            const t = throwAt(ms);
            const left = hands[0](ms);
            const lx = left.x;
            const ly = left.y;
            const right = hands[1](ms);
            // slung through the diabolo while it whips, taut once it flies
            const on =
              ms < t.flings && ms - t.whips > (t.flings - t.whips) * REBOUND;
            const d = diabolo(ms);
            const mx = on ? d.x : (lx + right.x) / 2;
            const my = on ? d.y : (ly + right.y) / 2;
            const strand = (ax: number, ay: number, seed: number) => {
              const n = Math.max(
                2,
                Math.floor(Math.hypot(mx - ax, my - ay) / 24),
              );
              for (let i = 1; i < n; i++)
                drawGlitterLight(
                  ctx,
                  lerp([ax, mx], i / n),
                  lerp([ay, my], i / n),
                  GLITTER,
                  seed + i,
                  0.8,
                  now,
                );
            };
            strand(lx, ly, 0);
            strand(right.x, right.y, 50);
          }
          for (const hand of hands)
            drawWispBetween(
              ctx,
              hand,
              ms,
              now,
              WISP_SIZE * HAND,
              0.3,
              0,
              endAt,
            );
          const t = throwAt(Math.max(0, ms));
          const heat =
            ms < t.flings ? clamp01((ms - t.whips) / (t.flings - t.whips)) : 1;
          drawWispBetween(
            ctx,
            diabolo,
            ms,
            now,
            WISP_SIZE * DIABOLO,
            heat,
            0,
            endAt,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
