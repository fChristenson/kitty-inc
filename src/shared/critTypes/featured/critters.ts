import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CRITTERS_CRITS = {
  crownHedgehog: {
    label: "Crown Hedgehog",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/crownHedgehog.webp",
    description: "One tier promotion and twenty-two upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.crownHedgehogTierSteps,
        balance.crownHedgehogUpgrades,
      ),
  },
  lanternFox: {
    label: "Lantern Fox",
    color: COLOR.orange,
    image: "crits/critters/lanternFox.webp",
    description: "Thirty-one payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.lanternFoxPayouts,
      ),
  },
  lanternLynx: {
    label: "Lantern Lynx",
    color: COLOR.orange,
    image: "crits/critters/lanternLynx.webp",
    description: "Boosts this floor's workers for 25s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        [context.floor],
        balance.lanternLynxBoostSeconds,
        balance.lanternLynxExtraWorkers,
      ),
  },
  pearlOtter: {
    label: "Pearl Otter",
    color: COLOR.cyan,
    image: "crits/critters/pearlOtter.webp",
    description: "Adds 6.9% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.pearlOtterShare),
  },
  profitPigeon: {
    label: "Profit Pigeon",
    color: COLOR.moneyGreen,
    image: "crits/critters/profitPigeon.webp",
    description: "Adds 13s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.profitPigeonSeconds),
  },
  redPanda: {
    label: "Red Panda",
    color: COLOR.red,
    image: "crits/critters/redPanda.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.redPandaFloors),
  },
  goldenGardenGolem: {
    label: "Golden Garden Golem",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/goldenGardenGolem.webp",
    description: "Adds 10% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.goldenGardenGolemShare),
  },
  vaultBeetle: {
    label: "Vault Beetle",
    color: COLOR.gold,
    image: "crits/critters/vaultBeetle.webp",
    description: "Adds 20s of your company's income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeSeconds(balance.vaultBeetleSeconds),
  },
  antleredFoxFortune: {
    label: "Antlered Fox Fortune",
    color: COLOR.orange,
    image: "crits/critters/antleredFoxFortune.webp",
    description: "Adds 7% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.antleredFoxFortuneShare),
  },
  bestestBoy: {
    label: "Bestest Boy",
    color: COLOR.summerSaleOrange,
    image: "crits/critters/bestestBoy.webp",
    description: "Forty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bestestBoyUpgrades),
  },
  doggo: {
    label: "Doggo",
    color: COLOR.roundUpOrange,
    image: "crits/critters/doggo.webp",
    description: "Thirty-eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.doggoPayouts),
  },
  otterlyAdorable: {
    label: "Otterly Adorable",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/otterlyAdorable.webp",
    description: "Boosts every worker for 30s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.otterlyAdorableBoostSeconds,
        balance.otterlyAdorableExtraWorkers,
      ),
  },
  sleepyFox: {
    label: "Fox Nap",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/sleepyFox.webp",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sleepyFoxPayouts),
  },
  sleepyPanda: {
    label: "Panda Snooze",
    color: COLOR.nightShiftIndigo,
    image: "crits/critters/sleepyPanda.webp",
    description: "Cuts every price in this building by 6.4%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.sleepyPandaDiscount),
  },
  samoyedSmile: {
    label: "Samoyed Smile",
    color: COLOR.snowdayFrost,
    image: "crits/critters/samoyedSmile.webp",
    description: "Thirty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.samoyedSmilePayouts),
  },
  fluffball: {
    label: "Fluffball",
    color: COLOR.silverTicketGray,
    image: "crits/critters/fluffball.webp",
    description: "Cuts every price in this building by 4.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.fluffballDiscount),
  },
  cloudPup: {
    label: "Cloud Pup",
    color: COLOR.winterSaleIceBlue,
    image: "crits/critters/cloudPup.webp",
    description: "Cuts every price in this building by 4.2%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.cloudPupDiscount),
  },
  snowdriftSammy: {
    label: "Snowdrift Sammy",
    color: COLOR.frozenIceBlue,
    image: "crits/critters/snowdriftSammy.webp",
    description: "Raises the lowest-level floor to the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  },
  corgiCrossing: {
    label: "Corgi Crossing",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/critters/corgiCrossing.webp",
    description: "Boosts every worker for 38s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(context.floors, balance.corgiCrossingBoostSeconds, balance.corgiCrossingExtraWorkers),
  },
  feetsOfFury: {
    label: "Feets Of Fury",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/critters/feetsOfFury.webp",
    description: "Pays 26 times this floor's upgrade price in cash",
    reward: (context, { actions, balance }) =>
      actions.addUpgradePriceCash([context.floor], balance.feetsOfFuryMultiple),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
