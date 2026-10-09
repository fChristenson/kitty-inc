// the odometer: the total-income readout is a slot reel. When one of its
// comma groups, with a comma either side, is CONFIG.odometer.digits, the win
// sound plays and those digits turn gold and pop like a floor's level label
// reaching the cap; the readout slams and the Burst event's blow-out covers
// the screen in coins and bills that merge back into the total, multiplying
// it by CONFIG.odometer.multiplier.
//
// The HUD's readout asks it what to show (watchOdometer); gameCanvas runs its
// beats (drawOdometer) and hands it the Burst (setOdometerBurst)
import { CONFIG } from "../../config";
import { playJackpot } from "../../sound";
import { addTotalIncome, getTotalIncome } from "../../totalIncome";
import { multiply } from "../bigNumber";
import {
  GLOBAL_SLAM,
  SLAM_LAND_MS,
  triggerEventEndSlam,
  type GoldLetters,
} from "../eventEndSlam";
import { LEVEL_POP_MS } from "../levelPop";
import { isScreenFrozen } from "../screenFreeze";

const SLAM_AT = LEVEL_POP_MS;
const BURST_AT = SLAM_AT + SLAM_LAND_MS;

interface TotalParts {
  amount: string;
  unitName: string | null;
}

interface Run {
  startedAt: number;
  parts: TotalParts;
  from: number;
  to: number;
  slammed: boolean;
  burst: boolean;
}

let run: Run | null = null;
let readyAt = 0;
let forced = false;
let lastChecked: TotalParts | null = null;
let matcher = "";
let pattern = /$^/;
// starts the Burst, calling onEnd once its coins are back in; false if it can't
let startBurst: (onEnd: () => void) => boolean = () => false;

const gold: GoldLetters = { from: 0, to: 0, popMs: 0 };
const reel = { parts: { amount: "", unitName: null } as TotalParts, gold };

// a comma, the digits, a comma; rebuilt if the config changes
function digitPattern(): RegExp {
  const { digits } = CONFIG.odometer;
  if (digits !== matcher) {
    matcher = digits;
    pattern = new RegExp(`,${digits},`);
  }
  return pattern;
}

// the next readout shows the digits whatever the total is (test buttons)
export function forceOdometer(): void {
  forced = true;
}

// the amount's last group between two commas turned into the odometer's
// digits, or a made-up amount when it has no such group
function forcedParts(parts: TotalParts): { parts: TotalParts; from: number } {
  const { digits } = CONFIG.odometer;
  const { amount } = parts;
  const last = amount.lastIndexOf(",");
  const before = last > 0 ? amount.lastIndexOf(",", last - 1) : -1;
  if (before < 0) {
    const made = `$1,${digits},000`;
    return {
      parts: { amount: made, unitName: null },
      from: made.indexOf(",") + 1,
    };
  }
  const from = before + 1;
  return {
    parts: {
      amount: amount.slice(0, from) + digits + amount.slice(last),
      unitName: parts.unitName,
    },
    from,
  };
}

function start(parts: TotalParts, from: number, to: number, now: number): void {
  run = { startedAt: now, parts, from, to, slammed: false, burst: false };
  playJackpot();
}

// the readout's amount about to be drawn: what to draw instead while the
// odometer holds it (its digits gold), or null to draw it as it is. busy says
// the readout is already slamming or being streamed into
export function watchOdometer(
  parts: TotalParts,
  busy: boolean,
): typeof reel | null {
  const now = performance.now();
  if (!run) {
    if (busy || isScreenFrozen()) return null;
    if (forced) {
      forced = false;
      const made = forcedParts(parts);
      start(
        made.parts,
        made.from,
        made.from + CONFIG.odometer.digits.length,
        now,
      );
    } else {
      if (now < readyAt || parts === lastChecked) return null;
      lastChecked = parts;
      const match = digitPattern().exec(parts.amount);
      if (!match) return null;
      // the digits, not the commas round them
      const from = match.index + 1;
      start(parts, from, from + CONFIG.odometer.digits.length, now);
    }
  }
  const active = run!;
  const ms = now - active.startedAt;
  // the readout shows the real total again as it blows up
  if (active.burst || ms >= BURST_AT) return null;
  reel.parts = active.parts;
  gold.from = active.from;
  gold.to = active.to;
  gold.popMs = ms;
  return reel;
}

// how the odometer starts the Burst (gameCanvas knows the floors it needs)
export function setOdometerBurst(start: (onEnd: () => void) => boolean): void {
  startBurst = start;
}

// the coins are back in: the total multiplied
function finish(): void {
  addTotalIncome(multiply(getTotalIncome(), CONFIG.odometer.multiplier - 1));
  run = null;
  readyAt = performance.now() + CONFIG.odometer.cooldownMs;
}

// runs the odometer's beats while the floors are drawn
export function drawOdometer(): void {
  if (!run || run.burst) return;
  const active = run;
  const ms = performance.now() - active.startedAt;
  if (!active.slammed && ms >= SLAM_AT) {
    active.slammed = true;
    triggerEventEndSlam(GLOBAL_SLAM, "total");
  }
  if (ms >= BURST_AT) {
    active.burst = true;
    // nothing to blow up (another cover running): just pay
    if (!startBurst(finish)) finish();
  }
}
