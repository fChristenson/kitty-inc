// the "Arm Wrestling" event (experiment: an arm-wrestling match; worker
// perma tiers): it covers its crit, whose click freezes the screen while
// two wisps lock hands over a worker and strain against each other,
// heaving back and forth harder and harder as the screen rumbles, until
// one slams the other down: "WINNER!", a pop and a jolt as the worker
// climbs a perma tier; match after match down the line, ever quicker, the
// last slam landing in a huge blast and shake. Then the crit's tier pays
// out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../shared/critText";
import { findRewardWorkers } from "../eventRewards";
import { COLOR } from "../../palette";

const KEY = "armWrestling";
const MAX_WORKERS = 5;
const ABOVE = 70;
const GRIP = 20;
const STRAIN = 18;
const SLAM_MS = 90;
const MOVE_MS = 160;
const RUMBLE_MS = 90;
const CALL_MS = 340;
const STYLE = { fontSize: 42, strokeWidth: 8 };
const ARM = 0.4;
const SLAM_SHAKE: [number, number] = [0.6, 1.3];

export const forceArmWrestlingEvent = registerWispEvent(
  KEY,
  "Arm Wrestling",
  () => CONFIG.armWrestlingEvent.chance,
  (floor, context) => {
    const { strainMs, holdMs, mergeMs } = CONFIG.armWrestlingEvent;
    const workers = findRewardWorkers(floor, context)
      .slice(0, MAX_WORKERS)
      .sort((a, b) => a.at.x - b.at.x);
    if (workers.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const winner = createCritTextSprite("WINNER!", COLOR.heavenlyGold, STYLE);
    let clock = 0;
    let from: Point = button;
    const matches = workers.map((worker, k) => {
      const grip: Point = { x: worker.at.x, y: worker.at.y - ABOVE };
      const moves = clock;
      const strains = moves + MOVE_MS;
      const slams =
        strains + lerp(strainMs, k / Math.max(1, workers.length - 1));
      const wins = slams + SLAM_MS;
      clock = wins;
      const match = {
        worker,
        grip,
        from,
        moves,
        strains,
        slams,
        wins,
        dir: k % 2 === 0 ? 1 : -1,
      };
      from = grip;
      return match;
    });
    const last = matches[matches.length - 1];
    const endAt = last.wins;
    const matchAt = (ms: number) => {
      let m = matches[0];
      for (const match of matches) if (ms >= match.moves) m = match;
      return m;
    };
    const arms = [-1, 1].map((side) => {
      const at: Point = { x: 0, y: 0 };
      return (ms: number): Point => {
        const m = matchAt(ms);
        if (ms < m.strains) {
          const u = easeOut(clamp01((ms - m.moves) / MOVE_MS));
          at.x = lerp([m.from.x, m.grip.x + side * GRIP], u);
          at.y = lerp([m.from.y, m.grip.y], u);
          return at;
        }
        // straining: the locked pair rocks side to side, ever harder
        const t = clamp01((ms - m.strains) / (m.slams - m.strains));
        const rock = Math.sin(t * Math.PI * 6) * STRAIN * t;
        const slam =
          ms >= m.slams
            ? easeIn(clamp01((ms - m.slams) / SLAM_MS)) * 40 * m.dir
            : 0;
        at.x = m.grip.x + side * GRIP + rock + slam;
        at.y = m.grip.y + (side === m.dir ? 0 : Math.abs(slam) * 0.6);
        return at;
      };
    });
    let lastRumble = -Infinity;

    const slamming = createBeats(
      matches,
      (m) => m.wins,
      (m, k) => {
        cover!.promote(m.worker);
        if (m === last) {
          cover!.blast(m.worker.at);
          return;
        }
        cover!.burst(m.grip, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAM_SHAKE, k / Math.max(1, matches.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        workers,
        tick: (ms, now) => {
          slamming.tick(ms, now);
          const m = matchAt(ms);
          if (
            ms < m.strains ||
            ms >= m.slams ||
            now - lastRumble < RUMBLE_MS ||
            !cover?.isLive()
          )
            return;
          lastRumble = now;
          shakeScreen(0.2 + 0.5 * ((ms - m.strains) / (m.slams - m.strains)));
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const m of matches) {
            const c = (ms - m.wins) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              winner,
              m.grip.x,
              m.grip.y - 50,
              1 + 0.4 * (1 - clamp01(c * 3)),
            );
            ctx.globalAlpha = 1;
          }
          if (ms > endAt) return;
          for (const arm of arms)
            drawWispBetween(ctx, arm, ms, now, WISP_SIZE * ARM, 0.8, 0, endAt);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardWorkers(floor, context).length > 0,
);
