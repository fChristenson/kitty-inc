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
  nextCritTier,
  CHAIN_CRIT_CONTINUE_CHANCE,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  LUCKY_CLOVER_CRIT_COUNT,
  LUCKY_CLOVER_CRIT_TIER,
  MYSTIC_UPGRADE_COUNT,
  POKER_HAND_CRIT_COUNTS,
  type CritProcKind,
  type CritRollResult,
} from "../critTypes";
import { applyChainCrit } from "./floorCritRewards";
import { tierColor } from "./bonusTierReward";
import {
  playSpecialFlash,
  playTierFlash,
  triggerScreenShake,
} from "../critFlash";
import { runFirstCritProc, CRIT_PROC_INFO } from "../critTypes";
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
          label: CRIT_PROC_INFO.mystic.label,
          color: CRIT_PROC_INFO.mystic.color,
          strokeWidth: 15,
          blinkHz: 6,
          holdMs: 900,
          priority: 2,
        });
        playPayout();
      },
      // heavenly crit: the same ultra-strength flash the floors use
      heavenly: () =>
        playTierFlash(
          "ultra",
          CRIT_PROC_INFO.heavenly.label,
          CRIT_PROC_INFO.heavenly.color,
        ),
      // upgrade crit: the flat special flash (the reward itself, promoting
      // every floor's tier one step, is applied by setBuildingCritTier)
      upgrade: () =>
        playSpecialFlash(
          CRIT_PROC_INFO.upgrade.label,
          CRIT_PROC_INFO.upgrade.color,
        ),
      grandOpening: () =>
        playSpecialFlash(
          CRIT_PROC_INFO.grandOpening.label,
          CRIT_PROC_INFO.grandOpening.color,
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

// one building a crit bought on the map landed on
interface MapCritAt {
  floors: Floor[];
  // unlocks every floor it has, for free
  unlockAll(): void;
  addMysticBuilding(): void;
  // the floor chain climbing it from the ground floor, at the tier
  chainFloors(): void;
}

// what a proc does to a building bought on the map; each runs on every
// building the crit lands on, and `extra` adds that many more buildings it
// lands on too. A proc with no entry does nothing on the map
interface MapCrit {
  each?(at: MapCritAt): void;
  extra?(): number;
}

const pokerHand = (count: number): MapCrit => ({ extra: () => count - 1 });

const MAP_CRITS: Partial<Record<CritProcKind, MapCrit>> = {
  mystic: { each: (at) => at.addMysticBuilding() },
  // promotes every floor one step past the tier they were just set to
  upgrade: {
    each: ({ floors }) => {
      for (const floor of floors)
        floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    },
  },
  // unlocks every floor, maxes every tier and grants each a max-tier batch;
  // increaseIncomeRate, not applyUpgradeTick: the building may be off screen
  heavenly: {
    each: (at) => {
      at.unlockAll();
      const maxTier = CRIT_TIER_ORDER[0];
      const count = CRIT_TIER_CONFIG[maxTier].multiplier;
      for (const floor of at.floors) {
        floor.critMultiplierTier = maxTier;
        for (let i = 0; i < count; i++) increaseIncomeRate(floor);
      }
    },
  },
  grandOpening: { each: (at) => at.unlockAll() },
  // unlocks every floor and staffs and furnishes it, tiers and levels kept
  skip: {
    each: (at) => {
      at.unlockAll();
      for (const floor of at.floors) {
        if (!floor.unlocked) continue;
        floor.workerCount = MAX_RENDERED_WORKERS;
        floor.hasManager = true;
        floor.hasOfficeChairs = true;
        floor.hasOfficeSupplies = true;
      }
    },
  },
  luckyClover: {
    each: ({ floors }) => {
      const count = CRIT_TIER_CONFIG[LUCKY_CLOVER_CRIT_TIER].multiplier;
      for (const floor of floors) {
        if (!floor.unlocked) continue;
        for (let run = 0; run < LUCKY_CLOVER_CRIT_COUNT; run++)
          for (let i = 0; i < count; i++) increaseIncomeRate(floor);
      }
    },
  },
  // climbs every building it lands on, and always buys at least one more
  // building, then each next with CHAIN_CRIT_CONTINUE_CHANCE
  chain: {
    each: (at) => at.chainFloors(),
    extra: () => {
      let count = 1;
      while (Math.random() < CHAIN_CRIT_CONTINUE_CHANCE) count++;
      return count;
    },
  },
  // the poker hands: as many buildings as they'd promote floors, this one
  // included
  pair: pokerHand(POKER_HAND_CRIT_COUNTS.pair),
  threeOfAKind: pokerHand(POKER_HAND_CRIT_COUNTS.threeOfAKind),
  fourOfAKind: pokerHand(POKER_HAND_CRIT_COUNTS.fourOfAKind),
  fullHouse: pokerHand(POKER_HAND_CRIT_COUNTS.fullHouse),
  royalFlush: pokerHand(POKER_HAND_CRIT_COUNTS.royalFlush),
};

// the procs that do something on the map, in the order they apply
export const MAP_CRIT_KINDS = Object.keys(MAP_CRITS) as CritProcKind[];

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
  // crit celebration); any floor added later inherits this same tier (see
  // floorLock.ts's ensureLockedFloorAbove). Then every landed map crit's
  // `each` (MAP_CRITS). The chain climbs from index 0, NOT floors.length-1:
  // the walker's first step lands on startIndex+1, and the queued locked floor
  // is always index 1 here (a brand new building is exactly [ground, one
  // queued locked floor]), so starting any later skips it
  function applyBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings: Floor[][],
  ): void {
    const floors = targetBuildings[buildingIndex];
    if (!floors) return;
    const { tier } = result;
    for (const floor of floors) {
      if (!result.skip) floor.critMultiplierTier = tier;
    }
    const at: MapCritAt = {
      floors,
      unlockAll: () => unlockAll(floors, buildingIndex, targetBuildings),
      addMysticBuilding: () => createMysticBuilding(targetBuildings),
      chainFloors: () =>
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
        ),
    };
    for (const kind of MAP_CRIT_KINDS)
      if (result[kind]) MAP_CRITS[kind]!.each?.(at);
  }

  // the building bought, then every building the landed map crits add
  // (`extra`), each landed on the same way
  function setBuildingCritTier(
    buildingIndex: number,
    result: CritRollResult,
    targetBuildings = deps.buildings,
  ): void {
    applyBuildingCritTier(buildingIndex, result, targetBuildings);
    for (const kind of MAP_CRIT_KINDS) {
      if (!result[kind]) continue;
      const extra = MAP_CRITS[kind]!.extra?.() ?? 0;
      for (let i = 0; i < extra; i++)
        applyBuildingCritTier(
          deps.addBuilding(targetBuildings),
          result,
          targetBuildings,
        );
    }
    deps.persist(targetBuildings);
  }

  return { setBuildingCritTier, createMysticBuilding };
}
