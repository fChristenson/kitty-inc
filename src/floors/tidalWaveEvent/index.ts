// the "Tidal Wave" event: it covers its crit, whose click freezes the screen
// while a towering swell of water (shared/water) rolls across the screen from
// one side; each floor's income bar its front reaches slams and rises to the
// highest floor tier among the floors in view (see ../floodLift). Then the
// water fades, the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSwoosh, startWaterLoop } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import {
  drawTidalWave,
  tidalWave,
  waveFrontAt,
  waveReach,
  type TidalWave,
} from "../../shared/water";
import {
  freezeScreen,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { forceTestCrit } from "../upgradeButton";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  drawFloodBars,
  hideFloodBars,
  liftFloor,
  planFloodLift,
  type FloodLift,
} from "../floodLift";

const KEY = "tidalWave";
// the wave starts this far outside the screen and its crest ends this far past it
const MARGIN = 120;
// its foot sits this far below the screen's bottom, its crest this share of
// the screen's height above it
const SINK = 40;
const CREST_SHARE = 0.9;

interface RunningWave {
  floor: Floor;
  lift: FloodLift;
  wave: TidalWave;
  // 1 sweeping right, -1 sweeping left
  dir: 1 | -1;
  // the crest's travel and the ground's height, local to the clicked floor
  from: number;
  to: number;
  baseY: number;
  startedAt: number;
}

let running: RunningWave | null = null;

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.tidalWaveEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      planFloodLift(floor, context) !== null,
    arm: startWave,
  },
  { label: "Tidal Wave", color: COLOR.tideDeep },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Tidal Wave
export function forceTidalWaveEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the crest's x ms in, easing in and out of the sweep
function crestX(run: RunningWave, ms: number): number {
  const u = Math.min(1, Math.max(0, ms / CONFIG.tidalWaveEvent.sweepMs));
  const e = (1 - Math.cos(Math.PI * u)) / 2;
  return run.from + (run.to - run.from) * e;
}

// when the wave's front reaches local point (x, y)
function reachAt(run: RunningWave, x: number, y: number): number {
  const crest = x - run.dir * waveFrontAt(run.wave, run.baseY - y);
  const e = Math.min(1, Math.max(0, (crest - run.from) / (run.to - run.from)));
  return (CONFIG.tidalWaveEvent.sweepMs * Math.acos(1 - 2 * e)) / Math.PI;
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  getFloorRect: FloorRectResolver,
): void {
  const run = running;
  if (!run) return;
  const now = performance.now();
  const ms = now - run.startedAt;
  drawFloodBars(ctx, getFloorRect, run.lift, now);
  const rect = getFloorRect(run.floor);
  if (!rect) return;
  const { sweepMs, fadeMs } = CONFIG.tidalWaveEvent;
  ctx.save();
  ctx.translate(rect.left, rect.top);
  drawTidalWave(
    ctx,
    run.wave,
    crestX(run, ms),
    run.baseY,
    run.dir,
    Math.max(0, 1 - Math.max(0, ms - sweepMs) / fadeMs),
    now,
  );
  ctx.restore();
}

function startWave(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const area = context.getScreenAreaLocal?.(floor);
  const lift = planFloodLift(floor, context);
  if (!area || !lift) return;
  const { sweepMs, fadeMs, holdMs } = CONFIG.tidalWaveEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  const wave = tidalWave((area.bottom - area.top) * CREST_SHARE + SINK);
  // in from just past the near side, front first, until its crest has rolled
  // past the far side
  const ahead = waveReach(wave) + MARGIN;
  const behind = MARGIN + wave.back * 0.5;
  const run: RunningWave = {
    floor,
    lift,
    wave,
    dir,
    from: dir === 1 ? area.left - ahead : area.right + ahead,
    to: dir === 1 ? area.right + behind : area.left - behind,
    baseY: area.bottom + SINK,
    startedAt: performance.now(),
  };
  running = run;
  const isLive = () => running === run;
  hideFloodBars(lift);
  freezeScreen(drawOverlay);
  playSwoosh();
  const stopSound = startWaterLoop();

  for (const lifted of lift.floors)
    if (lifted.raises)
      setTimeout(
        () => {
          if (isLive()) liftFloor(lifted, lift.target);
        },
        reachAt(run, lifted.bar.x, lifted.bar.y),
      );

  setTimeout(stopSound, sweepMs);
  setTimeout(
    () => {
      if (!isLive()) return;
      running = null;
      hideFloodBars(null);
      unfreezeScreen();
      // the covered crit's own tier, which also saves the promotions
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
    sweepMs + fadeMs + holdMs,
  );
}
