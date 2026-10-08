// the "Shield Breaker" event (gunfire; a crit tier): it covers its crit,
// whose click freezes the screen while a shimmering shield bubble of light
// snaps up round the clicked floor's button and three gun wisps take aim
// from round the screen; they pound it in rattling bursts, every round a
// muzzle flash and a hit that ripples across the shield with a flash, a pop
// and a jolt, the bubble flickering and trembling harder, until all three
// fire one last volley together that shatters it in a huge blast and shake
// and the bar jumps a crit tier. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  BTN_H,
  BTN_W,
  getButtonCenter,
} from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "shieldBreaker";
const SHOTS = 15;
const PAD = 50;
const SEGMENTS = 40;
const RISE_MS = 220;
// each gun's heading from the button and how far off it sits
const GUNS = [-Math.PI, (-Math.PI * 3) / 4, -Math.PI / 2];
const GUN_REACH = 380;
const SPEED = 2.2;
const GUN = 0.55;
const RIPPLE_MS = 260;
const RIPPLE = 50;
const SHATTER_MS = 450;
const SHATTER_REACH = 220;
const FLASH_MS = 90;
const VOLLEY_GAP = 150;
const HIT_SHAKE: [number, number] = [0.25, 0.7];

interface Shot {
  gun: Point;
  hit: Point;
  bullet: Bullet;
}

export const forceShieldBreakerEvent = registerWispEvent(
  KEY,
  "Shield Breaker",
  () => CONFIG.shieldBreakerEvent.chance,
  (floor, context, area) => {
    const { shotsMs, holdMs, mergeMs } = CONFIG.shieldBreakerEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const rx = BTN_W / 2 + PAD;
    const ry = BTN_H / 2 + PAD;
    const rim = (a: number): Point => ({
      x: button.x + Math.cos(a) * rx,
      y: button.y + Math.sin(a) * ry,
    });
    const guns: Point[] = GUNS.map((a) => ({
      x: Math.min(
        area.right - 60,
        Math.max(area.left + 60, button.x + Math.cos(a) * GUN_REACH),
      ),
      y: Math.min(
        area.bottom - 60,
        Math.max(area.top + 60, button.y + Math.sin(a) * GUN_REACH),
      ),
    }));
    const shotAt = (gun: Point, ms: number): Shot => {
      // a little off the line straight at the button, so hits spread round it
      const a =
        Math.atan2(gun.y - button.y, gun.x - button.x) +
        (Math.random() - 0.5) * 1.1;
      const hit = rim(a);
      return { gun, hit, bullet: aimBullet(gun, hit, ms, SPEED) };
    };
    const shots: Shot[] = [];
    let clock: number = RISE_MS;
    for (let k = 0; k < SHOTS; k++) {
      shots.push(shotAt(guns[k % guns.length], clock));
      clock += lerp(shotsMs, k / (SHOTS - 1));
    }
    const volley = guns.map((gun) => shotAt(gun, clock + VOLLEY_GAP));
    const breaksAt = Math.max(...volley.map((s) => s.bullet.hitAt));
    const all = [...shots, ...volley];
    const bullets = all.map((s) => s.bullet);
    const endAt = breaksAt + SHATTER_MS;
    const ring = Array.from({ length: SEGMENTS + 1 }, (_, i) =>
      rim((i / SEGMENTS) * Math.PI * 2),
    );
    const segA: Point = { x: 0, y: 0 };
    const segB: Point = { x: 0, y: 0 };
    const gunAts = guns.map((g) => () => g);

    const hitting = createBeats(
      shots,
      (s) => s.bullet.hitAt,
      (s, k) => {
        cover!.burst(s.hit, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / (SHOTS - 1)));
      },
    );
    const volleying = createBeats(
      [volley[0].bullet.firedAt],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playExplosion();
      },
    );
    const breaking = createBeats(
      [breaksAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, button);
        cover!.slam(bar);
        cover!.blast(button);
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
          hitting.tick(ms, now);
          volleying.tick(ms, now);
          breaking.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          // weaker and twitchier with every hit taken
          const worn = clamp01(
            hitting.latest() ? (hitting.latest()!.index + 1) / SHOTS : 0,
          );
          const rise = easeOut(clamp01(ms / RISE_MS));
          if (ms < breaksAt) {
            const flicker = 0.55 + 0.35 * Math.sin(ms * (0.02 + 0.08 * worn));
            for (let i = 1; i < ring.length; i++) {
              const j = Math.sin(ms * 0.07 + i * 1.7) * 4 * worn;
              segA.x = lerp([button.x, ring[i - 1].x], rise) + j;
              segA.y = lerp([button.y, ring[i - 1].y], rise) - j;
              segB.x = lerp([button.x, ring[i].x], rise) - j;
              segB.y = lerp([button.y, ring[i].y], rise) + j;
              drawBeam(ctx, segA, segB, 9, flicker * rise);
            }
          } else {
            // the shards of the shield flung outward
            const t = (ms - breaksAt) / SHATTER_MS;
            const out = SHATTER_REACH * easeOut(t);
            for (let i = 1; i < ring.length; i += 2) {
              const a = ((i - 0.5) / SEGMENTS) * Math.PI * 2;
              const dx = Math.cos(a) * out;
              const dy = Math.sin(a) * out;
              segA.x = ring[i - 1].x + dx;
              segA.y = ring[i - 1].y + dy;
              segB.x = ring[i].x + dx;
              segB.y = ring[i].y + dy;
              drawBeam(ctx, segA, segB, 9, 1 - t);
            }
          }
          for (const s of shots) {
            const t = (ms - s.bullet.hitAt) / RIPPLE_MS;
            if (t >= 0 && t < 1)
              drawBeamFlare(ctx, s.hit, RIPPLE * (0.5 + t), 1 - t, now);
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.35, true);
          for (const s of all) {
            const t = (ms - s.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(
                ctx,
                s.gun,
                Math.atan2(s.hit.y - s.gun.y, s.hit.x - s.gun.x),
                t,
                WISP_SIZE * 0.9,
              );
          }
          if (ms <= breaksAt)
            for (const at of gunAts)
              drawWispHead(ctx, at, ms, now, WISP_SIZE * GUN, 0.7);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
