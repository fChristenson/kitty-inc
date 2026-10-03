// the "Shell Casings" event (gunfire; cash): it covers its crit, whose
// click freezes the screen while a gun wisp leaps out of the clicked floor's
// button and hammers a long burst across the top of the screen, muzzle
// flashing, bullets streaking off; with every shot a spent casing kicks out
// of it, arcs away and tumbles down the screen, and wherever it lands it
// tinkles into a burst of coins with a pop and a jolt; the burst speeds up
// into a roar of fire and a rain of casings, and the last shot goes off in
// a huge blast and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { drawBullets, drawMuzzleFlash, fireBullet } from "../../shared/bullets";
import { createBeats } from "../../shared/eventBeats";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "shellCasings";
const REWARD = 4;
const SHOTS = 16;
const EDGE = 40;
const TOP = 150;
const SETUP_MS = 220;
const SPEED = 2.8;
// the burst sweeps SWEEP rad across, centred straight up
const SWEEP = 2;
// each casing kicks out KICK px sideways and falls DROP px in casingMs
const KICK: [number, number] = [80, 200];
const DROP: [number, number] = [160, 320];
const FLASH_MS = 70;
const FLASH = 48;
const GUN = 0.6;
const CASING = 0.22;
const BULLET = WISP_SIZE * 0.3;
const COINS = 10;
const COIN_REACH: [number, number] = [20, 90];
const BANG_GAP_MS = 60;

export const forceShellCasingsEvent = registerWispEvent(
  KEY,
  "Shell Casings",
  () => CONFIG.shellCasingsEvent.chance,
  (floor, context, area) => {
    const { shotMs, casingMs, holdMs, mergeMs } = CONFIG.shellCasingsEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const gunSpot: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 60,
    };
    const box = {
      left: area.left - EDGE,
      right: area.right + EDGE,
      top: area.top + TOP - EDGE,
      bottom: area.bottom + EDGE,
    };
    const ltr = Math.random() < 0.5;
    let clock: number = SETUP_MS;
    const shots = Array.from({ length: SHOTS }, (_, i) => {
      const u = i / (SHOTS - 1);
      const angle = -Math.PI / 2 + (ltr ? 1 : -1) * SWEEP * (u - 0.5);
      const bullet = fireBullet(gunSpot, angle, clock, SPEED, box);
      // its casing kicks out the other way, then falls
      const kick = (ltr ? -1 : 1) * lerp(KICK, Math.random());
      const drop = lerp(DROP, Math.random());
      const lands: Point = {
        x: Math.min(
          area.right - EDGE,
          Math.max(area.left + EDGE, gunSpot.x + kick),
        ),
        y: Math.min(area.bottom - EDGE, gunSpot.y + drop),
      };
      const fires = clock;
      const at: Point = { x: 0, y: 0 };
      const casing = {
        lands,
        fires,
        drops: fires + casingMs,
        at: (ms: number): Point => {
          const t = clamp01((ms - fires) / casingMs);
          // a little hop up, then down under gravity
          at.x = lerp([gunSpot.x, lands.x], easeOut(t));
          at.y =
            gunSpot.y -
            Math.sin(t * Math.PI) * 50 +
            (lands.y - gunSpot.y) * t * t;
          return at;
        },
      };
      clock += shotMs * lerp([1, 0.45], u);
      return { bullet, angle, casing };
    });
    const bullets = shots.map((s) => s.bullet);
    const casings = shots.map((s) => s.casing);
    const lastShot = shots[SHOTS - 1];
    const endAt = Math.max(lastShot.casing.drops, lastShot.casing.fires);
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      const u = easeOut(clamp01(ms / SETUP_MS));
      gunAt.x = lerp([button.x, gunSpot.x], u);
      gunAt.y = lerp([button.y, gunSpot.y], u);
      return gunAt;
    };
    let lastBang = -Infinity;

    const firing = createBeats(
      shots,
      (s) => s.casing.fires,
      (s) => {
        if (s === lastShot) {
          cover!.blast(gunSpot);
          return;
        }
        if (cover?.isLive()) shakeScreen(0.35);
      },
    );
    const tinkling = createBeats(
      casings,
      (c) => c.drops,
      (c) => {
        cover!.launchFrom(c.lands, ringTargets(c.lands, COINS, COIN_REACH));
        cover!.burst(c.lands, 0.25);
        if (!cover!.isLive() || c.drops - lastBang < BANG_GAP_MS) return;
        lastBang = c.drops;
        playBloop();
        shakeScreen(0.4);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          tinkling.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt) return;
          drawBullets(ctx, bullets, ms, now, BULLET);
          for (const s of shots) {
            const t = (ms - s.casing.fires) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, gunSpot, s.angle, t, FLASH);
          }
          for (const c of casings)
            drawWispBetween(
              ctx,
              c.at,
              ms,
              now,
              WISP_SIZE * CASING,
              0.8,
              c.fires,
              c.drops,
            );
          drawWispBetween(
            ctx,
            gun,
            ms,
            now,
            WISP_SIZE * GUN,
            0.6,
            0,
            lastShot.casing.fires,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
