// the "Pellet Storm" event (gunfire; free hires): it covers its crit, whose
// click freezes the screen while a gun wisp leaps out of the clicked
// floor's button and hovers over an empty spot, then blasts straight down,
// a spreading fan of pellets peppering the spot with pops and a jolt as a
// new worker forms out of the storm; it hops to the next spot and fires
// again, ever faster, the last blast landing in a huge blast and shake.
// Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { createBeats } from "../../../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "pelletStorm";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
const HOVER = 220;
const PELLETS = 7;
const SPREAD = 70;
const SPEED = 2.6;
const MOVE_MS = 180;
const FLASH_MS = 90;
const GUN = 0.5;
const PELLET = WISP_SIZE * 0.24;
const BLAST_SHAKE: [number, number] = [0.6, 1.3];

export const forcePelletStormEvent = registerWispEvent(
  KEY,
  "Pellet Storm",
  () => CONFIG.pelletStormEvent.chance,
  (floor, context) => {
    const { blastsMs, holdMs, mergeMs } = CONFIG.pelletStormEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    let from: Point = button;
    const blasts = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const muzzle: Point = { x: spot.x, y: spot.y - HOVER };
      const moves = clock;
      const fires = moves + MOVE_MS;
      const pellets: Bullet[] = Array.from({ length: PELLETS }, (_, i) =>
        aimBullet(
          muzzle,
          {
            x: spot.x + SPREAD * (i / (PELLETS - 1) - 0.5) * 2,
            y: spot.y + (i % 2) * 14,
          },
          fires,
          SPEED,
        ),
      );
      const lands = Math.max(...pellets.map((p) => p.hitAt));
      clock = fires + lerp(blastsMs, k / Math.max(1, hires.length - 1));
      const blast = { hire, spot, muzzle, from, moves, fires, lands, pellets };
      from = muzzle;
      return blast;
    });
    const last = blasts[blasts.length - 1];
    const endAt = last.lands;
    const pellets = blasts.flatMap((b) => b.pellets);
    const gunAt: Point = { x: 0, y: 0 };
    const gun = (ms: number): Point => {
      let b = blasts[0];
      for (const blast of blasts) if (ms >= blast.moves) b = blast;
      const u = easeOut(clamp01((ms - b.moves) / MOVE_MS));
      const kick =
        ms >= b.fires ? Math.max(0, 1 - (ms - b.fires) / 120) * 16 : 0;
      gunAt.x = lerp([b.from.x, b.muzzle.x], u);
      gunAt.y = lerp([b.from.y, b.muzzle.y], u) - kick;
      return gunAt;
    };

    const firing = createBeats(
      blasts,
      (b) => b.fires,
      () => {
        if (cover?.isLive()) shakeScreen(0.5);
      },
    );
    const landing = createBeats(
      blasts,
      (b) => b.lands,
      (b, k) => {
        giveHire(b.hire);
        for (const p of b.pellets) cover!.burst(p.to, 0.15);
        if (b === last) {
          cover!.blast(b.spot);
          return;
        }
        cover!.burst(b.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / Math.max(1, blasts.length - 1)));
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
          firing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          drawBullets(ctx, pellets, ms, now, PELLET, true);
          for (const b of blasts)
            drawMuzzleFlash(
              ctx,
              b.muzzle,
              Math.PI / 2,
              (ms - b.fires) / FLASH_MS,
              80,
            );
          drawWispBetween(ctx, gun, ms, now, WISP_SIZE * GUN, 0.6, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
