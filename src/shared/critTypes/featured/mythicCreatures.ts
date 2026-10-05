import type { MYTHIC_CREATURES_CRITS } from "../../critData/mythicCreatures";
import type { FeaturedRewards } from "./types";

export const MYTHIC_CREATURES_REWARDS = {
  golem: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.golemContinueChance),
  emberwingDragon: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.emberwingDragonDiscount),
  moonlitKirin: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  pocketPhoenix: (context, { actions }) =>
    actions.startEvent([context.floor], "frozen"),
  crystalGriffin: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.crystalGriffinPayouts),
  velvetManticore: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.velvetManticoreTierSteps,
      balance.velvetManticoreUpgrades,
    ),
  frostfangYeti: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.frostfangYetiDiscount),
  lanternKitsune: (context, { actions }) => actions.armCrit([context.floor], "crit"),
  coralSeaSerpent: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  clockworkMinotaur: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.clockworkMinotaurFloors),
  starryCerberus: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.starryCerberusFloors),
  goldenSphinx: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.goldenSphinxSeconds),
  mossbackTreant: (context, { actions, balance }) =>
    actions.upgrade(context.floors, balance.mossbackTreantUpgrades),
  rainbowAlicorn: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.rainbowAlicornContinueChance),
  bogWitchFamiliar: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.bogWitchFamiliarDiscount),
  pearlHippocampus: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pearlHippocampusShare),
  thunderbirdChick: (context, { actions, balance }) =>
    actions.boostWorkers(
      [context.floor],
      balance.thunderbirdChickBoostSeconds,
      balance.thunderbirdChickExtraWorkers,
    ),
  obsidianBasilisk: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels(
      [lowestLevel(context)],
      Math.floor(topLevel(context) / 2),
    ),
  cloudNymph: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.cloudNymphPayouts),
  glassWyvern: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.glassWyvernPayouts,
    ),
  mossbackManticore: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.mossbackManticoreWorkers),
  emberwingDragon2: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.emberwingDragon2Payouts),
  alicorn: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.alicornDiscount),
  alicorn2: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.alicorn2Discount),
  crystallineDragon: (context, { actions, balance }) => {
    actions.hireWorkers(context.floors, balance.crystallineDragonWorkers);
    actions.hireManagers(context.floors);
  },
  dragonWithEgg: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.dragonWithEggTierSteps,
      balance.dragonWithEggUpgrades,
    ),
  griffin: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.griffinSeconds),
  hippocampus: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.hippocampusShare),
  hydra: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.hydraDiscount),
  kirin: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  kitsune: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.kitsuneSeconds),
  manticore: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.manticoreUpgrades),
  manticore2: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.manticore2ContinueChance),
  manticore3: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.manticore3Share),
  pegasus: (context, { actions }) =>
    actions.giveOfficeSupplies(context.floors),
  phoneix: (context, { actions, balance }) =>
    actions.payCycles(context.floors, balance.phoneixPayouts),
  puppyPosey: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.puppyPoseyContinueChance),
  salamander: (context, { actions, balance, alternating }) =>
    actions.hireWorkers(alternating(context), balance.salamanderWorkers),
  salamander2: (context, { actions, alternating, topLevel }) =>
    actions.raiseLevels(alternating(context), topLevel(context)),
  salamander3: (context, { actions, balance, selectByRate }) =>
    actions.payCycles(
      [selectByRate(context, true)],
      balance.salamander3Payouts,
    ),
  seaSerpet: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.seaSerpetUpgrades),
  thunderbird: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.thunderbirdBoostSeconds,
      balance.thunderbirdExtraWorkers,
    ),
  treant: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.treantContinueChance),
  unicorn: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.unicornPayouts),
  velvetManticore2: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.velvetManticore2TierSteps,
      balance.velvetManticore2Upgrades,
    ),
  velvetManticore3: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.velvetManticore3Seconds),
  mewtwo: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.mewtwoUpgrades),
  purplePoltergeist: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.purplePoltergeistUpgrades),
} satisfies FeaturedRewards<typeof MYTHIC_CREATURES_CRITS>;
