// every featured crit's metadata, one file per themed category
import { CYBERPUNK_CRIT_INFO } from "./cyberpunk";
import { ATTITUDE_CRIT_INFO } from "./attitude";
import { ELEMENTS_CRIT_INFO } from "./elements";
import { SHOWTIME_CRIT_INFO } from "./showtime";
import { GEMS_CRIT_INFO } from "./gems";
import { HEROES_CRIT_INFO } from "./heroes";
import { OFFICE_CRIT_INFO } from "./office";
import { PARTY_CRIT_INFO } from "./party";
import { GAME_QUOTES_CRIT_INFO } from "./gameQuotes";
import { BIG_PERSONALITIES_CRIT_INFO } from "./bigPersonalities";
import { GOOD_LUCK_CRIT_INFO } from "./goodLuck";
import { MOVIES_CRIT_INFO } from "./movies";
import { DANCE_CRIT_INFO } from "./dance";
import { COMFORT_FOOD_CRIT_INFO } from "./comfortFood";
import { GOTHAM_CRIT_INFO } from "./gotham";
import { MYTHIC_CREATURES_CRIT_INFO } from "./mythicCreatures";
import { CANDY_CRIT_INFO } from "./candy";
import { GAMER_LIFE_CRIT_INFO } from "./gamerLife";
import { SUPERHEROES_CRIT_INFO } from "./superheroes";
import { TREASURES_CRIT_INFO } from "./treasures";
import { ADVENTURERS_CRIT_INFO } from "./adventurers";
import { BALDURS_GATE_CRIT_INFO } from "./baldursGate";
import { RICHES_CRIT_INFO } from "./riches";
import { GEAR_CRIT_INFO } from "./gear";
import { COSMOS_CRIT_INFO } from "./cosmos";
import { OCEAN_CRIT_INFO } from "./ocean";
import { GAMES_OF_CHANCE_CRIT_INFO } from "./gamesOfChance";
import { STEAMPUNK_CRIT_INFO } from "./steampunk";
import { RELICS_CRIT_INFO } from "./relics";
import { DESSERTS_CRIT_INFO } from "./desserts";
import { DRINKS_CRIT_INFO } from "./drinks";
import { BAKERY_CRIT_INFO } from "./bakery";
import { CRITTERS_CRIT_INFO } from "./critters";
import { WARHAMMER_CRIT_INFO } from "./warhammer";
import { WARCRAFT_CRIT_INFO } from "./warcraft";
import { GOLDEN_ANIMALS_CRIT_INFO } from "./goldenAnimals";
import { PLUSHIES_CRIT_INFO } from "./plushies";
import { FRUITS_CRIT_INFO } from "./fruits";
import { CAKES_CRIT_INFO } from "./cakes";

export const FEATURED_CRIT_INFO = {
  ...CYBERPUNK_CRIT_INFO,
  ...ATTITUDE_CRIT_INFO,
  ...ELEMENTS_CRIT_INFO,
  ...SHOWTIME_CRIT_INFO,
  ...GEMS_CRIT_INFO,
  ...HEROES_CRIT_INFO,
  ...OFFICE_CRIT_INFO,
  ...PARTY_CRIT_INFO,
  ...GAME_QUOTES_CRIT_INFO,
  ...BIG_PERSONALITIES_CRIT_INFO,
  ...GOOD_LUCK_CRIT_INFO,
  ...MOVIES_CRIT_INFO,
  ...DANCE_CRIT_INFO,
  ...COMFORT_FOOD_CRIT_INFO,
  ...GOTHAM_CRIT_INFO,
  ...MYTHIC_CREATURES_CRIT_INFO,
  ...CANDY_CRIT_INFO,
  ...GAMER_LIFE_CRIT_INFO,
  ...SUPERHEROES_CRIT_INFO,
  ...TREASURES_CRIT_INFO,
  ...ADVENTURERS_CRIT_INFO,
  ...BALDURS_GATE_CRIT_INFO,
  ...RICHES_CRIT_INFO,
  ...GEAR_CRIT_INFO,
  ...COSMOS_CRIT_INFO,
  ...OCEAN_CRIT_INFO,
  ...GAMES_OF_CHANCE_CRIT_INFO,
  ...STEAMPUNK_CRIT_INFO,
  ...RELICS_CRIT_INFO,
  ...DESSERTS_CRIT_INFO,
  ...DRINKS_CRIT_INFO,
  ...BAKERY_CRIT_INFO,
  ...CRITTERS_CRIT_INFO,
  ...WARHAMMER_CRIT_INFO,
  ...WARCRAFT_CRIT_INFO,
  ...GOLDEN_ANIMALS_CRIT_INFO,
  ...PLUSHIES_CRIT_INFO,
  ...CAKES_CRIT_INFO,
  ...FRUITS_CRIT_INFO,
} as const;
