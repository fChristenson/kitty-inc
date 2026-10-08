// the "Return Fire" event (gunfire; free upgrade levels): it covers its
// crit, whose click freezes the screen while the total-income readout opens
// fire like a turret, rattling bursts of wisp bullets down at one income bar
// after another in muzzle flashes, each bullet a pop and a jolt pumping free
// levels into the bar it hits, the bursts coming quicker each time; then it
// lets loose a last volley at every bar at once, slamming them all in a
// huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playSlamExplosion,
} from "../../../../sound";
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
import { totalSpot } from "../../cashFlow";
import { findRewardBars, levelsFor, type RewardBar } from "../../eventRewards";

const KEY = "returnFire";
const MAX_BARS = 5;
const BURST = 4;
const VOLLEY = 3;
const SPEED = 2.4;
const SPREAD = 0.35;
const BULLET = 0.5;
const FLASH_MS = 90;
const FLASH = 80;
const RATTLE_GAP_MS = 50;
const HIT_SHAKE: [number, number] = [0.35, 0.8];
const BLAST_SHAKE = 2.4;

interface Shot {
  bullet: Bullet;
  bar: RewardBar;
  angle: number;
  volley: boolean;
}

export const forceReturnFireEvent = registerWispEvent(
  KEY,
  "Return Fire",
  () => CONFIG.returnFireEvent.chance,
  (floor, context, area) => {
    const { burstsMs, shotGapMs, volleyGapMs, levelShare, holdMs, mergeMs } =
      CONFIG.returnFireEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const gun = totalSpot(area);
    // somewhere along the bar, so a burst stitches across it
    const along = (bar: RewardBar): Point => ({
      x: bar.box.x + bar.box.width * (0.5 + (Math.random() - 0.5) * 2 * SPREAD),
      y: bar.center.y,
    });
    const shot = (bar: RewardBar, at: number, volley: boolean): Shot => {
      const bullet = aimBullet(gun, along(bar), at, SPEED);
      return {
        bullet,
        bar,
        angle: Math.atan2(bullet.dy, bullet.dx),
        volley,
      };
    };
    let clock = 0;
    const shots: Shot[] = [];
    bars.forEach((bar, k) => {
      for (let i = 0; i < BURST; i++)
        shots.push(shot(bar, clock + i * shotGapMs, false));
      clock += lerp(burstsMs, k / Math.max(1, bars.length - 1));
    });
    const volleyAt = clock - lerp(burstsMs, 1) + volleyGapMs;
    for (const bar of bars)
      for (let i = 0; i < VOLLEY; i++)
        shots.push(shot(bar, volleyAt + i * 30, true));
    const volleys = shots.filter((s) => s.volley);
    const endAt = Math.max(...volleys.map((s) => s.bullet.hitAt));
    const finalShot = volleys.find((s) => s.bullet.hitAt === endAt);
    const bullets = shots.map((s) => s.bullet);
    const slammed = new Set<RewardBar>();
    let lastRattle = -Infinity;
    let k = 0;

    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s) => {
        const at = s.bullet.to;
        if (!s.volley) {
          cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare, 1), at);
          cover!.burst(at, 0.3);
        } else if (!slammed.has(s.bar)) {
          slammed.add(s.bar);
          cover!.levels(s.bar, levelsFor(s.bar.floor, levelShare * 2, 2), at);
          cover!.slam(s.bar);
        }
        if (s === finalShot) {
          cover!.blast(at);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(BLAST_SHAKE);
          return;
        }
        if (!cover!.isLive()) return;
        shakeScreen(lerp(HIT_SHAKE, k++ / shots.length));
        if (s.bullet.hitAt - lastRattle >= RATTLE_GAP_MS) {
          lastRattle = s.bullet.hitAt;
          playBloop();
        }
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
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * BULLET, true);
          for (const s of shots) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(
                ctx,
                gun,
                s.angle,
                t,
                s.volley ? FLASH * 1.5 : FLASH,
              );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
