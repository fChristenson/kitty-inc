// the "Firing Squad" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while gunman wisps shoot up out of
// the clicked floor's button and snap into a line along the bottom of the
// screen; together they fire volley after volley, every muzzle flashing at
// once, a wall of wisp bullets slamming into an income bar end to end, each
// volley a bang and a big jolt that lands free levels, ever faster; the
// last volley fires at every bar at once in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, levelsFor, type RewardBar } from "../eventRewards";

const KEY = "firingSquad";
const MAX_BARS = 4;
const GUNMEN = 7;
// the line stands LINE px up from the bottom, SIDE px in from each edge
const LINE = 70;
const SIDE = 50;
const GUNMAN = 0.55;
const SPEED = 2.4;
const BULLET = WISP_SIZE * 0.32;
const MUZZLE = 46;
const FLASH_MS = 80;
const VOLLEY_SHAKE: [number, number] = [0.8, 1.5];

export const forceFiringSquadEvent = registerWispEvent(
  KEY,
  "Firing Squad",
  () => CONFIG.firingSquadEvent.chance,
  (floor, context, area) => {
    const { formMs, gapsMs, levelShare, holdMs, mergeMs } =
      CONFIG.firingSquadEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y = area.bottom - LINE;
    const gunmen = Array.from({ length: GUNMEN }, (_, i) => {
      const spot: Point = {
        x: lerp([area.left + SIDE, area.right - SIDE], i / (GUNMEN - 1)),
        y,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        spot,
        at: (ms: number): Point => {
          const u = easeOutBack(Math.min(1, ms / formMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      };
    });
    // one volley per bar, then a last at all of them
    const targets: RewardBar[][] = [...bars.map((b) => [b]), bars];
    let clock: number = formMs;
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const volleys = targets.map((group, v) => {
      const firedAt = clock;
      clock += lerp(gapsMs, v / Math.max(1, targets.length - 1));
      let hitAt = 0;
      gunmen.forEach((g, i) => {
        const bar = group[i % group.length];
        const hit: Point = {
          x: bar.box.x + bar.box.width * ((i + 0.5) / GUNMEN),
          y: bar.center.y,
        };
        const b = aimBullet(g.spot, hit, firedAt, SPEED);
        bullets.push(b);
        flashes.push({
          at: firedAt,
          from: g.spot,
          angle: Math.atan2(hit.y - g.spot.y, hit.x - g.spot.x),
        });
        hitAt = Math.max(hitAt, b.hitAt);
      });
      return { group, firedAt, hitAt };
    });
    const endAt = volleys[volleys.length - 1].hitAt;
    const lastFire = volleys[volleys.length - 1].firedAt;

    const pinging = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => cover!.burst(b.to, 0.15),
    );
    const firing = createBeats(
      volleys,
      (v) => v.firedAt,
      () => {
        if (cover?.isLive()) playExplosion();
      },
    );
    const landing = createBeats(
      volleys,
      (v) => v.hitAt,
      (v, k) => {
        if (k === volleys.length - 1) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(bars[0].center);
          return;
        }
        const bar = v.group[0];
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 2), {
          x: bar.center.x,
          y,
        });
        if (!cover!.isLive()) return;
        shakeScreen(lerp(VOLLEY_SHAKE, k / Math.max(1, volleys.length - 2)));
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
          firing.tick(ms, now);
          pinging.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          if (ms <= lastFire + FLASH_MS) {
            for (const f of flashes)
              drawMuzzleFlash(
                ctx,
                f.from,
                f.angle,
                (ms - f.at) / FLASH_MS,
                MUZZLE,
              );
          }
          for (const g of gunmen)
            drawWispBetween(
              ctx,
              g.at,
              ms,
              now,
              WISP_SIZE * GUNMAN,
              0.7,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) =>
    context.upgradeFloorFree !== undefined &&
    findRewardBars(floor, context).length > 0,
);
