// the "Seismic Charges" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a row of bomb wisps fizzes along the bottom
// of the screen; they blow one after another down the line, each a big
// blast with its own bang and shake, spraying cash up and sending a ring of
// glitter rolling out across the screen, the later rings racing faster; the
// rings all meet at one point mid-screen, which goes off in a cluster of
// blasts at once and then one colossal blast and the hardest shake of all
// as the cash pours into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  drawWispBetween,
  drawGlitterLight,
  WISP_SIZE,
  type Point,
} from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { sprayTargets } from "../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";

const KEY = "seismicCharges";
const REWARD = 4;
const CHARGES = 5;
const EDGE = 60;
const LOW = 70;
const FOCUS = 0.42;
const BOMB = 0.5;
const FUSE = 56;
const BLAST = 260;
const SPRAY = 40;
const SPRAY_REACH: [number, number] = [120, 340];
const RING_DOTS = 30;
const RING_DOT = 7;
const CLUSTER = 4;
const CLUSTER_OFF = 100;
const CLUSTER_SIZE = 340;
const COLOSSAL = 760;
const COLOSSAL_MS = 150;
const CHAIN_SHAKE: [number, number] = [0.8, 1.4];
const CLUSTER_SHAKE = 1.7;
const COLOSSAL_SHAKE = 2.4;

interface Charge {
  at: Point;
  blows: number;
  // px per ms its ring rolls out, to meet the others at the focus
  speed: number;
  seed: number;
}

export const forceSeismicChargesEvent = registerWispEvent(
  KEY,
  "Seismic Charges",
  () => CONFIG.seismicChargesEvent.chance,
  (floor, context, area) => {
    const { fuseMs, chainMs, meetMs, holdMs, mergeMs } =
      CONFIG.seismicChargesEvent;
    const width = area.right - area.left;
    const focus: Point = {
      x: area.left + width / 2,
      y: area.top + (area.bottom - area.top) * FOCUS,
    };
    let clock = fuseMs;
    const blowTimes = Array.from({ length: CHARGES }, (_, k) => {
      const ms = clock;
      clock += lerp(chainMs, k / (CHARGES - 1));
      return ms;
    });
    const meetsAt = blowTimes[CHARGES - 1] + meetMs;
    const colossalAt = meetsAt + COLOSSAL_MS;
    const endAt = colossalAt + DETONATION_MS;
    // blown from the outside in, alternating sides
    const xs = Array.from(
      { length: CHARGES },
      (_, k) => area.left + EDGE + ((width - EDGE * 2) * k) / (CHARGES - 1),
    );
    const order = [0, CHARGES - 1, 1, CHARGES - 2, 2];
    const charges: Charge[] = order.map((i, k) => {
      const at: Point = { x: xs[i], y: area.bottom - LOW };
      const dist = Math.hypot(focus.x - at.x, focus.y - at.y);
      return {
        at,
        blows: blowTimes[k],
        speed: dist / (meetsAt - blowTimes[k]),
        seed: k * 97,
      };
    });
    const bombs = charges.map((c) => () => c.at);
    const cluster: Point[] = Array.from({ length: CLUSTER }, (_, i) => {
      const a = (i / CLUSTER) * Math.PI * 2 + Math.PI / 4;
      return {
        x: focus.x + Math.cos(a) * CLUSTER_OFF,
        y: focus.y + Math.sin(a) * CLUSTER_OFF,
      };
    });

    const chain = createBeats(
      charges,
      (c) => c.blows,
      (c, k) => {
        cover!.launchFrom(
          c.at,
          sprayTargets(c.at, SPRAY, SPRAY_REACH, -Math.PI / 2, Math.PI * 0.8),
        );
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(CHAIN_SHAKE, k / (CHARGES - 1)));
      },
    );
    const finale = createBeats(
      [meetsAt, colossalAt],
      (ms) => ms,
      (_, k) => {
        if (k === 1) {
          cover!.blast(focus);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(COLOSSAL_SHAKE);
          return;
        }
        for (const at of cluster)
          cover!.launchFrom(at, sprayTargets(at, SPRAY / 2, SPRAY_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(CLUSTER_SHAKE);
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
          chain.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let k = 0; k < CHARGES; k++) {
            const c = charges[k];
            if (ms < c.blows) {
              drawLitFuse(ctx, c.at, ms / c.blows, FUSE, now);
              drawWispBetween(
                ctx,
                bombs[k],
                ms,
                now,
                WISP_SIZE * BOMB,
                0.6 + 0.4 * (ms / c.blows),
                0,
                c.blows,
              );
              continue;
            }
            drawDetonation(ctx, c.at, ms - c.blows, BLAST, now);
            if (ms >= meetsAt) continue;
            // its ring of glitter rolling out towards the focus
            const r = (ms - c.blows) * c.speed;
            const alpha =
              0.5 + 0.5 * clamp01((ms - c.blows) / (meetsAt - c.blows));
            for (let i = 0; i < RING_DOTS; i++) {
              const a = (i / RING_DOTS) * Math.PI * 2;
              const x = c.at.x + Math.cos(a) * r;
              const y = c.at.y + Math.sin(a) * r;
              if (y > area.bottom + 20) continue;
              drawGlitterLight(ctx, x, y, RING_DOT, c.seed + i, alpha, now);
            }
          }
          for (const at of cluster)
            drawDetonation(ctx, at, ms - meetsAt, CLUSTER_SIZE, now);
          drawDetonation(ctx, focus, ms - colossalAt, COLOSSAL, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
