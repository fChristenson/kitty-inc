// the "Fire for Effect" event (gunfire; a crit tier): it covers its crit,
// whose click freezes the screen while a gun in the bottom corner lobs
// ranging shells at the clicked floor's income bar the way artillery
// zeroes in: the first sails way over and blows up beyond it, the next
// drops short, then over again, then short, each closer, every miss a
// blast and a jolt, the bracket closing in on the bar under a flickering
// aim line; then the whole battery opens up along the bottom, salvo after
// salvo of shells landing on the bar together in clusters of blasts and
// heavy shakes, and the last salvo blows it up a crit tier in a huge
// blast. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawAimLaser } from "../../../../shared/beam";
import { drawDetonation } from "../../../../shared/explosion";
import { stampGlimmer } from "../../../../shared/twinkle";
import { findRewardBars } from "../../eventRewards";

const KEY = "fireForEffect";
// each ranging shell lands this share of the gun's range past (+) or short
// of (-) the bar
const RANGING = [0.5, -0.32, 0.16, -0.06];
const GUNS = 5;
const SALVOS = 3;
// px the guns keep from the screen's sides and bottom; px a shell rises
// over its flight per px it flies, at least MIN_LIFT
const SIDE = 90;
const BOTTOM = 70;
const LIFT = 0.35;
const MIN_LIFT = 260;
const MARGIN = 80;
const SHELL = WISP_SIZE * 0.55;
const MUZZLE = 70;
const MUZZLE_MS = 130;
const MISS_SIZE = 190;
const MISS_SHAKE: [number, number] = [0.5, 0.8];
const SALVO_SIZE: [number, number] = [150, 210];
const SALVO_SHAKE: [number, number] = [1.0, 1.6];
// the craters the misses leave, glowing on as the bracket closes
const CRATER = 26;
const SOUND_GAP_MS = 60;

interface Shell {
  gun: Point;
  to: Point;
  lift: number;
  firedAt: number;
  landsAt: number;
  angle: number;
  salvo: number;
  at: (ms: number) => Point | null;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
}

export const forceFireForEffectEvent = registerWispEvent(
  KEY,
  "Fire for Effect",
  () => CONFIG.fireForEffectEvent.chance,
  (floor, context, area) => {
    const { readyMs, rangeGapMs, flightMs, salvoGapMs, holdMs, mergeMs } =
      CONFIG.fireForEffectEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const target = bar.center;
    const guns: Point[] = Array.from({ length: GUNS }, (_, i) => ({
      x: lerp([area.left + SIDE, area.right - SIDE], i / (GUNS - 1)),
      y: area.bottom - BOTTOM,
    }));
    // the ranging gun is the corner one farther from the bar
    const spotter =
      Math.abs(guns[0].x - target.x) > Math.abs(guns[GUNS - 1].x - target.x)
        ? guns[0]
        : guns[GUNS - 1];
    const shell = (
      gun: Point,
      to: Point,
      firedAt: number,
      salvo: number,
    ): Shell => {
      const dx = to.x - gun.x;
      const dy = to.y - gun.y;
      const lift = Math.max(MIN_LIFT, Math.hypot(dx, dy) * LIFT);
      const spot: Point = { x: 0, y: 0 };
      const landsAt = firedAt + flightMs;
      return {
        gun,
        to,
        lift,
        firedAt,
        landsAt,
        angle: Math.atan2(dy - 4 * lift, dx),
        salvo,
        at: (ms) => {
          if (ms < firedAt || ms > landsAt) return null;
          const u = (ms - firedAt) / flightMs;
          spot.x = gun.x + dx * u;
          spot.y = gun.y + dy * u - 4 * lift * u * (1 - u);
          return spot;
        },
      };
    };
    const clampIn = (p: Point): Point => ({
      x: Math.min(area.right - MARGIN, Math.max(area.left + MARGIN, p.x)),
      y: Math.min(area.bottom - MARGIN, Math.max(area.top + MARGIN, p.y)),
    });
    const shells: Shell[] = [];
    let clock: number = readyMs;
    const rx = target.x - spotter.x;
    const ry = target.y - spotter.y;
    const range = Math.hypot(rx, ry) || 1;
    RANGING.forEach((share, k) => {
      const side = (k % 2 ? 1 : -1) * 40 * (1 - k / RANGING.length);
      shells.push(
        shell(
          spotter,
          clampIn({
            x: target.x + rx * share - (ry / range) * side,
            y: target.y + ry * share + (rx / range) * side,
          }),
          clock,
          -1,
        ),
      );
      clock += lerp(rangeGapMs, k / (RANGING.length - 1));
    });
    // fire for effect: every gun at once, each salvo landing together
    const zeroedAt = shells[shells.length - 1].landsAt + 80;
    clock = Math.max(clock, zeroedAt - flightMs * 0.5);
    for (let s = 0; s < SALVOS; s++) {
      guns.forEach((g, i) =>
        shells.push(
          shell(
            g,
            {
              x: target.x + (i - (GUNS - 1) / 2) * bar.box.width * 0.17,
              y: target.y + (Math.random() - 0.5) * bar.box.height * 0.6,
            },
            clock,
            s,
          ),
        ),
      );
      clock += salvoGapMs;
    }
    const blasts: Blast[] = shells.map((s) => ({
      at: s.to,
      ms: s.landsAt,
      size:
        s.salvo < 0
          ? MISS_SIZE
          : lerp(SALVO_SIZE, s.salvo / Math.max(1, SALVOS - 1)),
    }));
    const salvoLands = Array.from(
      { length: SALVOS },
      (_, s) => shells.find((sh) => sh.salvo === s)!.landsAt,
    );
    const misses = shells.filter((s) => s.salvo < 0);
    const endAt = salvoLands[SALVOS - 1];
    let soundAt = -Infinity;
    const boom = (now: number) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      playExplosion();
    };

    const firing = createBeats(
      [
        ...misses.map((s) => s.firedAt),
        ...salvoLands.map((ms) => ms - flightMs),
      ],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const missing = createBeats(
      misses,
      (s) => s.landsAt,
      (s, k, now) => {
        if (!cover!.isLive()) return;
        boom(now);
        shakeScreen(lerp(MISS_SHAKE, k / (misses.length - 1)));
        // the near misses rattle the bar
        if (k >= misses.length - 2) cover!.levels(bar, 0, s.to);
      },
    );
    const pounding = createBeats(
      salvoLands,
      (ms) => ms,
      (_, s, now) => {
        if (s === SALVOS - 1) {
          cover!.tierUp(bar, spotter);
          cover!.slam(bar);
          cover!.blast(target);
          return;
        }
        cover!.levels(bar, 0, spotter);
        if (!cover!.isLive()) return;
        boom(now);
        shakeScreen(lerp(SALVO_SHAKE, s / Math.max(1, SALVOS - 2)));
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
          firing.tick(ms, now);
          missing.tick(ms, now);
          pounding.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 900) return;
          // the bracket: the misses' craters glowing on, and the aim line
          // from the spotting gun while it's still ranging
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const s of misses) {
            if (ms < s.landsAt) continue;
            const fade = 1 - clamp01((ms - zeroedAt) / 400);
            stampGlimmer(
              ctx,
              s.to.x,
              s.to.y,
              CRATER * fade,
              ms * 0.004,
              COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          if (ms < zeroedAt) {
            const next = misses.find((s) => s.landsAt > ms) ?? misses[0];
            drawAimLaser(ctx, spotter, next.to);
          }
          // the guns: the spotter glinting from the start, the rest as
          // they're wheeled up for the salvos
          for (const g of guns)
            if (g === spotter || ms >= zeroedAt - flightMs * 0.5 - 150)
              if (ms < endAt)
                drawMuzzleFlash(ctx, g, -Math.PI / 2, 0.3, MUZZLE * 0.5);
          for (const s of shells) {
            drawMuzzleFlash(
              ctx,
              s.gun,
              s.angle,
              (ms - s.firedAt) / MUZZLE_MS,
              s.salvo < 0 ? MUZZLE : MUZZLE * 1.4,
            );
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              SHELL,
              0.5,
              s.firedAt,
              s.landsAt,
            );
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
