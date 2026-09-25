import type { CritProcDisplayInfo } from "../index";
import { COLOR } from "../../../palette";

export const BALDURS_GATE_CRIT_INFO = {
  astapurrion: {
    label: "Astapurrion",
    color: COLOR.fullHouseCrimson,
    icon: "astapurrion",
    description: "Nineteen instant payouts on this floor",
  },
  astralclawSkyblade: {
    label: "Astralclaw Skyblade",
    color: COLOR.red,
    icon: "astralclawSkyblade",
    description: "Twenty-three free upgrades on this floor",
  },
  drizztDoPurrden: {
    label: "Drizzt Do'Purrden",
    color: COLOR.cyan,
    icon: "drizztDoPurrden",
    description: "Nine upgrades on alternating floors",
  },
  elmiaowster: {
    label: "Elmiaowster",
    color: COLOR.royalFlushPurple,
    icon: "elmiaowster",
    description: "Two tier promotions and six upgrades here",
  },
  elvenSongblade: {
    label: "Elven Songblade",
    color: COLOR.pairBlue,
    icon: "elvenSongblade",
    description: "Twenty payouts on every unlocked floor",
  },
  galepaw: {
    label: "Galepaw",
    color: COLOR.purple,
    icon: "galepaw",
    description: "Eleven payouts on every unlocked floor",
  },
  halsinpaw: {
    label: "Halsinpaw",
    color: COLOR.dressCodeGreen,
    icon: "halsinpaw",
    description: "Sixteen free upgrades on every unlocked floor",
  },
  hearthpawShadowagent: {
    label: "Hearthpaw Shadowagent",
    color: COLOR.nightShiftIndigo,
    icon: "hearthpawShadowagent",
    description: "Twenty payouts from the highest-earning floor",
  },
  imeown: {
    label: "Imeown",
    color: COLOR.peppermintPink,
    icon: "imeown",
    description: "Thirteen free upgrades on the lowest-level floor",
  },
  jaheirball: {
    label: "Jaheirball",
    color: COLOR.moneyGreen,
    icon: "jaheirball",
    description: "Fourteen payouts on alternating floors",
  },
  karlachonk: {
    label: "Karlachonk",
    color: COLOR.orange,
    icon: "karlachonk",
    description: "Twenty-one free upgrades on this floor",
  },
  laezclaw: {
    label: "Lae'zclaw",
    color: COLOR.suppliesGiveawayLime,
    icon: "laezclaw",
    description: "Nineteen free upgrades on this floor",
  },
  minscAndMeow: {
    label: "Minsc and Meow",
    color: COLOR.supplyRunTan,
    icon: "minscAndMeow",
    description: "Eighteen free upgrades on every unlocked floor",
  },
  sarevmeowk: {
    label: "Sarevmeowk",
    color: COLOR.gold,
    icon: "sarevmeowk",
    description: "Fifteen upgrades on the highest unlocked floor",
  },
  shadowpurr: {
    label: "Shadowpurr",
    color: COLOR.nightOwlIndigo,
    icon: "shadowpurr",
    description: "One tier promotion and eleven upgrades here",
  },
  theEmpurror: {
    label: "The Empurror",
    color: COLOR.halloweenSalePurple,
    icon: "theEmpurror",
    description: "Thirteen payouts on every unlocked floor",
  },
  thisIsTheEnd: {
    label: "This Is The End",
    color: COLOR.luckyCloverGreen,
    icon: "thisIsTheEnd",
    description: "Twenty-two free upgrades on this floor",
  },
  whiskerWyll: {
    label: "Whisker Wyll",
    color: COLOR.blue,
    icon: "whiskerWyll",
    description: "Nineteen payouts from the highest-earning floor",
  },
  winkWink: {
    label: "Wink Wink",
    color: COLOR.springSalePink,
    icon: "winkWink",
    description: "Fourteen free upgrades on the lowest-level floor",
  },
} as const satisfies Record<string, CritProcDisplayInfo>;
