import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WARCRAFT_CRITS = {
  arfthas: {
    label: "Arthas Meow-nenethil",
    color: COLOR.fastForwardBlue,
    image: "crits/warcraft/arfthas.webp",
    description: "Free office chairs and supplies for this floor",
    reward: (context, { actions }) => {
      actions.giveOfficeChairs([context.floor]);
      actions.giveOfficeSupplies([context.floor]);
    },
  },
  guldanMeow: {
    label: "Gul'dan Meow",
    color: COLOR.halloweenSalePurple,
    image: "crits/warcraft/guldanMeow.webp",
    description: "Cuts every price in this building by 6.6%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.guldanMeowDiscount),
  },
  sargerasPurrgeras: {
    label: "Sargeras Purrgeras",
    color: COLOR.fullHouseCrimson,
    image: "crits/warcraft/sargerasPurrgeras.webp",
    description: "Forty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.sargerasPurrgerasUpgrades),
  },
  sylvanwhisker: {
    label: "For the Forsaken!",
    color: COLOR.easterSalePink,
    image: "crits/warcraft/sylvanwhisker.webp",
    description:
      "Repeats the crit on the floor below, 32% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.sylvanwhiskerContinueChance),
  },
  sylvanasWhiskerunner: {
    label: "Sylvanas Whiskerunner",
    color: COLOR.red,
    image: "crits/warcraft/sylvanasWhiskerunner.webp",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sylvanasWhiskerunnerPayouts),
  },
  jainaPurrmoore: {
    label: "Jaina Purrmoore",
    color: COLOR.winterSaleIceBlue,
    image: "crits/warcraft/jainaPurrmoore.webp",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.jainaPurrmooreUpgrades),
  },
  thrallpaw: {
    label: "Thrallpaw",
    color: COLOR.unionBossSlate,
    image: "crits/warcraft/thrallpaw.webp",
    description:
      "Repeats the crit on the floor below, 54% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.thrallpawContinueChance),
  },
  varianWrynnkles: {
    label: "Varian Wrynnkles",
    color: COLOR.goldenHandshakeGold,
    image: "crits/warcraft/varianWrynnkles.webp",
    description:
      "Repeats the crit above and below, 52% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.varianWrynnklesContinueChance,
      ),
  },
  anduinWrynncat: {
    label: "Anduin Wrynncat",
    color: COLOR.heavenlyGold,
    image: "crits/warcraft/anduinWrynncat.webp",
    description:
      "Repeats the crit on the floor above, 35% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "up", balance.anduinWrynncatContinueChance),
  },
  illidandelight: {
    label: "I'm blind not deaf",
    color: COLOR.cloneArmyViolet,
    image: "crits/warcraft/illidandelight.webp",
    description: "Cuts every price in this building by 11.8%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.illidandelightDiscount),
  },
  malfurionStormpaw: {
    label: "Malfurion Stormpaw",
    color: COLOR.luckyCloverGreen,
    image: "crits/warcraft/malfurionStormpaw.webp",
    description:
      "Repeats the crit above and below, 53% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "both",
        balance.malfurionStormpawContinueChance,
      ),
  },
  voljinWhisker: {
    label: "Vol'jin Whisker",
    color: COLOR.royalFlushPurple,
    image: "crits/warcraft/voljinWhisker.webp",
    description: "Cuts every price in this building by 2.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.voljinWhiskerDiscount),
  },
  lorthemewPurron: {
    label: "Lor'themar Purron",
    color: COLOR.grandOpeningRose,
    image: "crits/warcraft/lorthemewPurron.webp",
    description: "Twenty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lorthemewPurronPayouts),
  },
  khadgarPurr: {
    label: "Khatgar Purr",
    color: COLOR.pairBlue,
    image: "crits/warcraft/khadgarPurr.webp",
    description: "Thirty-three free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.khadgarPurrUpgrades),
  },
  garroshHellscreamPurr: {
    label: "Garrosh Hellmeow",
    color: COLOR.red,
    image: "crits/warcraft/garroshHellscreamPurr.webp",
    description: "Boosts every worker for 144s, counting as 3 extra workers",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.garroshHellscreamPurrBoostSeconds,
        balance.garroshHellscreamPurrExtraWorkers,
      ),
  },
  grommewHellscream: {
    label: "Grommash Hellmeow",
    color: COLOR.amber,
    image: "crits/warcraft/grommewHellscream.webp",
    description: "Unlocks the next 3 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.grommewHellscreamFloors),
  },
  deathwingTheDestroycat: {
    label: "Deathpaw the Destroyer",
    color: COLOR.orange,
    image: "crits/warcraft/deathwingTheDestroycat.webp",
    description: "Unlocks the next 5 floors for free",
    reward: (context, { actions, balance }) =>
      actions.unlockFloors(context, balance.deathwingTheDestroycatFloors),
  },
  deathwingAshwing: {
    label: "Deathpaw Ashwing",
    color: COLOR.unionBossSlate,
    image: "crits/warcraft/deathwingAshwing.webp",
    description: "Cuts every price in this building by 17.5%",
    reward: (context, { actions, balance }) =>
      actions.discountPrices(context.floors, balance.deathwingAshwingDiscount),
  },
  deathwingDestroypurr: {
    label: "I Am the Destroyer!",
    color: COLOR.orange,
    image: "crits/warcraft/deathwingDestroypurr.webp",
    description: "Deathwing grants sixty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.deathwingDestroypurrUpgrades),
  },
  ragnapurrs: {
    label: "Ragnaros the Fireclaw",
    color: COLOR.summerSaleOrange,
    image: "crits/warcraft/ragnapurrs.webp",
    description: "Boosts every worker for 31s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.ragnapurrsBoostSeconds,
        balance.ragnapurrsExtraWorkers,
      ),
  },
  medivhMewage: {
    label: "Medivh Mewage",
    color: COLOR.purple,
    image: "crits/warcraft/medivhMewage.webp",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.medivhMewageUpgrades),
  },
  tyrandeWhiskerwind: {
    label: "Tyrande Whiskerwind",
    color: COLOR.cyan,
    image: "crits/warcraft/tyrandeWhiskerwind.webp",
    description:
      "Repeats the crit on the floor above, 50% chance to keep climbing",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(
        context,
        "up",
        balance.tyrandeWhiskerwindContinueChance,
      ),
  },
  tyrandeMoonwhisker: {
    label: "By Elune's Light!",
    color: COLOR.cyan,
    image: "crits/warcraft/tyrandeMoonwhisker.webp",
    description:
      "Tyrande Whisperwind grants thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tyrandeMoonwhiskerPayouts),
  },
  tyrandeWhisperpaws: {
    label: "The Night Warrior Rises!",
    color: COLOR.blue,
    image: "crits/warcraft/tyrandeWhisperpaws.webp",
    description:
      "Tyrande Whisperwind grants thirty-eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tyrandeWhisperpawsPayouts),
  },
  tyrandeStarbow: {
    label: "Elune-Adore",
    color: COLOR.springSalePink,
    image: "crits/warcraft/tyrandeStarbow.webp",
    description:
      "Repeats the crit on the floor below, 33% chance to keep falling",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "down", balance.tyrandeStarbowContinueChance),
  },
  chenStormstout: {
    label: "A Toast to Victory!",
    color: COLOR.teaBreakBrown,
    image: "crits/warcraft/chenStormstout.webp",
    description: "Twenty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.chenStormstoutUpgrades),
  },
  furionStormpaw: {
    label: "Furion Stormpaw",
    color: COLOR.luckyCloverGreen,
    image: "crits/warcraft/furionStormpaw.webp",
    description:
      "Repeats the crit above and below, 90% chance to keep spreading",
    reward: (context, { actions, balance }) =>
      actions.repeatCrit(context, "both", balance.furionStormpawContinueChance),
  },
  whatIsBrewing: {
    label: "What Is Brewing?",
    color: COLOR.teaBreakBrown,
    image: "crits/warcraft/whatIsBrewing.webp",
    description: "Sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.whatIsBrewingPayouts),
  },
  grimVanguard: {
    label: "Grim Vanguard",
    color: COLOR.nightShiftIndigo,
    image: "crits/warcraft/grimVanguard.webp",
    description: "Boosts every worker for 21s",
    reward: (context, { actions, balance }) =>
      actions.boostWorkers(
        context.floors,
        balance.grimVanguardBoostSeconds,
        balance.grimVanguardExtraWorkers,
      ),
  },
  lightforgedPaladin: {
    label: "Lightforged Paladin",
    color: COLOR.overflowBlue,
    image: "crits/warcraft/lightforgedPaladin.webp",
    description: "Free office supplies for this floor",
    reward: (context, { actions }) =>
      actions.giveOfficeSupplies([context.floor]),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
