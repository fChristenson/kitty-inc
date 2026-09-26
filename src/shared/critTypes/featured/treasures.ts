import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const TREASURES_CRITS = {
  theMoonstoneKey: {
    label: "The Moonstone Key",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/theMoonstoneKey.png",
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
    image: "crits/treasures/spellbookSupreme.png",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.spellbookSupremeUpgrades),
  },
  prismPotion: {
    label: "Prism Potion",
    color: COLOR.cyan,
    image: "crits/treasures/prismPotion.png",
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
    image: "crits/treasures/galaxyGumball.png",
    description: "Eleven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.galaxyGumballPayouts),
  },
  treasureTruffle: {
    label: "Treasure Truffle",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/treasureTruffle.png",
    description: "Five upgrades and five payouts on this floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade([context.floor], balance.treasureTruffleUpgrades);
      actions.payCycles([context.floor], balance.treasureTrufflePayouts);
    },
  },
  wizardsWaffle: {
    label: "Wizard's Waffle",
    color: COLOR.autumnSaleAmber,
    image: "crits/treasures/wizardsWaffle.png",
    description: "Ten free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.wizardsWaffleUpgrades),
  },
  goldenFortuneCookie: {
    label: "Golden Fortune Cookie",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/goldenFortuneCookie.png",
    description: "Nine free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade(
        [lowestLevel(context)],
        balance.goldenFortuneCookieUpgrades,
      ),
  },
  crystalDragonEgg: {
    label: "Crystal Dragon Egg",
    color: COLOR.cyan,
    image: "crits/treasures/crystalDragonEgg.png",
    description: "Twelve free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.crystalDragonEggUpgrades),
  },
  diamondCompass: {
    label: "Diamond Compass",
    color: COLOR.blue,
    image: "crits/treasures/diamondCompass.png",
    description: "Ten payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.diamondCompassPayouts,
      ),
  },
  emeraldCrown: {
    label: "Emerald Crown",
    color: COLOR.moneyGreen,
    image: "crits/treasures/emeraldCrown.png",
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
    image: "crits/treasures/goldenFleece.png",
    description: "Seven payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.goldenFleecePayouts),
  },
  imperialScepter: {
    label: "Imperial Scepter",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/imperialScepter.png",
    description: "Thirteen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.imperialScepterUpgrades),
  },
  rubyHeartRelic: {
    label: "Ruby Heart Relic",
    color: COLOR.fullHouseCrimson,
    image: "crits/treasures/rubyHeartRelic.png",
    description: "Twelve instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.rubyHeartRelicPayouts),
  },
  sapphireHourglass: {
    label: "Sapphire Hourglass",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/sapphireHourglass.png",
    description: "Nine payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.sapphireHourglassPayouts),
  },
  vaultOfJewels: {
    label: "Vault of Jewels",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/vaultOfJewels.png",
    description: "Six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.vaultOfJewelsUpgrades),
  },
  goldenIdol: {
    label: "Golden Idol",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/treasures/goldenIdol.png",
    description: "Fifteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.goldenIdolUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
