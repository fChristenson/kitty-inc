import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CRITTERS_CRITS = {
  crownHedgehog: {
    label: "Crown Hedgehog",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/crownHedgehog.png",
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
    image: "crits/critters/lanternFox.png",
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
    image: "crits/critters/lanternLynx.png",
    description: "Twenty-three free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.lanternLynxUpgrades),
  },
  pearlOtter: {
    label: "Pearl Otter",
    color: COLOR.cyan,
    image: "crits/critters/pearlOtter.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.pearlOtterPayouts),
  },
  profitPigeon: {
    label: "Profit Pigeon",
    color: COLOR.moneyGreen,
    image: "crits/critters/profitPigeon.png",
    description: "Twenty-seven payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.profitPigeonPayouts),
  },
  redPanda: {
    label: "Red Panda",
    color: COLOR.red,
    image: "crits/critters/redPanda.png",
    description: "Thirty-one upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.redPandaUpgrades),
  },
  goldenGardenGolem: {
    label: "Golden Garden Golem",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/goldenGardenGolem.png",
    description: "Thirty-three payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldenGardenGolemPayouts),
  },
  vaultBeetle: {
    label: "Vault Beetle",
    color: COLOR.gold,
    image: "crits/critters/vaultBeetle.png",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.vaultBeetleUpgrades),
  },
  antleredFoxFortune: {
    label: "Antlered Fox Fortune",
    color: COLOR.orange,
    image: "crits/critters/antleredFoxFortune.png",
    description: "Thirty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.antleredFoxFortuneUpgrades),
  },
  bestestBoy: {
    label: "Bestest Boy",
    color: COLOR.summerSaleOrange,
    image: "crits/critters/bestestBoy.png",
    description: "Forty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.bestestBoyUpgrades),
  },
  doggo: {
    label: "Doggo",
    color: COLOR.roundUpOrange,
    image: "crits/critters/doggo.png",
    description: "Thirty-eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.doggoPayouts),
  },
  otterlyAdorable: {
    label: "Otterly Adorable",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/otterlyAdorable.png",
    description: "Thirty-five instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.otterlyAdorablePayouts),
  },
  sleepyFox: {
    label: "Fox Nap",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/sleepyFox.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sleepyFoxPayouts),
  },
  sleepyPanda: {
    label: "Panda Snooze",
    color: COLOR.nightShiftIndigo,
    image: "crits/critters/sleepyPanda.png",
    description: "Forty-three free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.sleepyPandaUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
