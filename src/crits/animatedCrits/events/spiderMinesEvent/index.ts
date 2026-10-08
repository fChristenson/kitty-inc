// the "Spider Mines" event (explosion; free hires): it covers its crit,
// whose click freezes the screen while lit mine wisps scuttle out of the
// clicked floor's button and skitter in jittery zigzags to every empty
// spot, fuses fizzing; then they go off one after another in a chain of
// big blasts, each bursting into a cluster of little blasts as a new
// worker forms in the smoke, every blast its own bang and shake, the last
// mine going up in a huge blast and shake. Then the crit's tier pays out
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
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../../eventRewards";

const KEY = "spiderMines";
const MAX_HIRES = 6;
const FORM_MS = 300;
const LIFT = 20;
const SKITTER = 26;
const ZIGS = 7;
const CLUSTER = 4;
const CLUSTER_REACH = 50;
const MINE = 0.34;
const FUSE = 13;
const MINE_BLAST = 190;
const CLUSTER_BLAST = 100;
const FINAL_BLAST = 330;
const BANG_GAP_MS = 60;

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceSpiderMinesEvent = registerWispEvent(
  KEY,
  "Spider Mines",
  () => CONFIG.spiderMinesEvent.chance,
  (floor, context) => {
    const { scuttleMs, chainMs, holdMs, mergeMs } = CONFIG.spiderMinesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const blasts: Blast[] = [];
    const armed = scuttleMs + 80 * hires.length;
    const mines = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const leaves = k * 80;
      const arrives = leaves + scuttleMs;
      const blows = armed + k * chainMs;
      const last = k === hires.length - 1;
      blasts.push({
        at: spot,
        ms: blows,
        size: last ? FINAL_BLAST : MINE_BLAST,
        shake: last ? 1.6 : 0.8 + 0.1 * k,
      });
      for (let c = 0; c < CLUSTER; c++) {
        const a = (c / CLUSTER) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: spot.x + Math.cos(a) * CLUSTER_REACH,
            y: spot.y + Math.sin(a) * CLUSTER_REACH * 0.7,
          },
          ms: blows + 50 + c * 25,
          size: CLUSTER_BLAST,
          shake: 0.6,
        });
      }
      const dx = spot.x - button.x;
      const dy = spot.y - button.y;
      const d = Math.hypot(dx, dy) || 1;
      const at: Point = { x: 0, y: 0 };
      return {
        hire,
        spot,
        leaves,
        blows,
        last,
        at: (ms: number): Point => {
          const u = clamp01((ms - leaves) / (arrives - leaves));
          // a scuttling zigzag across the straight line, settling as it arrives
          const zig = Math.sin(u * Math.PI * ZIGS) * SKITTER * (1 - u);
          at.x = lerp([button.x, spot.x], u) - (dy / d) * zig;
          at.y = lerp([button.y, spot.y], u) + (dx / d) * zig;
          return at;
        },
      };
    });
    const endAt = mines[mines.length - 1].blows;
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
    const hiring = createBeats(
      mines,
      (m) => m.blows,
      (m) => {
        giveHire(m.hire);
        if (m.last) cover!.blast(m.spot);
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
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_000) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          for (const m of mines) {
            if (ms < m.leaves || ms >= m.blows) continue;
            drawLitFuse(
              ctx,
              m.at(ms),
              (ms - m.leaves) / (m.blows - m.leaves),
              FUSE,
              now,
            );
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MINE,
              0.5,
              m.leaves,
              m.blows,
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
