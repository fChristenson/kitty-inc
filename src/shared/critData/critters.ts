import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const CRITTERS_CRITS = {
  crownHedgehog: {
    label: "Crown Hedgehog",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/crownHedgehog.webp",
    description: "One tier promotion and twenty-two upgrades here",
  },
  lanternFox: {
    label: "Lantern Fox",
    color: COLOR.orange,
    image: "crits/critters/lanternFox.webp",
    description: "Thirty-one payouts from the highest-earning floor",
  },
  lanternLynx: {
    label: "Lantern Lynx",
    color: COLOR.orange,
    image: "crits/critters/lanternLynx.webp",
    description: "Boosts this floor's workers for 25s",
  },
  pearlOtter: {
    label: "Pearl Otter",
    color: COLOR.cyan,
    image: "crits/critters/pearlOtter.webp",
    description: "Adds 6.9% of your total income",
  },
  profitPigeon: {
    label: "Profit Pigeon",
    color: COLOR.moneyGreen,
    image: "crits/critters/profitPigeon.webp",
    description: "Adds 13s of your company's income",
  },
  redPanda: {
    label: "Red Panda",
    color: COLOR.red,
    image: "crits/critters/redPanda.webp",
    description: "Unlocks the next floor for free",
  },
  goldenGardenGolem: {
    label: "Golden Garden Golem",
    color: COLOR.goldenHandshakeGold,
    image: "crits/critters/goldenGardenGolem.webp",
    description: "Adds 10% of your total income",
  },
  vaultBeetle: {
    label: "Vault Beetle",
    color: COLOR.gold,
    image: "crits/critters/vaultBeetle.webp",
    description: "Adds 20s of your company's income",
  },
  antleredFoxFortune: {
    label: "Antlered Fox Fortune",
    color: COLOR.orange,
    image: "crits/critters/antleredFoxFortune.webp",
    description: "Adds 7% of your total income",
  },
  bestestBoy: {
    label: "Bestest Boy",
    color: COLOR.summerSaleOrange,
    image: "crits/critters/bestestBoy.webp",
    description: "Forty-one free upgrades on this floor",
  },
  doggo: {
    label: "Doggo",
    color: COLOR.roundUpOrange,
    image: "crits/critters/doggo.webp",
    description: "Thirty-eight instant payouts on every unlocked floor",
  },
  otterlyAdorable: {
    label: "Otterly Adorable",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/otterlyAdorable.webp",
    description: "Boosts every worker for 30s",
  },
  sleepyFox: {
    label: "Fox Nap",
    color: COLOR.teaBreakBrown,
    image: "crits/critters/sleepyFox.webp",
    description: "Thirty-four instant payouts on this floor",
  },
  sleepyPanda: {
    label: "Panda Snooze",
    color: COLOR.nightShiftIndigo,
    image: "crits/critters/sleepyPanda.webp",
    description: "Cuts every price in this building by 6.4%",
  },
  samoyedSmile: {
    label: "Samoyed Smile",
    color: COLOR.snowdayFrost,
    image: "crits/critters/samoyedSmile.webp",
    description: "Thirty-nine instant payouts on this floor",
  },
  fluffball: {
    label: "Fluffball",
    color: COLOR.silverTicketGray,
    image: "crits/critters/fluffball.webp",
    description: "Cuts every price in this building by 4.6%",
  },
  cloudPup: {
    label: "Cloud Pup",
    color: COLOR.winterSaleIceBlue,
    image: "crits/critters/cloudPup.webp",
    description: "Cuts every price in this building by 4.2%",
  },
  snowdriftSammy: {
    label: "Snowdrift Sammy",
    color: COLOR.frozenIceBlue,
    image: "crits/critters/snowdriftSammy.webp",
    description: "Raises the lowest-level floor to the building's top level",
  },
  corgiCrossing: {
    label: "Corgi Crossing",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/critters/corgiCrossing.webp",
    description: "Boosts every worker for 38s",
  },
  feetsOfFury: {
    label: "Feets Of Fury",
    color: COLOR.goldenParachuteMarigold,
    image: "crits/critters/feetsOfFury.webp",
    description: "Pays 26 times this floor's upgrade price in cash",
  },
  denimRat: {
    label: "Denim Rat",
    color: COLOR.coffeeRunTeal,
    image: "crits/critters/denimRat.webp",
    description: "Grows this floor's level by 26.6% in free upgrades",
  },
  kettleCrew: {
    label: "Kettle Crew",
    color: COLOR.chairGiveawayBrown,
    image: "crits/critters/kettleCrew.webp",
    description: "Adds 40.9% of your total income",
  },
  shipshapeCats: {
    label: "Shipshape Cats",
    color: COLOR.amberMuted,
    image: "crits/critters/shipshapeCats.webp",
    description: "Adds 41% of your total income",
  },
} as const satisfies Record<string, FeaturedCritData>;
