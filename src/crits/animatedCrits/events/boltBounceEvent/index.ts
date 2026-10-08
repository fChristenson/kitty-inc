// the "Bolt Bounce" event (lightning; cash): it covers its crit, whose click
// freezes the screen while a bolt of lightning cracks out of the clicked
// floor's button and ricochets round the screen, zigzagging from edge to
// edge, every bounce a blinding flash, a crack, a jolt and a burst of coins,
// each leg striking quicker than the last; the final leg cracks back into
// the middle of the screen in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { fireBullet } from "../../../../shared/bullets";
import { ringTargets } from "../../../../shared/coinTargets";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";

const KEY = "boltBounce";
const REWARD = 4;
const BOUNCES = 9;
const EDGE = 30;
const TOP = 140;
const FADE_MS = 300;
const COINS = 9;
const COIN_REACH: [number, number] = [30, 120];
const BOUNCE_SHAKE: [number, number] = [0.5, 1.3];

export const forceBoltBounceEvent = registerWispEvent(
  KEY,
  "Bolt Bounce",
  () => CONFIG.boltBounceEvent.chance,
  (floor, context, area) => {
    const { legsMs, holdMs, mergeMs } = CONFIG.boltBounceEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      right: area.right - EDGE,
      top: area.top + TOP,
      bottom: area.bottom - EDGE,
    };
    const center: Point = {
      x: (box.left + box.right) / 2,
      y: (box.top + box.bottom) / 2,
    };
    // reflect off each wall it reaches
    let from: Point = button;
    let angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    let clock = 0;
    const legs = Array.from({ length: BOUNCES + 1 }, (_, k) => {
      const final = k === BOUNCES;
      const to = final ? center : fireBullet(from, angle, 0, 1, box).to;
      clock += lerp(legsMs, k / BOUNCES);
      const leg = { to, at: clock, bolt: createBolt(from, to, 1), final };
      let dx = Math.cos(angle);
      let dy = Math.sin(angle);
      if (Math.abs(to.x - box.left) < 1 || Math.abs(to.x - box.right) < 1)
        dx = -dx;
      if (Math.abs(to.y - box.top) < 1 || Math.abs(to.y - box.bottom) < 1)
        dy = -dy;
      angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
      from = to;
      return leg;
    });
    const endAt = clock;

    const bouncing = createBeats(
      legs,
      (l) => l.at,
      (l, k) => {
        if (l.final) {
          cover!.blast(l.to);
          return;
        }
        cover!.launchFrom(l.to, ringTargets(l.to, COINS, COIN_REACH));
        cover!.burst(l.to, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOUNCE_SHAKE, k / BOUNCES));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => bouncing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + FADE_MS) return;
          for (const l of legs) {
            const t = (ms - l.at) / FADE_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, l.bolt, 1 - t, l.final ? 1.6 : 1);
            drawStrike(ctx, l.to, 1 - t, 0.9, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
