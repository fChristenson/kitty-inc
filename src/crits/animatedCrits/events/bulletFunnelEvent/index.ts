// the "Bullet Funnel" event (gunfire; cash): it covers its crit, whose click
// freezes the screen while eight gun wisps ring the screen's edges and open
// up, hosing streams of wisp bullets inward that swirl into a whirlpool in
// the middle of the screen, every stream bending into the vortex, rounds
// popping out showers of cash as they're sucked in, the guns firing ever
// faster as the screen rumbles harder; then the funnel fires the whole haul
// up into the total as a roaring river of cash in a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { bezier } from "../../../../shared/curves";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import {
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "bulletFunnel";
const REWARD = 4;
const GUNS = 8;
const SHOTS = 9;
const SWIRL = 1.4;
const INSET = 50;
const POP_EVERY = 3;
const COINS = 5;
const FLASH_MS = 70;
const FLASH = 40;
const GUN = 0.45;
const VORTEX = 0.8;
const POP_SHAKE: [number, number] = [0.2, 0.9];

// a round from a gun at `angle` round the vortex, spiralling SWIRL turns in
function swirlRound(
  vortex: Point,
  angle: number,
  radius: number,
  firedAt: number,
  hitAt: number,
): Bullet {
  const from = {
    x: vortex.x + Math.cos(angle) * radius,
    y: vortex.y + Math.sin(angle) * radius,
  };
  const spot: Point = { x: 0, y: 0 };
  return {
    from,
    dx: -Math.cos(angle),
    dy: -Math.sin(angle),
    speed: radius / (hitAt - firedAt),
    firedAt,
    hitAt,
    to: vortex,
    at: (ms) => {
      if (ms < firedAt || ms >= hitAt) return null;
      const u = (ms - firedAt) / (hitAt - firedAt);
      const a = angle + SWIRL * Math.PI * 2 * u * u;
      const r = radius * (1 - u);
      spot.x = vortex.x + Math.cos(a) * r;
      spot.y = vortex.y + Math.sin(a) * r;
      return spot;
    },
  };
}

export const forceBulletFunnelEvent = registerWispEvent(
  KEY,
  "Bullet Funnel",
  () => CONFIG.bulletFunnelEvent.chance,
  (floor, context, area) => {
    const { gapsMs, flightMs, holdMs, mergeMs } = CONFIG.bulletFunnelEvent;
    const total = totalSpot(area);
    const vortex: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 60,
    };
    const halfW = (area.right - area.left) / 2 - INSET;
    const halfH = (area.bottom - area.top) / 2 - INSET;
    const guns = Array.from({ length: GUNS }, (_, g) => {
      const angle = (g / GUNS) * Math.PI * 2;
      // pushed out to the screen's edge along that heading
      const scale = Math.min(
        halfW / Math.abs(Math.cos(angle) || 1e-6),
        halfH / Math.abs(Math.sin(angle) || 1e-6),
      );
      return {
        angle,
        radius: scale,
        at: {
          x: vortex.x + Math.cos(angle) * scale,
          y: vortex.y + Math.sin(angle) * scale,
        },
      };
    });
    const rounds: { bullet: Bullet; gun: (typeof guns)[number] }[] = [];
    let clock = 0;
    for (let s = 0; s < SHOTS; s++) {
      for (const gun of guns)
        rounds.push({
          gun,
          bullet: swirlRound(
            vortex,
            gun.angle,
            gun.radius,
            clock,
            clock + flightMs,
          ),
        });
      clock += lerp(gapsMs, s / (SHOTS - 1));
    }
    const bullets = rounds.map((r) => r.bullet);
    const pours = Math.max(...bullets.map((b) => b.hitAt));
    const line = sampleLine(
      (u) =>
        bezier(vortex, { x: vortex.x, y: total.y + 80 }, total, u, {
          x: 0,
          y: 0,
        }),
      30,
    );
    const pour: Pour = {
      coinsAlong: 300,
      width: 50,
      streamMs: 450,
      travelMs: 520,
    };
    const endAt = pours + pour.travelMs;
    const durationMs = Math.max(
      pourDurationMs(pours, pour),
      endAt + holdMs + mergeMs,
    );
    const pops = bullets.filter((_, i) => i % POP_EVERY === 0);
    const gunAts = guns.map((g) => () => g.at);
    const vortexAt = () => vortex;

    const popping = createBeats(
      pops,
      (b) => b.hitAt,
      (_, k) => {
        cover!.launchFrom(
          vortex,
          clampTargetsY(
            sprayTargets(vortex, COINS, [60, 200]),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(POP_SHAKE, k / Math.max(1, pops.length - 1)));
      },
    );
    const pouring = createBeats(
      [pours],
      (ms) => ms,
      () => pourLine(cover!, line, pour),
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(cover!.total() ?? total),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          popping.tick(ms, now);
          pouring.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > pours) return;
          for (const r of rounds) {
            const t = (ms - r.bullet.firedAt) / FLASH_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, r.gun.at, r.gun.angle + Math.PI, t, FLASH);
          }
          drawBullets(ctx, bullets, ms, now);
          for (const at of gunAts)
            drawWispBetween(ctx, at, ms, now, WISP_SIZE * GUN, 0.4, 0, pours);
          drawWispBetween(
            ctx,
            vortexAt,
            ms,
            now,
            WISP_SIZE * VORTEX,
            ms / pours,
            0,
            pours,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
