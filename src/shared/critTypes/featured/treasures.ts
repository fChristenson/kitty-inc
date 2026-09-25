import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const TREASURES_CRIT_INFO = {
  theMoonstoneKey: {
    label: "The Moonstone Key",
    color: COLOR.silverTicketGray,
    icon: "theMoonstoneKey",
    description: "One tier promotion and six upgrades here",
  },
  spellbookSupreme: {
    label: "Spellbook Supreme",
    color: COLOR.purple,
    icon: "spellbookSupreme",
    description: "Twelve free upgrades on this floor",
  },
  prismPotion: {
    label: "Prism Potion",
    color: COLOR.cyan,
    icon: "prismPotion",
    description: "Fourteen payouts from the highest-earning floor",
  },
  galaxyGumball: {
    label: "Galaxy Gumball",
    color: COLOR.springSalePink,
    icon: "galaxyGumball",
    description: "Eleven instant payouts on this floor",
  },
  treasureTruffle: {
    label: "Treasure Truffle",
    color: COLOR.goldenHandshakeGold,
    icon: "treasureTruffle",
    description: "Five upgrades and five payouts on this floor",
  },
  wizardsWaffle: {
    label: "Wizard's Waffle",
    color: COLOR.autumnSaleAmber,
    icon: "wizardsWaffle",
    description: "Ten free upgrades on every unlocked floor",
  },
  goldenFortuneCookie: {
    label: "Golden Fortune Cookie",
    color: COLOR.heavenlyGold,
    icon: "goldenFortuneCookie",
    description: "Nine free upgrades on the lowest-level floor",
  },
  crystalDragonEgg: {
    label: "Crystal Dragon Egg",
    color: COLOR.cyan,
    icon: "crystalDragonEgg",
    description: "Twelve free upgrades on this floor",
  },
  diamondCompass: {
    label: "Diamond Compass",
    color: COLOR.blue,
    icon: "diamondCompass",
    description: "Ten payouts from the highest-earning floor",
  },
  emeraldCrown: {
    label: "Emerald Crown",
    color: COLOR.moneyGreen,
    icon: "emeraldCrown",
    description: "One tier promotion and eight upgrades here",
  },
  goldenFleece: {
    label: "Golden Fleece",
    color: COLOR.gold,
    icon: "goldenFleece",
    description: "Seven payouts on every unlocked floor",
  },
  imperialScepter: {
    label: "Imperial Scepter",
    color: COLOR.heavenlyGold,
    icon: "imperialScepter",
    description: "Thirteen free upgrades on the highest floor",
  },
  rubyHeartRelic: {
    label: "Ruby Heart Relic",
    color: COLOR.fullHouseCrimson,
    icon: "rubyHeartRelic",
    description: "Twelve instant payouts on this floor",
  },
  sapphireHourglass: {
    label: "Sapphire Hourglass",
    color: COLOR.silverTicketGray,
    icon: "sapphireHourglass",
    description: "Nine payouts on alternating floors, from the ground",
  },
  vaultOfJewels: {
    label: "Vault of Jewels",
    color: COLOR.goldenHandshakeGold,
    icon: "vaultOfJewels",
    description: "Six free upgrades on every unlocked floor",
  },
  goldenIdol: {
    label: "Golden Idol",
    color: COLOR.goldenParachuteMarigold,
    icon: "goldenIdol",
    description: "Fifteen free upgrades on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
