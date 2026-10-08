// the "Ripple Fire" event (gunfire; a crit tier): it covers its crit, whose
// click freezes the screen while a row of guns lines up along the bottom of
// the screen and fires in a rolling ripple of muzzle flashes, gun after gun,
// left to right, every shot streaking into the clicked floor's income bar
// with a pop and a jolt; then back right to left, faster, then from both
// ends in toward the middle, faster still; then every gun fires at once,
// each timed so the whole volley slams into the bar together, and it jumps
// a crit tier in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "rippleFire";
const GUNS = 9;
// px the guns keep from the screen's sides and bottom
const SIDE = 70;
const BOTTOM = 60;
const BULLET = WISP_SIZE * 0.45;
const MUZZLE = 50;
const MUZZLE_MS = 110;
const FIRST_SHOT = 0.3;
const HIT_SHAKE: [number, number] = [0.2, 0.45];

interface Shot {
  gun: number;
  bullet: Bullet;
  angle: number;
  volley: boolean;
}

export const forceRippleFireEvent = registerWispEvent(
  KEY,
  "Ripple Fire",
  () => CONFIG.rippleFireEvent.chance,
  (floor, context, area) => {
    const { readyMs, rippleMs, passGapMs, speed, holdMs, mergeMs } =
      CONFIG.rippleFireEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const guns: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: lerp([area.left + SIDE, area.right - SIDE], i / (GUNS - 1)),
      y: area.bottom - BOTTOM,
    }));
    // each gun's own spot along the bar
    const marks: Point[] = guns.map((_, i) => ({
      x: bar.box.x + bar.box.width * (0.1 + (0.8 * i) / (GUNS - 1)),
      y: bar.center.y,
    }));
    // the passes' firing orders: left to right, back, then both ends inward
    const inward: number[] = [];
    for (let i = 0; i < Math.ceil(GUNS / 2); i++) {
      inward.push(i);
      if (GUNS - 1 - i !== i) inward.push(GUNS - 1 - i);
    }
    const passes = [
      guns.map((_, i) => i),
      guns.map((_, i) => GUNS - 1 - i),
      inward,
    ];
    const shots: Shot[] = [];
    const shoot = (gun: number, to: Point, at: number, volley: boolean) => {
      const bullet = aimBullet(guns[gun], to, at, speed);
      shots.push({
        gun,
        bullet,
        angle: Math.atan2(to.y - guns[gun].y, to.x - guns[gun].x),
        volley,
      });
    };
    let clock: number = readyMs;
    passes.forEach((order, p) => {
      const gap = lerp(rippleMs, p / (passes.length - 1));
      order.forEach((gun, k) => {
        // the inward pass fires its pairs together
        const step = p === passes.length - 1 ? Math.floor(k / 2) : k;
        shoot(gun, marks[gun], clock + step * gap, false);
      });
      const steps = p === passes.length - 1 ? Math.ceil(GUNS / 2) : GUNS;
      clock += steps * gap + passGapMs;
    });
    // the volley: each gun fires so its round lands with all the others
    const centre = bar.center;
    const far = Math.max(
      ...guns.map((g) => Math.hypot(centre.x - g.x, centre.y - g.y)),
    );
    const volleyHits = clock + far / speed;
    guns.forEach((g, i) =>
      shoot(
        i,
        centre,
        volleyHits - Math.hypot(centre.x - g.x, centre.y - g.y) / speed,
        true,
      ),
    );
    const bullets = shots.map((s) => s.bullet);
    const rippleHits = shots.filter((s) => !s.volley);
    const endAt = volleyHits;
    const lastRipple = Math.max(...rippleHits.map((s) => s.bullet.hitAt));

    const readying = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      rippleHits,
      (s) => s.bullet.hitAt,
      (s) => {
        cover!.levels(bar, 0, s.bullet.from);
        cover!.burst(s.bullet.to, 0.25);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, s.bullet.hitAt / lastRipple));
      },
    );
    const volleying = createBeats(
      [volleyHits],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, guns[Math.floor(GUNS / 2)]);
        cover!.slam(bar);
        cover!.blast(centre);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          readying.tick(ms, now);
          hitting.tick(ms, now);
          volleying.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 400) return;
          // the guns: glints along the bottom, flaring as they fire
          for (const s of shots)
            drawMuzzleFlash(
              ctx,
              guns[s.gun],
              s.angle,
              (ms - s.bullet.firedAt) / MUZZLE_MS,
              s.volley ? MUZZLE * 1.6 : MUZZLE,
            );
          drawBullets(ctx, bullets, ms, now, BULLET);
          if (ms < endAt)
            for (const g of guns)
              drawMuzzleFlash(ctx, g, -Math.PI / 2, FIRST_SHOT, MUZZLE * 0.5);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
