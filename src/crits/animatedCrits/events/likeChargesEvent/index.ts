// the "Like Charges" event (lightning; crit tiers): it covers its crit,
// whose click freezes the screen while a knot of charged spark wisps bursts
// out of the clicked floor's button, every spark shoving every other away,
// so they fly apart and jostle across the screen, crackling arcs snapping
// between any two that come too close; once they've spread out each one
// discharges in turn, a bolt cracking down from it onto an income bar that
// jumps a crit tier with a jolt, quicker and quicker, the last in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createBolt,
  drawBolt,
  drawStrike,
  type Bolt,
} from "../../../../shared/lightning";
import { findRewardBars, type RewardBar } from "../../eventRewards";

const KEY = "likeCharges";
const MAX_BARS = 4;
const CHARGES = 8;
const STEP_MS = 8;
// how hard they shove apart, how fast it bleeds off, and the walls' push
const PUSH = 6e7;
const DRAG = 0.96;
const WALL = 60;
// px a second, so the first shove out of the knot can't fling them off
const TOP_SPEED = 2200;
const ARC = 190;
const DISCHARGE_MS = 140;
const STRIKE_MS = 160;
const SPARK = 0.35;
const BURST_SHAKE = 0.8;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Discharge {
  charge: number;
  bar: RewardBar | null;
  ms: number;
  bolt: Bolt;
}

export const forceLikeChargesEvent = registerWispEvent(
  KEY,
  "Like Charges",
  () => CONFIG.likeChargesEvent.chance,
  (floor, context, area) => {
    const { spreadMs, firesMs, holdMs, mergeMs } = CONFIG.likeChargesEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    // every step of the shoving worked out at arm
    const xs = Float64Array.from(
      { length: CHARGES },
      () => button.x + (Math.random() - 0.5) * 30,
    );
    const ys = Float64Array.from(
      { length: CHARGES },
      () => button.y + (Math.random() - 0.5) * 30,
    );
    const vx = new Float64Array(CHARGES);
    const vy = new Float64Array(CHARGES);
    const steps = Math.ceil(spreadMs / STEP_MS) + 1;
    const track = new Float32Array(steps * CHARGES * 2);
    const dt = STEP_MS / 1000;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < CHARGES; i++) {
        track[(s * CHARGES + i) * 2] = xs[i];
        track[(s * CHARGES + i) * 2 + 1] = ys[i];
      }
      for (let i = 0; i < CHARGES; i++) {
        let fx = 0;
        let fy = 0;
        for (let j = 0; j < CHARGES; j++) {
          if (j === i) continue;
          const dx = xs[i] - xs[j];
          const dy = ys[i] - ys[j];
          const d2 = Math.max(400, dx * dx + dy * dy);
          const f = PUSH / (d2 * Math.sqrt(d2));
          fx += dx * f;
          fy += dy * f;
        }
        // the screen's edges push back
        fx += (WALL * PUSH) / Math.max(400, (xs[i] - area.left) ** 2) / 100;
        fx -= (WALL * PUSH) / Math.max(400, (area.right - xs[i]) ** 2) / 100;
        fy += (WALL * PUSH) / Math.max(400, (ys[i] - area.top) ** 2) / 100;
        fy -= (WALL * PUSH) / Math.max(400, (area.bottom - ys[i]) ** 2) / 100;
        vx[i] = (vx[i] + fx * dt) * DRAG;
        vy[i] = (vy[i] + fy * dt) * DRAG;
        const speed = Math.hypot(vx[i], vy[i]);
        if (speed > TOP_SPEED) {
          vx[i] *= TOP_SPEED / speed;
          vy[i] *= TOP_SPEED / speed;
        }
      }
      for (let i = 0; i < CHARGES; i++) {
        xs[i] = Math.max(
          area.left + 20,
          Math.min(area.right - 20, xs[i] + vx[i] * dt),
        );
        ys[i] = Math.max(
          area.top + 20,
          Math.min(area.bottom - 20, ys[i] + vy[i] * dt),
        );
      }
    }
    const spots = Array.from({ length: CHARGES }, () => ({ x: 0, y: 0 }));
    const placeAt = (i: number, ms: number, into: Point): Point => {
      const s = Math.min(steps - 1, Math.max(0, Math.floor(ms / STEP_MS)));
      into.x = track[(s * CHARGES + i) * 2];
      into.y = track[(s * CHARGES + i) * 2 + 1];
      return into;
    };
    // nearest bar first for each discharge in turn; spare sparks hit the last bar
    let clock: number = spreadMs;
    const discharges: Discharge[] = Array.from({ length: CHARGES }, (_, i) => {
      const at = placeAt(i, spreadMs, { x: 0, y: 0 });
      const bar = i < bars.length ? bars[i] : null;
      const target = (bar ?? bars[bars.length - 1]).center;
      const ms = clock;
      clock += lerp(firesMs, i / (CHARGES - 1));
      return { charge: i, bar, ms, bolt: createBolt(at, target, 2) };
    });
    const hits = discharges.filter((d) => d.bar);
    const last = hits[hits.length - 1];
    const endAt = discharges[discharges.length - 1].ms + STRIKE_MS;
    const live = discharges.map(
      (d) => (ms: number) =>
        ms > d.ms ? null : placeAt(d.charge, ms, spots[d.charge]),
    );
    const now0: Point[] = Array.from({ length: CHARGES }, () => ({
      x: 0,
      y: 0,
    }));
    const arcs: Bolt[] = [];
    const pairs: [number, number][] = [];
    for (let i = 0; i < CHARGES; i++)
      for (let j = i + 1; j < CHARGES; j++) {
        pairs.push([i, j]);
        arcs.push(createBolt(now0[i], now0[j], 0));
      }

    const bursting = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(BURST_SHAKE);
      },
    );
    const firing = createBeats(
      discharges,
      (d) => d.ms,
      (d, k) => {
        if (!d.bar) {
          if (cover!.isLive()) shakeScreen(HIT_SHAKE[0]);
          return;
        }
        cover!.tierUp(d.bar, d.bar.center);
        if (d === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(d.bar.center);
          return;
        }
        cover!.burst(d.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: Math.max(endAt, last.ms) + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars,
        tick: (ms, now) => {
          bursting.tick(ms, now);
          firing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt + 200) return;
          for (let i = 0; i < CHARGES; i++) placeAt(i, ms, now0[i]);
          // arcs between any two still charged that crowd too close
          for (let p = 0; p < pairs.length; p++) {
            const [i, j] = pairs[p];
            if (ms > discharges[i].ms || ms > discharges[j].ms) continue;
            const d = Math.hypot(now0[i].x - now0[j].x, now0[i].y - now0[j].y);
            if (d < ARC) drawBolt(ctx, arcs[p], 1 - d / ARC, 0.35);
          }
          for (const d of discharges) {
            const t = (ms - d.ms) / DISCHARGE_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, d.bolt, 1 - t, 0.8);
            if (d.bar) drawStrike(ctx, d.bar.center, 1 - clamp01(t), 0.8, now);
          }
          for (let i = 0; i < CHARGES; i++)
            if (ms <= discharges[i].ms)
              drawWispHead(ctx, live[i], ms, now, WISP_SIZE * SPARK, 1);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
