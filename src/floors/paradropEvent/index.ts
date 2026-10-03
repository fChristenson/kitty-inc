// the "Paradrop" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while lit bomb wisps drift down from the top of
// the screen under little canopies of glitter, swaying side to side, each
// aimed at an empty spot; they touch down in a quickening chain, each going
// off in a big blast that bursts into a cluster, a bang and a shake, and a
// new worker forms out of the smoke; the last lands in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { COLOR } from "../../palette";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../shared/explosion";
import { stampGlimmer } from "../../shared/twinkle";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "paradrop";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 22;
const START = 60;
const SWAY = 70;
const SWAYS = 1.5;
// the canopy: CANOPY sparkles in an arc RISE px over the bomb, ARC px round
const CANOPY = 9;
const ARC = 38;
const RISE = 26;
const CANOPY_SPARK = 11;
const CLUSTER = 4;
const CLUSTER_REACH = 55;
const BOMB = 0.38;
const FUSE = 14;
const BLAST = 200;
const CLUSTER_BLAST = 105;
const FINAL_BLAST = 360;
const LAND_SHAKE: [number, number] = [0.8, 1.3];
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceParadropEvent = registerWispEvent(
  KEY,
  "Paradrop",
  () => CONFIG.paradropEvent.chance,
  (floor, context, area) => {
    const { dropMs, gapsMs, holdMs, mergeMs } = CONFIG.paradropEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const n = hires.length;
    const blasts: Blast[] = [];
    let clock = 0;
    const drops = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const top: Point = { x: spot.x, y: area.top - START };
      const leaves = clock;
      const lands = leaves + dropMs;
      clock += lerp(gapsMs, k / Math.max(1, n - 1));
      const last = k === n - 1;
      blasts.push({
        at: spot,
        ms: lands,
        size: last ? FINAL_BLAST : BLAST,
        shake: last ? 1.8 : lerp(LAND_SHAKE, k / Math.max(1, n - 1)),
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: spot.x + Math.cos(a) * CLUSTER_REACH,
            y: spot.y + Math.sin(a) * CLUSTER_REACH * 0.6,
          },
          ms: lands + 45 + c * 25,
          size: CLUSTER_BLAST,
          shake: 0.6,
        });
      }
      const phase = k * 1.7;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        leaves,
        lands,
        last,
        phase,
        at: (ms: number): Point => {
          const u = clamp01((ms - leaves) / dropMs);
          // drifting, then dropping faster as it nears the ground
          const fall = 0.55 * u + 0.45 * u * u;
          const sway = Math.sin(u * Math.PI * 2 * SWAYS + phase) * SWAY;
          at.x = spot.x + sway * (1 - u);
          at.y = lerp([top.y, spot.y], fall);
          return at;
        },
      };
    });
    const endAt = drops[n - 1].lands;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const landing = createBeats(
      drops,
      (d) => d.lands,
      (d) => {
        giveHire(d.hire);
        if (d.last) cover!.blast(d.spot);
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
          booming.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const d of drops) {
            if (ms < d.leaves || ms >= d.lands) continue;
            const bomb = d.at(ms);
            const bx = bomb.x;
            const by = bomb.y;
            // the canopy tilts with the sway
            const tilt =
              Math.cos(
                ((ms - d.leaves) / dropMs) * Math.PI * 2 * SWAYS + d.phase,
              ) * 0.3;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let c = 0; c < CANOPY; c++) {
              const a = -Math.PI * (0.85 - 0.7 * (c / (CANOPY - 1))) + tilt;
              stampGlimmer(
                ctx,
                bx + Math.cos(a) * ARC,
                by - RISE + Math.sin(a) * ARC * 0.6,
                CANOPY_SPARK * (0.7 + 0.3 * Math.sin(now / 70 + c)),
                now / 250 + c,
                c % 2 === 0 ? COLOR.heavenlyGold : COLOR.white,
              );
            }
            ctx.restore();
            drawLitFuse(ctx, d.at(ms), (ms - d.leaves) / dropMs, FUSE, now);
            drawWispBetween(
              ctx,
              d.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              d.leaves,
              d.lands,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
