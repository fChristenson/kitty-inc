import { COLOR } from "../../palette";
import type { FeaturedCritData } from "./types";

export const GOLDEN_ANIMALS_CRITS = {
  goldLion: {
    label: "Golden Lion",
    color: COLOR.gold,
    image: "crits/goldenAnimals/goldLion.webp",
    description: "Adds 13s of your company's income",
  },
  goldElephant: {
    label: "Golden Elephant",
    color: COLOR.sunshineGold,
    image: "crits/goldenAnimals/goldElephant.webp",
    description: "Adds 6.7% of your total income",
  },
  goldBear: {
    label: "Golden Bear",
    color: COLOR.orange,
    image: "crits/goldenAnimals/goldBear.webp",
    description: "Adds 13s of your company's income",
  },
  goldWolf: {
    label: "Golden Wolf",
    color: COLOR.blue,
    image: "crits/goldenAnimals/goldWolf.webp",
    description: "Adds 6.3% of your total income",
  },
  goldOwl: {
    label: "Golden Owl",
    color: COLOR.luckyCloverGreen,
    image: "crits/goldenAnimals/goldOwl.webp",
    description: "Adds 11s of your company's income",
  },
  goldRam: {
    label: "Golden Ram",
    color: COLOR.starYellow,
    image: "crits/goldenAnimals/goldRam.webp",
    description: "Adds 5.6% of your total income",
  },
  goldRabbit: {
    label: "Golden Rabbit",
    color: COLOR.springSalePink,
    image: "crits/goldenAnimals/goldRabbit.webp",
    description: "Adds 10s of your company's income",
  },
  goldCat: {
    label: "Golden Cat",
    color: COLOR.teaBreakBrown,
    image: "crits/goldenAnimals/goldCat.webp",
    description: "Adds 5.3% of your total income",
  },
  goldenLion: {
    label: "King of the Jungle",
    color: COLOR.heavenlyGold,
    image: "crits/goldenAnimals/goldenLion.webp",
    description: "One tier promotion, then twenty free upgrades here",
  },
  platinumPaw: {
    label: "Platinum Paw",
    color: COLOR.silverTicketGray,
    image: "crits/goldenAnimals/platinumPaw.webp",
    description: "One tier promotion and forty-one upgrades here",
  },
  gildedWyrm: {
    label: "Gilded Wyrm",
    color: COLOR.amberMuted,
    image: "crits/goldenAnimals/gildedWyrm.webp",
    description: "Adds 20.1% of your total income",
  },
  bullionDrake: {
    label: "Bullion Drake",
    color: COLOR.amber,
    image: "crits/goldenAnimals/bullionDrake.webp",
    description: "One tier promotion and ten upgrades on the lowest-level floor",
  },
  slowAndGold: {
    label: "Slow And Gold",
    color: COLOR.amber,
    image: "crits/goldenAnimals/slowAndGold.webp",
    description: "Raises the lowest-level floor to half the building's top level",
  },
  platinumPlume: {
    label: "Platinum Plume",
    color: COLOR.amberMuted,
    image: "crits/goldenAnimals/platinumPlume.webp",
    description: "Free office supplies for this floor",
  },
} as const satisfies Record<string, FeaturedCritData>;
