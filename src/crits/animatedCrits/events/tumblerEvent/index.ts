// the "Tumbler" event (money; cash): it covers its crit, whose click freezes
// the screen while a great ring of cash fills a drum in the middle of the
// screen and starts to turn; the cash rides up the drum's wall and pours
// back across it in a tumbling sheet like a cement mixer, a jolt at every
// half turn, spinning faster and faster until the cash is plastered round
// the wall; then the drum bursts, flinging the cash out every way and on
// into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import {
  clamp01,
  easeIn,
  easeOut,
  lerp,
  smoothstep,
} from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "tumbler";
const REWARD = 4;
const COINS = 600;
const COIN = 0.45;
const GROW_MS = 250;
// rad a second the drum turns, at the start and at full spin
const SPIN: [number, number] = [2.5, 15];
// where the riding cash lets go, and how far round it falls before landing
const RELEASE = 4.1;
const CASCADE = 2.5;
const FLING = 220;
const FLING_MS = 300;
const TO_TOTAL_MS = 500;
const TURN_SHAKE: [number, number] = [0.3, 1.0];

export const forceTumblerEvent = registerWispEvent(
  KEY,
  "Tumbler",
  () => CONFIG.tumblerEvent.chance,
  (floor, context, area) => {
    const { spinMs, holdMs, mergeMs } = CONFIG.tumblerEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const radius = Math.min(width * 0.32, height * 0.25, 300);
    const centre: Point = {
      x: area.left + width / 2,
      y: area.top + height * 0.45,
    };
    const total = totalSpot(area);
    const seconds = spinMs / 1000;
    // how far the drum has turned by ms
    const turned = (ms: number) => {
      const s = Math.min(Math.max(0, ms), spinMs) / 1000;
      return SPIN[0] * s + ((SPIN[1] - SPIN[0]) * s * s) / (2 * seconds);
    };
    // the tumbling sheet narrows to nothing as it spins up into a centrifuge
    const cascadeAt = (ms: number) => CASCADE * (1 - clamp01(ms / spinMs) ** 2);
    const bursts = spinMs;
    const travel = bursts + FLING_MS + TO_TOTAL_MS;
    const paths: CoinPath[] = [];
    for (let i = 0; i < COINS; i++) {
      const start = Math.random() * Math.PI * 2;
      const r = radius * (0.72 + 0.28 * Math.sqrt(Math.random()));
      const appears = Math.random() * GROW_MS;
      const ring = (a: number) => ({
        x: centre.x + Math.cos(a) * r,
        y: centre.y + Math.sin(a) * r,
      });
      const lets = ring(RELEASE);
      // flung off along the wall's way at the burst
      const end = start + turned(bursts);
      const out = ring(end);
      const fx = -Math.sin(end) * 0.8 + Math.cos(end) * 0.6;
      const fy = Math.cos(end) * 0.8 + Math.sin(end) * 0.6;
      const flung: Point = { x: out.x + fx * FLING, y: out.y + fy * FLING };
      paths.push((f) => {
        const ms = f * travel;
        if (ms < bursts) {
          const a = start + turned(ms);
          const wrapped =
            (((a - RELEASE) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const cascade = cascadeAt(ms);
          const scale = COIN * easeOut(clamp01((ms - appears) / GROW_MS));
          if (wrapped < cascade) {
            // pouring across the drum from where it let go to where it lands
            const lands = ring(RELEASE + cascade);
            const u = smoothstep(wrapped / cascade);
            return {
              x: lerp([lets.x, lands.x], u),
              y: lerp([lets.y, lands.y], u),
              scale,
            };
          }
          return { ...ring(a), scale };
        }
        const t = ms - bursts;
        if (t < FLING_MS) {
          const u = easeOut(t / FLING_MS);
          return {
            x: lerp([out.x, flung.x], u),
            y: lerp([out.y, flung.y], u),
            scale: COIN,
          };
        }
        const u = easeIn(clamp01((t - FLING_MS) / TO_TOTAL_MS));
        return {
          x: lerp([flung.x, total.x], u),
          y: lerp([flung.y, total.y], u),
          scale: COIN,
        };
      });
    }
    // a jolt every half turn
    const turns: number[] = [];
    for (let half = 1; ; half++) {
      let lo = 0;
      let hi: number = spinMs;
      if (turned(hi) < half * Math.PI) break;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (turned(mid) < half * Math.PI) lo = mid;
        else hi = mid;
      }
      turns.push(hi);
    }

    const turning = createBeats(
      turns,
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(TURN_SHAKE, k / Math.max(1, turns.length - 1)));
      },
    );
    const bursting = createBeats(
      [bursts, travel],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        cover!.burst(centre, 1);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(TURN_SHAKE[1]);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travel + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          turning.tick(ms, now);
          bursting.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
