import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const WARCRAFT_CRIT_INFO = {
  arfthas: {
    label: "Arthas Meow-nenethil",
    color: COLOR.fastForwardBlue,
    icon: "arfthas",
    description: "Twenty-two free upgrades on this floor",
  },
  guldanMeow: {
    label: "Gul'dan Meow",
    color: COLOR.halloweenSalePurple,
    icon: "guldanMeow",
    description: "Thirty-one instant payouts on this floor",
  },
  sargerasPurrgeras: {
    label: "Sargeras Purrgeras",
    color: COLOR.fullHouseCrimson,
    icon: "sargerasPurrgeras",
    description: "Forty-five free upgrades on every unlocked floor",
  },
  sylvanwhisker: {
    label: "For the Forsaken!",
    color: COLOR.easterSalePink,
    icon: "sylvanwhisker",
    description: "Twenty-eight instant payouts on this floor",
  },
  sylvanasWhiskerunner: {
    label: "Sylvanas Whiskerunner",
    color: COLOR.red,
    icon: "sylvanasWhiskerunner",
    description: "Thirty instant payouts on this floor",
  },
  jainaPurrmoore: {
    label: "Jaina Purrmoore",
    color: COLOR.winterSaleIceBlue,
    icon: "jainaPurrmoore",
    description: "Twenty-four free upgrades on this floor",
  },
  thrallpaw: {
    label: "Thrallpaw",
    color: COLOR.unionBossSlate,
    icon: "thrallpaw",
    description: "Thirty-two instant payouts on every unlocked floor",
  },
  varianWrynnkles: {
    label: "Varian Wrynnkles",
    color: COLOR.goldenHandshakeGold,
    icon: "varianWrynnkles",
    description: "Thirty-eight free upgrades on this floor",
  },
  anduinWrynncat: {
    label: "Anduin Wrynncat",
    color: COLOR.heavenlyGold,
    icon: "anduinWrynncat",
    description: "Thirty instant payouts on this floor",
  },
  illidandelight: {
    label: "I'm blind not deaf",
    color: COLOR.cloneArmyViolet,
    icon: "illidandelight",
    description: "Forty-two free upgrades on this floor",
  },
  malfurionStormpaw: {
    label: "Malfurion Stormpaw",
    color: COLOR.luckyCloverGreen,
    icon: "malfurionStormpaw",
    description: "Thirty-five instant payouts on every unlocked floor",
  },
  voljinWhisker: {
    label: "Vol'jin Whisker",
    color: COLOR.royalFlushPurple,
    icon: "voljinWhisker",
    description: "Twenty-six free upgrades on this floor",
  },
  lorthemewPurron: {
    label: "Lor'themar Purron",
    color: COLOR.grandOpeningRose,
    icon: "lorthemewPurron",
    description: "Twenty-nine instant payouts on this floor",
  },
  khadgarPurr: {
    label: "Khatgar Purr",
    color: COLOR.pairBlue,
    icon: "khadgarPurr",
    description: "Thirty-three free upgrades on every unlocked floor",
  },
  garroshHellscreamPurr: {
    label: "Garrosh Hellmeow",
    color: COLOR.red,
    icon: "garroshHellscreamPurr",
    description: "Forty-eight free upgrades on this floor",
  },
  grommewHellscream: {
    label: "Grommash Hellmeow",
    color: COLOR.amber,
    icon: "grommewHellscream",
    description: "Forty instant payouts on every unlocked floor",
  },
  deathwingTheDestroycat: {
    label: "Deathpaw the Destroyer",
    color: COLOR.orange,
    icon: "deathwingTheDestroycat",
    description: "Fifty-five free upgrades on every unlocked floor",
  },
  deathwingAshwing: {
    label: "Deathpaw Ashwing",
    color: COLOR.unionBossSlate,
    icon: "deathwingAshwing",
    description: "Deathwing grants fifty free upgrades on this floor",
  },
  deathwingDestroypurr: {
    label: "I Am the Destroyer!",
    color: COLOR.orange,
    icon: "deathwingDestroypurr",
    description: "Deathwing grants sixty free upgrades on every unlocked floor",
  },
  ragnapurrs: {
    label: "Ragnaros the Fireclaw",
    color: COLOR.summerSaleOrange,
    icon: "ragnapurrs",
    description: "Thirty-seven instant payouts on this floor",
  },
  medivhMewage: {
    label: "Medivh Mewage",
    color: COLOR.purple,
    icon: "medivhMewage",
    description: "Twenty-seven free upgrades on this floor",
  },
  tyrandeWhiskerwind: {
    label: "Tyrande Whiskerwind",
    color: COLOR.cyan,
    icon: "tyrandeWhiskerwind",
    description: "Thirty-four instant payouts on this floor",
  },
  tyrandeMoonwhisker: {
    label: "By Elune's Light!",
    color: COLOR.cyan,
    icon: "tyrandeMoonwhisker",
    description:
      "Tyrande Whisperwind grants thirty-two instant payouts on this floor",
  },
  tyrandeWhisperpaws: {
    label: "The Night Warrior Rises!",
    color: COLOR.blue,
    icon: "tyrandeWhisperpaws",
    description:
      "Tyrande Whisperwind grants thirty-eight instant payouts on every unlocked floor",
  },
  tyrandeStarbow: {
    label: "Elune-Adore",
    color: COLOR.springSalePink,
    icon: "tyrandeStarbow",
    description:
      "Tyrande Whisperwind grants thirty-one free upgrades on this floor",
  },
  chenStormstout: {
    label: "A Toast to Victory!",
    color: COLOR.teaBreakBrown,
    icon: "chenStormstout",
    description: "Twenty-five free upgrades on every unlocked floor",
  },
  furionStormpaw: {
    label: "Furion Stormpaw",
    color: COLOR.luckyCloverGreen,
    icon: "furionStormpaw",
    description: "Forty-two instant payouts on every unlocked floor",
  },
  whatIsBrewing: {
    label: "What isBrewing?",
    color: COLOR.teaBreakBrown,
    icon: "whatIsBrewing",
    description: "Sixteen instant payouts on this floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
