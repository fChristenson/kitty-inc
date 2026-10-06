import type { MUSCLE_FEET_CRITS } from "../../critData/muscleFeet";
import type { FeaturedRewards } from "./types";

export const MUSCLE_FEET_REWARDS = {
  soleMate: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.soleMateUpgrades),
  toeTapper: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.toeTapperPayouts),
  heelAppeal: (context, { actions, belowAndHere }) =>
    actions.raiseLevels(belowAndHere(context), context.floor.upgradeCount),
  solePower: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.solePowerBoostSeconds,
      balance.solePowerExtraWorkers,
    ),
  tiptoeTitan: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.tiptoeTitanTierSteps,
      balance.tiptoeTitanUpgrades,
    ),
  footloose: (context, { actions, balance, alternating }) =>
    actions.payCycles(alternating(context), balance.footloosePayouts),
  tenLittlePiggies: (context, { actions, balance }) =>
    actions.unlockFloors(context, balance.tenLittlePiggiesFloors),
  pedicurePinup: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pedicurePinupDiscount),
  wiggleRoom: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.wiggleRoomPayouts),
  cozyToes: (context, { actions, balance, lowestLevel }) =>
    actions.payCycles([lowestLevel(context)], balance.cozyToesPayouts),
  barefootBoss: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  bigFootEnergy: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.bigFootEnergyTierSteps,
      balance.bigFootEnergyUpgrades,
    ),
  tickleMePink: (context, { balance, upgradeAndPay }) =>
    upgradeAndPay(
      [context.floor],
      balance.tickleMePinkUpgrades,
      balance.tickleMePinkPayouts,
    ),
  galaTootsies: (context, { actions }) =>
    actions.startEvent(context.floors, "spendingFreeze"),
  redCarpetStomp: (context, { balance, promoteAndUpgrade, selectByRate }) =>
    promoteAndUpgrade(
      selectByRate(context, false),
      balance.redCarpetStompTierSteps,
      balance.redCarpetStompUpgrades,
    ),
  putYourFeetUp: (context, { actions, balance }) =>
    actions.repeatCrit(context, "down", balance.putYourFeetUpContinueChance),
  highTen: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.highTenDiscount),
  toeTheLine: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.toeTheLineDiscount),
  heelDrive: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.heelDriveContinueChance),
  plantarPower: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.plantarPowerDiscount),
  tiptoeTreasury: (context, { actions }) => actions.armCrit(context.floors, "crit"),
  greenLeggingsGenuflect: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.greenLeggingsGenuflectUpgrades),
  pinkBootsPraise: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.pinkBootsPraiseMultiple),
  purpleLeggingsReverence: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.purpleLeggingsReverenceMultiple),
  redLeggingsRapture: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.redLeggingsRaptureMultiple),
  matchingSneakers: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.matchingSneakersUpgrades),
} satisfies FeaturedRewards<typeof MUSCLE_FEET_CRITS>;
