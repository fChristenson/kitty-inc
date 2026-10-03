// the "Swarm Strike" event (explosion; a free floor): it covers its crit,
// whose click freezes the screen while a swarm of lit bomb wisps pours out
// of the clicked floor's button and circles the building's locked floor
// like hornets, fuses blinking ever faster; then they peel off and dive
// into it one after another, every hit a white blast, a bang and its own
// shake, the dives quickening into a rolling chain, until the last three
// slam in together in a cluster round one huge blast and shake; the floor
// bursts open, unlocked for free, as the screen unfreezes. Then the crit's
// tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { findRewardLocked } from "../eventRewards";
import { FLOOR_H, FLOOR_W } from "../constants";

const KEY = "swarmStrike";
const BOMBS = 9;
// the last CLUSTER dive together
const CLUSTER = 3;
const ORBIT = 170;
const SQUASH = 0.55;
const SPIN = 0.004;
const DIVE_MS = 160;
const JITTER = 60;
const BOMB = 0.35;
const FUSE = 14;
const BLAST = 160;
const CLUSTER_BLAST = 190;
const HUGE = 320;
const BANG_GAP_MS = 60;
const DIVE_SHAKE: [number, number] = [0.6, 1.3];

export const forceSwarmStrikeEvent = registerWispEvent(
  KEY,
  "Swarm Strike",
  () => CONFIG.swarmStrikeEvent.chance,
  (floor, context) => {
    const { circleMs, divesMs, holdMs, mergeMs } = CONFIG.swarmStrikeEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const button = getButtonCenter(context.isGroundFloor);
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const orbitAt = (i: number, ms: number, into: Point): Point => {
      const a =
        (i / BOMBS) * Math.PI * 2 +
        ms * SPIN * Math.PI * 2 * (1 + ms / circleMs);
      into.x = lock.x + Math.cos(a) * ORBIT;
      into.y = lock.y + Math.sin(a) * ORBIT * SQUASH;
      return into;
    };
    // single dives quickening, then the cluster all at once
    const diveTimes: number[] = [];
    let clock: number = circleMs;
    for (let i = 0; i < BOMBS - CLUSTER; i++) {
      diveTimes.push(clock);
      clock += lerp(divesMs, i / (BOMBS - CLUSTER - 1));
    }
    for (let i = 0; i < CLUSTER; i++) diveTimes.push(clock);
    const bombs = Array.from({ length: BOMBS }, (_, i) => {
      const inCluster = i >= BOMBS - CLUSTER;
      const dives = diveTimes[i];
      const hits = dives + DIVE_MS;
      const target: Point = {
        x: lock.x + (Math.random() - 0.5) * JITTER * 2,
        y: lock.y + (Math.random() - 0.5) * JITTER,
      };
      const release: Point = { x: 0, y: 0 };
      orbitAt(i, dives, release);
      const at: Point = { x: 0, y: 0 };
      return {
        dives,
        hits,
        target,
        inCluster,
        at: (ms: number): Point => {
          if (ms < dives) {
            orbitAt(i, ms, at);
            const u = easeOut(clamp01(ms / (circleMs * 0.4)));
            at.x = lerp([button.x, at.x], u);
            at.y = lerp([button.y, at.y], u);
            return at;
          }
          const u = easeIn(clamp01((ms - dives) / DIVE_MS));
          at.x = lerp([release.x, target.x], u);
          at.y = lerp([release.y, target.y], u);
          return at;
        },
      };
    });
    const endAt = clock + DIVE_MS;
    let lastBang = -Infinity;

    const hitting = createBeats(
      bombs,
      (b) => b.hits,
      (b, k) => {
        if (b.inCluster) {
          if (b === bombs[BOMBS - 1]) cover!.blast(lock);
          return;
        }
        if (!cover!.isLive()) return;
        if (b.hits - lastBang >= BANG_GAP_MS) {
          lastBang = b.hits;
          playExplosion();
        }
        shakeScreen(lerp(DIVE_SHAKE, k / (BOMBS - CLUSTER - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => hitting.tick(ms, now),
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of bombs)
            drawDetonation(
              ctx,
              b.target,
              ms - b.hits,
              b.inCluster ? CLUSTER_BLAST : BLAST,
              now,
            );
          drawDetonation(ctx, lock, ms - endAt, HUGE, now);
          for (const b of bombs) {
            if (ms >= b.hits) continue;
            drawLitFuse(ctx, b.at(ms), clamp01(ms / b.hits), FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              0,
              b.hits,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
