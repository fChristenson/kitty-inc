// the "Hailfire" event (gunfire; free upgrade levels): it covers its crit,
// whose click freezes the screen while gun wisps shoot out of the clicked
// floor's button and spread into a line across the top of the screen, one
// over each income bar; they open up in rolling volleys, muzzles flashing
// down the line, raining wisp bullets onto the bars, every hit a pop, a
// jolt and free levels piling up; the volleys come ever faster until the
// whole line fires at once in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "hailfire";
const MAX_BARS = 5;
const VOLLEYS = 5;
const TOP = 150;
// each gun's shots in a volley ROLL_MS apart down the line
const ROLL_MS = 40;
const SPEED = 2.2;
const SPREAD = 0.4;
const GUN = 0.5;
const BULLET = WISP_SIZE * 0.3;
const MUZZLE = 40;
const FLASH_MS = 60;
const VOLLEY_SHAKE: [number, number] = [0.4, 1.1];

export const forceHailfireEvent = registerWispEvent(
  KEY,
  "Hailfire",
  () => CONFIG.hailfireEvent.chance,
  (floor, context, area) => {
    const { spreadMs, volleysMs, holdMs, mergeMs } = CONFIG.hailfireEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const guns = bars.map((bar) => {
      const spot: Point = { x: bar.center.x, y: area.top + TOP };
      const at: Point = { x: 0, y: 0 };
      return {
        bar,
        spot,
        share: Math.max(1, Math.round(levelsFor(bar.floor) / VOLLEYS)),
        wisp: (ms: number): Point => {
          const u = easeOut(Math.min(1, ms / spreadMs));
          at.x = lerp([button.x, spot.x], u);
          at.y = lerp([button.y, spot.y], u);
          return at;
        },
      };
    });
    const shots: { gun: (typeof guns)[number]; b: Bullet; volley: number }[] =
      [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const volleys: number[] = [];
    let clock: number = spreadMs;
    for (let v = 0; v < VOLLEYS; v++) {
      const last = v === VOLLEYS - 1;
      volleys.push(clock);
      guns.forEach((gun, i) => {
        const fires = clock + (last ? 0 : i * ROLL_MS);
        const target: Point = {
          x:
            gun.bar.center.x +
            (Math.random() - 0.5) * gun.bar.box.width * SPREAD,
          y: gun.bar.center.y,
        };
        const b = aimBullet(gun.spot, target, fires, SPEED);
        shots.push({ gun, b, volley: v });
        flashes.push({
          at: fires,
          from: gun.spot,
          angle: Math.atan2(target.y - gun.spot.y, target.x - gun.spot.x),
        });
      });
      clock += lerp(volleysMs, v / (VOLLEYS - 1));
    }
    const bullets = shots.map((s) => s.b);
    const endAt = Math.max(...bullets.map((b) => b.hitAt));
    const lastVolley = VOLLEYS - 1;

    const hitting = createBeats(
      shots,
      (s) => s.b.hitAt,
      (s) => {
        cover!.levels(s.gun.bar, s.gun.share, s.gun.spot);
        cover!.burst(s.b.to, 0.15);
      },
    );
    const volleying = createBeats(
      volleys,
      (ms) => ms,
      (_, k) => {
        if (!cover?.isLive() || k === lastVolley) return;
        playExplosion();
        shakeScreen(lerp(VOLLEY_SHAKE, k / lastVolley));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(bars[0].center);
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
          hitting.tick(ms, now);
          volleying.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const f of flashes)
            drawMuzzleFlash(
              ctx,
              f.from,
              f.angle,
              (ms - f.at) / FLASH_MS,
              MUZZLE,
            );
          for (const gun of guns)
            drawWispBetween(
              ctx,
              gun.wisp,
              ms,
              now,
              WISP_SIZE * GUN,
              0.6,
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
