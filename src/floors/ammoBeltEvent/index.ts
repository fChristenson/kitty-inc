// the "Ammo Belt" event (gunfire; free upgrade levels): it covers its crit,
// whose click freezes the screen while a gun wisp flies out of the clicked
// floor's button to the side of the screen, an ammo belt of bullet wisps
// trailing off it, and it opens up: the belt feeds round after round into
// it, each shot a muzzle flash and a bullet ripping into an income bar with
// a pop and a jolt, every burst landing the bar free levels; it rakes bar
// after bar, ever faster, until the belt runs dry on a last shot that lands
// in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { aimBullet, drawBullets, drawMuzzleFlash } from "../../shared/bullets";
import { createBeats } from "../../shared/eventBeats";
import { findRewardBars, levelsFor } from "../eventRewards";

const KEY = "ammoBelt";
const MAX_BARS = 3;
const BURST = 5;
const EDGE = 70;
const SETUP_MS = 260;
const SPEED = 2.4;
const SPREAD = 0.35;
// the belt shows BELT_SHOWN rounds GAP px apart, sagging SAG px
const BELT_SHOWN = 8;
const GAP = 22;
const SAG = 50;
const FLASH_MS = 70;
const FLASH = 46;
const GUN = 0.55;
const ROUND = 0.3;
const BULLET = WISP_SIZE * 0.32;
const HIT_SHAKE: [number, number] = [0.8, 1.3];
const BANG_GAP_MS = 60;

export const forceAmmoBeltEvent = registerWispEvent(
  KEY,
  "Ammo Belt",
  () => CONFIG.ammoBeltEvent.chance,
  (floor, context, area) => {
    const { shotMs, burstsMs, holdMs, mergeMs } = CONFIG.ammoBeltEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const side = button.x > (area.left + area.right) / 2 ? -1 : 1;
    const post: Point = {
      x: side > 0 ? area.left + EDGE : area.right - EDGE,
      y: (area.top + area.bottom) / 2,
    };
    let clock: number = SETUP_MS;
    const bursts = bars.map((bar, k) => {
      const shots = Array.from({ length: BURST }, (_, i) => {
        const to: Point = {
          x:
            bar.box.x +
            bar.box.width * (0.5 + SPREAD * (i / (BURST - 1) - 0.5) * 2),
          y: bar.center.y,
        };
        return aimBullet(post, to, clock + i * shotMs, SPEED);
      });
      clock +=
        (BURST - 1) * shotMs + lerp(burstsMs, k / Math.max(1, bars.length - 1));
      return { bar, shots, lands: shots[BURST - 1].hitAt };
    });
    const bullets = bursts.flatMap((b) => b.shots);
    const last = bursts[bursts.length - 1];
    const lastShot = bullets[bullets.length - 1];
    const endAt = last.lands;
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const u = easeOut(clamp01(ms / SETUP_MS));
      gunAt.x = lerp([button.x, post.x], u);
      gunAt.y = lerp([button.y, post.y], u);
      return gunAt;
    };
    // rounds fed so far, smoothly, so the belt slides into the gun
    const fed = (ms: number) => {
      let n = 0;
      for (const b of bullets) if (ms >= b.firedAt) n++;
      const next = bullets[n];
      return next ? n + clamp01(1 - (next.firedAt - ms) / shotMs) * 0.5 : n;
    };
    const rounds = Array.from({ length: bullets.length }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        const s = i - fed(ms);
        if (s < 0 || s >= BELT_SHOWN) return null;
        const g = gun(ms);
        at.x = g.x - side * s * GAP;
        at.y = g.y + Math.sin((s / BELT_SHOWN) * Math.PI) * SAG + s * 6;
        return at;
      };
    });
    let lastBang = -Infinity;

    const hitting = createBeats(
      bullets,
      (b) => b.hitAt,
      (b) => {
        if (b === lastShot) return;
        cover!.burst(b.to, 0.3);
        if (!cover!.isLive() || b.hitAt - lastBang < BANG_GAP_MS) return;
        lastBang = b.hitAt;
        playBloop();
        shakeScreen(0.35);
      },
    );
    const landing = createBeats(
      bursts,
      (b) => b.lands,
      (b, k) => {
        cover!.levels(b.bar, levelsFor(b.bar.floor), post);
        if (b === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(lastShot.to);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, bursts.length - 1)));
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
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          for (const round of rounds)
            drawWispHead(ctx, round, ms, now, WISP_SIZE * ROUND, 0.3);
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const b of bullets) {
            const t = (ms - b.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, post, Math.atan2(b.dy, b.dx), t, FLASH);
          }
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
