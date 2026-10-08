// every featured crit's reward, one file per themed category (their display
// data is crits/badgeCrits/critData); only ever loaded through loadFeaturedRewards
import { CYBERPUNK_REWARDS } from "./cyberpunk";
import { HEROES_REWARDS } from "./heroes";
import { GAME_QUOTES_REWARDS } from "./gameQuotes";
import { COMFORT_FOOD_REWARDS } from "./comfortFood";
import { MYTHIC_CREATURES_REWARDS } from "./mythicCreatures";
import { CANDY_REWARDS } from "./candy";
import { GAMER_LIFE_REWARDS } from "./gamerLife";
import { ADVENTURERS_REWARDS } from "./adventurers";
import { BALDURS_GATE_REWARDS } from "./baldursGate";
import { GEAR_REWARDS } from "./gear";
import { STEAMPUNK_REWARDS } from "./steampunk";
import { DRINKS_REWARDS } from "./drinks";
import { BAKERY_REWARDS } from "./bakery";
import { CRITTERS_REWARDS } from "./critters";
import { WARCRAFT_REWARDS } from "./warcraft";
import { CAKES_REWARDS } from "./cakes";
import { MAFIA_REWARDS } from "./mafia";
import { YAKUZA_REWARDS } from "./yakuza";
import { DEMON_GIRLS_REWARDS } from "./demonGirls";
import { CAT_GIRLS_REWARDS } from "./catGirls";
import { ELEMENTAL_WOMEN_REWARDS } from "./elementalWomen";
import { COW_GIRLS_REWARDS } from "./cowGirls";
import { ICE_CREAM_REWARDS } from "./iceCream";
import { GRAFFITI_REWARDS } from "./graffiti";
import { HACKING_REWARDS } from "./hacking";
import { PINUPS_REWARDS } from "./pinups";
import { RUNES_REWARDS } from "./runes";
import { LUCKY_CATS_REWARDS } from "./luckyCats";
import { WRESTLING_REWARDS } from "./wrestling";
import { WEIGHT_TRAINING_REWARDS } from "./weightTraining";
import { GLAMOUR_AND_RUNWAY_REWARDS } from "./glamourAndRunway";
import { BODYBUILDING_POSES_REWARDS } from "./bodybuildingPoses";
import { YOGA_AND_STRETCHING_REWARDS } from "./yogaAndStretching";
import { KISSES_AND_PINUPS_REWARDS } from "./kissesAndPinups";
import { COMBAT_ATHLETICS_REWARDS } from "./combatAthletics";
import { LOWER_BODY_TRAINING_REWARDS } from "./lowerBodyTraining";
import { GYM_TEAMS_REWARDS } from "./gymTeams";
import { MUSCLE_FEET_REWARDS } from "./muscleFeet";
import { FANTASY_AND_WORSHIP_REWARDS } from "./fantasyAndWorship";
import { SOLE_CLOSEUPS_REWARDS } from "./soleCloseups";
import { PEDICURE_AND_ADORNMENTS_REWARDS } from "./pedicureAndAdornments";
import { FOOT_POSES_REWARDS } from "./footPoses";
import { FOOT_KISSES_REWARDS } from "./footKisses";
import { FANTASY_FEET_REWARDS } from "./fantasyFeet";
import { FOOTWEAR_AND_LEGWEAR_REWARDS } from "./footwearAndLegwear";
import { DUO_HAIRSTYLES_REWARDS } from "./duoHairstyles";
import { MATCHING_OUTFITS_REWARDS } from "./matchingOutfits";
import { PAIRED_POSES_REWARDS } from "./pairedPoses";
import { AFFECTIONATE_DUOS_REWARDS } from "./affectionateDuos";
import { DUO_GROUP_SCENES_REWARDS } from "./duoGroupScenes";
import { COURTSHIP_AND_DATES_REWARDS } from "./courtshipAndDates";
import { KISSES_AND_POUTS_REWARDS } from "./kissesAndPouts";
import { FANTASY_ROMANCES_REWARDS } from "./fantasyRomances";
import { ROMANTIC_PORTRAITS_REWARDS } from "./romanticPortraits";
import { EMBRACES_REWARDS } from "./embraces";
import { SOUTH_ASIAN_FEASTS_REWARDS } from "./southAsianFeasts";
import { AFRICAN_AND_AMERICAS_FEASTS_REWARDS } from "./africanAndAmericasFeasts";
import { MEDITERRANEAN_FEASTS_REWARDS } from "./mediterraneanFeasts";
import { EAST_ASIAN_FEASTS_REWARDS } from "./eastAsianFeasts";
import { ENERGY_AND_NATURE_REWARDS } from "./energyAndNature";
import { ATOMIC_LAB_REWARDS } from "./atomicLab";
import { METALS_AND_MINERALS_REWARDS } from "./metalsAndMinerals";
import { SKY_AND_SPACE_ELEMENTS_REWARDS } from "./skyAndSpaceElements";
import { WARHAMMER_BATTLES_REWARDS } from "./warhammerBattles";
import { WARHAMMER_ARMOR_REWARDS } from "./warhammerArmor";
import { CHROME_PERFORMERS_REWARDS } from "./chromePerformers";
import { CHROME_GLAMOUR_REWARDS } from "./chromeGlamour";
import { TREASURE_AND_FORTUNES_REWARDS } from "./treasureAndFortunes";
import { CASH_AND_CURRENCY_REWARDS } from "./cashAndCurrency";
import { ARCADE_AND_LUCKY_GAMES_REWARDS } from "./arcadeAndLuckyGames";
import { TABLE_GAMES_AND_CARDS_REWARDS } from "./tableGamesAndCards";
import { RESCUE_SQUAD_REWARDS } from "./rescueSquad";
import { DAY_JOB_REWARDS } from "./dayJob";
import { SHOWBIZ_REWARDS } from "./showbiz";
import { PARTY_TIME_REWARDS } from "./partyTime";
import { BIG_ATTITUDE_REWARDS } from "./bigAttitude";
import { LUCKY_CHARMS_REWARDS } from "./luckyCharms";
import { RELICS_AND_TREASURES_REWARDS } from "./relicsAndTreasures";
import { COZY_CUTE_REWARDS } from "./cozyCute";
import { DARK_BEAUTIES_REWARDS } from "./darkBeauties";
import { VOYAGES_REWARDS } from "./voyages";
import { FRONTIERS_REWARDS } from "./frontiers";
import { FAST_FOOD_REWARDS } from "./fastFood";
import { SWEET_TREATS_REWARDS } from "./sweetTreats";
import { FARM_FRESH_REWARDS } from "./farmFresh";
import { SPA_DAY_REWARDS } from "./spaDay";
import { FIGHTERS_REWARDS } from "./fighters";

export const FEATURED_REWARDS = {
  ...CYBERPUNK_REWARDS,
  ...HEROES_REWARDS,
  ...GAME_QUOTES_REWARDS,
  ...COMFORT_FOOD_REWARDS,
  ...MYTHIC_CREATURES_REWARDS,
  ...CANDY_REWARDS,
  ...GAMER_LIFE_REWARDS,
  ...ADVENTURERS_REWARDS,
  ...BALDURS_GATE_REWARDS,
  ...GEAR_REWARDS,
  ...STEAMPUNK_REWARDS,
  ...DRINKS_REWARDS,
  ...BAKERY_REWARDS,
  ...CRITTERS_REWARDS,
  ...WARCRAFT_REWARDS,
  ...CAKES_REWARDS,
  ...MAFIA_REWARDS,
  ...YAKUZA_REWARDS,
  ...DEMON_GIRLS_REWARDS,
  ...CAT_GIRLS_REWARDS,
  ...ELEMENTAL_WOMEN_REWARDS,
  ...COW_GIRLS_REWARDS,
  ...ICE_CREAM_REWARDS,
  ...GRAFFITI_REWARDS,
  ...HACKING_REWARDS,
  ...PINUPS_REWARDS,
  ...RUNES_REWARDS,
  ...LUCKY_CATS_REWARDS,
  ...WRESTLING_REWARDS,
  ...WEIGHT_TRAINING_REWARDS,
  ...GLAMOUR_AND_RUNWAY_REWARDS,
  ...BODYBUILDING_POSES_REWARDS,
  ...YOGA_AND_STRETCHING_REWARDS,
  ...KISSES_AND_PINUPS_REWARDS,
  ...COMBAT_ATHLETICS_REWARDS,
  ...LOWER_BODY_TRAINING_REWARDS,
  ...GYM_TEAMS_REWARDS,
  ...MUSCLE_FEET_REWARDS,
  ...FANTASY_AND_WORSHIP_REWARDS,
  ...SOLE_CLOSEUPS_REWARDS,
  ...PEDICURE_AND_ADORNMENTS_REWARDS,
  ...FOOT_POSES_REWARDS,
  ...FOOT_KISSES_REWARDS,
  ...FANTASY_FEET_REWARDS,
  ...FOOTWEAR_AND_LEGWEAR_REWARDS,
  ...DUO_HAIRSTYLES_REWARDS,
  ...MATCHING_OUTFITS_REWARDS,
  ...PAIRED_POSES_REWARDS,
  ...AFFECTIONATE_DUOS_REWARDS,
  ...DUO_GROUP_SCENES_REWARDS,
  ...COURTSHIP_AND_DATES_REWARDS,
  ...KISSES_AND_POUTS_REWARDS,
  ...FANTASY_ROMANCES_REWARDS,
  ...ROMANTIC_PORTRAITS_REWARDS,
  ...EMBRACES_REWARDS,
  ...SOUTH_ASIAN_FEASTS_REWARDS,
  ...AFRICAN_AND_AMERICAS_FEASTS_REWARDS,
  ...MEDITERRANEAN_FEASTS_REWARDS,
  ...EAST_ASIAN_FEASTS_REWARDS,
  ...ENERGY_AND_NATURE_REWARDS,
  ...ATOMIC_LAB_REWARDS,
  ...METALS_AND_MINERALS_REWARDS,
  ...SKY_AND_SPACE_ELEMENTS_REWARDS,
  ...WARHAMMER_BATTLES_REWARDS,
  ...WARHAMMER_ARMOR_REWARDS,
  ...CHROME_PERFORMERS_REWARDS,
  ...CHROME_GLAMOUR_REWARDS,
  ...TREASURE_AND_FORTUNES_REWARDS,
  ...CASH_AND_CURRENCY_REWARDS,
  ...ARCADE_AND_LUCKY_GAMES_REWARDS,
  ...TABLE_GAMES_AND_CARDS_REWARDS,
  ...RESCUE_SQUAD_REWARDS,
  ...DAY_JOB_REWARDS,
  ...SHOWBIZ_REWARDS,
  ...PARTY_TIME_REWARDS,
  ...BIG_ATTITUDE_REWARDS,
  ...LUCKY_CHARMS_REWARDS,
  ...RELICS_AND_TREASURES_REWARDS,
  ...COZY_CUTE_REWARDS,
  ...DARK_BEAUTIES_REWARDS,
  ...VOYAGES_REWARDS,
  ...FRONTIERS_REWARDS,
  ...FAST_FOOD_REWARDS,
  ...SWEET_TREATS_REWARDS,
  ...FARM_FRESH_REWARDS,
  ...SPA_DAY_REWARDS,
  ...FIGHTERS_REWARDS,
} as const;
