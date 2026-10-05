// every featured crit's reward, one file per themed category (their display
// data is shared/critData); only ever loaded through loadFeaturedRewards
import { CYBERPUNK_REWARDS } from "./cyberpunk";
import { ATTITUDE_REWARDS } from "./attitude";
import { ELEMENTS_REWARDS } from "./elements";
import { SHOWTIME_REWARDS } from "./showtime";
import { GEMS_REWARDS } from "./gems";
import { HEROES_REWARDS } from "./heroes";
import { OFFICE_REWARDS } from "./office";
import { PARTY_REWARDS } from "./party";
import { GAME_QUOTES_REWARDS } from "./gameQuotes";
import { BIG_PERSONALITIES_REWARDS } from "./bigPersonalities";
import { GOOD_LUCK_REWARDS } from "./goodLuck";
import { MOVIES_REWARDS } from "./movies";
import { DANCE_REWARDS } from "./dance";
import { COMFORT_FOOD_REWARDS } from "./comfortFood";
import { GOTHAM_REWARDS } from "./gotham";
import { MYTHIC_CREATURES_REWARDS } from "./mythicCreatures";
import { CANDY_REWARDS } from "./candy";
import { GAMER_LIFE_REWARDS } from "./gamerLife";
import { SUPERHEROES_REWARDS } from "./superheroes";
import { TREASURES_REWARDS } from "./treasures";
import { ADVENTURERS_REWARDS } from "./adventurers";
import { BALDURS_GATE_REWARDS } from "./baldursGate";
import { RICHES_REWARDS } from "./riches";
import { GEAR_REWARDS } from "./gear";
import { COSMOS_REWARDS } from "./cosmos";
import { OCEAN_REWARDS } from "./ocean";
import { GAMES_OF_CHANCE_REWARDS } from "./gamesOfChance";
import { STEAMPUNK_REWARDS } from "./steampunk";
import { RELICS_REWARDS } from "./relics";
import { DESSERTS_REWARDS } from "./desserts";
import { DRINKS_REWARDS } from "./drinks";
import { BAKERY_REWARDS } from "./bakery";
import { CRITTERS_REWARDS } from "./critters";
import { WARHAMMER_REWARDS } from "./warhammer";
import { WARCRAFT_REWARDS } from "./warcraft";
import { GOLDEN_ANIMALS_REWARDS } from "./goldenAnimals";
import { PLUSHIES_REWARDS } from "./plushies";
import { FRUITS_REWARDS } from "./fruits";
import { CHOCOLATE_REWARDS } from "./chocolate";
import { CAKES_REWARDS } from "./cakes";
import { MAFIA_REWARDS } from "./mafia";
import { YAKUZA_REWARDS } from "./yakuza";
import { DEMON_GIRLS_REWARDS } from "./demonGirls";
import { CAT_GIRLS_REWARDS } from "./catGirls";
import { CHROME_GIRLS_REWARDS } from "./chromeGirls";
import { ELEMENTAL_WOMEN_REWARDS } from "./elementalWomen";
import { MUSCLE_GIRLS_REWARDS } from "./muscleGirls";
import { MILK_REWARDS } from "./milk";
import { COW_GIRLS_REWARDS } from "./cowGirls";
import { FEET_REWARDS } from "./feet";
import { ICE_CREAM_REWARDS } from "./iceCream";
import { ROMANCE_REWARDS } from "./romance";
import { PIZZA_REWARDS } from "./pizza";
import { GIRL_POWER_REWARDS } from "./girlPower";
import { GRAFFITI_REWARDS } from "./graffiti";
import { HACKING_REWARDS } from "./hacking";
import { HEADPATS_REWARDS } from "./headpats";
import { PINUPS_REWARDS } from "./pinups";
import { CAT_MARTIAL_ARTS_REWARDS } from "./catMartialArts";
import { EMOJIS_REWARDS } from "./emojis";
import { MASSAGE_REWARDS } from "./massage";
import { DRAGON_GIRLS_REWARDS } from "./dragonGirls";
import { VAMPIRES_REWARDS } from "./vampires";
import { RUNES_REWARDS } from "./runes";
import { LUCKY_CATS_REWARDS } from "./luckyCats";
import { WRESTLING_REWARDS } from "./wrestling";
import { GOTH_GIRLS_REWARDS } from "./gothGirls";
import { CAT_DOCTORS_REWARDS } from "./catDoctors";
import { CAT_SCIENTISTS_REWARDS } from "./catScientists";
import { PIRATES_REWARDS } from "./pirates";
import { POLICE_REWARDS } from "./police";
import { CLEANERS_REWARDS } from "./cleaners";
import { BEDTIME_REWARDS } from "./bedtime";
import { SPACE_KNIGHTS_REWARDS } from "./spaceKnights";
import { SILVER_DUOS_REWARDS } from "./silverDuos";
import { SOLDIERS_REWARDS } from "./soldiers";
import { ANCIENT_ROME_REWARDS } from "./ancientRome";
import { DINER_REWARDS } from "./diner";
import { FIREFIGHTERS_REWARDS } from "./firefighters";
import { HOT_TUBS_REWARDS } from "./hotTubs";
import { MEDICS_REWARDS } from "./medics";
import { RED_CARPET_REWARDS } from "./redCarpet";
import { TRAVEL_REWARDS } from "./travel";
import { WILD_WEST_REWARDS } from "./wildWest";
import { WORLD_FEASTS_REWARDS } from "./worldFeasts";

export const FEATURED_REWARDS = {
  ...CYBERPUNK_REWARDS,
  ...ATTITUDE_REWARDS,
  ...ELEMENTS_REWARDS,
  ...SHOWTIME_REWARDS,
  ...GEMS_REWARDS,
  ...HEROES_REWARDS,
  ...OFFICE_REWARDS,
  ...PARTY_REWARDS,
  ...GAME_QUOTES_REWARDS,
  ...BIG_PERSONALITIES_REWARDS,
  ...GOOD_LUCK_REWARDS,
  ...MOVIES_REWARDS,
  ...DANCE_REWARDS,
  ...COMFORT_FOOD_REWARDS,
  ...GOTHAM_REWARDS,
  ...MYTHIC_CREATURES_REWARDS,
  ...CANDY_REWARDS,
  ...GAMER_LIFE_REWARDS,
  ...SUPERHEROES_REWARDS,
  ...TREASURES_REWARDS,
  ...ADVENTURERS_REWARDS,
  ...BALDURS_GATE_REWARDS,
  ...RICHES_REWARDS,
  ...GEAR_REWARDS,
  ...COSMOS_REWARDS,
  ...OCEAN_REWARDS,
  ...GAMES_OF_CHANCE_REWARDS,
  ...STEAMPUNK_REWARDS,
  ...RELICS_REWARDS,
  ...DESSERTS_REWARDS,
  ...DRINKS_REWARDS,
  ...BAKERY_REWARDS,
  ...CRITTERS_REWARDS,
  ...WARHAMMER_REWARDS,
  ...WARCRAFT_REWARDS,
  ...GOLDEN_ANIMALS_REWARDS,
  ...PLUSHIES_REWARDS,
  ...CAKES_REWARDS,
  ...FRUITS_REWARDS,
  ...CHOCOLATE_REWARDS,
  ...MAFIA_REWARDS,
  ...YAKUZA_REWARDS,
  ...DEMON_GIRLS_REWARDS,
  ...CAT_GIRLS_REWARDS,
  ...CHROME_GIRLS_REWARDS,
  ...ELEMENTAL_WOMEN_REWARDS,
  ...MUSCLE_GIRLS_REWARDS,
  ...MILK_REWARDS,
  ...COW_GIRLS_REWARDS,
  ...FEET_REWARDS,
  ...ICE_CREAM_REWARDS,
  ...ROMANCE_REWARDS,
  ...PIZZA_REWARDS,
  ...GIRL_POWER_REWARDS,
  ...GRAFFITI_REWARDS,
  ...HACKING_REWARDS,
  ...HEADPATS_REWARDS,
  ...PINUPS_REWARDS,
  ...CAT_MARTIAL_ARTS_REWARDS,
  ...EMOJIS_REWARDS,
  ...MASSAGE_REWARDS,
  ...DRAGON_GIRLS_REWARDS,
  ...VAMPIRES_REWARDS,
  ...RUNES_REWARDS,
  ...LUCKY_CATS_REWARDS,
  ...WRESTLING_REWARDS,
  ...GOTH_GIRLS_REWARDS,
  ...CAT_DOCTORS_REWARDS,
  ...CAT_SCIENTISTS_REWARDS,
  ...PIRATES_REWARDS,
  ...POLICE_REWARDS,
  ...CLEANERS_REWARDS,
  ...BEDTIME_REWARDS,
  ...SPACE_KNIGHTS_REWARDS,
  ...SILVER_DUOS_REWARDS,
  ...SOLDIERS_REWARDS,
  ...ANCIENT_ROME_REWARDS,
  ...DINER_REWARDS,
  ...FIREFIGHTERS_REWARDS,
  ...HOT_TUBS_REWARDS,
  ...MEDICS_REWARDS,
  ...RED_CARPET_REWARDS,
  ...TRAVEL_REWARDS,
  ...WILD_WEST_REWARDS,
  ...WORLD_FEASTS_REWARDS,
} as const;
