// the "Blast Sweep" event (clutter; a free floor): it covers its crit, whose
// click freezes the screen while the button flings a whirl of glitter out
// over the whole screen, landing in spokes like a starburst; lit bomb wisps
// pop up round the locked floor's lock, fuses fizzing, then blow one after
// another round the ring, each a big blast that bursts into a cluster of
// smaller ones, every shockwave shoving the mess in toward the lock, the
// shakes rolling on blast after blast; the last blast sucks it all in onto
// the lock in one heap, which goes up in a colossal blast that bursts the
// lock open: the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import { scatterRays, simulateClean } from "../../../../shared/clutter";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { getLockCenter } from "../../../../floors/floorLock";
import { findRewardLocked } from "../../eventRewards";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "blastSweep";
const BITS = 460;
const BIT = 10;
const RAYS = 14;
const EDGE = 40;
const BOMBS = 6;
const BOMB = WISP_SIZE * 0.9;
// the bombs ring the lock this far out (a share of the screen's longer side),
// kept INSET px inside the screen
const RING = 0.42;
const INSET = 90;
// blown in this order round the ring, side to side
const ORDER = [0, 3, 1, 4, 2, 5];
// a shockwave races out RING_SPEED px/ms, BAND px thick, shoving every bit
// it passes up to SHOVE px/ms², less the farther out it's got
const RING_SPEED = 2.4;
const BAND = 150;
const SHOVE = 0.05;
// then the lock draws every bit in, PULL px/ms² till it's close
const PULL = 0.03;
const NEAR = 60;
const BLAST = 330;
const CLUSTER = 3;
const CLUSTER_SIZE = 170;
const CLUSTER_OUT = 120;
const CLUSTER_MS = 110;
const FINAL = 680;
const COLLAPSE_MS = 160;
const BLAST_SHAKE: [number, number] = [0.8, 1.5];
const CLUSTER_SHAKE = 0.5;
const SPILL_BOW = 160;

interface Bomb {
  at: Point;
  blowsAt: number;
  clusters: Point[];
}

export const forceBlastSweepEvent = registerWispEvent(
  KEY,
  "Blast Sweep",
  () => CONFIG.blastSweepEvent.chance,
  (floor, context, area) => {
    const { spillMs, fuseMs, blastsMs, implodeMs, holdMs, mergeMs } =
      CONFIG.blastSweepEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lockAt = getLockCenter();
    const lock: Point = { x: lockAt.x, y: locked.offsetY + lockAt.y };
    const button = getButtonCenter(context.isGroundFloor);
    const box = {
      left: area.left + EDGE,
      top: area.top + EDGE,
      right: area.right - EDGE,
      bottom: area.bottom - EDGE,
    };
    const spots = scatterRays(box, BITS, RAYS);
    const n = spots.length;
    const lands = spots.map(() => spillMs * (0.55 + 0.45 * Math.random()));
    const bows = spots.map((s) => ({
      x: (button.x + s.x) / 2,
      y: Math.min(button.y, s.y) - SPILL_BOW,
    }));

    // the ring of bombs round the lock, blown side to side, quickening
    const reach =
      RING * Math.max(area.right - area.left, area.bottom - area.top);
    const firstBlast = spillMs + fuseMs;
    const bombs: Bomb[] = ORDER.map((slot, k) => {
      const angle = -Math.PI / 2 + (slot / BOMBS) * Math.PI * 2;
      const at: Point = {
        x: Math.min(
          area.right - INSET,
          Math.max(area.left + INSET, lock.x + Math.cos(angle) * reach),
        ),
        y: Math.min(
          area.bottom - INSET,
          Math.max(area.top + INSET, lock.y + Math.sin(angle) * reach),
        ),
      };
      const u = k / (BOMBS - 1);
      return {
        at,
        blowsAt: firstBlast + blastsMs * (1 - (1 - u) ** 1.5),
        clusters: Array.from({ length: CLUSTER }, (_, c) => {
          const a = angle + Math.PI + ((c - 1) * Math.PI) / 3;
          return {
            x: at.x + Math.cos(a) * CLUSTER_OUT,
            y: at.y + Math.sin(a) * CLUSTER_OUT,
          };
        }),
      };
    });
    const lastBlast = bombs[BOMBS - 1].blowsAt;
    const implodeAt = lastBlast + CLUSTER_MS;
    const collapseAt = implodeAt + implodeMs;
    const finalAt = collapseAt + COLLAPSE_MS;
    const swept = simulateClean(
      spots,
      [
        {
          kind: "force",
          push: (x, y, ms, into) => {
            into.x = 0;
            into.y = 0;
            let any = false;
            for (const bomb of bombs) {
              const front = (ms - bomb.blowsAt) * RING_SPEED;
              if (front <= 0) continue;
              const dx = x - bomb.at.x;
              const dy = y - bomb.at.y;
              const d = Math.hypot(dx, dy) || 1;
              if (Math.abs(d - front) > BAND / 2 || d > reach * 2) continue;
              const shove = SHOVE * (1 - d / (reach * 2));
              into.x += (dx / d) * shove;
              into.y += (dy / d) * shove;
              any = true;
            }
            if (ms >= implodeAt) {
              const dx = lock.x - x;
              const dy = lock.y - y;
              const d = Math.hypot(dx, dy);
              if (d > NEAR) {
                into.x += (dx / d) * PULL;
                into.y += (dy / d) * PULL;
                any = true;
              }
            }
            return any ? into : null;
          },
        },
      ],
      firstBlast,
      collapseAt,
    );

    const spilling = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const arming = createBeats(
      [spillMs],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const blowing = createBeats(
      bombs.flatMap((bomb, k) => [
        { ms: bomb.blowsAt, k, cluster: false },
        { ms: bomb.blowsAt + CLUSTER_MS, k, cluster: true },
      ]),
      (b) => b.ms,
      (b) => {
        if (!cover!.isLive()) return;
        if (b.cluster) {
          shakeScreen(CLUSTER_SHAKE);
          return;
        }
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, b.k / (BOMBS - 1)));
      },
    );
    const finishing = createBeats(
      [implodeAt, finalAt],
      (ms) => ms,
      (ms) => {
        if (ms === finalAt) {
          cover!.blast(lock);
          return;
        }
        if (cover!.isLive()) playSwoosh();
      },
    );

    const bit: Point = { x: 0, y: 0 };
    const bombAt = bombs.map((bomb) => () => bomb.at);
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: finalAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          spilling.tick(ms, now);
          arming.tick(ms, now);
          blowing.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0) return;
          for (let k = 0; k < BOMBS; k++) {
            const bomb = bombs[k];
            const since = ms - bomb.blowsAt;
            if (ms >= spillMs && since < 0) {
              const pop = easeOut(clamp01((ms - spillMs) / 160));
              const burn = clamp01((ms - spillMs) / (bomb.blowsAt - spillMs));
              drawLitFuse(ctx, bomb.at, burn, BOMB * 1.3 * pop, now);
              drawWisp(ctx, bombAt[k], ms, now, BOMB * pop, burn);
            }
            drawDetonation(ctx, bomb.at, since, BLAST, now);
            for (const c of bomb.clusters)
              drawDetonation(ctx, c, since - CLUSTER_MS, CLUSTER_SIZE, now);
          }
          drawDetonation(ctx, lock, ms - finalAt, FINAL, now);
          if (ms >= finalAt) return;
          const collapse = easeIn(clamp01((ms - collapseAt) / COLLAPSE_MS));
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < n; i++) {
            if (ms < lands[i])
              bezier(button, bows[i], spots[i], easeOut(ms / lands[i]), bit);
            else swept.at(i, ms, bit);
            if (collapse > 0) {
              bit.x = lerp([bit.x, lock.x], collapse);
              bit.y = lerp([bit.y, lock.y], collapse);
            }
            stampGlimmer(
              ctx,
              bit.x,
              bit.y,
              BIT,
              i + ms * 0.005,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          endLightBatch(ctx);
          ctx.restore();
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
