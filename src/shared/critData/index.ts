// every featured crit's display data (label, colour, icon, description), one
// file per themed category; their rewards load later (critTypes/featured)
import { CYBERPUNK_CRITS } from "./cyberpunk";
import { ATTITUDE_CRITS } from "./attitude";
import { ELEMENTS_CRITS } from "./elements";
import { SHOWTIME_CRITS } from "./showtime";
import { GEMS_CRITS } from "./gems";
import { HEROES_CRITS } from "./heroes";
import { OFFICE_CRITS } from "./office";
import { PARTY_CRITS } from "./party";
import { GAME_QUOTES_CRITS } from "./gameQuotes";
import { BIG_PERSONALITIES_CRITS } from "./bigPersonalities";
import { GOOD_LUCK_CRITS } from "./goodLuck";
import { MOVIES_CRITS } from "./movies";
import { DANCE_CRITS } from "./dance";
import { COMFORT_FOOD_CRITS } from "./comfortFood";
import { GOTHAM_CRITS } from "./gotham";
import { MYTHIC_CREATURES_CRITS } from "./mythicCreatures";
import { CANDY_CRITS } from "./candy";
import { GAMER_LIFE_CRITS } from "./gamerLife";
import { SUPERHEROES_CRITS } from "./superheroes";
import { TREASURES_CRITS } from "./treasures";
import { ADVENTURERS_CRITS } from "./adventurers";
import { BALDURS_GATE_CRITS } from "./baldursGate";
import { RICHES_CRITS } from "./riches";
import { GEAR_CRITS } from "./gear";
import { COSMOS_CRITS } from "./cosmos";
import { OCEAN_CRITS } from "./ocean";
import { GAMES_OF_CHANCE_CRITS } from "./gamesOfChance";
import { STEAMPUNK_CRITS } from "./steampunk";
import { RELICS_CRITS } from "./relics";
import { DESSERTS_CRITS } from "./desserts";
import { DRINKS_CRITS } from "./drinks";
import { BAKERY_CRITS } from "./bakery";
import { CRITTERS_CRITS } from "./critters";
import { WARHAMMER_CRITS } from "./warhammer";
import { WARCRAFT_CRITS } from "./warcraft";
import { GOLDEN_ANIMALS_CRITS } from "./goldenAnimals";
import { PLUSHIES_CRITS } from "./plushies";
import { FRUITS_CRITS } from "./fruits";
import { CHOCOLATE_CRITS } from "./chocolate";
import { CAKES_CRITS } from "./cakes";
import { MAFIA_CRITS } from "./mafia";
import { YAKUZA_CRITS } from "./yakuza";
import { DEMON_GIRLS_CRITS } from "./demonGirls";
import { CAT_GIRLS_CRITS } from "./catGirls";
import { CHROME_GIRLS_CRITS } from "./chromeGirls";
import { ELEMENTAL_WOMEN_CRITS } from "./elementalWomen";
import { MUSCLE_GIRLS_CRITS } from "./muscleGirls";
import { MILK_CRITS } from "./milk";
import { COW_GIRLS_CRITS } from "./cowGirls";
import { FEET_CRITS } from "./feet";
import { ICE_CREAM_CRITS } from "./iceCream";
import { ROMANCE_CRITS } from "./romance";
import { PIZZA_CRITS } from "./pizza";
import { GIRL_POWER_CRITS } from "./girlPower";
import { GRAFFITI_CRITS } from "./graffiti";
import { HACKING_CRITS } from "./hacking";
import { HEADPATS_CRITS } from "./headpats";
import { PINUPS_CRITS } from "./pinups";
import { CAT_MARTIAL_ARTS_CRITS } from "./catMartialArts";
import { EMOJIS_CRITS } from "./emojis";
import { MASSAGE_CRITS } from "./massage";
import { DRAGON_GIRLS_CRITS } from "./dragonGirls";
import { VAMPIRES_CRITS } from "./vampires";
import { RUNES_CRITS } from "./runes";
import { LUCKY_CATS_CRITS } from "./luckyCats";
import { WRESTLING_CRITS } from "./wrestling";
import { GOTH_GIRLS_CRITS } from "./gothGirls";
import { CAT_DOCTORS_CRITS } from "./catDoctors";
import { CAT_SCIENTISTS_CRITS } from "./catScientists";
import { PIRATES_CRITS } from "./pirates";
import { POLICE_CRITS } from "./police";
import { CLEANERS_CRITS } from "./cleaners";
import { BEDTIME_CRITS } from "./bedtime";
import { SPACE_KNIGHTS_CRITS } from "./spaceKnights";
import { SILVER_DUOS_CRITS } from "./silverDuos";
import { SOLDIERS_CRITS } from "./soldiers";
import { ANCIENT_ROME_CRITS } from "./ancientRome";
import { DINER_CRITS } from "./diner";
import { FIREFIGHTERS_CRITS } from "./firefighters";
import { HOT_TUBS_CRITS } from "./hotTubs";
import { MEDICS_CRITS } from "./medics";
import { RED_CARPET_CRITS } from "./redCarpet";
import { TRAVEL_CRITS } from "./travel";
import { WILD_WEST_CRITS } from "./wildWest";
import { WORLD_FEASTS_CRITS } from "./worldFeasts";

export const FEATURED_CRITS = {
  ...CYBERPUNK_CRITS,
  ...ATTITUDE_CRITS,
  ...ELEMENTS_CRITS,
  ...SHOWTIME_CRITS,
  ...GEMS_CRITS,
  ...HEROES_CRITS,
  ...OFFICE_CRITS,
  ...PARTY_CRITS,
  ...GAME_QUOTES_CRITS,
  ...BIG_PERSONALITIES_CRITS,
  ...GOOD_LUCK_CRITS,
  ...MOVIES_CRITS,
  ...DANCE_CRITS,
  ...COMFORT_FOOD_CRITS,
  ...GOTHAM_CRITS,
  ...MYTHIC_CREATURES_CRITS,
  ...CANDY_CRITS,
  ...GAMER_LIFE_CRITS,
  ...SUPERHEROES_CRITS,
  ...TREASURES_CRITS,
  ...ADVENTURERS_CRITS,
  ...BALDURS_GATE_CRITS,
  ...RICHES_CRITS,
  ...GEAR_CRITS,
  ...COSMOS_CRITS,
  ...OCEAN_CRITS,
  ...GAMES_OF_CHANCE_CRITS,
  ...STEAMPUNK_CRITS,
  ...RELICS_CRITS,
  ...DESSERTS_CRITS,
  ...DRINKS_CRITS,
  ...BAKERY_CRITS,
  ...CRITTERS_CRITS,
  ...WARHAMMER_CRITS,
  ...WARCRAFT_CRITS,
  ...GOLDEN_ANIMALS_CRITS,
  ...PLUSHIES_CRITS,
  ...CAKES_CRITS,
  ...FRUITS_CRITS,
  ...CHOCOLATE_CRITS,
  ...MAFIA_CRITS,
  ...YAKUZA_CRITS,
  ...DEMON_GIRLS_CRITS,
  ...CAT_GIRLS_CRITS,
  ...CHROME_GIRLS_CRITS,
  ...ELEMENTAL_WOMEN_CRITS,
  ...MUSCLE_GIRLS_CRITS,
  ...MILK_CRITS,
  ...COW_GIRLS_CRITS,
  ...FEET_CRITS,
  ...ICE_CREAM_CRITS,
  ...ROMANCE_CRITS,
  ...PIZZA_CRITS,
  ...GIRL_POWER_CRITS,
  ...GRAFFITI_CRITS,
  ...HACKING_CRITS,
  ...HEADPATS_CRITS,
  ...PINUPS_CRITS,
  ...CAT_MARTIAL_ARTS_CRITS,
  ...EMOJIS_CRITS,
  ...MASSAGE_CRITS,
  ...DRAGON_GIRLS_CRITS,
  ...VAMPIRES_CRITS,
  ...RUNES_CRITS,
  ...LUCKY_CATS_CRITS,
  ...WRESTLING_CRITS,
  ...GOTH_GIRLS_CRITS,
  ...CAT_DOCTORS_CRITS,
  ...CAT_SCIENTISTS_CRITS,
  ...PIRATES_CRITS,
  ...POLICE_CRITS,
  ...CLEANERS_CRITS,
  ...BEDTIME_CRITS,
  ...SPACE_KNIGHTS_CRITS,
  ...SILVER_DUOS_CRITS,
  ...SOLDIERS_CRITS,
  ...ANCIENT_ROME_CRITS,
  ...DINER_CRITS,
  ...FIREFIGHTERS_CRITS,
  ...HOT_TUBS_CRITS,
  ...MEDICS_CRITS,
  ...RED_CARPET_CRITS,
  ...TRAVEL_CRITS,
  ...WILD_WEST_CRITS,
  ...WORLD_FEASTS_CRITS,
} as const;
