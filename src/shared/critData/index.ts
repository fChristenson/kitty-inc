// every featured crit's display data (label, colour, icon, description), one
// file per themed category; their rewards load later (critTypes/featured)
import { CYBERPUNK_CRITS } from "./cyberpunk";
import { HEROES_CRITS } from "./heroes";
import { GAME_QUOTES_CRITS } from "./gameQuotes";
import { COMFORT_FOOD_CRITS } from "./comfortFood";
import { MYTHIC_CREATURES_CRITS } from "./mythicCreatures";
import { CANDY_CRITS } from "./candy";
import { GAMER_LIFE_CRITS } from "./gamerLife";
import { ADVENTURERS_CRITS } from "./adventurers";
import { BALDURS_GATE_CRITS } from "./baldursGate";
import { GEAR_CRITS } from "./gear";
import { STEAMPUNK_CRITS } from "./steampunk";
import { DRINKS_CRITS } from "./drinks";
import { BAKERY_CRITS } from "./bakery";
import { CRITTERS_CRITS } from "./critters";
import { WARCRAFT_CRITS } from "./warcraft";
import { CAKES_CRITS } from "./cakes";
import { MAFIA_CRITS } from "./mafia";
import { YAKUZA_CRITS } from "./yakuza";
import { DEMON_GIRLS_CRITS } from "./demonGirls";
import { CAT_GIRLS_CRITS } from "./catGirls";
import { ELEMENTAL_WOMEN_CRITS } from "./elementalWomen";
import { COW_GIRLS_CRITS } from "./cowGirls";
import { ICE_CREAM_CRITS } from "./iceCream";
import { GRAFFITI_CRITS } from "./graffiti";
import { HACKING_CRITS } from "./hacking";
import { PINUPS_CRITS } from "./pinups";
import { RUNES_CRITS } from "./runes";
import { LUCKY_CATS_CRITS } from "./luckyCats";
import { WRESTLING_CRITS } from "./wrestling";
import { WEIGHT_TRAINING_CRITS } from "./weightTraining";
import { GLAMOUR_AND_RUNWAY_CRITS } from "./glamourAndRunway";
import { BODYBUILDING_POSES_CRITS } from "./bodybuildingPoses";
import { YOGA_AND_STRETCHING_CRITS } from "./yogaAndStretching";
import { KISSES_AND_PINUPS_CRITS } from "./kissesAndPinups";
import { COMBAT_ATHLETICS_CRITS } from "./combatAthletics";
import { LOWER_BODY_TRAINING_CRITS } from "./lowerBodyTraining";
import { GYM_TEAMS_CRITS } from "./gymTeams";
import { MUSCLE_FEET_CRITS } from "./muscleFeet";
import { FANTASY_AND_WORSHIP_CRITS } from "./fantasyAndWorship";
import { SOLE_CLOSEUPS_CRITS } from "./soleCloseups";
import { PEDICURE_AND_ADORNMENTS_CRITS } from "./pedicureAndAdornments";
import { FOOT_POSES_CRITS } from "./footPoses";
import { FOOT_KISSES_CRITS } from "./footKisses";
import { FANTASY_FEET_CRITS } from "./fantasyFeet";
import { FOOTWEAR_AND_LEGWEAR_CRITS } from "./footwearAndLegwear";
import { DUO_HAIRSTYLES_CRITS } from "./duoHairstyles";
import { MATCHING_OUTFITS_CRITS } from "./matchingOutfits";
import { PAIRED_POSES_CRITS } from "./pairedPoses";
import { AFFECTIONATE_DUOS_CRITS } from "./affectionateDuos";
import { DUO_GROUP_SCENES_CRITS } from "./duoGroupScenes";
import { COURTSHIP_AND_DATES_CRITS } from "./courtshipAndDates";
import { KISSES_AND_POUTS_CRITS } from "./kissesAndPouts";
import { FANTASY_ROMANCES_CRITS } from "./fantasyRomances";
import { ROMANTIC_PORTRAITS_CRITS } from "./romanticPortraits";
import { EMBRACES_CRITS } from "./embraces";
import { SOUTH_ASIAN_FEASTS_CRITS } from "./southAsianFeasts";
import { AFRICAN_AND_AMERICAS_FEASTS_CRITS } from "./africanAndAmericasFeasts";
import { MEDITERRANEAN_FEASTS_CRITS } from "./mediterraneanFeasts";
import { EAST_ASIAN_FEASTS_CRITS } from "./eastAsianFeasts";
import { ENERGY_AND_NATURE_CRITS } from "./energyAndNature";
import { ATOMIC_LAB_CRITS } from "./atomicLab";
import { METALS_AND_MINERALS_CRITS } from "./metalsAndMinerals";
import { SKY_AND_SPACE_ELEMENTS_CRITS } from "./skyAndSpaceElements";
import { WARHAMMER_BATTLES_CRITS } from "./warhammerBattles";
import { WARHAMMER_ARMOR_CRITS } from "./warhammerArmor";
import { CHROME_PERFORMERS_CRITS } from "./chromePerformers";
import { CHROME_GLAMOUR_CRITS } from "./chromeGlamour";
import { TREASURE_AND_FORTUNES_CRITS } from "./treasureAndFortunes";
import { CASH_AND_CURRENCY_CRITS } from "./cashAndCurrency";
import { ARCADE_AND_LUCKY_GAMES_CRITS } from "./arcadeAndLuckyGames";
import { TABLE_GAMES_AND_CARDS_CRITS } from "./tableGamesAndCards";
import { RESCUE_SQUAD_CRITS } from "./rescueSquad";
import { DAY_JOB_CRITS } from "./dayJob";
import { SHOWBIZ_CRITS } from "./showbiz";
import { PARTY_TIME_CRITS } from "./partyTime";
import { BIG_ATTITUDE_CRITS } from "./bigAttitude";
import { LUCKY_CHARMS_CRITS } from "./luckyCharms";
import { RELICS_AND_TREASURES_CRITS } from "./relicsAndTreasures";
import { COZY_CUTE_CRITS } from "./cozyCute";
import { DARK_BEAUTIES_CRITS } from "./darkBeauties";
import { VOYAGES_CRITS } from "./voyages";
import { FRONTIERS_CRITS } from "./frontiers";
import { FAST_FOOD_CRITS } from "./fastFood";
import { SWEET_TREATS_CRITS } from "./sweetTreats";
import { FARM_FRESH_CRITS } from "./farmFresh";
import { SPA_DAY_CRITS } from "./spaDay";
import { FIGHTERS_CRITS } from "./fighters";

export const FEATURED_CRITS = {
  ...CYBERPUNK_CRITS,
  ...HEROES_CRITS,
  ...GAME_QUOTES_CRITS,
  ...COMFORT_FOOD_CRITS,
  ...MYTHIC_CREATURES_CRITS,
  ...CANDY_CRITS,
  ...GAMER_LIFE_CRITS,
  ...ADVENTURERS_CRITS,
  ...BALDURS_GATE_CRITS,
  ...GEAR_CRITS,
  ...STEAMPUNK_CRITS,
  ...DRINKS_CRITS,
  ...BAKERY_CRITS,
  ...CRITTERS_CRITS,
  ...WARCRAFT_CRITS,
  ...CAKES_CRITS,
  ...MAFIA_CRITS,
  ...YAKUZA_CRITS,
  ...DEMON_GIRLS_CRITS,
  ...CAT_GIRLS_CRITS,
  ...ELEMENTAL_WOMEN_CRITS,
  ...COW_GIRLS_CRITS,
  ...ICE_CREAM_CRITS,
  ...GRAFFITI_CRITS,
  ...HACKING_CRITS,
  ...PINUPS_CRITS,
  ...RUNES_CRITS,
  ...LUCKY_CATS_CRITS,
  ...WRESTLING_CRITS,
  ...WEIGHT_TRAINING_CRITS,
  ...GLAMOUR_AND_RUNWAY_CRITS,
  ...BODYBUILDING_POSES_CRITS,
  ...YOGA_AND_STRETCHING_CRITS,
  ...KISSES_AND_PINUPS_CRITS,
  ...COMBAT_ATHLETICS_CRITS,
  ...LOWER_BODY_TRAINING_CRITS,
  ...GYM_TEAMS_CRITS,
  ...MUSCLE_FEET_CRITS,
  ...FANTASY_AND_WORSHIP_CRITS,
  ...SOLE_CLOSEUPS_CRITS,
  ...PEDICURE_AND_ADORNMENTS_CRITS,
  ...FOOT_POSES_CRITS,
  ...FOOT_KISSES_CRITS,
  ...FANTASY_FEET_CRITS,
  ...FOOTWEAR_AND_LEGWEAR_CRITS,
  ...DUO_HAIRSTYLES_CRITS,
  ...MATCHING_OUTFITS_CRITS,
  ...PAIRED_POSES_CRITS,
  ...AFFECTIONATE_DUOS_CRITS,
  ...DUO_GROUP_SCENES_CRITS,
  ...COURTSHIP_AND_DATES_CRITS,
  ...KISSES_AND_POUTS_CRITS,
  ...FANTASY_ROMANCES_CRITS,
  ...ROMANTIC_PORTRAITS_CRITS,
  ...EMBRACES_CRITS,
  ...SOUTH_ASIAN_FEASTS_CRITS,
  ...AFRICAN_AND_AMERICAS_FEASTS_CRITS,
  ...MEDITERRANEAN_FEASTS_CRITS,
  ...EAST_ASIAN_FEASTS_CRITS,
  ...ENERGY_AND_NATURE_CRITS,
  ...ATOMIC_LAB_CRITS,
  ...METALS_AND_MINERALS_CRITS,
  ...SKY_AND_SPACE_ELEMENTS_CRITS,
  ...WARHAMMER_BATTLES_CRITS,
  ...WARHAMMER_ARMOR_CRITS,
  ...CHROME_PERFORMERS_CRITS,
  ...CHROME_GLAMOUR_CRITS,
  ...TREASURE_AND_FORTUNES_CRITS,
  ...CASH_AND_CURRENCY_CRITS,
  ...ARCADE_AND_LUCKY_GAMES_CRITS,
  ...TABLE_GAMES_AND_CARDS_CRITS,
  ...RESCUE_SQUAD_CRITS,
  ...DAY_JOB_CRITS,
  ...SHOWBIZ_CRITS,
  ...PARTY_TIME_CRITS,
  ...BIG_ATTITUDE_CRITS,
  ...LUCKY_CHARMS_CRITS,
  ...RELICS_AND_TREASURES_CRITS,
  ...COZY_CUTE_CRITS,
  ...DARK_BEAUTIES_CRITS,
  ...VOYAGES_CRITS,
  ...FRONTIERS_CRITS,
  ...FAST_FOOD_CRITS,
  ...SWEET_TREATS_CRITS,
  ...FARM_FRESH_CRITS,
  ...SPA_DAY_CRITS,
  ...FIGHTERS_CRITS,
} as const;
