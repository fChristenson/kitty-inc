// the "Sculptor" event (lightning; free hires): it covers its crit, whose
// click freezes the screen while five node wisps fly out of the clicked
// floor's button and ring an empty spot; they crackle and charge, then all
// fire at once, bolts converging on the spot from every side in a blinding
// flash, a bang and a jolt, and a new worker is struck into being there;
// the ring flies on to the next spot and the next, ever quicker, the last
// worker sculpted in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../shared/lightning";
import { createBeats } from "../../shared/eventBeats";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "sculptor";
const MAX_HIRES = 5;
const FORM_MS = 300;
const LIFT = 30;
const NODES = 5;
const RING = 120;
const MOVE_MS = 200;
const BOLT_MS = 170;
const NODE = 0.35;
const HIT_SHAKE: [number, number] = [0.7, 1.3];

export const forceSculptorEvent = registerWispEvent(
  KEY,
  "Sculptor",
  () => CONFIG.sculptorEvent.chance,
  (floor, context) => {
    const { chargesMs, holdMs, mergeMs } = CONFIG.sculptorEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    let clock = 0;
    const jobs = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - LIFT };
      const turn = k * 0.6;
      const nodes = Array.from({ length: NODES }, (_, i): Point => {
        const a = turn + (i / NODES) * Math.PI * 2;
        return {
          x: spot.x + Math.cos(a) * RING,
          y: spot.y + Math.sin(a) * RING * 0.8,
        };
      });
      const moves = clock;
      const fires =
        moves + MOVE_MS + lerp(chargesMs, k / Math.max(1, hires.length - 1));
      clock = fires;
      return {
        hire,
        spot,
        nodes,
        moves,
        fires,
        bolts: nodes.map((n): Bolt => createBolt(n, spot, 1)),
      };
    });
    const last = jobs[jobs.length - 1];
    const endAt = last.fires + BOLT_MS;
    const nodeWisps = Array.from({ length: NODES }, (_, i) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        let j = 0;
        while (j + 1 < jobs.length && ms >= jobs[j + 1].moves) j++;
        const job = jobs[j];
        const from = j === 0 ? button : jobs[j - 1].nodes[i];
        const u = easeOut(clamp01((ms - job.moves) / MOVE_MS));
        const to = job.nodes[i];
        at.x = lerp([from.x, to.x], u) + Math.sin(ms / 25 + i) * 2;
        at.y = lerp([from.y, to.y], u) + Math.cos(ms / 31 + i) * 2;
        return at;
      };
    });

    const firing = createBeats(
      jobs,
      (j) => j.fires,
      (j, k) => {
        giveHire(j.hire);
        if (j === last) {
          cover!.blast(j.spot);
          return;
        }
        cover!.burst(j.spot, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, jobs.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => firing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const j of jobs) {
            const t = (ms - j.fires) / BOLT_MS;
            if (t < 0 || t >= 1) continue;
            for (const bolt of j.bolts) drawBolt(ctx, bolt, 1 - t, 0.8);
            drawStrike(ctx, j.spot, 1 - t, 1.4, now);
          }
          for (const node of nodeWisps)
            drawWispBetween(
              ctx,
              node,
              ms,
              now,
              WISP_SIZE * NODE,
              0.9,
              0,
              last.fires,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
