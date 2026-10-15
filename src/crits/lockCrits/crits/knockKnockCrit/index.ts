// Knock Knock, a lock crit: the number arcs out beside the dark locked floor
// and turns into a wisp that flies up to the lock and knocks, darting back and
// bumping it, rap-rap (a flash and a jolt each); more wisps fly in from all
// round the floor and join in, circling the lock and bumping it in turn,
// faster and faster, rap-rap-rap-rap, the lock glowing hotter with each; then
// they all draw back together, trembling, and crash into it at once, bursting
// the floor open, and pour out onto its button, settling round it: the opened
// floor's next payouts each also hire a worker on it
import meta from "./meta";
import { defineBarEffect } from "../../../rateCrits/rateBonus";
import type { Floor } from "../../../../gameState";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { playSwoosh } from "../../../../sound";
import { getLockCenter } from "../../../../floors/floorLock";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  celebrateWorkerBoost,
  findRecruitSpot,
  recruitWorker,
} from "../../../../floors/worker";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  glowStops,
  lerp,
} from "../../../floorCrits/critPlayer";

const N = 8;
// the number arcing out to LEAD_FROM (from the lock), the lead wisp flying
// in onto its orbit over LEAD_IN_MS and knocking rap-rap
const ARC_MS = 170;
const ARC_RISE = 120;
const LEAD_FROM: Point = { x: -520, y: -260 };
const LEAD_IN_MS = 90;
const LEAD_KNOCKS = [330, 430];
// the others flying in from round the floor's edge (SPAWN px out), one every
// JOIN_STEP_MS over JOIN_MS each, knocking from JOIN_READY_MS after arriving
const JOIN_FROM = 360;
const JOIN_STEP_MS = 30;
const JOIN_MS = 230;
const JOIN_READY_MS = 40;
const SPAWN: Point = { x: 560, y: 330 };
// the crowd knocking in turn, CROWD_GAP_MS apart and quickening, no wisp
// twice within SAME_GAP_MS
const CROWD_FROM = 560;
const CROWD_END = 1120;
const CROWD_GAP_MS = 110;
const CROWD_QUICKEN = 0.84;
const CROWD_MIN_GAP_MS = 34;
const SAME_GAP_MS = 120;
// circling ORBIT px out (squashed SQUASH tall), SPIN_TURNS round by the pull;
// a knock draws back WIND_BACK of the way out over WIND_MS, darts in to
// CONTACT px in IN_MS, and bounces back over OUT_MS
const ORBIT = 250;
const SQUASH = 0.5;
const CONTACT = 70;
const SPIN_TURNS = 2;
const WIND_MS = 60;
const WIND_BACK = 0.35;
const IN_MS = 55;
const OUT_MS = 110;
// all drawing back to PULL_R px, trembling, then crashing in at once
const PULL_FROM = 1230;
const PULL_MS = 130;
const PULL_R = 420;
const TREMBLE = 14;
const CRASH_FROM = PULL_FROM + PULL_MS;
const CRASH_MS = 70;
const OPEN_AT = CRASH_FROM + CRASH_MS;
// pouring out onto a RING px ring round the button, each POUR_STEP_MS behind
// the last, bowed BOW px, then circling it for SETTLE_MS
const POUR_MS = 150;
const POUR_STEP_MS = 20;
const BOW = 140;
const RING = 110;
const RING_SQUASH = 0.45;
const SETTLE_MS = 200;
const SETTLE_TURN_MS = 450;
const WISP = WISP_SIZE * 1.1;
// flashes: each knock, each wisp landing, the lock's glow as it heats
const KNOCK_FLASH_MS = 130;
const KNOCK_GLOW = 150;
const LAND_FLASH_MS = 140;
const LAND_GLOW = 90;
const LOCK_GLOW: [number, number] = [90, 300];
const OPEN_BLAST = 360;
const BUTTON_BLAST = 220;
// shakes by step: a knock, the lock bursting, onto the button; and the pull
const SHAKES = [0.7, 3, 1.4];
const PULL_SHAKE = 0.8;
const FIRST_LAND = OPEN_AT + POUR_MS;
const LAST_END = FIRST_LAND + (N - 1) * POUR_STEP_MS + SETTLE_MS;

interface State {
  runners: ((ms: number) => Point | null)[];
  starts: number[];
  ends: number[];
  lands: number[];
  // where each lands round the button, from the lock's middle
  spots: Point[];
  button: Point;
  // every knock, and where it hit the lock
  knockAt: number[];
  knockX: number[];
  knockY: number[];
}
const states = new WeakMap<Running, State>();
const LOCK: Point = { x: 0, y: 0 };
const GOLD = glowStops(COLOR.heavenlyGold);
const WHITE = glowStops(COLOR.white);

const baseAngle = (i: number) => Math.PI + (i / N) * Math.PI * 2;
// how far the crowd has turned round the lock by ms
function spin(ms: number): number {
  const p = clamp01((Math.min(ms, PULL_FROM) - ARC_MS) / (PULL_FROM - ARC_MS));
  return SPIN_TURNS * Math.PI * 2 * p * p;
}

// 1 on the lock, 0 on its orbit, below 0 drawn back for a knock
function knockDip(knocks: number[], ms: number): number {
  let dip = 0;
  for (let k = 0; k < knocks.length; k++) {
    const s = ms - knocks[k];
    let d = 0;
    if (s < -IN_MS - WIND_MS || s > OUT_MS) continue;
    if (s < -IN_MS)
      d = -WIND_BACK * Math.sin((Math.PI * (s + IN_MS + WIND_MS)) / WIND_MS);
    else if (s < 0) {
      const u = (s + IN_MS) / IN_MS;
      d = u * u;
    } else {
      const u = 1 - s / OUT_MS;
      d = u * u;
    }
    if (d > dip || (dip <= 0 && d < dip)) dip = d;
  }
  return dip;
}

function radiusAt(i: number, knocks: number[], ms: number): number {
  if (ms >= CRASH_FROM) {
    const u = clamp01((ms - CRASH_FROM) / CRASH_MS);
    return PULL_R * (1 - u * u);
  }
  if (ms >= PULL_FROM) {
    const u = (ms - PULL_FROM) / PULL_MS;
    return (
      lerp(ORBIT, PULL_R, 1 - (1 - u) ** 2) +
      Math.sin(ms * 0.11 + i * 1.7) * TREMBLE * u
    );
  }
  return lerp(ORBIT, CONTACT, knockDip(knocks, ms));
}

// the opened floor's next `left` payouts each also hiring a worker on it,
// till it's full
const knockHires = defineBarEffect<{ floor: Floor; left: number }>({
  onPayout: (v, now) => {
    const spot = findRecruitSpot(v.floor);
    if (!spot) return undefined;
    const worker = recruitWorker(v.floor, spot.x, now);
    if (worker === null) return undefined;
    celebrateWorkerBoost(v.floor, worker, now);
    v.left--;
    return v.left > 0 ? v : undefined;
  },
});

registerFloorCrit("knockKnockCrit", {
  reward(t) {
    const { payouts } = meta.values;
    const left = (knockHires.get(t.floor)?.left ?? 0) + payouts;
    knockHires.set(t.floor, { floor: t.floor, left });
    t.punch(`Hires x${payouts}`);
  },
  plan(r, _bars, hit) {
    const lock = getLockCenter();
    const btn = getButtonCenter(false);
    const button = { x: btn.x - lock.x, y: btn.y - lock.y };
    const starts: number[] = [];
    const arrives: number[] = [];
    const knocks: number[][] = [];
    const last: number[] = [];
    for (let i = 0; i < N; i++) {
      const start = i === 0 ? ARC_MS : JOIN_FROM + (i - 1) * JOIN_STEP_MS;
      starts.push(start);
      arrives.push(start + (i === 0 ? LEAD_IN_MS : JOIN_MS));
      knocks.push(i === 0 ? LEAD_KNOCKS.slice() : []);
      last.push(i === 0 ? LEAD_KNOCKS[LEAD_KNOCKS.length - 1] : -Infinity);
    }
    const knockAt: number[] = LEAD_KNOCKS.slice();
    const knockBy: number[] = LEAD_KNOCKS.map(() => 0);
    // the crowd's knocks, in turn round whoever's ready
    let cursor = 0;
    let gap = CROWD_GAP_MS;
    for (let t = CROWD_FROM; t < CROWD_END; ) {
      for (let tries = 0; tries < N; tries++) {
        const w = (cursor + tries) % N;
        if (t < arrives[w] + JOIN_READY_MS || t - last[w] < SAME_GAP_MS)
          continue;
        knocks[w].push(t);
        last[w] = t;
        knockAt.push(t);
        knockBy.push(w);
        cursor = w + 1;
        break;
      }
      t += gap;
      gap = Math.max(CROWD_MIN_GAP_MS, gap * CROWD_QUICKEN);
    }
    const knockX: number[] = [];
    const knockY: number[] = [];
    for (let k = 0; k < knockAt.length; k++) {
      const a = baseAngle(knockBy[k]) + spin(knockAt[k]);
      knockX.push(Math.cos(a) * CONTACT);
      knockY.push(Math.sin(a) * CONTACT * SQUASH);
      hit(0, knockAt[k], 0);
    }
    hit(0, OPEN_AT, 1);
    hit(0, FIRST_LAND, 2);
    const runners: ((ms: number) => Point | null)[] = [];
    const ends: number[] = [];
    const lands: number[] = [];
    const spots: Point[] = [];
    for (let i = 0; i < N; i++) {
      const base = baseAngle(i);
      const from =
        i === 0
          ? LEAD_FROM
          : { x: Math.cos(base) * SPAWN.x, y: Math.sin(base) * SPAWN.y };
      const ring = (i / N) * Math.PI * 2 - Math.PI / 2;
      const spot = {
        x: button.x + Math.cos(ring) * RING,
        y: button.y + Math.sin(ring) * RING * RING_SQUASH,
      };
      const pourMs = POUR_MS + i * POUR_STEP_MS;
      const land = OPEN_AT + pourMs;
      const end = land + SETTLE_MS;
      const len = Math.hypot(spot.x, spot.y) || 1;
      const side = (i % 2 ? 1 : -1) * BOW;
      const start = starts[i];
      const arrive = arrives[i];
      const own = knocks[i];
      const at: Point = { x: 0, y: 0 };
      runners.push((ms) => {
        if (ms < start || ms > end) return null;
        if (ms >= land) {
          const a = ring + ((ms - land) / SETTLE_TURN_MS) * Math.PI * 2;
          at.x = button.x + Math.cos(a) * RING;
          at.y = button.y + Math.sin(a) * RING * RING_SQUASH;
          return at;
        }
        if (ms >= OPEN_AT) {
          const u = (ms - OPEN_AT) / pourMs;
          const bow = side * Math.sin(Math.PI * u);
          at.x = spot.x * u - (spot.y / len) * bow;
          at.y = spot.y * u + (spot.x / len) * bow;
          return at;
        }
        const a = base + spin(ms);
        const rad = radiusAt(i, own, ms);
        const ox = Math.cos(a) * rad;
        const oy = Math.sin(a) * rad * SQUASH;
        if (ms < arrive) {
          const u = (ms - start) / (arrive - start);
          at.x = lerp(from.x, ox, u);
          at.y = lerp(from.y, oy, u);
        } else {
          at.x = ox;
          at.y = oy;
        }
        return at;
      });
      ends.push(end);
      lands.push(land);
      spots.push(spot);
    }
    states.set(r, {
      runners,
      starts,
      ends,
      lands,
      spots,
      button,
      knockAt,
      knockX,
      knockY,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const lock = bars[0];
    if (ms < ARC_MS) {
      const u = ms / ARC_MS;
      const p = u * u * (3 - 2 * u);
      drawText(
        ctx,
        r.glyphs,
        r.label,
        (lock.x + LEAD_FROM.x) * p,
        (lock.y + LEAD_FROM.y) * p - ARC_RISE * 4 * p * (1 - p),
        r.flashFont * (1 - 0.6 * p),
        { alpha: 1 - p * p },
      );
    }
    if (r.kicked === 0 && ms >= PULL_FROM) {
      r.kicked = 1;
      r.shake(PULL_SHAKE);
    }
    if (r.kicked === 1 && ms >= CRASH_FROM) {
      r.kicked = 2;
      playSwoosh();
    }
    const { knockAt, knockX, knockY } = state;
    let knocked = 0;
    while (knocked < knockAt.length && knockAt[knocked] <= ms) knocked++;
    const charge =
      ms < PULL_FROM
        ? (0.7 * knocked) / knockAt.length
        : 0.7 + 0.3 * clamp01((ms - PULL_FROM) / (OPEN_AT - PULL_FROM));
    ctx.save();
    ctx.translate(lock.x, lock.y);
    ctx.globalCompositeOperation = "lighter";
    if (ms >= ARC_MS && ms < OPEN_AT) {
      ctx.globalAlpha = 0.2 + 0.5 * charge;
      drawGlow(ctx, GOLD, 0, 0, lerp(LOCK_GLOW[0], LOCK_GLOW[1], charge));
    }
    for (let k = 0; k < knocked; k++) {
      const s = ms - knockAt[k];
      if (s >= KNOCK_FLASH_MS) continue;
      const f = 1 - s / KNOCK_FLASH_MS;
      ctx.globalAlpha = f;
      drawGlow(ctx, GOLD, knockX[k], knockY[k], KNOCK_GLOW * (0.5 + 0.5 * f));
      drawGlow(ctx, WHITE, knockX[k], knockY[k], KNOCK_GLOW * 0.4 * f);
    }
    for (let i = 0; i < state.lands.length; i++) {
      const s = ms - state.lands[i];
      if (s < 0 || s >= LAND_FLASH_MS) continue;
      const f = 1 - s / LAND_FLASH_MS;
      ctx.globalAlpha = f;
      const spot = state.spots[i];
      drawGlow(ctx, GOLD, spot.x, spot.y, LAND_GLOW * (0.6 + 0.4 * f));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    drawDetonation(ctx, LOCK, ms - OPEN_AT, OPEN_BLAST, now);
    const heat = ms < OPEN_AT ? charge : 0.5;
    for (let i = 0; i < state.runners.length; i++)
      drawWispBetween(
        ctx,
        state.runners[i],
        ms,
        now,
        WISP,
        heat,
        state.starts[i],
        state.ends[i],
      );
    drawDetonation(ctx, state.button, ms - FIRST_LAND, BUTTON_BLAST, now);
    ctx.restore();
  },
  tailMs: Math.max(DETONATION_MS, LAST_END - FIRST_LAND),
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
