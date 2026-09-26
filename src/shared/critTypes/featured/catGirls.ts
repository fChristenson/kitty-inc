import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CAT_GIRLS_CRITS = {
  pawsAndEffect: {
    label: "Paws and Effect",
    color: COLOR.peppermintPink,
    image: "crits/catGirls/pawsAndEffect.png",
    description: "Sixty-nine free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.pawsAndEffectUpgrades),
  },
  catwalkQueen: {
    label: "Catwalk Queen",
    color: COLOR.bonusRoundGold,
    image: "crits/catGirls/catwalkQueen.png",
    description: "Two tier promotions and twenty-five upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.catwalkQueenTierSteps,
        balance.catwalkQueenUpgrades,
      ),
  },
  runwayRoyalty: {
    label: "Runway Royalty",
    color: COLOR.goldenTicketYellow,
    image: "crits/catGirls/runwayRoyalty.png",
    description: "Sixty-seven upgrades on the top earner",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.upgrade(
        [selectByRate(context, true)],
        balance.runwayRoyaltyUpgrades,
      ),
  },
  blueHourStrut: {
    label: "Blue Hour Strut",
    color: COLOR.fastForwardBlue,
    image: "crits/catGirls/blueHourStrut.png",
    description: "Sixty-nine payouts from the highest-earning floor",
    reward: (context, { actions, balance, selectByRate }) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.blueHourStrutPayouts,
      ),
  },
  felineFine: {
    label: "Feline Fine",
    color: COLOR.autumnSaleAmber,
    image: "crits/catGirls/felineFine.png",
    description: "Sixty-four upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.felineFineUpgrades),
  },
  kittenHeels: {
    label: "Kitten Heels",
    color: COLOR.grandOpeningRose,
    image: "crits/catGirls/kittenHeels.png",
    description: "Sixty-three upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade([highestFloor(context)], balance.kittenHeelsUpgrades),
  },
  catsPajamas: {
    label: "Cat's Pajamas",
    color: COLOR.internSkyBlue,
    image: "crits/catGirls/catsPajamas.png",
    description:
      "Twenty-two upgrades and twenty-one payouts on every unlocked floor",
    reward: (context, { balance, upgradeAndPay }) =>
      upgradeAndPay(
        context.floors,
        balance.catsPajamasUpgrades,
        balance.catsPajamasPayouts,
      ),
  },
  bedtimeBonus: {
    label: "Bedtime Bonus",
    color: COLOR.pairBlue,
    image: "crits/catGirls/bedtimeBonus.png",
    description:
      "Twenty-seven upgrades and thirty-one payouts on alternating floors",
    reward: (context, { alternating, balance, upgradeAndPay }) =>
      upgradeAndPay(
        alternating(context),
        balance.bedtimeBonusUpgrades,
        balance.bedtimeBonusPayouts,
      ),
  },
  purrsuasion: {
    label: "Purrsuasion",
    color: COLOR.silverTicketGray,
    image: "crits/catGirls/purrsuasion.png",
    description: "Forty-five upgrades here and on the lowest-level floor",
    reward: (context, { actions, balance, hereAnd, lowestLevel }) =>
      actions.upgrade(
        hereAnd(context, lowestLevel(context)),
        balance.purrsuasionUpgrades,
      ),
  },
  coinBoop: {
    label: "Coin Boop",
    color: COLOR.goldStandardAmber,
    image: "crits/catGirls/coinBoop.png",
    description: "Sixty-eight instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.coinBoopPayouts),
  },
  tailSwish: {
    label: "Tail Swish",
    color: COLOR.royalFlushPurple,
    image: "crits/catGirls/tailSwish.png",
    description: "Fifty-five upgrades on this floor and every floor below",
    reward: (context, { actions, balance, belowAndHere }) =>
      actions.upgrade(belowAndHere(context), balance.tailSwishUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
