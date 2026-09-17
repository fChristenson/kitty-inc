import { CONFIG } from "../../config";
import type { Floor } from "../../gameState";
import { nextCritTier, type FeaturedCritKind } from "../../shared/critTypes";
import { gt, lt, type BigNumber } from "../../shared/bigNumber";
import type { CritRewardContext } from "./index";

interface FeaturedRewardActions {
  upgrade: (floors: Floor[], count: number) => void;
  payCycles: (floors: Floor[], count: number) => void;
  incomeRate: (floor: Floor, now: number) => BigNumber;
}

export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const balance = CONFIG.crit;
  const highestFloor = (context: CritRewardContext) =>
    context.floors.filter((floor) => floor.unlocked).at(-1) ?? context.floor;
  const lowestLevel = (context: CritRewardContext) =>
    context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          floor.upgradeCount < best.upgradeCount ? floor : best,
        context.floor,
      );
  const selectByRate = (context: CritRewardContext, highest: boolean) => {
    const now = Date.now();
    const compare = highest ? gt : lt;
    return context.floors
      .filter((floor) => floor.unlocked)
      .reduce(
        (best, floor) =>
          compare(actions.incomeRate(floor, now), actions.incomeRate(best, now))
            ? floor
            : best,
        context.floor,
      );
  };
  const promoteAndUpgrade = (floor: Floor, steps: number, upgrades: number) => {
    for (let step = 0; step < steps; step++) {
      floor.critMultiplierTier = nextCritTier(floor.critMultiplierTier);
    }
    actions.upgrade([floor], upgrades);
  };

  return {
    ballerina: (context) => {
      actions.upgrade([context.floor], balance.ballerinaUpgrades);
      actions.payCycles([context.floor], balance.ballerinaPayouts);
    },
    cowboy: (context) =>
      actions.upgrade([lowestLevel(context)], balance.cowboyUpgrades),
    dinnerTime: (context) =>
      actions.payCycles(context.floors, balance.dinnerTimePayouts),
    fingerGuns: (context) => {
      actions.upgrade([context.floor], balance.fingerGunsUpgrades);
      actions.upgrade([highestFloor(context)], balance.fingerGunsUpgrades);
    },
    flamenco: (context) =>
      actions.upgrade(context.floors, balance.flamencoUpgrades),
    milestone: (context) => {
      const count =
        balance.milestoneStep -
        (context.floor.upgradeCount % balance.milestoneStep);
      actions.upgrade([context.floor], count);
    },
    moonwalker: (context) => {
      const targets = context.floors.slice(
        0,
        context.floors.indexOf(context.floor) + 1,
      );
      actions.upgrade(targets, balance.moonwalkerUpgrades);
    },
    ninja: (context) => actions.upgrade([context.floor], balance.ninjaUpgrades),
    obelisk: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.obeliskTierSteps,
        balance.obeliskUpgrades,
      ),
    sharpShooter: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.sharpShooterPayouts,
      ),
    space: (context) =>
      actions.upgrade([highestFloor(context)], balance.spaceUpgrades),
    yesChef: (context) =>
      actions.payCycles(context.floors, balance.yesChefPayouts),
    amethyst: (context) =>
      actions.payCycles([context.floor], balance.amethystPayouts),
    blessed: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.blessedTierSteps,
        balance.blessedUpgrades,
      ),
    centurion: (context) =>
      actions.upgrade([context.floor], balance.centurionUpgrades),
    checkUp: (context) => {
      const floor = lowestLevel(context);
      actions.upgrade([floor], balance.checkUpUpgrades);
      actions.payCycles([floor], balance.checkUpPayouts);
    },
    diamond: (context) =>
      actions.payCycles([context.floor], balance.diamondPayouts),
    emerald: (context) =>
      actions.payCycles([context.floor], balance.emeraldPayouts),
    fireman: (context) => {
      actions.upgrade(context.floors, balance.firemanUpgrades);
      actions.payCycles(context.floors, balance.firemanPayouts);
    },
    forTheEmperor: (context) =>
      actions.upgrade(context.floors, balance.forTheEmperorUpgrades),
    forTheKing: (context) =>
      actions.upgrade(context.floors, balance.forTheKingUpgrades),
    goldNugget: (context) =>
      actions.payCycles([context.floor], balance.goldNuggetPayouts),
    goldRush: (context) =>
      actions.payCycles(context.floors, balance.goldRushPayouts),
    hammerTime: (context) =>
      actions.upgrade([context.floor], balance.hammerTimeUpgrades),
    robinHood: (context) => {
      actions.payCycles(
        [selectByRate(context, true)],
        balance.robinHoodPayouts,
      );
      actions.upgrade([lowestLevel(context)], balance.robinHoodUpgrades);
    },
    roman: (context) => actions.upgrade(context.floors, balance.romanUpgrades),
    ruby: (context) => actions.payCycles([context.floor], balance.rubyPayouts),
    samurai: (context) =>
      actions.upgrade([context.floor], balance.samuraiUpgrades),
    saphire: (context) =>
      actions.payCycles([context.floor], balance.saphirePayouts),
    silverRush: (context) =>
      actions.payCycles(context.floors, balance.silverRushPayouts),
    spy: (context) =>
      actions.upgrade([selectByRate(context, false)], balance.spyUpgrades),
    theLawWon: (context) => {
      const cheapest = context.floors
        .filter((floor) => floor.unlocked)
        .reduce(
          (best, floor) =>
            lt(floor.upgradeCost, best.upgradeCost) ? floor : best,
          context.floor,
        );
      actions.upgrade([cheapest], balance.theLawWonUpgrades);
      actions.payCycles([cheapest], balance.theLawWonPayouts);
    },
    victorian: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.victorianPayouts,
      ),
    executiveSpin: (context) =>
      actions.upgrade([highestFloor(context)], balance.executiveSpinUpgrades),
    rubberStampede: (context) =>
      actions.payCycles(context.floors, balance.rubberStampedePayouts),
    replyAll: (context) => {
      const lowest = lowestLevel(context);
      actions.payCycles([context.floor], balance.replyAllPayouts);
      if (lowest !== context.floor)
        actions.payCycles([lowest], balance.replyAllPayouts);
    },
    stapleOfSuccess: (context) =>
      actions.upgrade([context.floor], balance.stapleOfSuccessUpgrades),
    faxOfFortune: (context) =>
      actions.payCycles(
        [selectByRate(context, true)],
        balance.faxOfFortunePayouts,
      ),
    casualMonday: (context) =>
      actions.upgrade([context.floor], balance.casualMondayUpgrades),
    deskJockey: (context) =>
      actions.upgrade([lowestLevel(context)], balance.deskJockeyUpgrades),
    inboxZeroGravity: (context) =>
      actions.payCycles(context.floors, balance.inboxZeroGravityPayouts),
    beanCounter: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.beanCounterTierSteps,
        balance.beanCounterUpgrades,
      ),
    kingOfTheWorld: (context) =>
      actions.upgrade([highestFloor(context)], balance.kingOfTheWorldUpgrades),
    officeClown: (context) =>
      actions.upgrade([lowestLevel(context)], balance.officeClownUpgrades),
    fridayTieDay: (context) =>
      actions.payCycles(
        context.floors.filter(
          (floor, index) => floor.unlocked && index % 2 === 0,
        ),
        balance.fridayTieDayPayouts,
      ),
    soReady: (context) =>
      actions.upgrade([context.floor], balance.soReadyUpgrades),
    wizard: (context) =>
      promoteAndUpgrade(
        context.floor,
        balance.wizardTierSteps,
        balance.wizardUpgrades,
      ),
  } satisfies Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
