import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const WARCRAFT_CRITS = {
  arfthas: {
    label: "Arthas Meow-nenethil",
    color: COLOR.fastForwardBlue,
    image: "crits/warcraft/arfthas.png",
    description: "Twenty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.arfthasUpgrades),
  },
  guldanMeow: {
    label: "Gul'dan Meow",
    color: COLOR.halloweenSalePurple,
    image: "crits/warcraft/guldanMeow.png",
    description: "Thirty-one instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.guldanMeowPayouts),
  },
  sargerasPurrgeras: {
    label: "Sargeras Purrgeras",
    color: COLOR.fullHouseCrimson,
    image: "crits/warcraft/sargerasPurrgeras.png",
    description: "Forty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.sargerasPurrgerasUpgrades),
  },
  sylvanwhisker: {
    label: "For the Forsaken!",
    color: COLOR.easterSalePink,
    image: "crits/warcraft/sylvanwhisker.png",
    description: "Twenty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sylvanwhiskerPayouts),
  },
  sylvanasWhiskerunner: {
    label: "Sylvanas Whiskerunner",
    color: COLOR.red,
    image: "crits/warcraft/sylvanasWhiskerunner.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.sylvanasWhiskerunnerPayouts),
  },
  jainaPurrmoore: {
    label: "Jaina Purrmoore",
    color: COLOR.winterSaleIceBlue,
    image: "crits/warcraft/jainaPurrmoore.png",
    description: "Twenty-four free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.jainaPurrmooreUpgrades),
  },
  thrallpaw: {
    label: "Thrallpaw",
    color: COLOR.unionBossSlate,
    image: "crits/warcraft/thrallpaw.png",
    description: "Thirty-two instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.thrallpawPayouts),
  },
  varianWrynnkles: {
    label: "Varian Wrynnkles",
    color: COLOR.goldenHandshakeGold,
    image: "crits/warcraft/varianWrynnkles.png",
    description: "Thirty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.varianWrynnklesUpgrades),
  },
  anduinWrynncat: {
    label: "Anduin Wrynncat",
    color: COLOR.heavenlyGold,
    image: "crits/warcraft/anduinWrynncat.png",
    description: "Thirty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.anduinWrynncatPayouts),
  },
  illidandelight: {
    label: "I'm blind not deaf",
    color: COLOR.cloneArmyViolet,
    image: "crits/warcraft/illidandelight.png",
    description: "Forty-two free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.illidandelightUpgrades),
  },
  malfurionStormpaw: {
    label: "Malfurion Stormpaw",
    color: COLOR.luckyCloverGreen,
    image: "crits/warcraft/malfurionStormpaw.png",
    description: "Thirty-five instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.malfurionStormpawPayouts),
  },
  voljinWhisker: {
    label: "Vol'jin Whisker",
    color: COLOR.royalFlushPurple,
    image: "crits/warcraft/voljinWhisker.png",
    description: "Twenty-six free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.voljinWhiskerUpgrades),
  },
  lorthemewPurron: {
    label: "Lor'themar Purron",
    color: COLOR.grandOpeningRose,
    image: "crits/warcraft/lorthemewPurron.png",
    description: "Twenty-nine instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.lorthemewPurronPayouts),
  },
  khadgarPurr: {
    label: "Khatgar Purr",
    color: COLOR.pairBlue,
    image: "crits/warcraft/khadgarPurr.png",
    description: "Thirty-three free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.khadgarPurrUpgrades),
  },
  garroshHellscreamPurr: {
    label: "Garrosh Hellmeow",
    color: COLOR.red,
    image: "crits/warcraft/garroshHellscreamPurr.png",
    description: "Forty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.garroshHellscreamPurrUpgrades),
  },
  grommewHellscream: {
    label: "Grommash Hellmeow",
    color: COLOR.amber,
    image: "crits/warcraft/grommewHellscream.png",
    description: "Forty instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.grommewHellscreamPayouts),
  },
  deathwingTheDestroycat: {
    label: "Deathpaw the Destroyer",
    color: COLOR.orange,
    image: "crits/warcraft/deathwingTheDestroycat.png",
    description: "Fifty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.deathwingTheDestroycatUpgrades),
  },
  deathwingAshwing: {
    label: "Deathpaw Ashwing",
    color: COLOR.unionBossSlate,
    image: "crits/warcraft/deathwingAshwing.png",
    description: "Deathwing grants fifty free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.deathwingAshwingUpgrades),
  },
  deathwingDestroypurr: {
    label: "I Am the Destroyer!",
    color: COLOR.orange,
    image: "crits/warcraft/deathwingDestroypurr.png",
    description: "Deathwing grants sixty free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.deathwingDestroypurrUpgrades),
  },
  ragnapurrs: {
    label: "Ragnaros the Fireclaw",
    color: COLOR.summerSaleOrange,
    image: "crits/warcraft/ragnapurrs.png",
    description: "Thirty-seven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.ragnapurrsPayouts),
  },
  medivhMewage: {
    label: "Medivh Mewage",
    color: COLOR.purple,
    image: "crits/warcraft/medivhMewage.png",
    description: "Twenty-seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.medivhMewageUpgrades),
  },
  tyrandeWhiskerwind: {
    label: "Tyrande Whiskerwind",
    color: COLOR.cyan,
    image: "crits/warcraft/tyrandeWhiskerwind.png",
    description: "Thirty-four instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tyrandeWhiskerwindPayouts),
  },
  tyrandeMoonwhisker: {
    label: "By Elune's Light!",
    color: COLOR.cyan,
    image: "crits/warcraft/tyrandeMoonwhisker.png",
    description:
      "Tyrande Whisperwind grants thirty-two instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.tyrandeMoonwhiskerPayouts),
  },
  tyrandeWhisperpaws: {
    label: "The Night Warrior Rises!",
    color: COLOR.blue,
    image: "crits/warcraft/tyrandeWhisperpaws.png",
    description:
      "Tyrande Whisperwind grants thirty-eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.tyrandeWhisperpawsPayouts),
  },
  tyrandeStarbow: {
    label: "Elune-Adore",
    color: COLOR.springSalePink,
    image: "crits/warcraft/tyrandeStarbow.png",
    description:
      "Tyrande Whisperwind grants thirty-one free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.tyrandeStarbowUpgrades),
  },
  chenStormstout: {
    label: "A Toast to Victory!",
    color: COLOR.teaBreakBrown,
    image: "crits/warcraft/chenStormstout.png",
    description: "Twenty-five free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.chenStormstoutUpgrades),
  },
  furionStormpaw: {
    label: "Furion Stormpaw",
    color: COLOR.luckyCloverGreen,
    image: "crits/warcraft/furionStormpaw.png",
    description: "Forty-two instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.furionStormpawPayouts),
  },
  whatIsBrewing: {
    label: "What is brewing?",
    color: COLOR.teaBreakBrown,
    image: "crits/warcraft/whatIsBrewing.png",
    description: "Sixteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.whatIsBrewingPayouts),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
