// a crit landing on a whole building bought on the map: every floor it has
// takes the landed tier, and the procs that mean something at building scope
// play out over whole buildings instead of floors
import type { Floor } from "../../gameState";
import type { BigNumber } from "../../shared/bigNumber";
import {
  increaseIncomeRate,
  unlockAllFloors,
  MAX_RENDERED_WORKERS,
} from "../../floors";
import {
  applyCritProcs,
  nextCritTier,
  CHAIN_CRIT_CONTINUE_CHANCE,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  MYSTIC_UPGRADE_COUNT,
  POKER_HAND_CRIT_COUNTS,
  type CritRollResult,
} from "../critTypes";
import { applyChainCrit } from "./floorCritRewards";
import { tierColor } from "./bonusTierReward";
import {
  playSpecialFlash,
  playTierFlash,
  triggerScreenShake,
} from "../critFlash";
import {
  runFirstCritProc,
  GRAND_OPENING_CRIT_COLOR,
  GRAND_OPENING_CRIT_LABEL,
  HEAVENLY_CRIT_COLOR,
  HEAVENLY_CRIT_LABEL,
  MYSTIC_CRIT_COLOR,
  MYSTIC_CRIT_LABEL,
  UPGRADE_CRIT_COLOR,
  UPGRADE_CRIT_LABEL,
} from "../critTypes";
import { playPayout, playSold } from "../../sound";

// the flash a crit on a building bought on the map plays. Only ONE flash can
// ever show at once, so Mystic/heavenly/upgrade/grand opening — the only
// procs this whole-building event celebrates — are mutually exclusive with
// each other and with the plain tier flash below, in priority order
// (heavenly first: it's the bigger moment if both happen to land together).
// A landed proc with no entry here just falls through to the plain tier flash
export function celebrateBuildingCrit(result: CritRollResult): void {
  const { tier, chain } = result;
  const playedSpecial = runFirstCritProc(
    result,
    undefined,
    {
      mystic: () => {
        triggerScreenShake({
          intensity: 2.2,
          label: MYSTIC_CRIT_LABEL,
          color: MYSTIC_CRIT_COLOR,
          strokeWidth: 15,
          blinkHz: 6,
          holdMs: 900,
          priority: 2,
        });
        playPayout();
      },
      // heavenly crit: the same ultra-strength flash the floors use
      heavenly: () =>
        playTierFlash("ultra", HEAVENLY_CRIT_LABEL, HEAVENLY_CRIT_COLOR),
      // upgrade crit: the flat special flash (the reward itself, promoting
      // every floor's tier one step, is applied by setBuildingCritTier)
      upgrade: () => playSpecialFlash(UPGRADE_CRIT_LABEL, UPGRADE_CRIT_COLOR),
      grandOpening: () =>
        playSpecialFlash(
          GRAND_OPENING_CRIT_LABEL,
          GRAND_OPENING_CRIT_COLOR,
          playSold,
        ),
    },
    ["mystic", "heavenly", "grandOpening", "upgrade"],
  );
  if (playedSpecial) return;
  // chain crit: the flash shows "Chain" instead of the tier's number
  playTierFlash(
    tier,
    chain ? "Chain" : CRIT_TIER_CONFIG[tier].label,
    tierColor(tier),
  );
}

export interface BuildingCritDeps {
  // the active company's buildings, the default target
  buildings: Floor[][];
  backgroundCount: () => number;
  getBuildingMultiplier: (buildingIndex: number) => BigNumber;
  // a floor added to targetBuildings[buildingIndex] (to show it if on screen)
  onFloorAdded: (
    targetBuildings: Floor[][],
    buildingIndex: number,
    floor: Floor,
  ) => void;
  // appends a new, set-up building to targetBuildings and returns its index
  addBuilding: (
    targetBuildings: Floor[][],
    options?: { groundFloorLocked?: boolean; initialUpgradeCount?: number },
  ) => number;
  persist: (targetBuildings: Floor[][]) => void;
}

export interface BuildingCrits {
  setBuildingCritTier: (
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings?: Floor[][],
  ) => void;
  // the Mystic crit's reward: a free building whose ground floor starts open
  // and already upgraded
  createMysticBuilding: (targetBuildings?: Floor[][]) => void;
}

export function createBuildingCrits(deps: BuildingCritDeps): BuildingCrits {
  const unlockAll = (
    floors: Floor[],
    buildingIndex: number,
    targetBuildings: Floor[][],
  ): void => {
    unlockAllFloors({
      floors,
      backgroundCount: deps.backgroundCount(),
      multiplier: deps.getBuildingMultiplier(buildingIndex),
      onAdd: (floor) =>
        deps.onFloorAdded(targetBuildings, buildingIndex, floor),
    });
  };

  function createMysticBuilding(targetBuildings = deps.buildings): void {
    deps.addBuilding(targetBuildings, {
      groundFloorLocked: false,
      initialUpgradeCount: MYSTIC_UPGRADE_COUNT,
    });
  }

  // sets EVERY floor a building currently has (locked or not) to the given crit
  // tier, permanently — no unlocking, no cost (see cityMap/index.ts's map-buy
  // crit celebration). A brand new building only has its one free ground floor
  // + the one locked floor already queued above it at this point; any floor
  // added later inherits this same tier automatically (see floorLock.ts's
  // ensureLockedFloorAbove). `chain` (see rollFloorBuyCrit's own chain flag)
  // additionally UNLOCKS that already-queued locked floor (it already got the
  // tier from the loop below, but was still sitting locked) and keeps climbing
  // further above it — same "chain crit" behavior the other 2 crit events
  // share. Chain must start from index 0 (the ground floor), NOT
  // floors.length-1 — the walker's first step lands on startIndex+1, and the
  // queued locked floor is always index 1 at this point (a brand new building
  // is always exactly [ground, one queued locked floor] here), so starting
  // any later just skips over it and the chain never actually unlocks anything
  function applyBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings: Floor[][],
  ): void {
    const floors = targetBuildings[buildingIndex];
    if (!floors) return;
    const { tier, chain } = result;
    for (const floor of floors) {
      if (!result.skip) floor.critMultiplierTier = tier;
    }
    if (result.mystic) createMysticBuilding(targetBuildings);
    // reward side of every proc this building-buy event actually supports —
    // one handler per proc kind (see critTypes' applyCritProcs), so this is
    // the ONE place that has to say what "upgrade"/"heavenly" mean for a
    // whole building; a proc with no entry here (boost/bounce/explosion/
    // booty/peppermint don't apply at building scope) is simply skipped
    applyCritProcs(result, floors, {
      // upgrade crit: promotes every floor this building has one further
      // step past the tier they were just set to above (see
      // rollFloorBuyCrit's own upgrade flag, applied here instead of
      // floorCritRewards.ts since this is a whole-building event, not a
      // single Floor)
      upgrade: (floors) => {
        for (const floor of floors) {
          floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
        }
      },
      // heavenly crit: the biggest reward of all, applied building-wide —
      // unlocks every remaining floor for free, maxes every floor's tier,
      // then grants each one a full max-tier free-upgrade batch. Uses
      // increaseIncomeRate directly (not floorInteractions' applyUpgradeTick,
      // which also spawns a coin burst/re-rolls a crit at a specific
      // ON-SCREEN floor button position) since this building may not even
      // be the one currently displayed
      heavenly: (floors) => {
        unlockAll(floors, buildingIndex, targetBuildings);
        const maxTier = CRIT_TIER_ORDER[0];
        const count = CRIT_TIER_CONFIG[maxTier].multiplier;
        for (const floor of floors) {
          floor.critMultiplierTier = maxTier;
          for (let i = 0; i < count; i++) {
            increaseIncomeRate(floor);
          }
        }
      },
      // skip crit: unlocks every floor and grants its free workers, manager,
      // office chairs, and supplies without changing tiers or levels
      skip: (floors) => {
        unlockAll(floors, buildingIndex, targetBuildings);
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          floor.workerCount = MAX_RENDERED_WORKERS;
          floor.hasManager = true;
          floor.hasOfficeChairs = true;
          floor.hasOfficeSupplies = true;
        }
      },
      // grand opening crit: same reward as at floor scope — unlocks every
      // remaining locked floor of this building for free
      grandOpening: (floors) => {
        unlockAll(floors, buildingIndex, targetBuildings);
      },
      luckyClover: (floors) => {
        const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
        for (const floor of floors) {
          if (!floor.unlocked) continue;
          for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++) {
            for (let i = 0; i < count; i++) increaseIncomeRate(floor);
          }
        }
      },
    });
    if (!chain) return;
    applyChainCrit(
      {
        floors,
        backgroundCount: deps.backgroundCount(),
        multiplier: deps.getBuildingMultiplier(buildingIndex),
        onFloorAdded: (floor) =>
          deps.onFloorAdded(targetBuildings, buildingIndex, floor),
      },
      0,
      (floor) => {
        floor.critMultiplierTier = tier;
      },
    );
  }

  // a chain crit ALWAYS has at least +1 impact area — same guarantee
  // applyChainCrit's own floor walker already gives (its first extra floor is
  // unconditional, only whether it keeps going past that is a coin flip).
  // "The building" being unlocked for THIS event is a whole building, not a
  // floor, so a chain here must always unlock at least one MORE building
  // (free, same tier, its own floor-chain too) — only whether it climbs PAST
  // that first extra building is CHAIN_CRIT_CONTINUE_CHANCE
  function setBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = deps.buildings,
  ): void {
    applyBuildingCritTier(buildingIndex, result, targetBuildings);
    if (result.chain) {
      let continueChain = true;
      while (continueChain) {
        const nextIndex = deps.addBuilding(targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
        continueChain = Math.random() < CHAIN_CRIT_CONTINUE_CHANCE;
      }
    }
    // pair/three of a kind/four of a kind/full house crits (see critTypes'
    // POKER_HAND_CRIT_COUNTS): at floor scope these promote a fixed number of
    // floors; at this whole-building scope they unlock/create that many
    // buildings instead (the building this event is already for counts as
    // the first of them, so only count-1 MORE get created here), each set to
    // the same landed tier. Applied independently per landed kind
    // (MAX_SPECIAL_CRIT_PROCS allows up to 2 to land together), same as
    // every other proc's reward. Royal Flush is the ONE exception at floor
    // scope (unlocks/upgrades every floor above it instead of a fixed 6 —
    // see floorCritRewards.ts's applyPokerHandCrit call), but at this
    // map/building scope it still just unlocks 6 buildings, same as every
    // other poker-hand crit here
    for (const count of [
      result.pair && POKER_HAND_CRIT_COUNTS.pair,
      result.threeOfAKind && POKER_HAND_CRIT_COUNTS.threeOfAKind,
      result.fourOfAKind && POKER_HAND_CRIT_COUNTS.fourOfAKind,
      result.fullHouse && POKER_HAND_CRIT_COUNTS.fullHouse,
      result.royalFlush && POKER_HAND_CRIT_COUNTS.royalFlush,
    ]) {
      if (!count) continue;
      for (let i = 1; i < count; i++) {
        const nextIndex = deps.addBuilding(targetBuildings);
        applyBuildingCritTier(nextIndex, result, targetBuildings);
      }
    }
    deps.persist(targetBuildings);
  }

  return { setBuildingCritTier, createMysticBuilding };
}
