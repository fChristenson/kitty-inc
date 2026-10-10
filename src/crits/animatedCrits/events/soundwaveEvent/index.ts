// the "Soundwave" event (money; free upgrade levels and cash): it covers
// its crit, whose click freezes the screen while a line of cash pours out
// of the clicked floor's button across the middle of it and starts to
// ripple like a soundwave on a scope; the wave rolls faster and swells
// louder, its crests reaching further up and down the screen, and every
// income bar a crest slaps jolts with a thump and free levels; at full
// volume the wave whips up into the total in a huge blast and shake. Pays
// floor income × floor number × REWARD, plus the levels
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import type { CoinPath } from "../../../../floors/coins";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { totalSpot } from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "soundwave";
const REWARD = 3;
const MAX_BARS = 5;
const COINS = 1_000;
const COIN = 0.42;
// WAVES crests across the screen, rolling ROLL to ROLL_UP rad a ms; the
// line is THICK px deep and swells to REACH of the screen's half-height
const WAVES = 2.5;
const ROLL = 0.006;
const ROLL_UP = 0.02;
const THICK = 12;
const REACH = 0.9;
const EDGE = 16;
const SURGE_SPREAD = 300;
const SLAP_SHAKE: [number, number] = [0.5, 1.2];

export const forceSoundwaveEvent = registerWispEvent(
  KEY,
  "Soundwave",
  () => CONFIG.soundwaveEvent.chance,
  (floor, context, area) => {
    const { formMs, swellMs, flightMs, levelShare, holdMs, mergeMs } =
      CONFIG.soundwaveEvent;
    const fallback = totalSpot(area);
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const cy = (area.top + area.bottom) / 2;
    const reach = ((area.bottom - area.top) / 2) * REACH;
    const swellAt = (ms: number) => easeIn(clamp01((ms - formMs) / swellMs));
    const surgeAt = formMs + swellMs;
    const endAt = surgeAt + SURGE_SPREAD + flightMs;
    // the phase rolls ever faster as it swells
    const phaseAt = (ms: number) => {
      const t = Math.max(0, ms - formMs);
      return ROLL * t + ((ROLL_UP - ROLL) * t * t) / (2 * swellMs);
    };
    const bars = context.upgradeFloorFree
      ? findRewardBars(floor, context)
          .filter((b) => Math.abs(b.center.y - cy) < reach)
          .slice(0, MAX_BARS)
      : [];
    // a crest first slaps a bar once the wave swells past its height
    const slaps = bars
      .map((bar) => ({
        bar,
        at: formMs + swellMs * Math.sqrt(Math.abs(bar.center.y - cy) / reach),
      }))
      .sort((a, b) => a.at - b.at);

    const paths: CoinPath[] = Array.from({ length: COINS }, (_, i) => {
      const u = i / (COINS - 1);
      const x = lerp([left, right], u);
      const depth = (Math.random() - 0.5) * THICK;
      const sent = u * formMs * 0.6;
      const leaves = surgeAt + u * SURGE_SPREAD;
      const from: Point = { x, y: 0 };
      const lift: Point = { x, y: 0 };
      const at: Point = { x: 0, y: 0 };
      const yAt = (ms: number) =>
        cy +
        Math.sin(u * WAVES * Math.PI * 2 - phaseAt(ms)) * reach * swellAt(ms) +
        depth;
      return (f) => {
        const ms = f * endAt;
        if (ms < sent) return { x: button.x, y: button.y, scale: 0 };
        const y = yAt(ms);
        if (ms < sent + formMs * 0.4) {
          const p = easeOut((ms - sent) / (formMs * 0.4));
          return {
            x: lerp([button.x, x], p),
            y: lerp([button.y, y], p),
            scale: COIN,
          };
        }
        if (ms < leaves) return { x, y, scale: COIN };
        from.y = yAt(leaves);
        lift.y = from.y - 70;
        const total = cover?.total() ?? fallback;
        bezier(
          from,
          lift,
          total,
          easeIn(clamp01((ms - leaves) / flightMs)),
          at,
        );
        return { x: at.x, y: at.y, scale: COIN };
      };
    });

    const slapping = createBeats(
      slaps,
      (s) => s.at,
      (s, k) => {
        cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 2), {
          x: s.bar.center.x,
          y: cy,
        });
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SLAP_SHAKE, k / Math.max(1, slaps.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? fallback),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          slapping.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    cover.trace(paths, endAt);
    playBoostEventStream();
  },
);
