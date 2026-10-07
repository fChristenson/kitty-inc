export { wireCritTestActions } from "./testButton";

import type { BigNumber } from "../shared/bigNumber";
import { createTotalIncomeReadout } from "../shared/totalIncomeReadout";

// floating text overlaid on top of the floors (no panel/bar), pinned via CSS sticky
const HUD_TOP_MARGIN = 24; // breathing room above the total-income text itself
const HUD_FONT_SIZE = 144; // 25% smaller than the previous 192px
const HUD_UNIT_NAME_GAP_PX = 24; // below the amount's own measured bottom edge
export const HUD_H = HUD_TOP_MARGIN + HUD_FONT_SIZE + 16;

const totalIncomeReadout = createTotalIncomeReadout();

// returns the actual screen-Y just below the drawn readout (amount, plus the
// unit-name line under it once the total is big enough to have one) — the
// real tappable height varies with that, so callers doing hit-testing (see
// gameCanvas's own HUD tap zone) must use this return value, not a fixed guess
export function drawHud(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  totalIncome: BigNumber,
): number {
  return totalIncomeReadout.draw(
    ctx,
    canvasWidth / 2,
    HUD_TOP_MARGIN,
    totalIncome,
    {
      fontSize: HUD_FONT_SIZE,
      unitNameGapPx: HUD_UNIT_NAME_GAP_PX,
    },
  );
}

// everything below is this module's own facade: hud/ has several nested widgets
// (actionBar, upgradeMenu, boostMenu, ...) that stay together for internal reuse, but
// anything outside src/hud must import them from here, never from a nested path
export { createActionBarMarkup, wireActionBar } from "./actionBar";
export type { ActionBarHandlers } from "./actionBar";
export {
  createBoostMenuMarkup,
  wireBoostMenu,
  applyBoostAll,
} from "./boostMenu";
export type { BoostMenu } from "./boostMenu";
export {
  createBadgeCollectionMarkup,
  wireBadgeCollection,
  getGlobalIncomeBoostMultiplier,
  getCompanyAssetValue,
  getActiveCompanyAssetValue,
  getCompanyUpgradesValue,
  mergeCompanies,
} from "./corporationBoostMenu";
export type { BadgeCollection } from "./corporationBoostMenu";
export {
  createCorporationStatsMarkup,
  wireCorporationStats,
} from "./corporationStats";
export type { CorporationStats } from "./corporationStats";
export { createMapMenuMarkup, wireMapMenu } from "./mapMenu";
export type { MapMenu } from "./mapMenu";
export {
  createTestButtonMarkup,
  wireTestButton,
  wireSpawnMouseButton,
  wireTestActionsFilter,
  sortTestActionMenus,
  wireIdleOverlayTestButton,
  wireAddBadgesTestButtons,
  wireFoilRevealTestButtons,
  wireBoostEventTestButton,
  wireUnionEventTestButton,
  wireKickbackEventTestButton,
  wireBurstEventTestButton,
  wireSprayEventTestButton,
  wireFountainEventTestButton,
  wireRippleEventTestButton,
  wireWreckingBallEventTestButton,
  wirePiledriverEventTestButton,
  wireOrbitalStrikeEventTestButton,
  wireFuseEventTestButton,
  wireSupernovaEventTestButton,
  wireBowlingEventTestButton,
  wireThunderclapEventTestButton,
  wireChainReactionEventTestButton,
  wireBullseyeEventTestButton,
  wirePopcornEventTestButton,
  wireNewtonsCradleEventTestButton,
  wireJuggleEventTestButton,
  wireBoomerangEventTestButton,
  wireHeartbeatEventTestButton,
  wireClashEventTestButton,
  wireAsteroidsEventTestButton,
  wireWhackAMoleEventTestButton,
  wireDrumrollEventTestButton,
  wireShellGameEventTestButton,
  wireSeesawEventTestButton,
  wireScratchEventTestButton,
  wireTagEventTestButton,
  wireBumpersEventTestButton,
  wireCatcherEventTestButton,
  wireImplosionEventTestButton,
  wireAtomEventTestButton,
  wireSpiralEventTestButton,
  wireLoopEventTestButton,
  wireEternityEventTestButton,
  wireHelixEventTestButton,
  wireYoYoEventTestButton,
  wireRacetrackEventTestButton,
  wireSwingEventTestButton,
  wireEventTestButtons,
  wireSlashEventTestButton,
  wireJackhammerEventTestButton,
  wirePummelEventTestButton,
  wireOverloadEventTestButton,
  wireGatlingEventTestButton,
  wirePressEventTestButton,
  wireDrillEventTestButton,
  wireBurrowEventTestButton,
  wirePingPongEventTestButton,
  wireSlamDunkEventTestButton,
  wireUppercutEventTestButton,
  wireHeadHopEventTestButton,
  wirePaparazziEventTestButton,
  wireMissileBarrageEventTestButton,
  wireSonicBoomEventTestButton,
  wireMitosisEventTestButton,
  wirePlinkoEventTestButton,
  wireHammerThrowEventTestButton,
  wireSnakeEventTestButton,
  wireBreakoutEventTestButton,
  wireLineClearEventTestButton,
  wireBreakShotEventTestButton,
  wireBulletHellEventTestButton,
  wireVortexEventTestButton,
  wireRicochetEventTestButton,
  wireWaterfallEventTestButton,
  wireConveyorEventTestButton,
  wireFirefliesEventTestButton,
  wirePaydayEventTestButton,
  wirePiggyBankEventTestButton,
  wireCoinTossEventTestButton,
  wireHourglassEventTestButton,
  wireRocketEventTestButton,
  wireRevealEventTestButton,
  wireBadgeCapsuleTestButton,
  wireJackpotReelsEventTestButton,
  wireChainPayEventTestButton,
  wireTwisterEventTestButton,
  wireDownpourEventTestButton,
  wireTrickleEventTestButton,
  wireMagnetEventTestButton,
  wireSpilloverEventTestButton,
  wireConstellationEventTestButton,
  wireAscendEventTestButton,
  wireRisingTideEventTestButton,
  wireTidalWaveEventTestButton,
  wireBeanstalkEventTestButton,
  wireBlessingEventTestButton,
  wireHaloEventTestButton,
  wireCometEventTestButton,
  wireMeteorShowerEventTestButton,
  wireMentorEventTestButton,
  wireSparkChainEventTestButton,
  wirePolishEventTestButton,
  wireLighthouseEventTestButton,
  wireRecruitEventTestButton,
  wirePromotionDayEventTestButton,
  wireAlchemyEventTestButton,
  wireInvestmentEventTestButton,
  wireDividendsEventTestButton,
  wireWispEventTestButton,
  wireStreamEventTestButton,
  wireTrailsEventTestButton,
  wireDrawEventTestButton,
  wireNightSkyEventTestButton,
  wirePitcherEventTestButton,
  wireGlimmerEventTestButton,
  wireHuntEventTestButton,
  wireSwarmEventTestButton,
  wireRenovateEventTestButton,
  wireUpgradeEventTestButton,
  wireUnlockEventTestButton,
  wireResetButton,
} from "./testButton";
export { createUpgradeMenuMarkup, wireUpgradeMenu } from "./upgradeMenu";
export {
  getWorkerCost,
  getOfficeChairsCost,
  getOfficeSuppliesCost,
  getManagerCost,
  buyWorker,
  buyOfficeChairs,
  buyOfficeSupplies,
  buyManager,
  isManagerUnlocked,
  MANAGER_MIN_UPGRADE_COUNT,
} from "./upgradeMenu";
export type { UpgradeMenu } from "./upgradeMenu";
export {
  createFloorUpgradeMenuMarkup,
  wireFloorUpgradeMenu,
  hasAffordableFloorUpgrade,
} from "./floorUpgradeMenu";
export type { FloorUpgradeMenu } from "./floorUpgradeMenu";
export {
  createCorporationUpgradeMenuMarkup,
  wireCorporationUpgradeMenu,
} from "./corporationUpgradeMenu";
export type { CorporationUpgradeMenu } from "./corporationUpgradeMenu";
export {
  createTotalEarnedOverlayMarkup,
  wireTotalEarnedOverlay,
} from "./totalEarnedOverlay";
export type { TotalEarnedOverlay } from "./totalEarnedOverlay";
