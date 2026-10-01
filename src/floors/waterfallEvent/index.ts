// the "Waterfall" event: it covers its crit, whose click freezes the screen
// while coins and bills spill off the top upgrade button in view and cascade
// down the building's side, arcing out and dropping onto each button below,
// every one tipping in a stream of its own, then pour into the total. Pays
// the floor's payout once per button the falls pass (see ../moneyCover and
// ../riverPaths)
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { isFloorLocked } from "../../shared/detachedJob";
import { BTN_W, forceTestCrit, getButtonCenter } from "../upgradeButton";
import {
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import {
  canStartMoneyCover,
  FLOW_FLIGHT_MS,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../moneyCover";
import { pathsAlong } from "../riverPaths";

const KEY = "waterfall";
// coins along the main falls while it's full; each button tips in this share more
const COINS_ALONG = 1_500;
const TIP_SHARE = 0.5;
const START_WIDTH = 90;
const TIP_WIDTH = 110;
const END_PAUSE_MS = 100;
// how far past the buttons' outer edge the falls arc, and their edge margin
const SPILL_OUT = 60;
const MARGIN = 40;
// where on the way down the falls start curving back in, of each drop
const CURVE_IN = 0.35;
const STEP = 6; // px between the falls' samples
const LEDGE_SHAKE = 0.3;

type Pt = { x: number; y: number };

// every open floor's button in view, top first, local to floor's own space
function findLedges(floor: Floor, context: EventProcContext): Pt[] {
  const onScreen = context.getOnScreenFloors?.() ?? [];
  const top = onScreen.find((entry) => entry.floor === floor)?.top;
  if (top === undefined) return [];
  return onScreen
    .filter((entry) => entry.floor.unlocked && !isFloorLocked(entry.floor))
    .map((entry) => {
      const button = getButtonCenter(context.floors.indexOf(entry.floor) === 0);
      return { entry, button };
    })
    .filter(({ entry, button }) => isVisibleOnFloor(entry, button.y))
    .sort((a, b) => a.entry.top - b.entry.top)
    .slice(0, CONFIG.waterfallEvent.maxFloors)
    .map(({ entry, button }) => ({
      x: button.x,
      y: button.y + entry.top - top,
    }));
}

// the falls' line: off each button, arcing out past its outer edge and down
// onto the next; the index along it where each button sits
function fallsLine(ledges: Pt[], area: CoverArea) {
  const outX = Math.min(
    area.right - MARGIN,
    ledges[0].x + BTN_W / 2 + SPILL_OUT,
  );
  const line: Pt[] = [ledges[0]];
  const ledgeAt = [0];
  for (let k = 1; k < ledges.length; k++) {
    const a = ledges[k - 1];
    const b = ledges[k];
    const c1 = { x: outX, y: a.y };
    const c2 = { x: outX, y: b.y - (b.y - a.y) * CURVE_IN };
    const steps = Math.ceil((b.y - a.y + 2 * (outX - a.x)) / STEP);
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const u = 1 - t;
      const w = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      line.push({
        x: w[0] * a.x + w[1] * c1.x + w[2] * c2.x + w[3] * b.x,
        y: w[0] * a.y + w[1] * c1.y + w[2] * c2.y + w[3] * b.y,
      });
    }
    ledgeAt.push(line.length - 1);
  }
  let total = 0;
  const along = [0];
  for (let i = 1; i < line.length; i++) {
    total += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
    along.push(total);
  }
  return { line, ledgeAt, shares: ledgeAt.map((i) => along[i] / total) };
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.waterfallEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) && findLedges(floor, context).length >= 2,
    arm: (floor, context) => {
      const ledges = findLedges(floor, context);
      if (ledges.length < 2) return;
      const travelMs = CONFIG.waterfallEvent.dropMs * (ledges.length - 1);
      // the top button pours until the falls' head reaches the total
      const streamMs = travelMs + FLOW_FLIGHT_MS;
      const durationMs =
        streamMs + travelMs * 1.03 + FLOW_FLIGHT_MS + END_PAUSE_MS;
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs },
        { rewardMultiplier: ledges.length },
      );
      if (!cover) return;
      const { line, ledgeAt, shares } = fallsLine(ledges, cover.area);
      const count = Math.round((COINS_ALONG * streamMs) / travelMs);
      cover.flow(pathsAlong(line, count, START_WIDTH), streamMs, travelMs);
      // as the falls land on each button below, it tips in its own stream,
      // pouring on down with them until the top one stops
      for (let k = 1; k < ledges.length; k++) {
        const landMs = shares[k] * travelMs;
        setTimeout(() => {
          if (!cover.isLive()) return;
          shakeScreen(LEDGE_SHAKE);
          if (k === ledges.length - 1) return;
          const tipMs = streamMs - landMs;
          const count = Math.round(
            (COINS_ALONG * TIP_SHARE * tipMs) / travelMs,
          );
          cover.flow(
            pathsAlong(line.slice(ledgeAt[k]), count, TIP_WIDTH),
            tipMs,
            travelMs - landMs,
          );
        }, landMs);
      }
      playBoostEventStream();
    },
  },
  { label: "Waterfall", color: COLOR.coinGold },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Waterfall
export function forceWaterfallEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
