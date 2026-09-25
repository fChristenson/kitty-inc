import type { CritRewardContext } from "../index";
import type { RewardHelpers } from "./helpers";

export function createMythicCreaturesRewards({
  actions,
  balance,
  highestFloor,
  lowestLevel,
  selectByRate,
  alternating,
  promoteAndUpgrade,
}: RewardHelpers) {
  return {
    golem: (context) =>
      actions.upgrade([highestFloor(context)], balance.golemUpgrades),
    emberwingDragon: (context) =>
      actions.upgrade([context.floor], balance.emberwingDragonUpgrades),
    moonlitKirin: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.moonlitKirinPayouts,
      ),
    pocketPhoenix: (context) =>
      actions.upgrade([context.floor], balance.pocketPhoenixUpgrades),
    crystalGriffin: (context) =>
      actions.payCycles(context.floors, balance.crystalGriffinPayouts),
    velvetManticore: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.velvetManticoreTierSteps,
        balance.velvetManticoreUpgrades,
      ),
    frostfangYeti: (context) =>
      actions.upgrade(context.floors, balance.frostfangYetiUpgrades),
    lanternKitsune: (context) =>
      actions.payCycles([context.floor], balance.lanternKitsunePayouts),
    coralSeaSerpent: (context) =>
      actions.payCycles([context.floor], balance.coralSeaSerpentPayouts),
    clockworkMinotaur: (context) =>
      actions.upgrade([context.floor], balance.clockworkMinotaurUpgrades),
    starryCerberus: (context) =>
      actions.upgrade(alternating(context), balance.starryCerberusUpgrades),
    goldenSphinx: (context) =>
      actions.upgrade([highestFloor(context)], balance.goldenSphinxUpgrades),
    mossbackTreant: (context) =>
      actions.upgrade(context.floors, balance.mossbackTreantUpgrades),
    rainbowAlicorn: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.rainbowAlicornPayouts,
      ),
    bogWitchFamiliar: (context) =>
      actions.upgrade([context.floor], balance.bogWitchFamiliarUpgrades),
    pearlHippocampus: (context) =>
      actions.payCycles([context.floor], balance.pearlHippocampusPayouts),
    thunderbirdChick: (context) =>
      actions.upgrade([context.floor], balance.thunderbirdChickUpgrades),
    obsidianBasilisk: (context) =>
      actions.upgrade([context.floor], balance.obsidianBasiliskUpgrades),
    cloudNymph: (context) =>
      actions.payCycles(context.floors, balance.cloudNymphPayouts),
    glassWyvern: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.glassWyvernPayouts,
      ),
    mossbackManticore: (context) =>
      actions.payCycles(context.floors, balance.mossbackManticorePayouts),
    emberwingDragon2: (context) =>
      actions.payCycles([context.floor], balance.emberwingDragon2Payouts),
    alicorn: (context) =>
      actions.payCycles([selectByRate(context, true)], balance.alicornPayouts),
    alicorn2: (context) =>
      actions.upgrade([context.floor], balance.alicorn2Upgrades),
    crystallineDragon: (context) =>
      actions.upgrade(context.floors, balance.crystallineDragonUpgrades),
    dragonWithEgg: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.dragonWithEggTierSteps,
        balance.dragonWithEggUpgrades,
      ),
    griffin: (context) =>
      actions.payCycles(context.floors, balance.griffinPayouts),
    hippocampus: (context) =>
      actions.payCycles([context.floor], balance.hippocampusPayouts),
    hydra: (context) =>
      actions.upgrade(alternating(context), balance.hydraUpgrades),
    kirin: (context) =>
      actions.upgrade([lowestLevel(context)], balance.kirinUpgrades),
    kitsune: (context) =>
      actions.payCycles([context.floor], balance.kitsunePayouts),
    manticore: (context) =>
      actions.upgrade([context.floor], balance.manticoreUpgrades),
    manticore2: (context) =>
      actions.payCycles(context.floors, balance.manticore2Payouts),
    manticore3: (context) =>
      actions.upgrade([highestFloor(context)], balance.manticore3Upgrades),
    pegasus: (context) =>
      actions.upgrade(alternating(context), balance.pegasusUpgrades),
    phoneix: (context) =>
      actions.payCycles(context.floors, balance.phoneixPayouts),
    puppyPosey: (context) =>
      actions.upgrade([context.floor], balance.puppyPoseyUpgrades),
    salamander: (context) =>
      actions.payCycles([context.floor], balance.salamanderPayouts),
    salamander2: (context) =>
      actions.upgrade(context.floors, balance.salamander2Upgrades),
    salamander3: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.salamander3Payouts,
      ),
    seaSerpet: (context) =>
      actions.upgrade([context.floor], balance.seaSerpetUpgrades),
    thunderbird: (context) =>
      actions.payCycles(context.floors, balance.thunderbirdPayouts),
    treant: (context) =>
      actions.upgrade(context.floors, balance.treantUpgrades),
    unicorn: (context) =>
      actions.payCycles([context.floor], balance.unicornPayouts),
    velvetManticore2: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.velvetManticore2TierSteps,
        balance.velvetManticore2Upgrades,
      ),
    velvetManticore3: (context) =>
      actions.upgrade([context.floor], balance.velvetManticore3Upgrades),
  } satisfies Record<string, (context: CritRewardContext) => void>;
}
