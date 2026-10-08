// the "Bullet Braid" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while three guns ringing the clicked floor's
// button fire streams of bullet wisps that twist round each other in a
// tight braid as they fly, closing onto an income bar; the braid tightens
// to a point on the bar with a flash, a bang and a jolt, and the bar jumps a
// crit tier; braid after braid, quicker each time, the last landing in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "bulletBraid";
const MAX_BARS = 4;
const STRANDS = 3;
const SHOTS = 6;
const SHOT_GAP_MS = 35;
const FLIGHT = 0.55;
const WIDTH = 46;
const TWISTS = 3;
const FLASH_MS = 90;
const MUZZLE = 40;
const GUN_R = 34;
const BULLET = 0.24;
const BRAID_SHAKE: [number, number] = [0.6, 1.4];

// a bullet flying from `from` to `to` over flightMs, swinging round the
// straight line by a sine whose phase sets its strand, narrowing to the end
function braided(
  from: Point,
  to: Point,
  firedAt: number,
  flightMs: number,
  phase: number,
): Bullet {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const hitAt = firedAt + flightMs;
  const spot: Point = { x: 0, y: 0 };
  return {
    from,
    dx: dx / length,
    dy: dy / length,
    speed: length / flightMs,
    firedAt,
    hitAt,
    to,
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      const u = (ms - firedAt) / flightMs;
      const swing =
        Math.sin(u * Math.PI * 2 * TWISTS + phase) * WIDTH * (1 - u);
      spot.x = from.x + dx * u + nx * swing;
      spot.y = from.y + dy * u + ny * swing;
      return spot;
    },
  };
}

interface Braid {
  bar: RewardBar;
  bullets: Bullet[];
  lands: number;
  final: boolean;
}

export const forceBulletBraidEvent = registerWispEvent(
  KEY,
  "Bullet Braid",
  () => CONFIG.bulletBraidEvent.chance,
  (floor, context) => {
    const { braidsMs, holdMs, mergeMs } = CONFIG.bulletBraidEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const guns: Point[] = Array.from({ length: STRANDS }, (_, s) => {
      const a = -Math.PI / 2 + (s / STRANDS) * Math.PI * 2;
      return {
        x: button.x + Math.cos(a) * GUN_R,
        y: button.y + Math.sin(a) * GUN_R,
      };
    });
    let clock = 0;
    const braids: Braid[] = bars.map((bar, k) => {
      const span = lerp(braidsMs, k / Math.max(1, bars.length - 1));
      const flight = span * FLIGHT;
      const bullets: Bullet[] = [];
      for (let shot = 0; shot < SHOTS; shot++)
        for (let s = 0; s < STRANDS; s++)
          bullets.push(
            braided(
              guns[s],
              bar.center,
              clock + shot * SHOT_GAP_MS,
              flight,
              (s / STRANDS) * Math.PI * 2,
            ),
          );
      const lands = clock + (SHOTS - 1) * SHOT_GAP_MS + flight;
      clock += span * 0.75;
      return { bar, bullets, lands, final: k === bars.length - 1 };
    });
    const all = braids.flatMap((b) => b.bullets);
    const endAt = Math.max(...braids.map((b) => b.lands));

    const landing = createBeats(
      braids,
      (b) => b.lands,
      (b, k) => {
        cover!.tierUp(b.bar, button);
        if (b.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(b.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(b.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BRAID_SHAKE, k / Math.max(1, braids.length - 1)));
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
        tick: (ms, now) => landing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, all, ms, now, WISP_SIZE * BULLET, true);
          for (const b of all)
            drawMuzzleFlash(
              ctx,
              b.from,
              Math.atan2(b.dy, b.dx),
              (ms - b.firedAt) / FLASH_MS,
              MUZZLE,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
