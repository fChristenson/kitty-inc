// the main categories a featured roll picks between, evenly, before landing
// one of the group's crits by its chance; every image category
// (critData/<category>.ts) belongs to exactly one
import type { FEATURED_CRITS } from ".";

type Crits = typeof FEATURED_CRITS;
export type FeaturedCategory = {
  [K in keyof Crits]: Crits[K]["image"] extends `crits/${infer C}/${string}`
    ? C
    : never;
}[keyof Crits];

export const CRIT_GROUPS = {
  girls: [
    "demonGirls",
    "elementalWomen",
    "darkBeauties",
    "cowGirls",
    "pinups",
    "bigAttitude",
    "showbiz",
    "partyTime",
    "chromePerformers",
    "chromeGlamour",
    "weightTraining",
    "bodybuildingPoses",
    "lowerBodyTraining",
    "yogaAndStretching",
    "combatAthletics",
    "gymTeams",
    "wrestling",
    "glamourAndRunway",
    "fantasyAndWorship",
    "kissesAndPouts",
    "kissesAndPinups",
    "embraces",
    "courtshipAndDates",
    "fantasyRomances",
    "romanticPortraits",
    "duoHairstyles",
    "matchingOutfits",
    "pairedPoses",
    "duoGroupScenes",
    "affectionateDuos",
    "soleCloseups",
    "pedicureAndAdornments",
    "footPoses",
    "footKisses",
    "fantasyFeet",
    "footwearAndLegwear",
    "muscleFeet",
    "spaDay",
  ],
  food: [
    "bakery",
    "cakes",
    "candy",
    "iceCream",
    "sweetTreats",
    "comfortFood",
    "fastFood",
    "farmFresh",
    "drinks",
    "eastAsianFeasts",
    "southAsianFeasts",
    "mediterraneanFeasts",
    "africanAndAmericasFeasts",
  ],
  misc: [
    "mythicCreatures",
    "runes",
    "warhammerArmor",
    "warhammerBattles",
    "steampunk",
    "voyages",
    "hacking",
    "cyberpunk",
    "graffiti",
    "luckyCats",
    "catGirls",
    "fighters",
    "mafia",
    "yakuza",
    "heroes",
    "dayJob",
    "rescueSquad",
    "cozyCute",
    "critters",
    "baldursGate",
    "warcraft",
    "adventurers",
    "gameQuotes",
    "gamerLife",
    "gear",
    "frontiers",
  ],
  wealth: [
    "cashAndCurrency",
    "treasureAndFortunes",
    "relicsAndTreasures",
    "luckyCharms",
    "tableGamesAndCards",
    "arcadeAndLuckyGames",
    "atomicLab",
    "metalsAndMinerals",
    "skyAndSpaceElements",
    "energyAndNature",
  ],
} as const satisfies Record<string, readonly FeaturedCategory[]>;

type Ungrouped = Exclude<
  FeaturedCategory,
  (typeof CRIT_GROUPS)[keyof typeof CRIT_GROUPS][number]
>;
// doesn't compile while a category is in no group (the error names it)
export const EVERY_CATEGORY_GROUPED: Record<Ungrouped, never> = {};
