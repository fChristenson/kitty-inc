import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const TREASURES_CRITS = {
  theMoonstoneKey: {
    label: "The Moonstone Key",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/theMoonstoneKey.webp",
    description: "One tier promotion and six upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.theMoonstoneKeyTierSteps,
        balance.theMoonstoneKeyUpgrades,
      ),
  },
  spellbookSupreme: {
    label: "Spellbook Supreme",
    color: COLOR.purple,
    image: "crits/treasures/spellbookSupreme.webp",
    description: "Unlocks the next floor for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.spellbookSupremeFloors),
  },
  prismPotion: {
    label: "Prism Potion",
    color: COLOR.cyan,
    image: "crits/treasures/prismPotion.webp",
    description: "Fourteen payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.prismPotionPayouts,
      ),
  },
  galaxyGumball: {
    label: "Galaxy Gumball",
    color: COLOR.springSalePink,
    image: "crits/treasures/galaxyGumball.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  treasureTruffle: {
    label: "Treasure Truffle",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/treasureTruffle.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  wizardsWaffle: {
    label: "Wizard's Waffle",
    color: COLOR.autumnSaleAmber,
    image: "crits/treasures/wizardsWaffle.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  goldenFortuneCookie: {
    label: "Golden Fortune Cookie",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/goldenFortuneCookie.webp",
    description: "Locks this floor's upgrade price for 5s",
    reward: (context, { actions }) =>
      actions.startEvent([context.floor], "frozen"),
  },
  crystalDragonEgg: {
    label: "Crystal Dragon Egg",
    color: COLOR.cyan,
    image: "crits/treasures/crystalDragonEgg.webp",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.crystalDragonEggUpgrades),
  },
  diamondCompass: {
    label: "Diamond Compass",
    color: COLOR.blue,
    image: "crits/treasures/diamondCompass.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  emeraldCrown: {
    label: "Emerald Crown",
    color: COLOR.moneyGreen,
    image: "crits/treasures/emeraldCrown.webp",
    description: "One tier promotion and eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.emeraldCrownTierSteps,
        balance.emeraldCrownUpgrades,
      ),
  },
  goldenFleece: {
    label: "Golden Fleece",
    color: COLOR.gold,
    image: "crits/treasures/goldenFleece.webp",
    description: "Seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldenFleecePayouts),
  },
  imperialScepter: {
    label: "Imperial Scepter",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/imperialScepter.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
    reward: (context, { actions, lowestLevel, topLevel }) =>
      actions.raiseLevels(
        [lowestLevel(context)],
        Math.floor(topLevel(context) / 2),
      ),
  },
  rubyHeartRelic: {
    label: "Ruby Heart Relic",
    color: COLOR.fullHouseCrimson,
    image: "crits/treasures/rubyHeartRelic.webp",
    description: "Twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.rubyHeartRelicPayouts),
  },
  sapphireHourglass: {
    label: "Sapphire Hourglass",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/sapphireHourglass.webp",
    description: "Free office chairs for this floor",
    reward: (context, { actions }) => actions.giveOfficeChairs([context.floor]),
  },
  vaultOfJewels: {
    label: "Vault of Jewels",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/vaultOfJewels.webp",
    description: "Six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.vaultOfJewelsUpgrades),
  },
  goldenIdol: {
    label: "Golden Idol",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/treasures/goldenIdol.webp",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.goldenIdolUpgrades),
  },
  chestOfSwag: {
    label: "Chest Of Swag",
    color: COLOR.chairGiveawayBrown,
    image: "crits/treasures/chestOfSwag.webp",
    description: "Adds 20.2% of your total income",
    reward: (_context, { actions, balance }) =>
      actions.addIncomeShare(balance.chestOfSwagShare),
  },
  heavyIsTheHead: {
    label: "Heavy Is The Head",
    color: COLOR.amber,
    image: "crits/treasures/heavyIsTheHead.webp",
    description: "Arms this floor's next click as an x25 crit",
    reward: (context, { actions }) =>
      actions.armCrit([context.floor], "mega"),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
