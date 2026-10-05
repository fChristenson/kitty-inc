import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const TREASURES_CRITS = {
  theMoonstoneKey: {
    label: "The Moonstone Key",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/theMoonstoneKey.webp",
    description: "One tier promotion and six upgrades here",
  },
  spellbookSupreme: {
    label: "Spellbook Supreme",
    color: COLOR.purple,
    image: "crits/treasures/spellbookSupreme.webp",
    description: "Unlocks the next floor for free",
  },
  prismPotion: {
    label: "Prism Potion",
    color: COLOR.cyan,
    image: "crits/treasures/prismPotion.webp",
    description: "Fourteen payouts from the highest-earning floor",
  },
  galaxyGumball: {
    label: "Galaxy Gumball",
    color: COLOR.springSalePink,
    image: "crits/treasures/galaxyGumball.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  treasureTruffle: {
    label: "Treasure Truffle",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/treasureTruffle.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  wizardsWaffle: {
    label: "Wizard's Waffle",
    color: COLOR.autumnSaleAmber,
    image: "crits/treasures/wizardsWaffle.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  goldenFortuneCookie: {
    label: "Golden Fortune Cookie",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/goldenFortuneCookie.webp",
    description: "Locks this floor's upgrade price for 5s",
  },
  crystalDragonEgg: {
    label: "Crystal Dragon Egg",
    color: COLOR.cyan,
    image: "crits/treasures/crystalDragonEgg.webp",
    description: "Twelve free upgrades on this floor",
  },
  diamondCompass: {
    label: "Diamond Compass",
    color: COLOR.blue,
    image: "crits/treasures/diamondCompass.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  emeraldCrown: {
    label: "Emerald Crown",
    color: COLOR.moneyGreen,
    image: "crits/treasures/emeraldCrown.webp",
    description: "One tier promotion and eight upgrades here",
  },
  goldenFleece: {
    label: "Golden Fleece",
    color: COLOR.gold,
    image: "crits/treasures/goldenFleece.webp",
    description: "Seven payouts on every unlocked floor",
  },
  imperialScepter: {
    label: "Imperial Scepter",
    color: COLOR.heavenlyGold,
    image: "crits/treasures/imperialScepter.webp",
    description:
      "Raises the lowest-level floor to half the building's top level",
  },
  rubyHeartRelic: {
    label: "Ruby Heart Relic",
    color: COLOR.fullHouseCrimson,
    image: "crits/treasures/rubyHeartRelic.webp",
    description: "Twelve instant payouts on this floor",
  },
  sapphireHourglass: {
    label: "Sapphire Hourglass",
    color: COLOR.silverTicketGray,
    image: "crits/treasures/sapphireHourglass.webp",
    description: "Free office chairs for this floor",
  },
  vaultOfJewels: {
    label: "Vault of Jewels",
    color: COLOR.goldenHandshakeGold,
    image: "crits/treasures/vaultOfJewels.webp",
    description: "Six free upgrades on every unlocked floor",
  },
  goldenIdol: {
    label: "Golden Idol",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/treasures/goldenIdol.webp",
    description: "Fifteen free upgrades on this floor",
  },
  chestOfSwag: {
    label: "Chest Of Swag",
    color: COLOR.chairGiveawayBrown,
    image: "crits/treasures/chestOfSwag.webp",
    description: "Adds 20.2% of your total income",
  },
  heavyIsTheHead: {
    label: "Heavy Is The Head",
    color: COLOR.amber,
    image: "crits/treasures/heavyIsTheHead.webp",
    description: "Arms this floor's next click as an x25 crit",
  },
} as const satisfies Record<string, FeaturedCritData>;
