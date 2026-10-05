import type { LUCKY_CATS_CRITS } from "../../critData/luckyCats";
import type { FeaturedRewards } from "./types";

export const LUCKY_CATS_REWARDS = {
  purrfectUnit: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.purrfectUnitUpgrades),
  bigIsBeautiful: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bigIsBeautifulSeconds),
  cleanItUp: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.cleanItUpPayouts),
  fabulousChonk: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.fabulousChonkSeconds),
  helloThere: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.helloTherePayouts),
  honeyPlease: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.honeyPleasePayouts),
  iCanHas: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.iCanHasSeconds),
  intenseWorkout: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.intenseWorkoutUpgrades),
  loveMe: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.loveMeUpgrades),
  onTheProwl: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.onTheProwlPayouts),
  purrfectShape: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.purrfectShapeSeconds),
  superSharp: (context, { actions, balance }) =>
    actions.upgrade([context.floor], balance.superSharpUpgrades),
  belleOfTheBall: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.belleOfTheBallGrowth),
  blueSnooze: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.blueSnoozeUpgrades),
  bottledUp: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.bottledUpMultiple),
  brassButtons: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.brassButtonsGrowth),
  campfireCrew: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.campfireCrewUpgrades),
  dapperDividend: (context, { actions, balance }) =>
    actions.addUpgradePriceCash(context.floors, balance.dapperDividendMultiple),
  deckChairBoss: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.deckChairBossGrowth),
  firesideChat: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.firesideChatUpgrades),
  huddleUp: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.huddleUpMultiple),
  jugHugger: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.jugHuggerGrowth),
  kindlingKitties: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.kindlingKittiesUpgrades),
  oldMoney: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.oldMoneyMultiple),
  paidVacation: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.paidVacationGrowth),
  powerNap: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.powerNapUpgrades),
  royalTreatment: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.royalTreatmentMultiple),
  shadyDeal: (context, { actions, balance }) =>
    actions.growLevels([context.floor], balance.shadyDealGrowth),
  sleepItOff: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.sleepItOffUpgrades),
  sunnySavings: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.sunnySavingsMultiple),
  tealAppeal: (context, { actions, balance }) =>
    actions.growLevels(context.floors, balance.tealAppealGrowth),
} satisfies FeaturedRewards<typeof LUCKY_CATS_CRITS>;
