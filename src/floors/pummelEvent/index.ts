// the "Pummel" event: it covers its crit, whose click freezes the screen while
// a swarm of wisps pops up far round the clicked floor's income bar and
// wheels about it like a flock of birds, each diving in on its own random
// rhythm two or three times, slamming into the bar and bouncing back off it
// to a new spot, each hit a burst, a bang and the bar knocked the other way;
// then the whole swarm dives in at once as the bar slams in a huge explosion
// and jumps one crit tier. Then the screen unfreezes and the crit's tier
// pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playExplosion, startBoostEventStreamLoop } from "../../sound";
import { shakeScreen } from "../../screenShake";
import {
  CRIT_TIER_ORDER,
  nextCritTier,
  pickCritTierByOdds,
} from "../../shared/critTypes";
import { SLAM_LAND_MS, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../incomePanel";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import { lerp, clamp01 } from "../../shared/easing";

const KEY = "pummel";
const WISPS = 10;
// each slams in this many times before the finale
const HITS: [number, number] = [2, 3];
// they wait this far clear of the bar, popping up staggered by
// POP_STAGGER_MS and growing in over POP_MS
const RING: [number, number] = [220, 420];
const POP_STAGGER_MS = 18;
const POP_MS = 160;
// while waiting they wheel about WANDER px, buzzing BUZZ px
const WANDER = 18;
const BUZZ = 4;
// each bounces off to a new spot this far round from its last (radians)
const VEER: [number, number] = [0.4, 1.4];
// it opens with one wisp diving in alone, then OPENER_GAP_MS later two more
// (PAIR_GAP_MS apart), then OPENER_GAP_MS after that the rest join in, each
// on its own rhythm: its first dive up to FIRST_DELAY_MS late, then this long
// between bouncing back and setting off again
const OPENER_GAP_MS = 220;
const PAIR_GAP_MS = 60;
const FIRST_DELAY_MS: [number, number] = [0, 200];
const REST_MS: [number, number] = [30, 160];
// each dive backs off BACK_OFF px over its first WIND_UP, then dives in
const WIND_UP = 0.3;
const BACK_OFF = 28;
// each hit: a burst on the bar, a bang (no closer than BANG_GAP_MS), a shake,
// and the bar knocked JOLT px the other way, springing back
const HIT_BURST = 0.22;
const HIT_BURST_MS = 260;
const BANG_GAP_MS = 60;
const HIT_SHAKE = 0.35;
const JOLT = 10;
const JOLT_DECAY_MS = 90;
const JOLT_WOBBLE_MS = 110;
// the finale: the bar's slam starts this long after the last hit, and the
// whole swarm dives in to land with it
const FINALE_DELAY_MS = 120;
const FLASH_MS = 450;
const BLAST_SCALE = 1.6;
const SPARK_REACH = 320;
const SPARK_SIZE = 20;

// one dive: from where it waits, into where it hits the bar, landing at `at`
interface Dive {
  spot: Point;
  hit: Point;
  // the way it's travelling as it hits
  dir: Point;
  at: number;
}

interface Striker {
  // its hits, then the finale's dive
  dives: Dive[];
  appearAt: number;
  phase: number;
}

interface Hit {
  dive: Dive;
  landedAt: number | null;
}

interface RunningPummel {
  floor: Floor;
  isGroundFloor: boolean;
  center: Point;
  strikers: Striker[];
  hits: Hit[];
  startedAt: number;
  // the bar's slam starts, then lands with the swarm, ms in
  finaleAt: number;
  landAt: number;
  slammedAt: number | null;
  blastAt: number | null;
  lastBang: number;
}

let running: RunningPummel | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.pummelEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      floor.critMultiplierTier !== CRIT_TIER_ORDER[0] &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startPummel,
  },
  { label: "Pummel", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Pummel
export function forcePummelEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}


// a dive at `angle` round the bar (with its center and half size), waiting
// somewhere in RING clear of it
function diveAt(
  center: Point,
  halfW: number,
  halfH: number,
  angle: number,
  at: number,
): Dive {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // where the line out of the bar's middle at this angle leaves its edge
  const edge = Math.min(
    halfW / Math.max(1e-6, Math.abs(dx)),
    halfH / Math.max(1e-6, Math.abs(dy)),
  );
  const out = edge + lerp(RING, Math.random());
  return {
    spot: { x: center.x + dx * out, y: center.y + dy * out },
    hit: { x: center.x + dx * edge, y: center.y + dy * edge },
    dir: { x: -dx, y: -dy },
    at,
  };
}

// the swarm: one wisp, then two, then all of them diving, each on its own
// random rhythm, then all of them at the finale's landing
function planPummel(box: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { strikers: Striker[]; hits: Hit[]; finaleAt: number; landAt: number } {
  const { strikeMs, bounceMs } = CONFIG.pummelEvent;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  const allPopped = (WISPS - 1) * POP_STAGGER_MS + POP_MS + strikeMs;
  const firstDiveAt = (i: number) =>
    i === 0
      ? allPopped
      : i < 3
        ? allPopped + OPENER_GAP_MS + (i - 1) * PAIR_GAP_MS
        : allPopped + OPENER_GAP_MS * 2 + lerp(FIRST_DELAY_MS, Math.random());
  const strikers: Striker[] = Array.from({ length: WISPS }, (_, i) => {
    const appearAt = i * POP_STAGGER_MS;
    let angle = ((i + Math.random() * 0.6) / WISPS) * Math.PI * 2;
    let at = firstDiveAt(i);
    const dives: Dive[] = [];
    const count = Math.round(lerp(HITS, Math.random()));
    for (let k = 0; k < count; k++) {
      dives.push(diveAt(center, halfW, halfH, angle, at));
      angle += (Math.random() < 0.5 ? -1 : 1) * lerp(VEER, Math.random());
      at += bounceMs + lerp(REST_MS, Math.random()) + strikeMs;
    }
    // where it waits for the finale, its landing set below
    dives.push(diveAt(center, halfW, halfH, angle, 0));
    return { dives, appearAt, phase: Math.random() * Math.PI * 2 };
  });
  const hits: Hit[] = strikers
    .flatMap((s) => s.dives.slice(0, -1))
    .sort((a, b) => a.at - b.at)
    .map((dive) => ({ dive, landedAt: null }));
  const finaleAt = hits[hits.length - 1].dive.at + FINALE_DELAY_MS;
  const landAt = finaleAt + SLAM_LAND_MS;
  for (const s of strikers) s.dives[s.dives.length - 1].at = landAt;
  return { strikers, hits, finaleAt, landAt };
}

// wheeling and buzzing about where it waits
function wander(striker: Striker, ms: number): Point {
  const { phase } = striker;
  return {
    x: Math.sin(ms / 170 + phase) * WANDER + Math.sin(ms / 37 + phase) * BUZZ,
    y:
      Math.cos(ms / 130 + phase * 1.7) * WANDER +
      Math.cos(ms / 29 + phase * 2) * BUZZ,
  };
}

// a striker ms in: popping up and wheeling about, backing off and diving
// into the bar, bouncing back off it to its next spot, until it dives in for
// good with the finale
function strikerAt(striker: Striker, ms: number): Point | null {
  const { strikeMs, bounceMs } = CONFIG.pummelEvent;
  const { dives } = striker;
  if (ms < striker.appearAt || ms >= dives[dives.length - 1].at) return null;
  for (let k = 0; k < dives.length; k++) {
    const { spot, hit, dir, at } = dives[k];
    const setOff = at - strikeMs;
    // diving in from wherever it had wheeled to as it set off
    if (ms >= setOff && ms < at) {
      const drift = wander(striker, setOff);
      const u = (ms - setOff) / strikeMs;
      const fromX = spot.x + drift.x - dir.x * BACK_OFF;
      const fromY = spot.y + drift.y - dir.y * BACK_OFF;
      if (u < WIND_UP) {
        const back = Math.sin((Math.PI / 2) * (u / WIND_UP)) * BACK_OFF;
        return {
          x: spot.x + drift.x - dir.x * back,
          y: spot.y + drift.y - dir.y * back,
        };
      }
      const dash = ((u - WIND_UP) / (1 - WIND_UP)) ** 2;
      return {
        x: fromX + (hit.x - fromX) * dash,
        y: fromY + (hit.y - fromY) * dash,
      };
    }
    // bouncing back off the bar to the next spot
    const next = dives[k + 1];
    if (next && ms >= at && ms < at + bounceMs) {
      const drift = wander(striker, ms);
      const back = 1 - (1 - (ms - at) / bounceMs) ** 3;
      return {
        x: hit.x + (next.spot.x + drift.x - hit.x) * back,
        y: hit.y + (next.spot.y + drift.y - hit.y) * back,
      };
    }
  }
  // waiting at the spot it's next diving from
  const waiting = dives.find((dive) => ms < dive.at) ?? dives[0];
  const drift = wander(striker, ms);
  return { x: waiting.spot.x + drift.x, y: waiting.spot.y + drift.y };
}

// every hit due by ms, then the finale's slam and its landing, each on the
// frame it's drawn
function landBeats(pummel: RunningPummel, ms: number, now: number): void {
  for (const hit of pummel.hits) {
    if (hit.landedAt !== null || ms < hit.dive.at) continue;
    hit.landedAt = now;
    shakeScreen(HIT_SHAKE);
    if (now - pummel.lastBang >= BANG_GAP_MS) {
      pummel.lastBang = now;
      playExplosion();
    }
  }
  if (pummel.slammedAt === null && ms >= pummel.finaleAt) {
    pummel.slammedAt = now;
    // the bar hops and slams down with its own bang and shake
    triggerEventEndSlam(pummel.floor, "bar");
  }
  if (pummel.blastAt === null && ms >= pummel.landAt) {
    pummel.blastAt = now;
    pummel.floor.critMultiplierTier = nextCritTier(
      pummel.floor.critMultiplierTier,
    );
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const pummel = running;
  if (!pummel) return;
  const rect = getFloorRect(pummel.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - pummel.startedAt;
  landBeats(pummel, ms, now);
  ctx.save();
  ctx.translate(rect.left, rect.top);

  // knocked away from every hit, springing back
  const jolt = { x: 0, y: 0 };
  for (const hit of pummel.hits) {
    if (hit.landedAt === null) continue;
    const t = now - hit.landedAt;
    const k =
      JOLT *
      Math.exp(-t / JOLT_DECAY_MS) *
      Math.cos((2 * Math.PI * t) / JOLT_WOBBLE_MS);
    jolt.x += hit.dive.dir.x * k;
    jolt.y += hit.dive.dir.y * k;
  }
  ctx.save();
  ctx.translate(jolt.x, jolt.y);
  drawIncomePanel(ctx, pummel.floor, pummel.isGroundFloor, {
    whiteAlpha:
      pummel.blastAt === null
        ? 0
        : Math.max(0, 1 - (now - pummel.blastAt) / FLASH_MS),
    rotation: 0,
  });
  ctx.restore();

  for (const hit of pummel.hits)
    if (hit.landedAt !== null)
      drawWhiteBurst(
        ctx,
        hit.dive.hit.x,
        hit.dive.hit.y,
        (now - hit.landedAt) / HIT_BURST_MS,
        HIT_BURST,
      );
  for (const striker of pummel.strikers) {
    const pop = clamp01((ms - striker.appearAt) / POP_MS);
    drawWisp(
      ctx,
      (t) => strikerAt(striker, t),
      ms,
      now,
      WISP_SIZE * pop,
      ms >= striker.dives[0].at - CONFIG.pummelEvent.strikeMs ? 1 : 0.3,
    );
  }
  if (pummel.blastAt !== null)
    drawExplosion(
      ctx,
      pummel.center.x,
      pummel.center.y,
      now - pummel.blastAt,
      now,
      BLAST_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
  ctx.restore();
}

function startPummel(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const { holdMs } = CONFIG.pummelEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const box = getIncomeBarBox(context.isGroundFloor);
  const { strikers, hits, finaleAt, landAt } = planPummel(box);
  const pummel: RunningPummel = {
    floor,
    isGroundFloor: context.isGroundFloor,
    center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    strikers,
    hits,
    startedAt: performance.now(),
    finaleAt,
    landAt,
    slammedAt: null,
    blastAt: null,
    lastBang: -Infinity,
  };
  running = pummel;
  const isLive = () => running === pummel;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    if (pummel.blastAt === null)
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    running = null;
    stopSound();
    setIncomePanelsHidden([]);
    unfreezeScreen();
    // the covered crit's own tier, which also saves the floor's new tier
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, landAt + holdMs);
}
