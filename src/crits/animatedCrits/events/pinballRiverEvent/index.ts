// the "Pinball River" event (money; cash): it covers its crit, whose click
// freezes the screen while one fierce jet of cash shoots out of the clicked
// floor's button and caroms round the screen like a pinball, banking off
// edge after edge in hard straight runs, every bank a splash of coins, a
// bang and a jolt, ever harder; off the last bank it tears straight into
// the total in a huge blast and shake. Pays floor income × floor number ×
// REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";
import {
  measure,
  pointAlong,
  pourDurationMs,
  pourLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "pinballRiver";
const REWARD = 4;
const BANKS = 6;
const EDGE = 50;
const STEPS = 160;
const COINS = 14;
const COIN_REACH: [number, number] = [40, 150];
const BANK_SHAKE: [number, number] = [0.6, 1.4];

export const forcePinballRiverEvent = registerWispEvent(
  KEY,
  "Pinball River",
  () => CONFIG.pinballRiverEvent.chance,
  (floor, context, area) => {
    const { travelMs, holdMs, mergeMs } = CONFIG.pinballRiverEvent;
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + EDGE * 3,
      bottom: area.bottom - EDGE,
    };
    const total = totalSpot(area);
    // the jet's banks off the edges, ray-cast from the button
    const corners: Point[] = [getButtonCenter(context.isGroundFloor)];
    let dx = Math.cos(-Math.PI * 0.32);
    let dy = Math.sin(-Math.PI * 0.32);
    for (let b = 0; b < BANKS; b++) {
      const p = corners[corners.length - 1];
      const tx = dx > 0 ? (box.right - p.x) / dx : (box.left - p.x) / dx;
      const ty = dy > 0 ? (box.bottom - p.y) / dy : (box.top - p.y) / dy;
      const t = Math.min(tx, ty);
      corners.push({ x: p.x + dx * t, y: p.y + dy * t });
      if (tx < ty) dx = -dx;
      else dy = -dy;
    }
    corners.push(total);
    const legs = measure(corners);
    const into: Point = { x: 0, y: 0 };
    const line = Array.from({ length: STEPS + 1 }, (_, i) => {
      const p = pointAlong(corners, legs, i / STEPS, into);
      return { x: p.x, y: p.y };
    });
    const length = legs[legs.length - 1];
    const banks = corners.slice(1, -1).map((at, k) => ({
      at,
      ms: (travelMs * legs[k + 1]) / length,
    }));
    const pour: Pour = {
      coinsAlong: 240,
      width: 34,
      streamMs: travelMs * 0.6,
      travelMs,
    };
    const durationMs = Math.max(
      pourDurationMs(0, pour),
      travelMs + holdMs + mergeMs,
    );

    const pouring = createBeats(
      [0],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const banking = createBeats(
      banks,
      (b) => b.ms,
      (b, k) => {
        cover!.burst(b.at, 0.5);
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            ringTargets(b.at, COINS, COIN_REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BANK_SHAKE, k / (BANKS - 1)));
      },
    );
    const finale = createBeats(
      [travelMs],
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
          banking.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
