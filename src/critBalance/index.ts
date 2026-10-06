// every featured crit's odds and reward sizes, one file per featured category;
// pure data with no imports beyond these files, so config.ts can spread it safely
import { CYBERPUNK_BALANCE } from "./cyberpunk";
import { HEROES_BALANCE } from "./heroes";
import { GAME_QUOTES_BALANCE } from "./gameQuotes";
import { COMFORT_FOOD_BALANCE } from "./comfortFood";
import { MYTHIC_CREATURES_BALANCE } from "./mythicCreatures";
import { CANDY_BALANCE } from "./candy";
import { GAMER_LIFE_BALANCE } from "./gamerLife";
import { ADVENTURERS_BALANCE } from "./adventurers";
import { BALDURS_GATE_BALANCE } from "./baldursGate";
import { GEAR_BALANCE } from "./gear";
import { STEAMPUNK_BALANCE } from "./steampunk";
import { DRINKS_BALANCE } from "./drinks";
import { BAKERY_BALANCE } from "./bakery";
import { CRITTERS_BALANCE } from "./critters";
import { WARCRAFT_BALANCE } from "./warcraft";
import { CAKES_BALANCE } from "./cakes";
import { MAFIA_BALANCE } from "./mafia";
import { YAKUZA_BALANCE } from "./yakuza";
import { DEMON_GIRLS_BALANCE } from "./demonGirls";
import { CAT_GIRLS_BALANCE } from "./catGirls";
import { ELEMENTAL_WOMEN_BALANCE } from "./elementalWomen";
import { COW_GIRLS_BALANCE } from "./cowGirls";
import { ICE_CREAM_BALANCE } from "./iceCream";
import { GRAFFITI_BALANCE } from "./graffiti";
import { HACKING_BALANCE } from "./hacking";
import { PINUPS_BALANCE } from "./pinups";
import { RUNES_BALANCE } from "./runes";
import { LUCKY_CATS_BALANCE } from "./luckyCats";
import { WRESTLING_BALANCE } from "./wrestling";
import { WEIGHT_TRAINING_BALANCE } from "./weightTraining";
import { GLAMOUR_AND_RUNWAY_BALANCE } from "./glamourAndRunway";
import { BODYBUILDING_POSES_BALANCE } from "./bodybuildingPoses";
import { YOGA_AND_STRETCHING_BALANCE } from "./yogaAndStretching";
import { KISSES_AND_PINUPS_BALANCE } from "./kissesAndPinups";
import { COMBAT_ATHLETICS_BALANCE } from "./combatAthletics";
import { LOWER_BODY_TRAINING_BALANCE } from "./lowerBodyTraining";
import { GYM_TEAMS_BALANCE } from "./gymTeams";
import { MUSCLE_FEET_BALANCE } from "./muscleFeet";
import { FANTASY_AND_WORSHIP_BALANCE } from "./fantasyAndWorship";
import { SOLE_CLOSEUPS_BALANCE } from "./soleCloseups";
import { PEDICURE_AND_ADORNMENTS_BALANCE } from "./pedicureAndAdornments";
import { FOOT_POSES_BALANCE } from "./footPoses";
import { FOOT_KISSES_BALANCE } from "./footKisses";
import { FANTASY_FEET_BALANCE } from "./fantasyFeet";
import { FOOTWEAR_AND_LEGWEAR_BALANCE } from "./footwearAndLegwear";
import { DUO_HAIRSTYLES_BALANCE } from "./duoHairstyles";
import { MATCHING_OUTFITS_BALANCE } from "./matchingOutfits";
import { PAIRED_POSES_BALANCE } from "./pairedPoses";
import { AFFECTIONATE_DUOS_BALANCE } from "./affectionateDuos";
import { DUO_GROUP_SCENES_BALANCE } from "./duoGroupScenes";
import { COURTSHIP_AND_DATES_BALANCE } from "./courtshipAndDates";
import { KISSES_AND_POUTS_BALANCE } from "./kissesAndPouts";
import { FANTASY_ROMANCES_BALANCE } from "./fantasyRomances";
import { ROMANTIC_PORTRAITS_BALANCE } from "./romanticPortraits";
import { EMBRACES_BALANCE } from "./embraces";
import { SOUTH_ASIAN_FEASTS_BALANCE } from "./southAsianFeasts";
import { AFRICAN_AND_AMERICAS_FEASTS_BALANCE } from "./africanAndAmericasFeasts";
import { MEDITERRANEAN_FEASTS_BALANCE } from "./mediterraneanFeasts";
import { EAST_ASIAN_FEASTS_BALANCE } from "./eastAsianFeasts";
import { ENERGY_AND_NATURE_BALANCE } from "./energyAndNature";
import { ATOMIC_LAB_BALANCE } from "./atomicLab";
import { METALS_AND_MINERALS_BALANCE } from "./metalsAndMinerals";
import { SKY_AND_SPACE_ELEMENTS_BALANCE } from "./skyAndSpaceElements";
import { WARHAMMER_BATTLES_BALANCE } from "./warhammerBattles";
import { WARHAMMER_ARMOR_BALANCE } from "./warhammerArmor";
import { CHROME_PERFORMERS_BALANCE } from "./chromePerformers";
import { CHROME_GLAMOUR_BALANCE } from "./chromeGlamour";
import { TREASURE_AND_FORTUNES_BALANCE } from "./treasureAndFortunes";
import { CASH_AND_CURRENCY_BALANCE } from "./cashAndCurrency";
import { ARCADE_AND_LUCKY_GAMES_BALANCE } from "./arcadeAndLuckyGames";
import { TABLE_GAMES_AND_CARDS_BALANCE } from "./tableGamesAndCards";
import { RESCUE_SQUAD_BALANCE } from "./rescueSquad";
import { DAY_JOB_BALANCE } from "./dayJob";
import { SHOWBIZ_BALANCE } from "./showbiz";
import { PARTY_TIME_BALANCE } from "./partyTime";
import { BIG_ATTITUDE_BALANCE } from "./bigAttitude";
import { LUCKY_CHARMS_BALANCE } from "./luckyCharms";
import { RELICS_AND_TREASURES_BALANCE } from "./relicsAndTreasures";
import { COZY_CUTE_BALANCE } from "./cozyCute";
import { DARK_BEAUTIES_BALANCE } from "./darkBeauties";
import { VOYAGES_BALANCE } from "./voyages";
import { FRONTIERS_BALANCE } from "./frontiers";
import { FAST_FOOD_BALANCE } from "./fastFood";
import { SWEET_TREATS_BALANCE } from "./sweetTreats";
import { FARM_FRESH_BALANCE } from "./farmFresh";
import { SPA_DAY_BALANCE } from "./spaDay";
import { FIGHTERS_BALANCE } from "./fighters";

export const FEATURED_CRIT_BALANCE = {
  ...CYBERPUNK_BALANCE,
  ...HEROES_BALANCE,
  ...GAME_QUOTES_BALANCE,
  ...COMFORT_FOOD_BALANCE,
  ...MYTHIC_CREATURES_BALANCE,
  ...CANDY_BALANCE,
  ...GAMER_LIFE_BALANCE,
  ...ADVENTURERS_BALANCE,
  ...BALDURS_GATE_BALANCE,
  ...GEAR_BALANCE,
  ...STEAMPUNK_BALANCE,
  ...DRINKS_BALANCE,
  ...BAKERY_BALANCE,
  ...CRITTERS_BALANCE,
  ...WARCRAFT_BALANCE,
  ...CAKES_BALANCE,
  ...MAFIA_BALANCE,
  ...YAKUZA_BALANCE,
  ...DEMON_GIRLS_BALANCE,
  ...CAT_GIRLS_BALANCE,
  ...ELEMENTAL_WOMEN_BALANCE,
  ...COW_GIRLS_BALANCE,
  ...ICE_CREAM_BALANCE,
  ...GRAFFITI_BALANCE,
  ...HACKING_BALANCE,
  ...PINUPS_BALANCE,
  ...RUNES_BALANCE,
  ...LUCKY_CATS_BALANCE,
  ...WRESTLING_BALANCE,
  ...WEIGHT_TRAINING_BALANCE,
  ...GLAMOUR_AND_RUNWAY_BALANCE,
  ...BODYBUILDING_POSES_BALANCE,
  ...YOGA_AND_STRETCHING_BALANCE,
  ...KISSES_AND_PINUPS_BALANCE,
  ...COMBAT_ATHLETICS_BALANCE,
  ...LOWER_BODY_TRAINING_BALANCE,
  ...GYM_TEAMS_BALANCE,
  ...MUSCLE_FEET_BALANCE,
  ...FANTASY_AND_WORSHIP_BALANCE,
  ...SOLE_CLOSEUPS_BALANCE,
  ...PEDICURE_AND_ADORNMENTS_BALANCE,
  ...FOOT_POSES_BALANCE,
  ...FOOT_KISSES_BALANCE,
  ...FANTASY_FEET_BALANCE,
  ...FOOTWEAR_AND_LEGWEAR_BALANCE,
  ...DUO_HAIRSTYLES_BALANCE,
  ...MATCHING_OUTFITS_BALANCE,
  ...PAIRED_POSES_BALANCE,
  ...AFFECTIONATE_DUOS_BALANCE,
  ...DUO_GROUP_SCENES_BALANCE,
  ...COURTSHIP_AND_DATES_BALANCE,
  ...KISSES_AND_POUTS_BALANCE,
  ...FANTASY_ROMANCES_BALANCE,
  ...ROMANTIC_PORTRAITS_BALANCE,
  ...EMBRACES_BALANCE,
  ...SOUTH_ASIAN_FEASTS_BALANCE,
  ...AFRICAN_AND_AMERICAS_FEASTS_BALANCE,
  ...MEDITERRANEAN_FEASTS_BALANCE,
  ...EAST_ASIAN_FEASTS_BALANCE,
  ...ENERGY_AND_NATURE_BALANCE,
  ...ATOMIC_LAB_BALANCE,
  ...METALS_AND_MINERALS_BALANCE,
  ...SKY_AND_SPACE_ELEMENTS_BALANCE,
  ...WARHAMMER_BATTLES_BALANCE,
  ...WARHAMMER_ARMOR_BALANCE,
  ...CHROME_PERFORMERS_BALANCE,
  ...CHROME_GLAMOUR_BALANCE,
  ...TREASURE_AND_FORTUNES_BALANCE,
  ...CASH_AND_CURRENCY_BALANCE,
  ...ARCADE_AND_LUCKY_GAMES_BALANCE,
  ...TABLE_GAMES_AND_CARDS_BALANCE,
  ...RESCUE_SQUAD_BALANCE,
  ...DAY_JOB_BALANCE,
  ...SHOWBIZ_BALANCE,
  ...PARTY_TIME_BALANCE,
  ...BIG_ATTITUDE_BALANCE,
  ...LUCKY_CHARMS_BALANCE,
  ...RELICS_AND_TREASURES_BALANCE,
  ...COZY_CUTE_BALANCE,
  ...DARK_BEAUTIES_BALANCE,
  ...VOYAGES_BALANCE,
  ...FRONTIERS_BALANCE,
  ...FAST_FOOD_BALANCE,
  ...SWEET_TREATS_BALANCE,
  ...FARM_FRESH_BALANCE,
  ...SPA_DAY_BALANCE,
  ...FIGHTERS_BALANCE,
} as const;
