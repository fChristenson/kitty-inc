// the "Skeet" event (gunfire; cash): it covers its crit, whose click freezes
// the screen while clay wisps are flung up in high arcs from the bottom
// corners, one after another and faster; a gun at the bottom of the screen
// leads each one and shoots it out of the sky at the top of its arc, every
// hit a muzzle flash, a burst and a jolt and a gush of cash pouring off into
// the total; then a double is flung up from both corners at once, both
// blasted together in a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { between, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { bezier } from "../../../../shared/curves";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";

const KEY = "skeet";
const REWARD = 4;
const CLAYS = 6;
const CORNER = 30;
const APEX: [number, number] = [0.25, 0.45];
const SPEED = 2.4;
const CLAY = 0.4;
const BULLET = WISP_SIZE * 0.35;
const FLASH_MS = 110;
const FLASH = 50;
const SPRAY = 26;
const POUR: Pour = { coinsAlong: 150, width: 28, streamMs: 220, travelMs: 520 };
const HIT_SHAKE: [number, number] = [0.5, 1.1];

interface Clay {
  from: Point;
  apex: Point;
  launches: number;
  hits: number;
  shot: Bullet;
  angle: number;
  at: (ms: number) => Point;
  river: Point[];
}

export const forceSkeetEvent = registerWispEvent(
  KEY,
  "Skeet",
  () => CONFIG.skeetEvent.chance,
  (floor, context, area) => {
    const { riseMs, throwsMs, doubleGapMs, holdMs, mergeMs } =
      CONFIG.skeetEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const gun: Point = { x: area.left + width / 2, y: area.bottom - 60 };
    const total = totalSpot(area);
    const into: Point = { x: 0, y: 0 };
    const throwClay = (side: number, launches: number): Clay => {
      const from: Point = {
        x: side < 0 ? area.left + CORNER : area.right - CORNER,
        y: area.bottom - CORNER,
      };
      const apex: Point = {
        x:
          area.left +
          width * (side < 0 ? between([0.3, 0.55]) : between([0.45, 0.7])),
        y: area.top + height * between(APEX),
      };
      const hits = launches + riseMs;
      const shot = aimBullet(
        gun,
        apex,
        hits - Math.hypot(apex.x - gun.x, apex.y - gun.y) / SPEED,
        SPEED,
      );
      const spot: Point = { x: 0, y: 0 };
      const bend: Point = {
        x: apex.x + (apex.x < total.x ? -1 : 1) * 160,
        y: (apex.y + total.y) / 2,
      };
      return {
        from,
        apex,
        launches,
        hits,
        shot,
        angle: Math.atan2(shot.dy, shot.dx),
        // rising to the apex, slowing as it climbs
        at: (ms) => {
          const u = Math.min(1, Math.max(0, (ms - launches) / riseMs));
          spot.x = lerp([from.x, apex.x], u);
          spot.y = lerp([from.y, apex.y], 1 - (1 - u) * (1 - u));
          return spot;
        },
        river: sampleLine(
          (u) => ({ ...bezier(apex, bend, total, u, into) }),
          20,
        ),
      };
    };
    let clock = 0;
    const singles = Array.from({ length: CLAYS }, (_, k) => {
      const clay = throwClay(k % 2 ? 1 : -1, clock);
      clock += lerp(throwsMs, k / (CLAYS - 1));
      return clay;
    });
    const doubleAt = clock + doubleGapMs;
    const pair = [throwClay(-1, doubleAt), throwClay(1, doubleAt)];
    const clays = [...singles, ...pair];
    const bullets = clays.map((c) => c.shot);
    const endAt = doubleAt + riseMs;

    const firing = createBeats(
      clays,
      (c) => c.shot.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const hitting = createBeats(
      clays,
      (c) => c.hits,
      (c, k) => {
        pourLine(cover!, c.river, POUR);
        cover!.launchFrom(
          c.apex,
          clampTargetsY(
            sprayTargets(c.apex, SPRAY, [60, 220]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (c === pair[1]) {
          cover!.blast(c.apex);
          return;
        }
        cover!.burst(c.apex, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / (clays.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: endAt + POUR.streamMs + POUR.travelMs + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          for (const c of clays) {
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CLAY,
              0.7,
              c.launches,
              c.hits,
            );
            const t = (ms - c.shot.firedAt) / FLASH_MS;
            if (t > 0 && t < 1) drawMuzzleFlash(ctx, gun, c.angle, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
