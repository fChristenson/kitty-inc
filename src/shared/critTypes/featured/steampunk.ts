import type { STEAMPUNK_CRITS } from "../../critData/steampunk";
import type { FeaturedRewards } from "./types";

export const STEAMPUNK_REWARDS = {
  aetherLantern: (context, { actions, balance }) =>
    actions.upgrade(
      context.floors.slice(0, context.floors.indexOf(context.floor) + 1),
      balance.aetherLanternUpgrades,
    ),
  boilerRoom: (context, { actions, balance, lowestLevel }) =>
    actions.upgrade([lowestLevel(context)], balance.boilerRoomUpgrades),
  brassDiver: (context, { actions, balance }) =>
    actions.repeatCrit(context, "up", balance.brassDiverContinueChance),
  clockworkHand: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.clockworkHandBoostSeconds,
      balance.clockworkHandExtraWorkers,
    ),
  cogwork: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.cogworkDiscount),
  fullSteam: (context, { actions, balance }) =>
    actions.hireWorkers([context.floor], balance.fullSteamWorkers),
  pocketWatch: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.pocketWatchDiscount),
  tubeDelivery: (context, { actions, balance, highestFloor }) =>
    actions.upgrade([highestFloor(context)], balance.tubeDeliveryUpgrades),
  windUp: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.windUpTierSteps,
      balance.windUpUpgrades,
    ),
  clockworkSatellite: (context, { actions, balance }) =>
    actions.discountPrices(
      context.floors,
      balance.clockworkSatelliteDiscount,
    ),
  clockworkOwl: (context, { actions, balance }) =>
    actions.discountPrices(context.floors, balance.clockworkOwlDiscount),
  clockworkWizard2: (context, { actions, balance, highestFloor }) =>
    actions.upgrade(
      [highestFloor(context)],
      balance.clockworkWizard2Upgrades,
    ),
  metalHeart: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.metalHeartUpgrades),
  metalHeart2: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.metalHeart2BoostSeconds,
      balance.metalHeart2ExtraWorkers,
    ),
  clockworkWizard: (context, { balance, promoteAndUpgrade }) =>
    promoteAndUpgrade(
      context.floor,
      balance.clockworkWizardTierSteps,
      balance.clockworkWizardUpgrades,
    ),
  bulwark: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.bulwarkBoostSeconds,
      balance.bulwarkExtraWorkers,
    ),
  fullPlate: (context, { actions }) => actions.hireManagers([context.floor]),
  overlord: (context, { actions, balance }) =>
    actions.repeatCrit(context, "both", balance.overlordContinueChance),
} satisfies FeaturedRewards<typeof STEAMPUNK_CRITS>;
