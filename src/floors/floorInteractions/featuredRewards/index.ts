import type { FeaturedCritKind } from "../../../shared/critTypes";
import type { CritRewardContext } from "../index";
import {
  createRewardHelpers,
  type FeaturedRewardActions,
} from "./helpers";
import { createCyberpunkRewards } from "./cyberpunk";
import { createAttitudeRewards } from "./attitude";
import { createElementsRewards } from "./elements";
import { createShowtimeRewards } from "./showtime";
import { createGemsRewards } from "./gems";
import { createHeroesRewards } from "./heroes";
import { createOfficeRewards } from "./office";
import { createPartyRewards } from "./party";
import { createGameQuotesRewards } from "./gameQuotes";
import { createBigPersonalitiesRewards } from "./bigPersonalities";
import { createGoodLuckRewards } from "./goodLuck";
import { createMoviesRewards } from "./movies";
import { createDanceRewards } from "./dance";
import { createComfortFoodRewards } from "./comfortFood";
import { createGothamRewards } from "./gotham";
import { createMythicCreaturesRewards } from "./mythicCreatures";
import { createCandyRewards } from "./candy";
import { createGamerLifeRewards } from "./gamerLife";
import { createSuperheroesRewards } from "./superheroes";
import { createTreasuresRewards } from "./treasures";
import { createAdventurersRewards } from "./adventurers";
import { createBaldursGateRewards } from "./baldursGate";
import { createRichesRewards } from "./riches";
import { createGearRewards } from "./gear";
import { createCosmosRewards } from "./cosmos";
import { createOceanRewards } from "./ocean";
import { createGamesOfChanceRewards } from "./gamesOfChance";
import { createSteampunkRewards } from "./steampunk";
import { createRelicsRewards } from "./relics";
import { createDessertsRewards } from "./desserts";
import { createDrinksRewards } from "./drinks";
import { createBakeryRewards } from "./bakery";
import { createCrittersRewards } from "./critters";
import { createWarhammerRewards } from "./warhammer";
import { createWarcraftRewards } from "./warcraft";
import { createGoldenAnimalsRewards } from "./goldenAnimals";
import { createPlushiesRewards } from "./plushies";

export function createFeaturedCritRewards(actions: FeaturedRewardActions) {
  const helpers = createRewardHelpers(actions);
  return {
    ...createCyberpunkRewards(helpers),
    ...createAttitudeRewards(helpers),
    ...createElementsRewards(helpers),
    ...createShowtimeRewards(helpers),
    ...createGemsRewards(helpers),
    ...createHeroesRewards(helpers),
    ...createOfficeRewards(helpers),
    ...createPartyRewards(helpers),
    ...createGameQuotesRewards(helpers),
    ...createBigPersonalitiesRewards(helpers),
    ...createGoodLuckRewards(helpers),
    ...createMoviesRewards(helpers),
    ...createDanceRewards(helpers),
    ...createComfortFoodRewards(helpers),
    ...createGothamRewards(helpers),
    ...createMythicCreaturesRewards(helpers),
    ...createCandyRewards(helpers),
    ...createGamerLifeRewards(helpers),
    ...createSuperheroesRewards(helpers),
    ...createTreasuresRewards(helpers),
    ...createAdventurersRewards(helpers),
    ...createBaldursGateRewards(helpers),
    ...createRichesRewards(helpers),
    ...createGearRewards(helpers),
    ...createCosmosRewards(helpers),
    ...createOceanRewards(helpers),
    ...createGamesOfChanceRewards(helpers),
    ...createSteampunkRewards(helpers),
    ...createRelicsRewards(helpers),
    ...createDessertsRewards(helpers),
    ...createDrinksRewards(helpers),
    ...createBakeryRewards(helpers),
    ...createCrittersRewards(helpers),
    ...createWarhammerRewards(helpers),
    ...createWarcraftRewards(helpers),
    ...createGoldenAnimalsRewards(helpers),
    ...createPlushiesRewards(helpers),
  } satisfies Record<FeaturedCritKind, (context: CritRewardContext) => void>;
}
