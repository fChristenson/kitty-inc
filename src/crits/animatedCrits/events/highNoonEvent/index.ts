// the "High Noon" event (gunfire; crit tiers): it covers its crit, whose
// click freezes the screen while two gunner wisps burst out of the clicked
// floor's button and skid to either side of the screen, face off, and fire:
// their wisp bullets meet dead in the middle and blow apart in flashes and
// pops, shot for shot, ever faster; then both spin and fan their last shots
// into income bars, each hit a bang, a jolt and a crit tier; they fire one
// last pair that meets in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "highNoon";
const MAX_BARS = 4;
const DUELS = 6;
const EDGE = 70;
const SPEED = 2;
const GUNNER = 0.75;
const BULLET = WISP_SIZE * 0.34;
const MUZZLE = 50;
const FLASH_MS = 60;
const CLASH = 0.25;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

export const forceHighNoonEvent = registerWispEvent(
  KEY,
  "High Noon",
  () => CONFIG.highNoonEvent.chance,
  (floor, context, area) => {
    const { skidMs, duelsMs, turnMs, holdMs, mergeMs } = CONFIG.highNoonEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const y = (area.top + area.bottom) / 2 - 40;
    const gunners: Point[] = [
      { x: area.left + EDGE, y },
      { x: area.right - EDGE, y },
    ];
    const mid: Point = { x: (area.left + area.right) / 2, y };
    const angleTo = (from: Point, to: Point) =>
      Math.atan2(to.y - from.y, to.x - from.x);

    // the duel: both fire at once, the shots meeting in the middle
    const bullets: Bullet[] = [];
    const flashes: { at: number; from: Point; angle: number }[] = [];
    const clashes: { at: number }[] = [];
    let clock: number = skidMs;
    for (let i = 0; i < DUELS; i++) {
      for (const g of gunners) {
        bullets.push(aimBullet(g, mid, clock, SPEED));
        flashes.push({ at: clock, from: g, angle: angleTo(g, mid) });
      }
      clashes.push({ at: bullets[bullets.length - 1].hitAt });
      clock += lerp(duelsMs, i / (DUELS - 1));
    }
    // then they turn on the bars, taking turns
    clock += turnMs;
    const hits = bars.map((bar, k) => {
      const g = gunners[k % 2];
      const b = aimBullet(g, bar.center, clock, SPEED * 1.4);
      bullets.push(b);
      flashes.push({ at: clock, from: g, angle: angleTo(g, bar.center) });
      clock += lerp(duelsMs, 1);
      return { bar, b };
    });
    const lastFire = clock + turnMs * 0.5;
    for (const g of gunners) {
      bullets.push(aimBullet(g, mid, lastFire, SPEED * 1.4));
      flashes.push({ at: lastFire, from: g, angle: angleTo(g, mid) });
    }
    const finalAt = bullets[bullets.length - 1].hitAt;
    const endAt = finalAt;

    const posAt: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const gunnerWisps = gunners.map((g, k) => (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / skidMs));
      posAt[k].x = lerp([button.x, g.x], u);
      posAt[k].y =
        lerp([button.y, g.y], u) + (u < 1 ? 0 : Math.sin(ms / 90 + k) * 2);
      return posAt[k];
    });

    const clashing = createBeats(
      clashes,
      (c) => c.at,
      () => {
        cover!.burst(mid, CLASH);
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      hits,
      (h) => h.b.hitAt,
      (h, k) => {
        cover!.tierUp(h.bar, h.b.from);
        cover!.burst(h.bar.center, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const finale = createBeats(
      [finalAt],
      (ms) => ms,
      () => {
        for (const bar of bars) cover!.slam(bar);
        cover!.blast(mid);
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
          clashing.tick(ms, now);
          hitting.tick(ms, now);
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
          for (const w of gunnerWisps)
            drawWispBetween(ctx, w, ms, now, WISP_SIZE * GUNNER, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
