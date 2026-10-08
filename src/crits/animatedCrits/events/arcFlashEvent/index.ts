// the "Arc Flash" event (lightning; cash): it covers its crit, whose click
// freezes the screen while wisps pop out of the clicked floor's button and
// scatter all over the screen, buzzing in place; bolts start arcing
// between them, pair after pair, criss-crossing the screen ever faster,
// every arc a crack, a flash and coins popping out of its middle; then
// every wisp arcs into the middle of the screen at once in a huge blast
// and shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "arcFlash";
const REWARD = 4;
const NODES = 8;
const ARCS = 22;
// arcs crowd together with PACE (under 1 crowds them toward the end)
const PACE = 0.65;
const ARC_MS = 170;
const FINAL_MS = 380;
const POP = 4;
const POP_REACH: [number, number] = [20, 90];
const NODE = 0.4;
const EDGE = 0.1;

export const forceArcFlashEvent = registerWispEvent(
  KEY,
  "Arc Flash",
  () => CONFIG.arcFlashEvent.chance,
  (floor, context, area) => {
    const { scatterMs, arcsMs, finalGapMs, holdMs, mergeMs } =
      CONFIG.arcFlashEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const nodes: Point[] = Array.from({ length: NODES }, (_, i) => ({
      x: area.left + width * lerp([EDGE, 1 - EDGE], (i * 0.618) % 1),
      y: area.top + height * lerp([EDGE, 1 - EDGE], (i + 0.5) / NODES),
    }));
    const arcs = Array.from({ length: ARCS }, (_, i) => {
      const a = Math.floor(Math.random() * NODES);
      const b = (a + 1 + Math.floor(Math.random() * (NODES - 1))) % NODES;
      const mid: Point = {
        x: (nodes[a].x + nodes[b].x) / 2,
        y: (nodes[a].y + nodes[b].y) / 2,
      };
      return {
        at: scatterMs + arcsMs * (i / (ARCS - 1)) ** PACE,
        mid,
        bolt: createBolt(nodes[a], nodes[b], 1),
      };
    });
    const center: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const finalAt = scatterMs + arcsMs + finalGapMs;
    const finals = nodes.map((n) => createBolt(n, center, 1));
    const endAt = finalAt;
    const wisps = nodes.map((spot, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms > endAt) return null;
        const u = easeOut(Math.min(1, ms / scatterMs));
        at.x = lerp([button.x, spot.x], u) + Math.sin(ms / 40 + i) * 2;
        at.y = lerp([button.y, spot.y], u) + Math.cos(ms / 47 + i) * 2;
        return at;
      };
    });

    const arcing = createBeats(
      arcs,
      (a) => a.at,
      (a, k) => {
        cover!.launchFrom(a.mid, ringTargets(a.mid, POP, POP_REACH));
        if (!cover!.isLive()) return;
        if (k % 2 === 0) playExplosion();
        shakeScreen(0.3 + 0.8 * (k / ARCS));
      },
    );
    const finale = createBeats(
      [finalAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          arcing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > finalAt + FINAL_MS) return;
          for (const a of arcs) {
            const t = (ms - a.at) / ARC_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, a.bolt, 1 - t, 0.5);
            drawStrike(ctx, a.mid, (1 - t) * 0.6, 0.5, now);
          }
          const t = (ms - finalAt) / FINAL_MS;
          if (t >= 0 && t < 1) {
            for (const bolt of finals) drawBolt(ctx, bolt, 1 - t, 0.9);
            drawStrike(ctx, center, 1 - t, 2.2, now);
          }
          for (const w of wisps)
            drawWispBetween(ctx, w, ms, now, WISP_SIZE * NODE, 0.7, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
