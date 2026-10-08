// the "Vapor Cloud" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a canister wisp drops into the middle of the
// screen and bursts, a cloud of glittering gold fuel billowing out over the
// whole screen; a spark streaks in from one side and lights the cloud's
// edge, and a detonation front rolls across it puff by puff, every puff a
// big blast, a bang and a shake spraying cash, the far side bursting in
// clusters; then the cloud's heart blows in a colossal blast. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawDetonation, DETONATION_MS } from "../../../../shared/explosion";
import { drawSprayMist } from "../../../../shared/spray";

const KEY = "vaporCloud";
const REWARD = 4;
const COLS = 6;
const ROWS = 4;
const MARGIN = 0.1;
const DROP_MS = 220;
const SPARK_MS = 160;
const PUFF = 90;
const PUFF_BLAST = 240;
const CLUSTER = 3;
const CLUSTER_BLAST = 150;
const CLUSTER_REACH = 70;
const CLUSTER_MS = 90;
const COLOSSAL = 720;
const COLOSSAL_PAUSE = 160;
const COINS = 8;
const REACH: [number, number] = [60, 220];
const BANG_GAP_MS = 45;
const BURST_SHAKE = 0.7;
const PUFF_SHAKE: [number, number] = [0.5, 1.2];
const CLUSTER_SHAKE = 0.7;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceVaporCloudEvent = registerWispEvent(
  KEY,
  "Vapor Cloud",
  () => CONFIG.vaporCloudEvent.chance,
  (floor, context, area) => {
    const { spreadMs, frontMs, holdMs, mergeMs } = CONFIG.vaporCloudEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.5,
    };
    const dir = Math.random() < 0.5 ? 1 : -1;
    const left = area.left + width * MARGIN;
    const top = area.top + height * MARGIN * 1.5;
    const w = width * (1 - 2 * MARGIN);
    const h = height * (1 - 3 * MARGIN);
    const ignites = DROP_MS + spreadMs + SPARK_MS;
    const puffs = Array.from({ length: COLS * ROWS }, (_, i) => {
      const c = i % COLS;
      const r = Math.floor(i / COLS);
      const at: Point = {
        x: left + ((c + 0.5 + (Math.random() - 0.5) * 0.5) / COLS) * w,
        y: top + ((r + 0.5 + (Math.random() - 0.5) * 0.5) / ROWS) * h,
      };
      // the front rolls in from the lit side
      const across = dir > 0 ? c / (COLS - 1) : 1 - c / (COLS - 1);
      return {
        at,
        reaches:
          DROP_MS +
          (spreadMs * Math.hypot(at.x - centre.x, at.y - centre.y)) /
            Math.hypot(w / 2, h / 2),
        blows: ignites + across * frontMs + Math.random() * 60,
        edge: across === 1,
      };
    });
    const blasts: Blast[] = [];
    for (const p of puffs) {
      blasts.push({
        at: p.at,
        ms: p.blows,
        size: PUFF_BLAST,
        shake: lerp(PUFF_SHAKE, (p.blows - ignites) / frontMs),
      });
      if (p.edge)
        for (let k = 0; k < CLUSTER; k++) {
          const a = (k / CLUSTER) * Math.PI * 2 + Math.random();
          blasts.push({
            at: {
              x: p.at.x + Math.cos(a) * CLUSTER_REACH,
              y: p.at.y + Math.sin(a) * CLUSTER_REACH,
            },
            ms: p.blows + CLUSTER_MS + k * 30,
            size: CLUSTER_BLAST,
            shake: CLUSTER_SHAKE,
          });
        }
    }
    const finalAt = Math.max(...blasts.map((b) => b.ms)) + COLOSSAL_PAUSE;
    const endAt = finalAt + DETONATION_MS;

    const canister: Point = { x: centre.x, y: 0 };
    const canisterAt = (ms: number): Point | null => {
      if (ms < 0 || ms > DROP_MS) return null;
      canister.y = lerp([area.top - 60, centre.y], easeIn(ms / DROP_MS));
      return canister;
    };
    const sparkFrom: Point = {
      x: dir > 0 ? area.left - 60 : area.right + 60,
      y: centre.y,
    };
    const sparkTo: Point = { x: dir > 0 ? left : left + w, y: centre.y };
    const spark: Point = { x: 0, y: centre.y };
    const sparkAt = (ms: number): Point | null => {
      if (ms < ignites - SPARK_MS || ms > ignites) return null;
      spark.x = lerp(
        [sparkFrom.x, sparkTo.x],
        easeIn(clamp01((ms - ignites + SPARK_MS) / SPARK_MS)),
      );
      return spark;
    };

    let bang = -Infinity;
    const bursting = createBeats(
      [DROP_MS],
      (ms) => ms,
      () => {
        cover!.burst(centre, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(BURST_SHAKE);
      },
    );
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        cover!.launchFrom(
          b.at,
          clampTargetsY(
            sprayTargets(b.at, COINS, REACH),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const finishing = createBeats(
      [finalAt],
      (ms) => ms,
      () => cover!.blast(centre),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          bursting.tick(ms, now);
          blasting.tick(ms, now);
          finishing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (const p of puffs) {
            if (ms < p.reaches || ms >= p.blows) continue;
            const grow = easeOut(clamp01((ms - p.reaches) / 260));
            drawSprayMist(
              ctx,
              p.at,
              ms - p.reaches,
              0.7 * grow,
              PUFF * (0.4 + 0.6 * grow),
              now,
            );
          }
          drawWispBetween(
            ctx,
            canisterAt,
            ms,
            now,
            WISP_SIZE * 0.8,
            0.6,
            0,
            DROP_MS,
          );
          drawWispBetween(
            ctx,
            sparkAt,
            ms,
            now,
            WISP_SIZE * 0.5,
            1,
            ignites - SPARK_MS,
            ignites,
          );
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          drawDetonation(ctx, centre, ms - finalAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
