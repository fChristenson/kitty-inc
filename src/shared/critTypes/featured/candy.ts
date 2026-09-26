import { COLOR } from "../../../palette";
import type { FeaturedCritDefinition } from "./types";

export const CANDY_CRITS = {
  chocolateFountainOfYouth: {
    label: "Chocolate Fountain of Youth",
    color: COLOR.autumnSaleAmber,
    image: "crits/candy/chocolateFountainOfYouth.png",
    description: "Twenty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(
        [context.floor],
        balance.chocolateFountainOfYouthPayouts,
      ),
  },
  gummyBearMarket: {
    label: "Gummy Bear Market",
    color: COLOR.red,
    image: "crits/candy/gummyBearMarket.png",
    description: "Ten free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.gummyBearMarketUpgrades),
  },
  jawbreaker: {
    label: "Jawbreaker",
    color: COLOR.purple,
    image: "crits/candy/jawbreaker.png",
    description: "Eighteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.jawbreakerUpgrades),
  },
  licoriceLaces: {
    label: "Licorice Laces",
    color: COLOR.fullHouseCrimson,
    image: "crits/candy/licoriceLaces.png",
    description: "Nine free upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.licoriceLacesUpgrades),
  },
  lollipopGuild: {
    label: "Lollipop Guild",
    color: COLOR.peppermintPink,
    image: "crits/candy/lollipopGuild.png",
    description: "Twelve payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.lollipopGuildPayouts),
  },
  marshmallowMountain: {
    label: "Marshmallow Mountain",
    color: COLOR.white,
    image: "crits/candy/marshmallowMountain.png",
    description: "Eight free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.marshmallowMountainUpgrades,
      ),
  },
  sugarHigh: {
    label: "Sugar High",
    color: COLOR.starYellow,
    image: "crits/candy/sugarHigh.png",
    description: "Five upgrades and five payouts on every unlocked floor",
    reward: (context, { actions, balance }) => {
      actions.upgrade(context.floors, balance.sugarHighUpgrades);
      actions.payCycles(context.floors, balance.sugarHighPayouts);
    },
  },
  bubblegumBalloon: {
    label: "Bubblegum Balloon",
    color: COLOR.springSalePink,
    image: "crits/candy/bubblegumBalloon.png",
    description: "Fifteen instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.bubblegumBalloonPayouts),
  },
  candyCaneClimber: {
    label: "Candy Cane Climber",
    color: COLOR.red,
    image: "crits/candy/candyCaneClimber.png",
    description: "Twelve free upgrades on the highest unlocked floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.candyCaneClimberUpgrades,
      ),
  },
  sherbetSherpa: {
    label: "Sherbet Sherpa",
    color: COLOR.easterSalePink,
    image: "crits/candy/sherbetSherpa.png",
    description: "Eight instant payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.sherbetSherpaPayouts),
  },
  toffeeTrap: {
    label: "Toffee Trap",
    color: COLOR.autumnSaleAmber,
    image: "crits/candy/toffeeTrap.png",
    description: "Seven free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.toffeeTrapUpgrades),
  },
  cottonCandyCloud: {
    label: "Cotton Candy Cloud",
    color: COLOR.peppermintPink,
    image: "crits/candy/cottonCandyCloud.png",
    description: "Eleven instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.cottonCandyCloudPayouts),
  },
  fudgeIt: {
    label: "Fudge It",
    color: COLOR.autumnSaleAmber,
    image: "crits/candy/fudgeIt.png",
    description: "Fourteen free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.fudgeItUpgrades),
  },
  gobstopperGetaway: {
    label: "Gobstopper Getaway",
    color: COLOR.orange,
    image: "crits/candy/gobstopperGetaway.png",
    description: "Thirteen free upgrades on the highest floor",
    reward: (context, { actions, balance, highestFloor }) =>
      actions.upgrade(
        [highestFloor(context)],
        balance.gobstopperGetawayUpgrades,
      ),
  },
  jellyBeanJamboree: {
    label: "Jelly Bean Jamboree",
    color: COLOR.springSalePink,
    image: "crits/candy/jellyBeanJamboree.png",
    description: "Ten payouts on alternating floors, from the ground",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.jellyBeanJamboreePayouts),
  },
  rockCandyQuarry: {
    label: "Rock Candy Quarry",
    color: COLOR.cyan,
    image: "crits/candy/rockCandyQuarry.png",
    description: "One tier promotion and seven upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.rockCandyQuarryTierSteps,
        balance.rockCandyQuarryUpgrades,
      ),
  },
  sprinkleStorm: {
    label: "Sprinkle Storm",
    color: COLOR.blue,
    image: "crits/candy/sprinkleStorm.png",
    description: "Six free upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.sprinkleStormUpgrades),
  },
  candyCastle: {
    label: "Candy Castle",
    color: COLOR.peppermintPink,
    image: "crits/candy/candyCastle.png",
    description: "Thirty-six payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.candyCastlePayouts),
  },
  caramelApple: {
    label: "Caramel Apple",
    color: COLOR.autumnSaleAmber,
    image: "crits/candy/caramelApple.png",
    description: "Twenty-eight free upgrades on this floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade([context.floor], balance.caramelAppleUpgrades),
  },
  moonlitMint: {
    label: "Moonlit Mint",
    color: COLOR.moneyGreen,
    image: "crits/candy/moonlitMint.png",
    description: "Twenty-six payouts on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.payCycles(alternating(context), balance.moonlitMintPayouts),
  },
  gumdropGazillionaire: {
    label: "Gumdrop Gazillionaire",
    color: COLOR.bonusRoundGold,
    image: "crits/candy/gumdropGazillionaire.png",
    description: "Forty-one upgrades on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.upgrade(context.floors, balance.gumdropGazillionaireUpgrades),
  },
  candyCornCornucopia: {
    label: "Candy Corn Cornucopia",
    color: COLOR.autumnSaleAmber,
    image: "crits/candy/candyCornCornucopia.png",
    description: "Forty-one payouts on every unlocked floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles(context.floors, balance.candyCornCornucopiaPayouts),
  },
  butterscotchBuyout: {
    label: "Butterscotch Buyout",
    color: COLOR.goldStandardAmber,
    image: "crits/candy/butterscotchBuyout.png",
    description: "Forty-two upgrades on the cheapest floor to upgrade",
    reward: (context, { actions, balance, cheapest }) =>
      actions.upgrade([cheapest(context)], balance.butterscotchBuyoutUpgrades),
  },
  sourStrawSprint: {
    label: "Sour Straw Sprint",
    color: COLOR.fastForwardBlue,
    image: "crits/candy/sourStrawSprint.png",
    description: "Thirty-six upgrades here and on the highest floor",
    reward: (context, { actions, balance, highestFloor }) => {
      const highest = highestFloor(context);
      actions.upgrade([context.floor], balance.sourStrawSprintUpgrades);
      if (highest !== context.floor)
        actions.upgrade([highest], balance.sourStrawSprintUpgrades);
    },
  },
  pralinePremium: {
    label: "Praline Premium",
    color: COLOR.amberMuted,
    image: "crits/candy/pralinePremium.png",
    description: "One tier promotion and twenty-eight upgrades here",
    reward: (context, { balance, promoteAndUpgrade }) =>
      promoteAndUpgrade(
        context.floor,
        balance.pralinePremiumTierSteps,
        balance.pralinePremiumUpgrades,
      ),
  },
  fizzyFortune: {
    label: "Fizzy Fortune",
    color: COLOR.cyan,
    image: "crits/candy/fizzyFortune.png",
    description: "Forty-eight payouts on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.payCycles([lowestLevel(context)], balance.fizzyFortunePayouts),
  },
  marzipanMogul: {
    label: "Marzipan Mogul",
    color: COLOR.peppermintPink,
    image: "crits/candy/marzipanMogul.png",
    description: "Fifty instant payouts on this floor",
    reward: (context, { actions, balance }) =>
      actions.payCycles([context.floor], balance.marzipanMogulPayouts),
  },
  gummyWormWealth: {
    label: "Gummy Worm Wealth",
    color: COLOR.bullMarketGreen,
    image: "crits/candy/gummyWormWealth.png",
    description: "Forty-four upgrades on the lowest-level floor",
    reward: (context, { actions, balance, lowestLevel }) =>
      actions.upgrade([lowestLevel(context)], balance.gummyWormWealthUpgrades),
  },
  chocolateCoinCartel: {
    label: "Chocolate Coin Cartel",
    color: COLOR.coinGold,
    image: "crits/candy/chocolateCoinCartel.png",
    description: "Nineteen upgrades and twenty-five payouts on the top earner",
    reward: (context, { balance, selectByRate, upgradeAndPay }) =>
      upgradeAndPay(
        [selectByRate(context, true)],
        balance.chocolateCoinCartelUpgrades,
        balance.chocolateCoinCartelPayouts,
      ),
  },
  honeycombHustle: {
    label: "Honeycomb Hustle",
    color: COLOR.amber,
    image: "crits/candy/honeycombHustle.png",
    description: "Thirty-six free upgrades on alternating floors",
    reward: (context, { actions, balance, alternating }) =>
      actions.upgrade(alternating(context), balance.honeycombHustleUpgrades),
  },
  candyComet: {
    label: "Candy Comet",
    color: COLOR.peppermintPink,
    image: "crits/candy/candyComet.png",
    description: "Fifty-seven upgrades rolling down the floors below",
    reward: (context, { actions, balance, cascadeDown }) =>
      actions.upgrade(cascadeDown(context), balance.candyCometUpgrades),
  },
} as const satisfies Record<string, FeaturedCritDefinition>;
