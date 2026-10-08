// the "Polish" event: it covers its crit, whose click freezes the screen while
// lights (the wisp, shared/wisp) pop up around the clicked floor's income bar
// and swirl in
// onto it, buffing it in little circles while shine bands sweep across and it
// glows ever brighter, then they sink into it and it slams, shining: the floor
// gets free upgrade levels. Then the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { playSwoosh, startBoostEventStreamLoop } from "../../../../sound";
import { pickCritTierByOdds } from "../../../critTypes";
import { drawPoppingCritText } from "../../../critFlash/critText";
import {
  drawShineSweep,
  SLAM_LAND_MS,
  triggerEventEndSlam,
} from "../../../../shared/eventEndSlam";
import { drawGoldShimmer } from "../../../../shared/goldShimmer";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../../../shared/screenFreeze";
import {
  BAR_W,
  drawIncomePanel,
  getIncomeBarBox,
  setIncomePanelsHidden,
} from "../../../../floors/incomePanel";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { clamp01, smoothstep as ease } from "../../../../shared/easing";

const KEY = "polish";
const LIGHTS = 6;
const BAR_H = getIncomeBarBox(false).height;
// the lights start on a ring around the bar and swirl in onto its face
const RING_RX = BAR_W * 0.62;
const RING_RY = BAR_H * 1.2;
const FACE_RX = BAR_W * 0.34;
const FACE_RY = BAR_H * 0.24;
// each buffs in little circles BUFF_R wide, BUFF_TURNS a second, once on the face
const BUFF_R = 16;
const BUFF_TURNS = 3;
// turns a second round the bar, speeding up by SPIN_ACCEL a second
const SPIN = 0.5;
const SPIN_ACCEL = 1.4;
// the lights pop up one after another, each growing in over APPEAR_MS
const STAGGER_MS = 70;
const APPEAR_MS = 250;
// at the end they sink into the bar's middle over this long
const CONVERGE_MS = 250;
// shine bands sweeping the bar as it's buffed, ever closer together, faster
// and brighter: sweep k starts at 1 - (1 - FIRST) * GAP^k of swirlMs
const SWEEP_COUNT = 11;
const FIRST_SWEEP = 0.12;
const SWEEP_GAP = 0.74;
const SWEEP_MS: [number, number] = [450, 160];
const SWEEP_ALPHA: [number, number] = [0.3, 1];
// a swoosh only for sweeps at least this far apart, so the rush doesn't drone
const SWOOSH_GAP_MS = 140;
const SWEEPS = Array.from({ length: SWEEP_COUNT }, (_, k) => {
  const build = k / (SWEEP_COUNT - 1);
  const lerp = ([from, to]: [number, number]) => from + (to - from) * build;
  return {
    at: 1 - (1 - FIRST_SWEEP) * SWEEP_GAP ** k,
    ms: lerp(SWEEP_MS),
    alpha: lerp(SWEEP_ALPHA),
  };
});
// the bar's white wash and the gold glow behind it, once fully buffed
const WHITE_MAX = 0.35;
const GLOW = BAR_H * 2.2;
const LABEL_FONT = 56;

interface RunningPolish {
  floor: Floor;
  isGroundFloor: boolean;
  levels: number;
  startedAt: number;
  shinedAt: number | null;
}

let running: RunningPolish | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.polishEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.upgradeFloorFree !== undefined &&
      context.getOnScreenFloors?.().some((entry) => entry.floor === floor) ===
        true,
    arm: startPolish,
  },
  { label: "Polish", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Polish
export function forcePolishEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}


// light i `ms` in around the bar's middle (cx, cy), or null before it pops up
function lightAt(i: number, ms: number, cx: number, cy: number) {
  const appear = clamp01((ms - i * STAGGER_MS) / APPEAR_MS);
  if (appear <= 0) return null;
  const { swirlMs } = CONFIG.polishEvent;
  const tighten = ease(clamp01(ms / swirlMs));
  const converge = ease(clamp01((ms - swirlMs) / CONVERGE_MS));
  const sec = ms / 1000;
  const angle =
    (i / LIGHTS + SPIN * sec + (SPIN_ACCEL * sec * sec) / 2) * Math.PI * 2;
  const buffAngle = (i / LIGHTS + BUFF_TURNS * sec) * Math.PI * 2;
  const rx = (RING_RX + (FACE_RX - RING_RX) * tighten) * (1 - converge);
  const ry = (RING_RY + (FACE_RY - RING_RY) * tighten) * (1 - converge);
  const buff = BUFF_R * tighten * (1 - converge);
  return {
    x: cx + Math.cos(angle) * rx + Math.cos(buffAngle) * buff,
    y: cy + Math.sin(angle) * ry + Math.sin(buffAngle) * buff,
    scale: ease(appear) * (1 - converge),
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const event = running;
  if (!event) return;
  const rect = getFloorRect(event.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - event.startedAt;
  const { swirlMs } = CONFIG.polishEvent;
  const buffed = ease(clamp01(ms / swirlMs));
  const box = getIncomeBarBox(event.isGroundFloor);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  ctx.save();
  ctx.translate(rect.left, rect.top);

  drawGoldShimmer(
    ctx,
    cx,
    cy,
    GLOW * buffed,
    buffed,
    1,
    now,
    COLOR.heavenlyGold,
  );
  drawIncomePanel(ctx, event.floor, event.isGroundFloor, {
    whiteAlpha: event.shinedAt === null ? WHITE_MAX * buffed : 0,
    rotation: 0,
  });
  for (const sweep of SWEEPS) {
    const t = (ms - sweep.at * swirlMs) / sweep.ms;
    if (t > 0 && t < 1) drawShineSweep(ctx, box, box.radius, t, sweep.alpha);
  }

  for (let i = 0; i < LIGHTS; i++)
    drawWisp(
      ctx,
      (t) => lightAt(i, t, cx, cy),
      ms,
      now,
      WISP_SIZE * (lightAt(i, ms, cx, cy)?.scale ?? 0),
    );

  if (event.shinedAt !== null)
    drawPoppingCritText(
      ctx,
      `+${event.levels} Lvl`,
      cx,
      box.y - LABEL_FONT * 0.6,
      COLOR.heavenlyGold,
      event.shinedAt,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 8 },
    );
  ctx.restore();
}

function startPolish(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen() || !context.upgradeFloorFree) return;
  const upgradeFloorFree = context.upgradeFloorFree;
  const { swirlMs, holdMs, levelShare, minLevels } = CONFIG.polishEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const event: RunningPolish = {
    floor,
    isGroundFloor: context.isGroundFloor,
    levels: Math.max(minLevels, Math.round(floor.upgradeCount * levelShare)),
    startedAt: performance.now(),
    shinedAt: null,
  };
  running = event;
  const isLive = () => running === event;
  setIncomePanelsHidden([floor]);
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  let lastSwoosh = -Infinity;
  for (const { at } of SWEEPS) {
    if (at * swirlMs - lastSwoosh < SWOOSH_GAP_MS) continue;
    lastSwoosh = at * swirlMs;
    setTimeout(() => {
      if (isLive()) playSwoosh();
    }, at * swirlMs);
  }

  // the lights sink in and the bar slams; the levels land with the impact
  const slamAt = swirlMs + CONVERGE_MS;
  setTimeout(() => {
    if (isLive()) triggerEventEndSlam(floor, "bar");
  }, slamAt);
  setTimeout(() => {
    if (!isLive()) return;
    event.shinedAt = performance.now();
    upgradeFloorFree(floor, event.levels);
  }, slamAt + SLAM_LAND_MS);

  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      stopSound();
      setIncomePanelsHidden([]);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the levels
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    slamAt + SLAM_LAND_MS + holdMs,
  );
}
