import type { KISSES_AND_PINUPS_CRITS } from "../../critData/kissesAndPinups";
import type { FeaturedRewards } from "./types";

export const KISSES_AND_PINUPS_REWARDS = {
  swingAndASmooch: (context, { actions, lowestLevel, topLevel }) =>
    actions.raiseLevels([lowestLevel(context)], topLevel(context)),
  pumpAndPout: (context, { actions, balance }) =>
    actions.boostWorkers(
      context.floors,
      balance.pumpAndPoutBoostSeconds,
      balance.pumpAndPoutExtraWorkers,
    ),
  blowAKissBudget: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.blowAKissBudgetShare),
  blueKissBonus: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blueKissBonusPayouts),
  farewellKissFund: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.farewellKissFundShare),
  kissKissCapital: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kissKissCapitalShare),
  kissMarkProfit: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.kissMarkProfitShare),
  kissYourMoneyHello: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.kissYourMoneyHelloPayouts),
  pointedProfits: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.pointedProfitsShare),
  rainbowKissRebate: (_context, { actions, balance }) =>
    actions.addIncomeShare(balance.rainbowKissRebateShare),
  sealedKissCheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.sealedKissCheckPayouts),
  smoochStipend: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.smoochStipendPayouts),
  sunnySmoochShares: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sunnySmoochSharesSeconds),
  pixieKissPaycheck: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.pixieKissPaycheckPayouts),
  smoochSalary: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.smoochSalaryPayouts),
  bigHairPout: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bigHairPoutSeconds),
  blushingPucker: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.blushingPuckerPayouts),
  peckPlease: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.peckPleasePayouts),
  lipService: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.lipServiceSeconds),
  candyLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.candyLipsSeconds),
  kissyFace: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.kissyFaceSeconds),
  lipGlossGrin: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.lipGlossGrinPayouts),
  hotLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.hotLipsSeconds),
  mwahaha: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.mwahahaPayouts),
  mostKissable: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.mostKissableSeconds),
  puckerUp: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.puckerUpPayouts),
  redHotKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.redHotKissPayouts),
  bedroomEyes: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.bedroomEyesSeconds),
  airKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.airKissPayouts),
  xoxo: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.xoxoSeconds),
  sugarKiss: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.sugarKissSeconds),
  tenderLips: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.tenderLipsPayouts),
  beeStungLips: (_context, { actions, balance }) =>
    actions.addIncomeSeconds(balance.beeStungLipsSeconds),
  winkAndAKiss: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.winkAndAKissPayouts),
  selfLove: (context, { actions, balance }) =>
    actions.payCycles([context.floor], balance.selfLovePayouts),
  lipNibble: (context, { actions, balance }) =>
    actions.spreadUpgrades(context.floors, balance.lipNibbleUpgrades),
  mohawkMwah: (context, { actions, balance }) =>
    actions.addUpgradePriceCash([context.floor], balance.mohawkMwahMultiple),
  olivePout: (context, { actions, balance, highestFloor }) =>
    actions.addUpgradePriceCash([highestFloor(context)], balance.olivePoutMultiple),
  royalHandKiss: (context, { actions, balance, belowAndHere }) =>
    actions.spreadUpgrades(belowAndHere(context), balance.royalHandKissUpgrades),
} satisfies FeaturedRewards<typeof KISSES_AND_PINUPS_CRITS>;
