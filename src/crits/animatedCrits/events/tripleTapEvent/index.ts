// the "Triple Tap" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while three gunner wisps blink into a triangle
// round an empty spot on a floor in view and all fire at once, three
// tracers of wisp bullets streaking in from three sides and meeting dead
// on the spot in a flash, a bang and a jolt as a new worker forms; they
// blink round the next spot and the next, quicker each time; the last
// triple tap goes off in a huge blast and shake. Then the crit's tier
// pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
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
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "tripleTap";
const MAX_HIRES = 5;
const FORM_MS = 300;
const GUNNERS = 3;
// gunners stand RING px round a spot, blinking in over BLINK_MS
const RING = 110;
const BLINK_MS = 120;
const SPEED = 2.4;
const GUNNER = 0.45;
const BULLET = WISP_SIZE * 0.32;
const MUZZLE = 44;
const FLASH_MS = 60;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

export const forceTripleTapEvent = registerWispEvent(
  KEY,
  "Triple Tap",
  () => CONFIG.tripleTapEvent.chance,
  (floor, context) => {
    const { aimsMs, holdMs, mergeMs } = CONFIG.tripleTapEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const bullets: Bullet[] = [];
    let clock = 0;
    const taps = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      const turn = Math.random() * Math.PI * 2;
      const stands = Array.from({ length: GUNNERS }, (_, g) => {
        const a = turn + (g / GUNNERS) * Math.PI * 2;
        return {
          x: spot.x + Math.cos(a) * RING,
          y: spot.y + Math.sin(a) * RING,
        };
      });
      const arrives = clock + BLINK_MS;
      const fires = arrives + lerp(aimsMs, k / Math.max(1, hires.length - 1));
      let hits = 0;
      for (const stand of stands) {
        const b = aimBullet(stand, spot, fires, SPEED);
        bullets.push(b);
        hits = b.hitAt;
      }
      const t = { hire, spot, stands, arrives, fires, hits, leaves: clock };
      clock = hits;
      return t;
    });
    const last = taps[taps.length - 1];
    const endAt = last.hits;
    const gunners = Array.from({ length: GUNNERS }, (_, g) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        let t = taps[0];
        for (const tap of taps) if (ms >= tap.leaves) t = tap;
        const k = taps.indexOf(t);
        const from = k === 0 ? button : taps[k - 1].stands[g];
        const u = easeOut(clamp01((ms - t.leaves) / BLINK_MS));
        at.x = lerp([from.x, t.stands[g].x], u);
        at.y = lerp([from.y, t.stands[g].y], u);
        return at;
      };
    });

    const blinking = createBeats(
      taps,
      (t) => t.leaves,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      taps,
      (t) => t.hits,
      (t, k) => {
        giveHire(t.hire);
        if (t === last) {
          cover!.blast(t.spot);
          return;
        }
        cover!.burst(t.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, taps.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          blinking.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const t of taps) {
            const f = (ms - t.fires) / FLASH_MS;
            if (f <= 0 || f >= 1) continue;
            for (const s of t.stands)
              drawMuzzleFlash(
                ctx,
                s,
                Math.atan2(t.spot.y - s.y, t.spot.x - s.x),
                f,
                MUZZLE,
              );
          }
          for (const g of gunners)
            drawWispBetween(ctx, g, ms, now, WISP_SIZE * GUNNER, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
