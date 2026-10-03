// the "Chain Fountain" event (money; cash): it covers its crit, whose click
// freezes the screen while a heap of cash slumps onto the clicked floor's
// button and a rope of coins leaps up out of it in a self-lifting arch,
// pouring over and crashing down beside it with a splash of coins, a bang
// and a jolt; each arch leaps higher and quicker than the last, flipping
// side to side, until the rope rears up over the whole screen and whips
// over into the total in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import type { Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../cashFlow";

const KEY = "chainFountain";
const REWARD = 4;
const ARCHES = 5;
const REACH: [number, number] = [150, 300];
const EDGE = 70;
const COINS = 14;
const HEAP_COINS = 24;
const SPLASH_SHAKE: [number, number] = [0.6, 1.5];

// a chain-fountain arch from `from` over to `to`, rearing `height` above
// the higher end: steep legs, a rounded crown
function arch(from: Point, to: Point, height: number): Point[] {
  const top = Math.min(from.y, to.y) - height;
  return sampleLine((u) => {
    const lift = Math.sin(Math.PI * u) ** 0.45;
    const base = lerp([from.y, to.y], u);
    return {
      x: lerp([from.x, to.x], (1 - Math.cos(Math.PI * u)) / 2),
      y: base + (top - base) * lift,
    };
  }, 60);
}

export const forceChainFountainEvent = registerWispEvent(
  KEY,
  "Chain Fountain",
  () => CONFIG.chainFountainEvent.chance,
  (floor, context, area) => {
    const { archesMs, travelMs, holdMs, mergeMs } = CONFIG.chainFountainEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const total = totalSpot(area);
    const landY = Math.min(area.bottom - 80, button.y + 60);
    const room = Math.max(200, button.y - area.top - 220);
    let clock = 0;
    const arches = Array.from({ length: ARCHES }, (_, k) => {
      const t = k / (ARCHES - 1);
      const side = k % 2 === 0 ? -1 : 1;
      const x = Math.min(
        area.right - EDGE,
        Math.max(area.left + EDGE, button.x + side * lerp(REACH, t)),
      );
      const to: Point = { x, y: landY };
      const starts = clock;
      const gap = lerp(archesMs, t);
      clock += gap;
      const travel = lerp(travelMs, t);
      return {
        to,
        starts,
        lands: starts + travel,
        line: arch(button, to, lerp([160, room * 0.75], t)),
        pour: {
          coinsAlong: 200,
          width: 24,
          streamMs: gap,
          travelMs: travel,
        } as Pour,
      };
    });
    const finalStarts = clock;
    const finalTravel = travelMs[0];
    const final: Pour = {
      coinsAlong: 300,
      width: 34,
      streamMs: finalTravel * 0.7,
      travelMs: finalTravel,
    };
    const finalLine = arch(button, total, room * 0.2);
    const endAt = finalStarts + finalTravel;
    const durationMs = Math.max(
      pourDurationMs(finalStarts, final),
      endAt + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [...arches.map((a) => a.starts), finalStarts],
      (ms) => ms,
      (ms, k) => {
        if (k === 0) {
          cover!.burst(button, 0.6);
          cover!.launchFrom(
            button,
            sprayTargets(button, HEAP_COINS, [20, 80], -Math.PI / 2, Math.PI),
          );
        }
        if (ms === finalStarts) pourLine(cover!, finalLine, final);
        else pourLine(cover!, arches[k].line, arches[k].pour);
      },
    );
    const splashing = createBeats(
      arches,
      (a) => a.lands,
      (a, k) => {
        cover!.burst(a.to, 0.5 + 0.1 * k);
        cover!.launchFrom(
          a.to,
          clampTargetsY(
            sprayTargets(a.to, COINS, [50, 170], -Math.PI / 2, Math.PI),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SPLASH_SHAKE, k / (ARCHES - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          splashing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
