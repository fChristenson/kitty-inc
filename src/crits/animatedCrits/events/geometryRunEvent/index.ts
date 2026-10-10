// the "Geometry Run" event, a reveal-stage event (see ../../revealStage) with
// an auto-runner look: it covers its crit, whose click whips the stage in over
// the floors as a side-scrolling run. The crit's wisp races over platforms
// made of the floors' bars laid end to end, to a pounding beat, hopping the
// glitter spike on each; every landing jolts its platform and levels that
// floor's bar. Off the last one it launches up a ramp into a huge blast, the
// stage whips out and the crit's tier lands on the clicked floor
import { levelsFor, type Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { drawCachedCritText } from "../../../critFlash/critText";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  canStartRevealStage,
  isRevealStageRunning,
  startRevealStage,
  type StageRect,
} from "../../revealStage";
import { findRewardBars } from "../../eventRewards";
import { drawBeam } from "../../../../shared/beam";
import { bezier } from "../../../../shared/curves";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  drawIncomePanel,
  getIncomeBarBox,
} from "../../../../floors/incomePanel";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playBarExplosion,
  playSlamExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";

const KEY = "geometryRun";

// the run, in shares of the stage's width: each platform's start along the
// run and its height over the ground; a platform is a floor's income bar, as
// long as the bar itself
const PLATFORMS = [
  { x0: 0.56, h: 0.136 },
  { x0: 1.3, h: 0.29 },
  { x0: 2.0, h: 0.184 },
  { x0: 2.66, h: 0.353 },
];
// where the runner is held across the stage, and the ground, of its height
const RUNNER_X = 0.26;
const GROUND = 0.62;
// of the stage's width: how high the hops go
const HOP_LIFT = 0.176;
const SPIKE_LIFT = 0.12;
const LAUNCH_RISE = 0.4;
// the beat the ground pulses to
const BEAT_MS = 300;
const BEAT_DECAY_MS = 90;
const JOLT_MS = 90;
const FLASH_MS = 200;
// a bar fills from this share as it's landed on
const FILL: [number, number] = [0.4, 1];
const FILL_MS = 250;
const LABEL_MS = 700;
const LABEL_RISE = 0.12;
const LABEL_STYLE = { fontSize: 80, strokeWidth: 12 };
const SPIKES = 3;
const LANDING_BLAST = 180;
const FINALE_BLAST = 480;
const LANDING_SHAKE = 0.8;
const FINALE_SHAKE = 2;

// a hop through (run share, height share) space
interface Jump {
  start: number;
  end: number;
  from: Point;
  to: Point;
  lift: number;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.geometryRunEvent.chance,
    isInProgress: () => isRevealStageRunning(KEY),
    canArm: (floor, context) =>
      canStartRevealStage(context) &&
      context.upgradeFloorFree !== undefined &&
      findRewardBars(floor, context).length > 0,
    arm: startRun,
  },
  { label: "Geometry Run", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Geometry Run
export function forceGeometryRunEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function startRun(floor: Floor, context: EventProcContext): void {
  const { speed, hopMs, spikeHopMs, launchMs, holdMs } =
    CONFIG.geometryRunEvent;
  const bars = findRewardBars(floor, context);
  const tier = context.critTier ?? pickCritTierByOdds();
  // the bars' own size, of the stage's (the screen's) width
  const area = context.getScreenAreaLocal?.(floor);
  const box = getIncomeBarBox(false);
  const areaW = area ? area.right - area.left : box.width * 2.4;
  const barW = box.width / areaW;
  const barH = box.height / areaW;
  const ramp = PLATFORMS[3].x0 + barW;
  // each platform is a floor's bar, cycling through those on screen
  const rewards = PLATFORMS.map((_, i) => {
    const bar = bars[i % bars.length];
    const levels = levelsFor(bar.floor);
    return {
      floor: bar.floor,
      isGroundFloor: bar.isGroundFloor,
      box: getIncomeBarBox(bar.isGroundFloor),
      levels,
      label: `+${levels} Lvl`,
    };
  });
  const jumps: Jump[] = [];
  let h = 0;
  for (const p of PLATFORMS) {
    const takeOff = p.x0 - speed * hopMs;
    jumps.push({
      start: takeOff / speed,
      end: p.x0 / speed,
      from: { x: takeOff, y: h },
      to: { x: p.x0, y: p.h },
      lift: HOP_LIFT,
    });
    // the spike in the middle of the platform, hopped
    const spike = p.x0 + barW / 2 - (speed * spikeHopMs) / 2;
    jumps.push({
      start: spike / speed,
      end: spike / speed + spikeHopMs,
      from: { x: spike, y: p.h },
      to: { x: spike + speed * spikeHopMs, y: p.h },
      lift: SPIKE_LIFT,
    });
    h = p.h;
  }
  const rampMs = ramp / speed;
  const endMs = rampMs + launchMs;
  const landingMs = PLATFORMS.map((p) => p.x0 / speed);
  const bend: Point = { x: 0, y: 0 };
  const run: Point = { x: 0, y: 0 };
  // the runner at ms into the run: x along it, y its height, both shares
  const runnerAt = (ms: number): Point => {
    const t = Math.min(endMs, Math.max(0, ms));
    run.x = speed * t;
    if (t >= rampMs) {
      const u = (t - rampMs) / launchMs;
      run.y = PLATFORMS[3].h + LAUNCH_RISE * (1 - (1 - u) ** 2);
      return run;
    }
    for (const j of jumps)
      if (t >= j.start && t < j.end) {
        bend.x = (j.from.x + j.to.x) / 2;
        bend.y = Math.max(j.from.y, j.to.y) + j.lift;
        return bezier(
          j.from,
          bend,
          j.to,
          (t - j.start) / (j.end - j.start),
          run,
        );
      }
    run.y = 0;
    for (const p of PLATFORMS) if (run.x >= p.x0) run.y = p.h;
    return run;
  };
  // this frame's stage and camera, read by the wisp's path
  const view = { x: 0, ground: 0, u: 1, cam: 0 };
  const screen: Point = { x: 0, y: 0 };
  const wispAt = (ms: number): Point | null => {
    if (ms > endMs) return null;
    const r = runnerAt(ms);
    screen.x = view.x + (r.x - view.cam) * view.u;
    screen.y = view.ground - (r.y + barH * 0.6) * view.u;
    return screen;
  };
  const finale: Point = { x: 0, y: 0 };
  const landing: Point = { x: 0, y: 0 };
  const lineFrom: Point = { x: 0, y: 0 };
  const lineTo: Point = { x: 0, y: 0 };

  const draw = (
    ctx: CanvasRenderingContext2D,
    stage: StageRect,
    ms: number,
    now: number,
  ) => {
    const t = Math.min(endMs, Math.max(0, ms));
    view.x = stage.x;
    view.u = stage.w;
    view.ground = stage.y + stage.h * GROUND;
    view.cam = Math.min(runnerAt(t).x, ramp) - RUNNER_X;
    const { u, ground, cam } = view;
    const beat = Math.exp(-((Math.max(0, ms) % BEAT_MS) / BEAT_DECAY_MS));
    lineFrom.x = stage.x;
    lineTo.x = stage.x + stage.w;
    lineFrom.y = lineTo.y = ground + barH * u;
    drawBeam(ctx, lineFrom, lineTo, 10, 0.4 + 0.4 * beat);
    const h = barH * u;
    const w = barW * u;
    for (let i = 0; i < PLATFORMS.length; i++) {
      const p = PLATFORMS[i];
      const x = stage.x + (p.x0 - cam) * u;
      if (x > stage.x + stage.w || x + w < stage.x) continue;
      const landed = ms - landingMs[i];
      const jolt = landed >= 0 ? Math.exp(-landed / JOLT_MS) * h * 0.3 : 0;
      const y = ground - p.h * u + jolt;
      // the floor's own bar, moved onto the platform's spot
      const reward = rewards[i];
      ctx.save();
      ctx.translate(x - reward.box.x, y - reward.box.y);
      drawIncomePanel(ctx, reward.floor, reward.isGroundFloor, {
        whiteAlpha:
          landed >= 0 && landed < FLASH_MS ? 0.9 * (1 - landed / FLASH_MS) : 0,
        rotation: 0,
        fill: lerp(FILL, landed >= 0 ? clamp01(landed / FILL_MS) : 0),
      });
      ctx.restore();
      // the glitter spike in its middle
      ctx.globalCompositeOperation = "lighter";
      for (let s = 0; s < SPIKES; s++)
        stampGlimmer(
          ctx,
          x + w / 2 + (s - 1) * h * 0.45,
          y - h * (s === 1 ? 0.75 : 0.4),
          h * 0.45,
          now * 0.003 + s,
          COLOR.heavenlyGold,
        );
      ctx.globalCompositeOperation = "source-over";
      landing.x = x + h;
      landing.y = y;
      drawDetonation(ctx, landing, landed, LANDING_BLAST, now);
      if (landed >= 0 && landed < LABEL_MS) {
        ctx.globalAlpha = 1 - landed / LABEL_MS;
        drawCachedCritText(
          ctx,
          reward.label,
          x + w * 0.3,
          y - h - (landed / LABEL_MS) * LABEL_RISE * u,
          COLOR.heavenlyGold,
          LABEL_STYLE,
        );
        ctx.globalAlpha = 1;
      }
    }
    drawWisp(ctx, wispAt, ms, now, WISP_SIZE * 1.3, clamp01(t / endMs));
    if (ms >= endMs) {
      finale.x = stage.x + (RUNNER_X + speed * launchMs) * u;
      finale.y = ground - (PLATFORMS[3].h + LAUNCH_RISE) * u;
      drawDetonation(ctx, finale, ms - endMs, FINALE_BLAST, now);
    }
  };

  const beat = startRevealStage(KEY, floor, context, {
    durationMs: endMs + holdMs,
    draw,
    onEnd: () => {
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
  if (!beat) return;
  landingMs.forEach((at, i) =>
    beat(at, () => {
      const { floor: barFloor, levels } = rewards[i];
      context.upgradeFloorFree?.(barFloor, levels);
      shakeScreen(LANDING_SHAKE);
      playBarExplosion(1 + 0.1 * i);
    }),
  );
  beat(endMs, () => {
    shakeScreen(FINALE_SHAKE);
    playSlamExplosion();
  });
}
