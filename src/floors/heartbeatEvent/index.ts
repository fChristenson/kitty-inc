// the "Heartbeat" event: it covers its crit, whose click freezes the screen
// while the wisp runs a heartbeat trace across it toward the clicked floor's
// upgrade button: every beat it spikes up and down like a heart monitor and
// the button throbs with a flash, a thump and a jolt, landing free upgrade
// levels. The beats come ever faster and taller; the last spikes to the top
// of the screen and slams down into the button in a huge blast and shake.
// Then the screen unfreezes and the crit's tier pays
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import {
  playExplosion,
  playSlamExplosion,
  startBoostEventStreamLoop,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { drawExplosion, drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, WISP_SIZE, type Point } from "../../shared/wisp";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  forceTestCrit,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";

const KEY = "heartbeat";
const BEATS = 7;
// the trace starts EDGE_MARGIN in from the screen's far side and runs level
// with the button; each spike is a heart monitor's: a dip, a tall peak, a
// deep trough, back to level (as shares of the spike's time and height)
const EDGE_MARGIN = 70;
const SPIKE: [number, number][] = [
  [0, 0],
  [0.12, -0.12],
  [0.38, 1],
  [0.62, -0.38],
  [0.82, 0.06],
  [1, 0],
];
const PEAK = 0.38;
// each beat's spike reaches HEIGHT of the way to the screen's top, growing
const HEIGHT: [number, number] = [0.25, 0.6];
const TOP_MARGIN = 60;
const WISP_GROW = 1.3;
// each beat: the button throbs up to THROB, washed white, a burst, a jolt
const THROB = 0.35;
const THROB_MS = 150;
const WHITE_MS = 220;
const BEAT_BURST: [number, number] = [0.25, 0.45];
const BEAT_BURST_MS = 260;
const BEAT_SHAKE: [number, number] = [0.6, 1.5];
const LABEL_FONT = 56;
// the last: a huge blast on the button
const FINAL_SHAKE = 2.7;
const BLAST_SCALE = 1.8;
const SPARK_REACH = 360;
const SPARK_SIZE = 22;

interface Beat {
  // ms in its spike starts, lasts and peaks
  at: number;
  ms: number;
  height: number;
  levels: number;
  final: boolean;
  firedAt: number | null;
}

interface RunningHeartbeat {
  floor: Floor;
  isGroundFloor: boolean;
  button: Point;
  startX: number;
  beats: Beat[];
  endAt: number;
  startedAt: number;
}

let running: RunningHeartbeat | null = null;

const lerp = ([a, b]: [number, number], t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.heartbeatEvent.chance,
    isInProgress: () => running !== null,
    canArm: (_floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      context.upgradeFloorFree !== undefined,
    arm: startHeartbeat,
  },
  { label: "Heartbeat", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Heartbeat
export function forceHeartbeatEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// a heart monitor spike's height share u through it
function spikeAt(u: number): number {
  for (let k = 1; k < SPIKE.length; k++) {
    const [u1, v1] = SPIKE[k];
    if (u > u1) continue;
    const [u0, v0] = SPIKE[k - 1];
    return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0);
  }
  return 0;
}

// level with the button, sliding steadily toward it, spiking on each beat
function wispAt(hb: RunningHeartbeat, ms: number): Point | null {
  if (ms < 0 || ms > hb.endAt) return null;
  const x = hb.startX + (hb.button.x - hb.startX) * (ms / hb.endAt);
  const beat = hb.beats.find((b) => ms >= b.at && ms < b.at + b.ms);
  if (!beat) return { x, y: hb.button.y };
  const u = (ms - beat.at) / beat.ms;
  // the last only peaks, then slams straight down into the button
  const v = beat.final ? Math.sin(Math.PI * u) ** 0.6 : spikeAt(u);
  return { x, y: hb.button.y - beat.height * v };
}

function startHeartbeat(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  if (!area || !upgradeFloorFree) return;
  const { firstBeatMs, gapMs, spikeMs, finalMs, holdMs, levelShare, minLevels } =
    CONFIG.heartbeatEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const button = getButtonCenter(context.isGroundFloor);
  const room = Math.max(0, button.y - (area.top + TOP_MARGIN));
  const startX =
    button.x > (area.left + area.right) / 2
      ? area.left + EDGE_MARGIN
      : area.right - EDGE_MARGIN;
  const levels = (share: number) =>
    Math.max(minLevels, Math.round(floor.upgradeCount * share));

  let at = firstBeatMs;
  const beats: Beat[] = Array.from({ length: BEATS + 1 }, (_, i) => {
    const final = i === BEATS;
    const t = i / (BEATS - 1);
    const beat: Beat = {
      at,
      ms: final ? finalMs : lerp(spikeMs, Math.min(1, t)),
      height: room * (final ? 1 : lerp(HEIGHT, t)),
      levels: levels(final ? levelShare * 3 : levelShare),
      final,
      firedAt: null,
    };
    if (!final) at += lerp(gapMs, t);
    return beat;
  });
  const last = beats[BEATS];
  const hb: RunningHeartbeat = {
    floor,
    isGroundFloor: context.isGroundFloor,
    button,
    startX,
    beats,
    endAt: last.at + last.ms,
    startedAt: performance.now(),
  };
  running = hb;
  const isLive = () => running === hb;
  setUpgradeButtonSpotlights([floor]);
  freezeScreen((ctx, getFloorRect) =>
    drawOverlay(ctx, getFloorRect, upgradeFloorFree),
  );
  const stopSound = startBoostEventStreamLoop();

  setTimeout(() => {
    if (!isLive()) return;
    for (const beat of hb.beats)
      if (beat.firedAt === null) upgradeFloorFree(floor, beat.levels);
    running = null;
    stopSound();
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the levels
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, hb.endAt + holdMs);
}

// each beat lands at its spike's peak, the last as it slams into the button
function landBeats(
  hb: RunningHeartbeat,
  ms: number,
  now: number,
  upgradeFloorFree: (floor: Floor, levels: number) => void,
): void {
  hb.beats.forEach((beat, i) => {
    const due = beat.final ? beat.at + beat.ms : beat.at + beat.ms * PEAK;
    if (beat.firedAt !== null || ms < due) return;
    beat.firedAt = now;
    upgradeFloorFree(hb.floor, beat.levels);
    if (beat.final) {
      playSlamExplosion();
      shakeScreen(FINAL_SHAKE);
      return;
    }
    playExplosion();
    shakeScreen(lerp(BEAT_SHAKE, i / (BEATS - 1)));
  });
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
  upgradeFloorFree: (floor: Floor, levels: number) => void,
): void {
  const hb = running;
  if (!hb) return;
  const rect = getFloorRect(hb.floor);
  if (!rect) return;
  const now = performance.now();
  const ms = now - hb.startedAt;
  landBeats(hb, ms, now, upgradeFloorFree);
  const fired = hb.beats.filter((beat) => beat.firedAt !== null);
  const latest = fired[fired.length - 1];
  const since = latest?.firedAt != null ? now - latest.firedAt : Infinity;
  const { button } = hb;

  ctx.save();
  ctx.translate(rect.left, rect.top);
  // the button throbs on every beat
  const throb = 1 + THROB * Math.exp(-since / THROB_MS) * Math.cos(since / 40);
  ctx.save();
  ctx.translate(button.x, button.y);
  ctx.scale(throb, throb);
  ctx.translate(-button.x, -button.y);
  drawUpgradeButtonSpotlight(
    ctx,
    hb.floor,
    hb.isGroundFloor,
    clamp01(1 - since / WHITE_MS),
  );
  ctx.restore();
  hb.beats.forEach((beat, i) => {
    if (beat.firedAt === null || beat.final) return;
    const peak = wispAt(hb, beat.at + beat.ms * PEAK);
    if (!peak) return;
    drawWhiteBurst(
      ctx,
      peak.x,
      peak.y,
      (now - beat.firedAt) / BEAT_BURST_MS,
      lerp(BEAT_BURST, i / (BEATS - 1)),
    );
  });
  const last = hb.beats[BEATS];
  if (last.firedAt !== null)
    drawExplosion(
      ctx,
      button.x,
      button.y,
      now - last.firedAt,
      now,
      BLAST_SCALE,
      SPARK_REACH,
      SPARK_SIZE,
    );
  if (latest?.firedAt != null)
    drawPoppingCritText(
      ctx,
      `+${latest.levels} Lvl`,
      button.x,
      button.y - LABEL_FONT * 1.6,
      COLOR.heavenlyGold,
      latest.firedAt,
      now,
      { fontSize: LABEL_FONT, strokeWidth: 8 },
    );
  if (last.firedAt === null)
    drawWisp(
      ctx,
      (t) => wispAt(hb, t),
      ms,
      now,
      WISP_SIZE * WISP_GROW,
      clamp01(ms / hb.endAt),
    );
  ctx.restore();
}
