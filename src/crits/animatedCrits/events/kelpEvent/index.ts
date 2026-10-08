// the "Kelp" event (money): it covers its crit, whose click freezes the screen
// while five stalks of flowing cash grow up out of its bottom edge like kelp,
// swaying in waves as cash streams up them, each topping out with a flash, a
// bloop and a jolt; then all five lean over together and pour everything up
// into the total-income readout in a huge blast and shake, and the coins
// sweep into the total. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import type { CoinPath } from "../../../../floors/coins";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOutCubic, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";

const KEY = "kelp";
const REWARD = 4;
// the stalks at these shares across, growing GROW_GAP_MS apart to UNDER of
// the screen's height below the total, swaying up to SWAY of its width at
// their tips in WAVES waves, at SWAY_HZ
const STALKS = [0.12, 0.31, 0.5, 0.69, 0.88];
const GROW_GAP_MS = 90;
const UNDER = 0.12;
const SWAY = 0.07;
const WAVES = 1.3;
const SWAY_HZ = 1.4;
// COINS_EACH streaming up each, LANE px either side of it
const COINS_EACH = 290;
const LANE = 7;
const COIN = 0.8;
const TOP_BURST = 0.7;
const TOP_SHAKE = 1.3;

export const forceKelpEvent = registerWispEvent(
  KEY,
  "Kelp",
  () => CONFIG.kelpEvent.chance,
  (floor, context, area) => {
    const { growMs, swayMs, leanMs, flowMs, holdMs, mergeMs } =
      CONFIG.kelpEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fallback = totalSpot(area);
    const base = area.bottom + 10;
    const leanFrom = (STALKS.length - 1) * GROW_GAP_MS + growMs + swayMs;
    const travelMs = leanFrom + flowMs;
    const stalks = STALKS.map((share, k) => ({
      x: area.left + width * share,
      from: k * GROW_GAP_MS,
      phase: k * 1.1,
    }));
    const lean = (ms: number) => smoothstep(clamp01((ms - leanFrom) / leanMs));
    // the point s 0..1 up stalk k, ms in
    const at = (
      k: number,
      s: number,
      ms: number,
      into: { x: number; y: number },
    ) => {
      const st = stalks[k];
      const total = cover?.total() ?? fallback;
      const l = lean(ms);
      const top = total.y + height * UNDER * (1 - l);
      const wave =
        width *
        SWAY *
        s *
        Math.sin(Math.PI * 2 * (WAVES * s - (SWAY_HZ * ms) / 1000) + st.phase);
      into.x = st.x + wave * (1 - l) + (total.x - st.x) * l * s * s;
      into.y = base - s * (base - top);
      return into;
    };
    const grown = (k: number, ms: number) =>
      easeOutCubic(clamp01((ms - stalks[k].from) / growMs));

    const paths: CoinPath[] = stalks.flatMap((_, k) =>
      Array.from({ length: COINS_EACH }, () => {
        const s0 = Math.random();
        const lane = (Math.random() - 0.5) * LANE * 2;
        const sAtLean = (s0 + leanFrom / flowMs) % 1;
        return (f) => {
          const ms = f * travelMs;
          const s =
            ms < leanFrom
              ? (s0 + ms / flowMs) % 1
              : Math.min(1, sAtLean + (ms - leanFrom) / flowMs);
          const p = at(k, s, ms, { x: 0, y: 0 });
          // hidden until its stalk has grown up to it
          const shown = ms >= leanFrom || s <= grown(k, ms);
          return { x: p.x + lane * (1 - s), y: p.y, scale: shown ? COIN : 0 };
        };
      }),
    );

    const topping = createBeats(
      stalks,
      (s) => s.from + growMs,
      (_, k) => {
        const tip = at(k, 1, stalks[k].from + growMs, { x: 0, y: 0 });
        cover!.burst(tip, TOP_BURST);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(TOP_SHAKE);
      },
    );
    const finale = createBeats(
      [travelMs],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          topping.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, travelMs);
    playBoostEventStream();
  },
);
