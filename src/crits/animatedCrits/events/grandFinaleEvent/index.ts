// the "Grand Finale" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a fireworks show goes off from the clicked
// floor's button: a row of shells rises and goes off in a chain across the
// top of the screen, bang-bang-bang; then cluster shells climb and each one
// bursts into a ring of blasts; then the grand finale: a salvo of huge
// shells all goes up and off together, every blast spraying coins, the
// shakes piling up into a huge blast and shake. Pays floor income × floor
// number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { bezier } from "../../../../shared/curves";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "grandFinale";
const REWARD = 4;
const ROW = 5;
const CLUSTERS = 3;
const CLUSTER_RING = 5;
const SALVO = 5;
const EDGE = 120;
const TOP = 200;
const CLUSTER_REACH = 90;
const CLUSTER_STAGGER_MS = 35;
const PHASE_GAP_MS = 120;
const SHELL = 0.35;
const FUSE = 14;
const ROW_BLAST = 190;
const CLUSTER_BLAST = 210;
const BOMBLET_BLAST = 120;
const SALVO_BLAST = 300;
const COINS = 12;
const COIN_REACH: [number, number] = [30, 120];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceGrandFinaleEvent = registerWispEvent(
  KEY,
  "Grand Finale",
  () => CONFIG.grandFinaleEvent.chance,
  (floor, context, area) => {
    const { riseMs, chainMs, clusterMs, holdMs, mergeMs } =
      CONFIG.grandFinaleEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const top = area.top + TOP;
    const mid = (area.top + area.bottom) / 2;
    const blasts: Blast[] = [];
    const shells: {
      at: (ms: number) => Point;
      leaves: number;
      blows: number;
    }[] = [];
    const shell = (to: Point, blows: number) => {
      const leaves = blows - riseMs;
      const ctrl: Point = {
        x: (button.x + to.x) / 2,
        y: Math.min(button.y, to.y) - 60,
      };
      const at: Point = { x: 0, y: 0 };
      shells.push({
        leaves,
        blows,
        at: (ms: number): Point =>
          bezier(
            button,
            ctrl,
            to,
            easeOut(clamp01((ms - leaves) / riseMs)),
            at,
          ),
      });
    };
    // the chain across the top
    for (let i = 0; i < ROW; i++) {
      const to: Point = {
        x: lerp([left, right], i / (ROW - 1)),
        y: top + (i % 2) * 40,
      };
      const blows = riseMs + i * chainMs;
      shell(to, blows);
      blasts.push({
        at: to,
        ms: blows,
        size: ROW_BLAST,
        shake: 0.6 + 0.1 * i,
        coins: COINS,
      });
    }
    // the cluster shells, each a blast ringed by bomblets
    const clusterAt = riseMs + (ROW - 1) * chainMs + PHASE_GAP_MS;
    for (let c = 0; c < CLUSTERS; c++) {
      const to: Point = {
        x: lerp([left + 80, right - 80], c / (CLUSTERS - 1)),
        y: lerp([top + 60, mid], (c + 1) % 2),
      };
      const blows = clusterAt + c * clusterMs;
      shell(to, blows);
      blasts.push({
        at: to,
        ms: blows,
        size: CLUSTER_BLAST,
        shake: 1.1,
        coins: COINS,
      });
      for (let b = 0; b < CLUSTER_RING; b++) {
        const a = (b / CLUSTER_RING) * Math.PI * 2;
        blasts.push({
          at: {
            x: to.x + Math.cos(a) * CLUSTER_REACH,
            y: to.y + Math.sin(a) * CLUSTER_REACH,
          },
          ms: blows + 80 + b * CLUSTER_STAGGER_MS,
          size: BOMBLET_BLAST,
          shake: 0.7,
          coins: 4,
        });
      }
    }
    // the salvo, all going off together
    const salvoAt =
      clusterAt +
      (CLUSTERS - 1) * clusterMs +
      80 +
      CLUSTER_RING * CLUSTER_STAGGER_MS +
      PHASE_GAP_MS +
      riseMs * 0.4;
    for (let s = 0; s < SALVO; s++) {
      const to: Point = {
        x: lerp([left, right], s / (SALVO - 1)),
        y: lerp([top + 30, mid - 20], Math.abs(s - 2) / 2),
      };
      shell(to, salvoAt);
      blasts.push({
        at: to,
        ms: salvoAt,
        size: SALVO_BLAST,
        shake: 1.6,
        coins: COINS * 2,
      });
    }
    const salvoMiddle: Point = { x: (left + right) / 2, y: top + 30 };
    const endAt = salvoAt;
    let lastBang = -Infinity;

    const launching = createBeats(
      [0, clusterAt - riseMs, salvoAt - riseMs],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(b.at, ringTargets(b.at, b.coins, COIN_REACH));
        if (!cover!.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(salvoMiddle),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          launching.tick(ms, now);
          booming.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const s of shells) {
            if (ms < s.leaves || ms >= s.blows) continue;
            drawLitFuse(ctx, s.at(ms), (ms - s.leaves) / riseMs, FUSE, now);
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.5,
              s.leaves,
              s.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
