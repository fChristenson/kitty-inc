// the "Riptide" event (money; cash): it covers its crit, whose click freezes
// the screen while bands of cash stream across it, each running the other
// way to the bands beside it, faster and faster with every surge; then a rip
// current tears up through the middle and every band bends into it, the
// whole lot sucked into one roaring jet that shoots up into the total in a
// huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { totalSpot } from "../../cashFlow";

const KEY = "riptide";
const REWARD = 4;
const BANDS = 6;
const PER_BAND = 150;
const COIN = 0.5;
const BAND_SPREAD = 26;
const WAVE = 12;
// px per ms the bands stream at, from the start to the rip
const SPEED: [number, number] = [0.25, 1.4];
const SPILL = 60;
const SURGES = 3;
const SURGE_SHAKE: [number, number] = [0.5, 1.0];
const RIP_SHAKE = 1.4;

export const forceRiptideEvent = registerWispEvent(
  KEY,
  "Riptide",
  () => CONFIG.riptideEvent.chance,
  (floor, context, area) => {
    const { streamMs, ripMs, pullMs, holdMs, mergeMs } = CONFIG.riptideEvent;
    const left = area.left;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const total = totalSpot(area);
    const midX = left + width / 2;
    const span = width + SPILL * 2;
    const travel = streamMs + ripMs + pullMs;
    // how far a band has run by ms, speeding up till the rip
    const runAt = (ms: number) => {
      const t = Math.min(Math.max(0, ms), streamMs + ripMs);
      const all = streamMs + ripMs;
      return SPEED[0] * t + ((SPEED[1] - SPEED[0]) * t * t) / (2 * all);
    };
    const into: Point = { x: 0, y: 0 };
    const spot: Point = { x: 0, y: 0 };
    const paths: CoinPath[] = [];
    for (let b = 0; b < BANDS; b++) {
      const y0 = area.top + height * (0.28 + (0.62 * b) / (BANDS - 1));
      const dir = b % 2 ? -1 : 1;
      for (let i = 0; i < PER_BAND; i++) {
        const x0 = Math.random() * span;
        const dy = (Math.random() - 0.5) * BAND_SPREAD;
        const phase = Math.random() * Math.PI * 2;
        const bandAt = (ms: number): Point => {
          const run = (((x0 + dir * runAt(ms)) % span) + span) % span;
          spot.x = left - SPILL + run;
          spot.y =
            y0 + dy + Math.sin(spot.x * 0.02 + phase + ms * 0.004) * WAVE;
          return spot;
        };
        // the nearer the middle, the sooner it's torn into the rip
        const near = clamp01(Math.abs(bandAt(streamMs).x - midX) / (width / 2));
        const pulled = streamMs + ripMs * near * between([0.6, 1]);
        const pullFor = travel - pulled;
        const from: Point = { ...bandAt(pulled) };
        const bend: Point = { x: midX, y: from.y };
        paths.push((f) => {
          const ms = f * travel;
          if (ms < pulled) {
            const p = bandAt(ms);
            return { x: p.x, y: p.y, scale: COIN * clamp01(ms / 200 + 0.2) };
          }
          const p = bezier(
            from,
            bend,
            total,
            easeIn(clamp01((ms - pulled) / pullFor)),
            into,
          );
          return { x: p.x, y: p.y, scale: COIN };
        });
      }
    }

    const surging = createBeats(
      Array.from(
        { length: SURGES },
        (_, k) => (streamMs * (k + 1)) / (SURGES + 1),
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(lerp(SURGE_SHAKE, k / (SURGES - 1)));
      },
    );
    const ripping = createBeats(
      [streamMs, travel],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(cover!.total() ?? total);
          return;
        }
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(RIP_SHAKE);
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
          surging.tick(ms, now);
          ripping.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travel);
    playBoostEventStream();
  },
);
