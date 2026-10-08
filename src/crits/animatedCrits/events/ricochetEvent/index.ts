// the "Ricochet" event: it covers its crit, whose click freezes the screen while
// the button fires one fat stream of coins and bills that bounces off the
// screen's edges like a pinball before diving into the total; every bounce
// adds the floor's payout once more (see ../moneyCover and ../riverPaths)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { randomInt } from "../../../../utils";
import { playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { forceClaimEventProc, registerEventProc } from "../../eventProcs";
import {
  canStartMoneyCover,
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../../moneyCover";
import { pathsAlong, roundCorners } from "../../riverPaths";

const KEY = "ricochet";
const BOUNCES: [number, number] = [3, 5];
// coins along the whole stream while it's full
const COINS_ALONG = 1_500;
const START_WIDTH = 90;
const END_PAUSE_MS = 100;
const MARGIN = 90; // where the stream bounces, inside the screen's edges
// shots never skim an edge: each axis gets at least this much of the heading
const MIN_SLANT = 0.35;
// px each bounce's corner is rounded over, just enough that lanes don't jump
const BOUNCE_RADIUS = 20;
const BOUNCE_STEPS = 6; // points along each rounded corner
const BOUNCE_SHAKE = 0.35;

type Pt = { x: number; y: number };

// the stream's line: from start, straight shots bouncing off the screen's
// edges, then a dive to its top middle; the distance (px along it) of each bounce
function bounceLine(area: CoverArea, start: Pt, bounces: number) {
  const left = area.left + MARGIN;
  const right = area.right - MARGIN;
  const top = area.top + MARGIN;
  const bottom = area.bottom - MARGIN;
  let x = Math.min(right, Math.max(left, start.x));
  let y = Math.min(bottom, Math.max(top, start.y));
  let dx = 0;
  let dy = 0;
  while (Math.abs(dx) < MIN_SLANT || Math.abs(dy) < MIN_SLANT) {
    const angle = Math.random() * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
  }
  const corners: Pt[] = [start, { x, y }];
  for (let i = 0; i < bounces; i++) {
    const tx = dx > 0 ? (right - x) / dx : (left - x) / dx;
    const ty = dy > 0 ? (bottom - y) / dy : (top - y) / dy;
    const t = Math.min(tx, ty);
    x += dx * t;
    y += dy * t;
    if (tx <= ty) dx = -dx;
    if (ty <= tx) dy = -dy;
    corners.push({ x, y });
  }
  corners.push({ x: (left + right) / 2, y: top });
  const length = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  let along = 0;
  const bounceAt: number[] = [];
  for (let i = 1; i < corners.length - 1; i++) {
    along += length(corners[i - 1], corners[i]);
    if (i >= 2) bounceAt.push(along);
  }
  const line = roundCorners(corners, BOUNCE_RADIUS, BOUNCE_STEPS);
  let total = 0;
  for (let i = 1; i < corners.length; i++)
    total += length(corners[i - 1], corners[i]);
  return { line, bounceShares: bounceAt.map((d) => d / total) };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.ricochetEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (_floor, context) => canStartMoneyCover(context),
    arm: (floor, context) => {
      const { travelMs } = CONFIG.ricochetEvent;
      const bounces = randomInt(...BOUNCES);
      // the button fires until the stream's head reaches the total
      const streamMs = travelMs + FLOW_FLIGHT_MS;
      const durationMs =
        streamMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs },
        { rewardMultiplier: bounces },
      );
      if (!cover) return;
      const { line, bounceShares } = bounceLine(
        cover.area,
        cover.button,
        bounces,
      );
      const count = Math.round((COINS_ALONG * streamMs) / travelMs);
      cover.flow(pathsAlong(line, count, START_WIDTH), streamMs, travelMs);
      // a knock each time the stream's head hits an edge
      for (const share of bounceShares)
        setTimeout(() => {
          if (cover.isLive()) shakeScreen(BOUNCE_SHAKE);
        }, share * travelMs);
      playBoostEventStream();
    },
  },
  { label: "Ricochet", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Ricochet
export function forceRicochetEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
