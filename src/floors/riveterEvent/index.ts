// the "Riveter" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while a rivet-gun wisp drops onto the end of an
// income bar and hops along it rat-a-tat, punching a glowing rivet into the
// bar at every hop with a muzzle flash, a clank and a jolt; at the far end
// the bar jumps a crit tier, and the gun leaps to the next bar and rivets
// that one quicker, the last bar's last rivet a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawGlitterLight,
  drawWisp,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, type RewardBar } from "../eventRewards";

const KEY = "riveter";
const MAX_BARS = 4;
const RIVETS = 6;
const ABOVE = 46;
const SPEED = 1.6;
const GUN = 0.5;
const RIVET = 9;
const FLASH_MS = 90;
const LEAP_MS = 200;
const LEAP_LIFT = 90;
const RIVET_SHAKE = 0.2;
const BAR_SHAKE: [number, number] = [0.6, 1.2];

interface Shot {
  bar: RewardBar;
  gun: Point;
  rivet: Point;
  fires: number;
  bullet: Bullet;
  // the bar's last rivet
  ends: boolean;
}

export const forceRiveterEvent = registerWispEvent(
  KEY,
  "Riveter",
  () => CONFIG.riveterEvent.chance,
  (floor, context) => {
    const { rivetsMs, holdMs, mergeMs } = CONFIG.riveterEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const shots: Shot[] = [];
    let clock: number = LEAP_MS;
    bars.forEach((bar, k) => {
      const gap = lerp(rivetsMs, k / Math.max(1, bars.length - 1));
      const forward = k % 2 === 0;
      for (let i = 0; i < RIVETS; i++) {
        const u = (forward ? i : RIVETS - 1 - i) / (RIVETS - 1);
        const x = bar.box.x + bar.box.width * lerp([0.08, 0.92], u);
        const rivet: Point = { x, y: bar.box.y + bar.box.height * 0.5 };
        const gun: Point = { x, y: bar.box.y - ABOVE };
        shots.push({
          bar,
          gun,
          rivet,
          fires: clock,
          bullet: aimBullet(gun, rivet, clock, SPEED),
          ends: i === RIVETS - 1,
        });
        clock += gap;
      }
      clock += LEAP_MS;
    });
    const last = shots[shots.length - 1];
    const endAt = last.bullet.hitAt + 300;
    const bullets = shots.map((s) => s.bullet);

    // hopping rivet to rivet, leaping in arcs between bars
    const entry: Point = { x: shots[0].gun.x, y: shots[0].gun.y - 300 };
    const legs = shots.map((s, k) => ({
      from: k === 0 ? entry : shots[k - 1].gun,
      leaves: k === 0 ? 0 : shots[k - 1].fires + 30,
      lift: k === 0 || shots[k - 1].bar !== s.bar ? LEAP_LIFT : 12,
    }));
    const spot: Point = { x: 0, y: 0 };
    const gunAt = (ms: number): Point | null => {
      if (ms < 0 || ms > last.fires + 120) return null;
      for (let k = 0; k < shots.length; k++) {
        const s = shots[k];
        if (ms >= s.fires) continue;
        const { from, leaves, lift } = legs[k];
        const u = smoothstep(clamp01((ms - leaves) / (s.fires - leaves)));
        spot.x = lerp([from.x, s.gun.x], u);
        spot.y = lerp([from.y, s.gun.y], u) - Math.sin(Math.PI * u) * lift;
        return spot;
      }
      return last.gun;
    };

    const riveting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        if (s.ends) {
          cover!.tierUp(s.bar, s.rivet);
          if (s === last) {
            for (const bar of bars) cover!.slam(bar);
            cover!.blast(s.bar.center);
            return;
          }
          cover!.burst(s.bar.center, 0.6);
          if (!cover!.isLive()) return;
          playExplosion();
          shakeScreen(lerp(BAR_SHAKE, k / Math.max(1, shots.length - 1)));
          return;
        }
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(RIVET_SHAKE);
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
        tick: (ms, now) => riveting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let i = 0; i < shots.length; i++) {
            const s = shots[i];
            if (ms < s.bullet.hitAt) continue;
            const glint =
              1 + 1.5 * (1 - easeOut(clamp01((ms - s.bullet.hitAt) / 200)));
            drawGlitterLight(
              ctx,
              s.rivet.x,
              s.rivet.y,
              RIVET * glint,
              i,
              1,
              now,
            );
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.3);
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              s.gun,
              Math.PI / 2,
              (ms - s.fires) / FLASH_MS,
              WISP_SIZE * 0.8,
            );
          drawWisp(ctx, gunAt, ms, now, WISP_SIZE * GUN, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
