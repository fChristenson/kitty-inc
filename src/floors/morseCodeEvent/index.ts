// the "Morse Code" event (experiment: the button signals in morse; crit
// tiers): it covers its crit, whose click freezes the screen while a wisp
// over the clicked floor's button starts blinking out a message in dots and
// dashes; every dot flicks a spark at an income bar in view and every dash
// fires a long flash of beam at it, each a blip and a pop on the bar; at
// the end of each letter the bar it was spelt at jumps a crit tier with a
// bang and a big jolt, letter after letter, ever faster; the last letter
// ends in a huge blast and shake that slams every bar. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../shared/beam";
import { findRewardBars } from "../eventRewards";

const KEY = "morseCode";
const MAX_BARS = 3;
const LETTERS = ["-.-", "..-", "--.", ".--", "-..", ".-."];
// a dot's spark flies DOT_FLY ms; a beat is DOT ms, a dash DASH beats; the
// gaps are GAP beats between symbols and LETTER_GAP between letters
const DOT_FLY = 150;
const DASH = 3;
const GAP = 1;
const LETTER_GAP = 3;
const SIGNAL = 0.8;
const BLINK = 0.8;
const SPARK = 0.35;
const BEAM = 16;
const FLARE = 26;
const LETTER_SHAKE: [number, number] = [0.9, 1.5];

export const forceMorseCodeEvent = registerWispEvent(
  KEY,
  "Morse Code",
  () => CONFIG.morseCodeEvent.chance,
  (floor, context) => {
    const { riseMs, dotsMs, holdMs, mergeMs } = CONFIG.morseCodeEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const signal: Point = { x: button.x, y: button.y - 60 };
    // every symbol, its beat ever shorter letter by letter
    const symbols: {
      bar: (typeof bars)[number];
      dash: boolean;
      on: number;
      off: number;
      lands: number;
      at: (ms: number) => Point | null;
    }[] = [];
    const letters: { bar: (typeof bars)[number]; at: number }[] = [];
    let clock: number = riseMs;
    bars.forEach((bar, k) => {
      const dot = lerp(dotsMs, k / Math.max(1, bars.length - 1));
      const code = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      let lands = 0;
      for (const c of code) {
        const dash = c === "-";
        const on = clock;
        const off = on + dot * (dash ? DASH : 1);
        const flyTo = bar.center;
        const spot: Point = { x: 0, y: 0 };
        const symbolLands = dash ? off : on + DOT_FLY;
        symbols.push({
          bar,
          dash,
          on,
          off,
          lands: symbolLands,
          at: (ms) => {
            if (ms < on || ms >= on + DOT_FLY) return null;
            const u = (ms - on) / DOT_FLY;
            spot.x = lerp([signal.x, flyTo.x], u);
            spot.y = lerp([signal.y, flyTo.y], u);
            return spot;
          },
        });
        lands = Math.max(lands, symbolLands);
        clock = off + dot * GAP;
      }
      letters.push({ bar, at: lands });
      clock += dot * (LETTER_GAP - GAP);
    });
    const endAt = Math.max(...letters.map((l) => l.at));
    const lastOff = symbols[symbols.length - 1].off;
    const blink = (ms: number) => {
      for (const s of symbols) if (ms >= s.on && ms < s.off) return 1;
      return 0;
    };
    const signalAt: Point = { x: 0, y: 0 };
    const signalWisp = (ms: number): Point => {
      const u = clamp01(ms / riseMs);
      signalAt.x = signal.x;
      signalAt.y = lerp([button.y, signal.y], u);
      return signalAt;
    };

    const blipping = createBeats(
      symbols,
      (s) => s.on,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const landing = createBeats(
      symbols,
      (s) => s.lands,
      (s) => cover!.burst(s.bar.center, s.dash ? 0.25 : 0.12),
    );
    const spelling = createBeats(
      letters,
      (l) => l.at,
      (l, k) => {
        cover!.tierUp(l.bar, signal);
        if (k === letters.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(l.bar.center);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(LETTER_SHAKE, k / Math.max(1, letters.length - 1)));
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
          blipping.tick(ms, now);
          landing.tick(ms, now);
          spelling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const s of symbols) {
            if (ms < s.on || ms > s.off + DOT_FLY) continue;
            if (s.dash) {
              if (ms >= s.off) continue;
              drawBeam(ctx, signal, s.bar.center, BEAM, 1);
              drawBeamFlare(ctx, s.bar.center, FLARE, 1, now);
            } else {
              drawWispBetween(
                ctx,
                s.at,
                ms,
                now,
                WISP_SIZE * SPARK,
                1,
                s.on,
                s.on + DOT_FLY,
              );
            }
          }
          const size = SIGNAL + (ms <= lastOff ? BLINK * blink(ms) : 0);
          drawWispBetween(
            ctx,
            signalWisp,
            ms,
            now,
            WISP_SIZE * size,
            0.8,
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
