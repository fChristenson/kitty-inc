// the "Bomb Pinwheel" event (explosion; cash): it covers its crit, whose
// click freezes the screen while bomb wisps, fuses fizzing, swing out of
// the clicked floor's button and whirl round it like a pinwheel, spinning
// faster and faster as the screen rumbles; one after another they're flung
// off the wheel, spinning away across the screen, each going off where it
// flies in a white blast, a bang, a jolt and cash blown everywhere; the
// last and biggest goes off in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { ringTargets } from "../../shared/coinTargets";

const KEY = "bombPinwheel";
const REWARD = 4;
const BOMBS = 6;
// the wheel is WHEEL px round over the button, turning ever faster up to
// SPIN laps a second; flung bombs fly FLING px
const WHEEL = 70;
const UP = 120;
const SPIN = 3;
const FLING = 220;
const BOMB = 0.4;
const FUSE = 20;
const BLAST = 180;
const COINS = 14;
const SPRAY: [number, number] = [40, 150];
const BOOM_SHAKE: [number, number] = [0.8, 1.6];

export const forceBombPinwheelEvent = registerWispEvent(
  KEY,
  "Bomb Pinwheel",
  () => CONFIG.bombPinwheelEvent.chance,
  (floor, context, area) => {
    const { spinUpMs, gapsMs, flingMs, holdMs, mergeMs } =
      CONFIG.bombPinwheelEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: Math.max(area.top + WHEEL + FLING * 0.5, button.y - UP),
    };
    // the wheel's turn, accelerating
    const turn = (ms: number) => {
      const t = ms / 1000;
      const ramp = Math.min(1, ms / spinUpMs);
      return Math.PI * 2 * SPIN * t * (0.3 + 0.7 * ramp);
    };
    let clock: number = spinUpMs;
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      const flung = clock;
      clock += lerp(gapsMs, k / (BOMBS - 1));
      const offset = (k / BOMBS) * Math.PI * 2;
      const a = turn(flung) + offset;
      const release: Point = {
        x: hub.x + Math.cos(a) * WHEEL,
        y: hub.y + Math.sin(a) * WHEEL,
      };
      // off along the rim's direction of travel, curving outward
      const tangent = a + Math.PI / 2;
      const booms = flung + flingMs;
      const land: Point = {
        x: Math.min(
          area.right - 30,
          Math.max(
            area.left + 30,
            release.x + Math.cos(tangent) * FLING + Math.cos(a) * FLING * 0.6,
          ),
        ),
        y: Math.min(
          area.bottom - 30,
          Math.max(
            area.top + 30,
            release.y + Math.sin(tangent) * FLING + Math.sin(a) * FLING * 0.6,
          ),
        ),
      };
      const at: Point = { x: 0, y: 0 };
      return {
        flung,
        booms,
        land,
        at: (ms: number): Point | null => {
          if (ms >= booms) return null;
          if (ms < flung) {
            const grow = easeOut(clamp01(ms / 300));
            const r = WHEEL * grow;
            const b = turn(ms) + offset;
            at.x = lerp([button.x, hub.x], grow) + Math.cos(b) * r;
            at.y = lerp([button.y, hub.y], grow) + Math.sin(b) * r;
            return at;
          }
          const u = easeOut((ms - flung) / flingMs);
          at.x = lerp([release.x, land.x], u);
          at.y = lerp([release.y, land.y], u);
          return at;
        },
      };
    });
    const last = bombs[BOMBS - 1];
    const endAt = last.booms;

    const rumbling = createBeats(
      [spinUpMs * 0.5],
      (ms) => ms,
      () => {
        if (cover?.isLive()) shakeScreen(0.5);
      },
    );
    const booming = createBeats(
      bombs,
      (b) => b.booms,
      (b, k) => {
        if (b === last) {
          cover!.blast(b.land);
          return;
        }
        cover!.launchFrom(b.land, ringTargets(b.land, COINS, SPRAY));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / (BOMBS - 1)));
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
          rumbling.tick(ms, now);
          booming.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const b of bombs) {
            const p = b.at(ms);
            if (p) drawLitFuse(ctx, p, clamp01(ms / b.booms), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              0,
              b.booms,
            );
            drawDetonation(ctx, b.land, ms - b.booms, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
