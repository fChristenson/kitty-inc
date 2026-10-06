// the playable bullet hell crits (see ../eventProcs), one per game in
// CONFIG.specialCrits.bulletHellCrit.games: each covers its crit, whose click
// freezes the screen while wisps pop in and move its game's way. The clicked
// floor's upgrade button stays live: pressing and holding it fires its game's
// shots at the wisps; a wisp shot down blows up in a blast and a ring of cash
// that flies straight into the total. When time is up the rest fizzle out,
// and the hits pay floor income × floor number × hitReward each before the
// crit's tier pays out
import type { Floor } from "../../gameState";
import { CONFIG } from "../../config";
import { COLOR } from "../../palette";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { pickCritTierByOdds } from "../../shared/critTypes";
import { ringTargets } from "../../shared/coinTargets";
import { clamp01 } from "../../shared/easing";
import { registerEventButton } from "../../shared/floorEvents";
import {
  clearUpgradeButtonSpotlights,
  drawUpgradeButtonSpotlight,
  forceTestCrit,
  getButtonCenter,
  BTN_H,
  setUpgradeButtonSpotlights,
  stopButtonHoldAnim,
  triggerButtonPress,
} from "../upgradeButton";
import {
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../eventProcs";
import { canStartMoneyCover, startMoneyCover } from "../moneyCover";
import { createBulletHellSim } from "./sim";
import type { BulletHellGameConfig } from "./types";

export type BulletHellGameName =
  keyof typeof CONFIG.specialCrits.bulletHellCrit.games;

// the wisps keep this far inside the screen's edges
const MARGIN = 90;
const COINS = 14;
const COIN_RING: [number, number] = [50, 150];
const FLASH_MS = 90;
const HIT_SHAKE = 0.9;
const BOMB_SHAKE = 1.2;
const BOMBLET_SHAKE = 0.5;
const SOUND_GAP_MS = 70;

const GAMES: Record<BulletHellGameName, BulletHellGameConfig> =
  CONFIG.specialCrits.bulletHellCrit.games;
const NAMES = Object.keys(GAMES) as BulletHellGameName[];
const keyOf = (name: BulletHellGameName) =>
  `bulletHell${name[0].toUpperCase()}${name.slice(1)}`;

let running: { floor: Floor; name: BulletHellGameName } | null = null;

for (const name of NAMES) {
  const key = keyOf(name);
  registerEventProc(
    {
      key,
      chance: () => GAMES[name].chance,
      isInProgress: () => running !== null,
      canArm: (floor, context) =>
        !running && canStartMoneyCover(context) && buttonInView(floor, context),
      arm: (floor, context) => startBulletHellGame(name, floor, context),
    },
    { label: GAMES[name].label, color: COLOR.red },
    "bulletHellCrit",
  );
  // the button while the game plays: free to press, firing
  registerEventButton({
    key,
    color: COLOR.red,
    freeClick: true,
    isActive: (floor) => running?.floor === floor && running.name === name,
    label: () => "Fire!",
  });
}

function buttonInView(floor: Floor, context: EventProcContext): boolean {
  const entry = context.getOnScreenFloors?.().find((e) => e.floor === floor);
  return (
    entry !== undefined &&
    isVisibleOnFloor(entry, getButtonCenter(context.isGroundFloor).y)
  );
}

// also the dev test hook's target: false while another freeze is running
function startBulletHellGame(
  name: BulletHellGameName,
  floor: Floor,
  context: EventProcContext,
): boolean {
  const cfg = GAMES[name];
  if (running || !canStartMoneyCover(context)) return false;
  const { isGroundFloor } = context;
  const area = context.getScreenAreaLocal!(floor);
  const box = {
    left: area.left + MARGIN,
    top: area.top + MARGIN,
    right: area.right - MARGIN,
    bottom: area.bottom - MARGIN,
  };
  const button = getButtonCenter(isGroundFloor);
  const muzzle = { x: button.x, y: button.y - BTN_H / 2 };
  let soundAt = -Infinity;
  const bang = () => {
    const now = performance.now();
    if (now - soundAt < SOUND_GAP_MS) return;
    soundAt = now;
    playExplosion();
  };
  const sim = createBulletHellSim(cfg, box, area, muzzle, {
    hit: (at) => {
      cover?.cashOut(at, ringTargets(at, COINS, COIN_RING));
      shakeScreen(HIT_SHAKE);
      bang();
    },
    boom: (_at, bomb) => {
      shakeScreen(bomb ? BOMB_SHAKE : BOMBLET_SHAKE);
      bang();
    },
    fired: () => triggerButtonPress(floor),
  });
  let startedAt = performance.now();
  const game = { floor, name };
  running = game;

  const fire = () => {
    const ms = performance.now() - startedAt;
    if (running === game && ms >= 0 && ms <= cfg.playMs) sim.fire();
  };

  setUpgradeButtonSpotlights([floor]);
  // the button fires shots now, not the long press's swell and burst
  stopButtonHoldAnim(floor);
  const cover = startMoneyCover(
    keyOf(name),
    floor,
    context,
    { durationMs: cfg.playMs + cfg.mergeMs, mergeMs: cfg.mergeMs },
    {
      rewardMultiplier: () => sim.hits * cfg.hitReward,
      pressable: { floor, fire, intervalMs: cfg.shots.fireMs },
      onEnd: () => {
        clearUpgradeButtonSpotlights();
        if (running === game) running = null;
      },
      drawExtra: (ctx, getFloorRect) => {
        const rect = getFloorRect(floor);
        if (!rect) return;
        const now = performance.now();
        sim.advance(now - startedAt);
        ctx.save();
        ctx.translate(rect.left, rect.top);
        drawUpgradeButtonSpotlight(
          ctx,
          floor,
          isGroundFloor,
          0.3 * (1 - clamp01((now - startedAt - sim.lastShot) / FLASH_MS)),
        );
        sim.draw(ctx, now);
        ctx.restore();
      },
    },
  );
  if (!cover) {
    clearUpgradeButtonSpotlights();
    running = null;
    return false;
  }
  startedAt = performance.now();
  playBoostEventStream();
  return true;
}

// dev test hook: arms a crit on floor (tier by the crit odds) carrying the game
export function forceBulletHellGame(
  name: BulletHellGameName,
  floor: Floor,
): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(keyOf(name), floor);
}
