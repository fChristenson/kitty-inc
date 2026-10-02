// the "Lighthouse" event: it covers its crit, whose click freezes the screen
// while the wisp (shared/wisp) flies up out of the button to the middle of
// the screen and lights up as a lighthouse lamp: its beam sweeps one full
// turn round the screen, and every floor's "Lvl" label, income bar and
// upgrade button in view slams and shines as it passes over them. Each
// floor's free upgrade levels land as its label is lit. Then the beam fades,
// the screen unfreezes and the crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playSwoosh, startBoostEventStreamLoop } from "../../sound";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { drawPoppingCritText } from "../../shared/critText";
import { SLAM_LAND_MS, triggerEventEndSlam } from "../../shared/eventEndSlam";
import { drawWhiteBurst } from "../../shared/eventFx";
import { drawWisp, swoop, WISP_SIZE } from "../../shared/wisp";
import {
  freezeScreen,
  drawFreezeDimmed,
  isScreenFrozen,
  unfreezeScreen,
  type FloorRectResolver,
} from "../../shared/screenFreeze";
import { isFloorLocked } from "../../shared/detachedJob";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  forceTestCrit,
  getButtonCenter,
  setUpgradeButtonSpotlights,
} from "../upgradeButton";
import {
  drawIncomePanel,
  getIncomeBarCenter,
  setIncomePanelsHidden,
} from "../incomePanel";
import {
  drawUpgradeStarSpotlight,
  getStarRightX,
  setUpgradeStarsHidden,
  STAR_BOTTOM_Y,
  STAR_X,
  STAR_Y,
} from "../star";
import {
  endEventProc,
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";

const KEY = "lighthouse";
// the beam's half-width (rad) and reach, with a softer, wider halo round it
const BEAM_HALF = 0.2;
const HALO_HALF = 0.42;
const BEAM_REACH = 3_000;
// it starts pointing straight up, turning clockwise
const START_ANGLE = -Math.PI / 2;
// the beam brightens in and fades out over these
const IGNITE_MS = 300;
const FADE_MS = 300;
const BURST_MS = 500;
const LABEL_FONT = 56;

type Point = { x: number; y: number };
type PartKind = "star" | "bar" | "button";

// one lit thing on a floor: its "Lvl" label, income bar or upgrade button
interface Part {
  kind: PartKind;
  floor: Floor;
  isGroundFloor: boolean;
  // floor-local to its own floor, and local to the clicked floor
  local: Point;
  at: Point;
  // ms from the event's start
  litAt: number;
  shinedAt: number | null;
}

interface Reward {
  floor: Floor;
  levels: number;
  // the part whose lighting lands the levels: the label, if it's in view
  part: Part;
  landedAt: number | null;
}

interface RunningLighthouse {
  floor: Floor;
  button: Point;
  lamp: Point;
  parts: Part[];
  rewards: Reward[];
  startedAt: number;
}

let running: RunningLighthouse | null = null;

// every visible label, bar and button on the open floors in view
function findParts(
  floor: Floor,
  context: EventProcContext,
): Omit<Part, "litAt" | "shinedAt">[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined || !context.upgradeFloorFree) return [];
  const parts: Omit<Part, "litAt" | "shinedAt">[] = [];
  for (const entry of onScreen) {
    const f = entry.floor;
    if (!f.unlocked || isFloorLocked(f)) continue;
    const isGroundFloor = context.floors.indexOf(f) === 0;
    const spots: [PartKind, Point][] = [
      [
        "star",
        {
          x: (STAR_X + getStarRightX(f)) / 2,
          y: (STAR_Y + STAR_BOTTOM_Y) / 2,
        },
      ],
      ["bar", getIncomeBarCenter(isGroundFloor)],
      ["button", getButtonCenter(isGroundFloor)],
    ];
    for (const [kind, local] of spots)
      if (isVisibleOnFloor(entry, local.y))
        parts.push({
          kind,
          floor: f,
          isGroundFloor,
          local,
          at: { x: local.x, y: local.y + entry.top - top },
        });
  }
  return parts;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.lighthouseEvent.chance,
    isInProgress: () => running !== null,
    canArm: (floor, context) =>
      !running &&
      !isScreenFrozen() &&
      context.getScreenAreaLocal !== undefined &&
      findParts(floor, context).length > 0,
    arm: startLighthouse,
  },
  { label: "Lighthouse", color: COLOR.heavenlyGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Lighthouse
export function forceLighthouseEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}

// the beam's angle ms into the event: one steady clockwise turn after the flight
function beamAngle(ms: number): number {
  const { flyMs, sweepMs } = CONFIG.lighthouseEvent;
  const u = Math.min(1, Math.max(0, (ms - flyMs) / sweepMs));
  return START_ANGLE + u * Math.PI * 2;
}

// a wedge of light from the lamp, fading out along its reach
function drawWedge(
  ctx: CanvasRenderingContext2D,
  lamp: Point,
  angle: number,
  half: number,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(
    lamp.x,
    lamp.y,
    0,
    lamp.x,
    lamp.y,
    BEAM_REACH,
  );
  gradient.addColorStop(0, COLOR.white);
  gradient.addColorStop(0.15, `${COLOR.heavenlyGold}cc`);
  gradient.addColorStop(1, `${COLOR.heavenlyGold}00`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(lamp.x, lamp.y);
  ctx.arc(lamp.x, lamp.y, BEAM_REACH, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPart(ctx: CanvasRenderingContext2D, part: Part): void {
  if (part.kind === "star") drawUpgradeStarSpotlight(ctx, part.floor);
  else if (part.kind === "bar")
    drawIncomePanel(ctx, part.floor, part.isGroundFloor, {
      whiteAlpha: 0,
      rotation: 0,
    });
  else drawUpgradeButtonSpotlight(ctx, part.floor, part.isGroundFloor, 0);
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
  const { flyMs, sweepMs } = CONFIG.lighthouseEvent;

  // everything sits dim in the dark until the beam finds it
  const drawAt = (c: CanvasRenderingContext2D, part: Part) => {
    const own = getFloorRect(part.floor);
    if (!own) return;
    c.save();
    c.translate(own.left, own.top);
    drawPart(c, part);
    if (part.shinedAt !== null)
      drawWhiteBurst(
        c,
        part.local.x,
        part.local.y,
        (now - part.shinedAt) / BURST_MS,
        0.3,
      );
    c.restore();
  };
  drawFreezeDimmed(
    ctx,
    (layer) => {
      for (const part of event.parts)
        if (part.shinedAt === null) drawAt(layer, part);
    },
    [event, event.parts.filter((part) => part.shinedAt === null).length],
  );
  for (const part of event.parts) if (part.shinedAt !== null) drawAt(ctx, part);

  ctx.save();
  ctx.translate(rect.left, rect.top);
  const beamMs = ms - flyMs;
  const strength =
    Math.min(1, Math.max(0, beamMs / IGNITE_MS)) *
    Math.min(1, Math.max(0, 1 - (beamMs - sweepMs) / FADE_MS));
  if (strength > 0) {
    const angle = beamAngle(ms);
    drawWedge(ctx, event.lamp, angle, HALO_HALF, 0.22 * strength);
    drawWedge(ctx, event.lamp, angle, BEAM_HALF, 0.55 * strength);
  }

  for (const reward of event.rewards)
    if (reward.landedAt !== null)
      drawPoppingCritText(
        ctx,
        `+${reward.levels} Lvl`,
        reward.part.at.x,
        reward.part.at.y + LABEL_FONT * 1.1,
        COLOR.heavenlyGold,
        reward.landedAt,
        now,
        { fontSize: LABEL_FONT, strokeWidth: 8 },
      );

  // the lamp: the wisp, flown up out of the button and hovering at the middle
  drawWisp(
    ctx,
    (t) =>
      t < 0
        ? null
        : t < flyMs
          ? swoop(event.button, event.lamp, t / flyMs, 3, 0.3, 0, 0)
          : event.lamp,
    ms,
    now,
    WISP_SIZE,
    strength,
  );
  ctx.restore();
}

function startLighthouse(floor: Floor, context: EventProcContext): void {
  if (running || isScreenFrozen()) return;
  const area = context.getScreenAreaLocal?.(floor);
  const upgradeFloorFree = context.upgradeFloorFree;
  const found = findParts(floor, context);
  if (!area || !upgradeFloorFree || found.length === 0) return;
  const { flyMs, sweepMs, holdMs, levelShare, minLevels } =
    CONFIG.lighthouseEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const button = getButtonCenter(context.isGroundFloor);
  const lamp = {
    x: (area.left + area.right) / 2,
    y: (area.top + area.bottom) / 2,
  };
  // each part is lit as the beam's turn reaches its direction from the lamp
  const parts: Part[] = found.map((part) => {
    const angle = Math.atan2(part.at.y - lamp.y, part.at.x - lamp.x);
    const turn =
      (((angle - START_ANGLE) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return {
      ...part,
      litAt: flyMs + (turn / (Math.PI * 2)) * sweepMs,
      shinedAt: null,
    };
  });
  const rewards: Reward[] = [...new Set(parts.map((p) => p.floor))].map((f) => {
    const own = parts.filter((p) => p.floor === f);
    return {
      floor: f,
      levels: Math.max(minLevels, Math.round(f.upgradeCount * levelShare)),
      part:
        own.find((p) => p.kind === "star") ??
        own.reduce((last, p) => (p.litAt > last.litAt ? p : last)),
      landedAt: null,
    };
  });
  const event: RunningLighthouse = {
    floor,
    button,
    lamp,
    parts,
    rewards,
    startedAt: performance.now(),
  };
  running = event;
  const isLive = () => running === event;
  const floorsWith = (kind: PartKind) =>
    parts.filter((p) => p.kind === kind).map((p) => p.floor);
  setUpgradeStarsHidden(floorsWith("star"));
  setIncomePanelsHidden(floorsWith("bar"));
  setUpgradeButtonSpotlights(floorsWith("button"));
  freezeScreen(drawOverlay);
  const stopSound = startBoostEventStreamLoop();

  for (const part of parts)
    setTimeout(() => {
      if (!isLive()) return;
      part.shinedAt = performance.now();
      playSwoosh();
      triggerEventEndSlam(part.floor, part.kind);
    }, part.litAt);
  // each floor's levels land with its label's slam
  for (const reward of rewards)
    setTimeout(() => {
      if (!isLive()) return;
      reward.landedAt = performance.now();
      upgradeFloorFree(reward.floor, reward.levels);
    }, reward.part.litAt + SLAM_LAND_MS);

  const endAt = Math.max(
    flyMs + sweepMs + FADE_MS,
    ...parts.map((part) => part.litAt + SLAM_LAND_MS),
  );
  setTimeout(() => {
    if (!isLive()) return;
    running = null;
    stopSound();
    setUpgradeStarsHidden([]);
    setIncomePanelsHidden([]);
    clearUpgradeButtonSpotlights();
    unfreezeScreen();
    // the covered crit's own tier, which also saves the levels
    context.applyTierCrit?.(floor, tier);
    endEventProc(KEY);
  }, endAt + holdMs);
}
