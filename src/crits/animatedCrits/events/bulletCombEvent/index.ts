// the "Bullet Comb" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while a gun wisp slides in at the
// screen's edge level with an income bar and rakes it with a comb of six
// parallel bullets, rattling off in a burst with muzzle flashes; as the comb
// tears through the bar it flashes with a pop, a jolt and free levels; the
// gun hops to the far side for the next bar, quicker each time, the last
// comb landing in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { levelsFor } from "../../../../gameState";

const KEY = "bulletComb";
const MAX_BARS = 4;
const EDGE = 40;
const TEETH = 6;
const TOOTH_GAP_MS = 25;
const MOVE = 0.3;
const SPEED = 3.2;
const FLASH_MS = 90;
const MUZZLE = 46;
const GUN = 0.45;
const BULLET = 0.22;
const COMB_SHAKE: [number, number] = [0.6, 1.4];

interface Comb {
  bar: RewardBar;
  gun: Point;
  from: Point;
  starts: number;
  fires: number;
  hits: number;
  angle: number;
  bullets: Bullet[];
  final: boolean;
}

export const forceBulletCombEvent = registerWispEvent(
  KEY,
  "Bullet Comb",
  () => CONFIG.bulletCombEvent.chance,
  (floor, context, area) => {
    const { combsMs, levelShare, holdMs, mergeMs } = CONFIG.bulletCombEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    let from: Point = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const combs: Comb[] = bars.map((bar, k) => {
      const left = k % 2 === 0;
      const gun: Point = {
        x: left ? area.left + EDGE : area.right - EDGE,
        y: bar.center.y,
      };
      const far = left ? area.right - EDGE / 2 : area.left + EDGE / 2;
      const span = lerp(combsMs, k / Math.max(1, bars.length - 1));
      const starts = clock;
      const fires = starts + span * MOVE;
      clock += span;
      const spacing = (bar.box.height - 20) / (TEETH - 1);
      const bullets = Array.from({ length: TEETH }, (_, i) => {
        const y = bar.box.y + 10 + spacing * i;
        return aimBullet(
          { x: gun.x, y },
          { x: far, y },
          fires + i * TOOTH_GAP_MS,
          SPEED,
        );
      });
      const comb = {
        bar,
        gun,
        from,
        starts,
        fires,
        hits:
          fires +
          (TEETH / 2) * TOOTH_GAP_MS +
          Math.abs(bar.center.x - gun.x) / SPEED,
        angle: left ? 0 : Math.PI,
        bullets,
        final: k === bars.length - 1,
      };
      from = gun;
      return comb;
    });
    const all = combs.flatMap((c) => c.bullets);
    const last = combs[combs.length - 1];
    const endAt = Math.max(last.hits, ...all.map((b) => b.hitAt));
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const t = Math.max(0, ms);
      let c = combs[0];
      for (const comb of combs) if (t >= comb.starts) c = comb;
      const e = easeOut(clamp01((t - c.starts) / (c.fires - c.starts)));
      gunAt.x = lerp([c.from.x, c.gun.x], e);
      gunAt.y = lerp([c.from.y, c.gun.y], e);
      return gunAt;
    };

    const firing = createBeats(
      all,
      (b) => b.firedAt,
      () => {
        if (cover?.isLive()) playBloop();
      },
    );
    const combing = createBeats(
      combs,
      (c) => c.hits,
      (c, k) => {
        cover!.levels(c.bar, levelsFor(c.bar.floor, levelShare, 2), c.gun);
        if (c.final) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(c.bar.center);
          if (cover!.isLive()) playExplosion();
          return;
        }
        cover!.burst(c.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(COMB_SHAKE, k / Math.max(1, combs.length - 1)));
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
          combing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, all, ms, now, WISP_SIZE * BULLET, true);
          for (const c of combs)
            for (const b of c.bullets)
              drawMuzzleFlash(
                ctx,
                b.from,
                c.angle,
                (ms - b.firedAt) / FLASH_MS,
                MUZZLE,
              );
          drawWispBetween(
            ctx,
            gun,
            ms,
            now,
            WISP_SIZE * GUN,
            0.6,
            0,
            last.fires + TEETH * TOOTH_GAP_MS,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
