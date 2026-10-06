// the "Bullet Mosaic" event (gunfire; a crit tier): it covers its crit, whose
// click freezes the screen while two gun wisps rise in the bottom corners
// and open up, hosing streams of wisp bullets into the air over the clicked
// floor's bar, where every one sticks fast as a glinting stud: shot by shot,
// faster and faster, the studs spell out a giant five-pointed star; it
// blazes, then slams down onto the bar, which jumps a crit tier in a huge
// blast. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOutBack, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../shared/bullets";
import { stampGlimmer } from "../../shared/twinkle";
import { shapeOutline, SHAPES } from "../../shared/drawing";
import { findRewardBars } from "../eventRewards";

const KEY = "bulletMosaic";
const STUDS = 130;
const STUD = 13;
// the star: this high over the bar (at most), its points' radius
const ABOVE = 300;
const OUTER = 230;
// the guns sit this far in from the bottom corners
const GUN_IN = 70;
const GUN = WISP_SIZE * 0.8;
const BULLET = WISP_SIZE * 0.4;
const BULLET_SPEED = 3.4;
const MUZZLE = 80;
const MUZZLE_MS = 90;
const SOUND_EVERY = 6;
const FIRE_SHAKE = 0.15;
const DONE_SHAKE = 1;

export const forceBulletMosaicEvent = registerWispEvent(
  KEY,
  "Bullet Mosaic",
  () => CONFIG.bulletMosaicEvent.chance,
  (floor, context, area) => {
    const { growMs, fireMs, blazeMs, slamMs, holdMs, mergeMs } =
      CONFIG.bulletMosaicEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const outer = Math.min(OUTER, width * 0.36);
    const centre: Point = {
      x: bar.center.x,
      y: Math.max(area.top + outer + 20, bar.center.y - ABOVE),
    };
    // studs evenly round the star's outline, from the top point clockwise
    const studs = shapeOutline(SHAPES.star, STUDS, centre, outer);
    const guns: Point[] = [
      { x: area.left + GUN_IN, y: area.bottom - GUN_IN },
      { x: area.right - GUN_IN, y: area.bottom - GUN_IN },
    ];
    // studs fired in order, alternating guns, quickening; each sticks on arrival
    const shots: { bullet: Bullet; gun: number }[] = studs.map((to, i) => {
      const u = i / (STUDS - 1);
      const hits = growMs + fireMs * (1 - (1 - u) ** 1.4);
      const gun = i % 2;
      const reach = Math.hypot(to.x - guns[gun].x, to.y - guns[gun].y);
      return {
        bullet: aimBullet(
          guns[gun],
          to,
          hits - reach / BULLET_SPEED,
          BULLET_SPEED,
        ),
        gun,
      };
    });
    const bullets = shots.map((s) => s.bullet);
    const doneAt = Math.max(...bullets.map((b) => b.hitAt));
    const slamAt = doneAt + blazeMs;
    const hitAt = slamAt + slamMs;
    const lastFired = [0, 0];

    const opening = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const firing = createBeats(
      shots,
      (s) => s.bullet.firedAt,
      (s, k) => {
        lastFired[s.gun] = s.bullet.firedAt;
        if (!cover!.isLive() || k % SOUND_EVERY !== 0) return;
        playBloop();
        shakeScreen(FIRE_SHAKE);
      },
    );
    const finishing = createBeats(
      [doneAt, slamAt, hitAt],
      (ms) => ms,
      (ms) => {
        if (ms >= hitAt) {
          cover!.tierUp(bar, centre);
          cover!.slam(bar);
          cover!.blast(bar.center);
          return;
        }
        if (ms >= slamAt) {
          if (cover!.isLive()) playSwoosh();
          return;
        }
        cover!.burst(centre, 1.1);
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(DONE_SHAKE);
      },
    );

    const gunAt = guns.map((g) => () => g);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: hitAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          opening.tick(ms, now);
          firing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > hitAt) return;
          const pop = easeOutBack(clamp01(ms / growMs));
          const fade = 1 - clamp01((ms - doneAt) / blazeMs);
          for (let g = 0; g < 2; g++) {
            drawWisp(ctx, gunAt[g], ms, now, GUN * pop * fade, 0.5);
            const t = (ms - lastFired[g]) / MUZZLE_MS;
            if (fade > 0 && t > 0 && t < 1) {
              const aim = Math.atan2(
                centre.y - guns[g].y,
                centre.x - guns[g].x,
              );
              drawMuzzleFlash(ctx, guns[g], aim, t, MUZZLE);
            }
          }
          drawBullets(ctx, bullets, ms, now, BULLET);
          // the stuck studs, blazing once complete, then slammed down flat
          const blaze = clamp01((ms - doneAt) / 150);
          const down = easeIn(clamp01((ms - slamAt) / slamMs));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < STUDS; i++) {
            const b = bullets[i];
            if (ms < b.hitAt) continue;
            const s = studs[i];
            const x = lerp([s.x, centre.x + (s.x - centre.x) * 1.6], down);
            const y = lerp([s.y, bar.center.y + (s.y - centre.y) * 0.15], down);
            stampGlimmer(
              ctx,
              x,
              y,
              STUD * (1 + 0.6 * blaze),
              i + ms * 0.004,
              blaze > 0.5 || i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
