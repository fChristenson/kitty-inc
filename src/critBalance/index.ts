// every featured crit's odds and reward sizes, one file per featured category;
// pure data with no imports beyond these files, so config.ts can spread it safely
import { CYBERPUNK_BALANCE } from "./cyberpunk";
import { ATTITUDE_BALANCE } from "./attitude";
import { ELEMENTS_BALANCE } from "./elements";
import { SHOWTIME_BALANCE } from "./showtime";
import { GEMS_BALANCE } from "./gems";
import { HEROES_BALANCE } from "./heroes";
import { OFFICE_BALANCE } from "./office";
import { PARTY_BALANCE } from "./party";
import { GAME_QUOTES_BALANCE } from "./gameQuotes";
import { BIG_PERSONALITIES_BALANCE } from "./bigPersonalities";
import { GOOD_LUCK_BALANCE } from "./goodLuck";
import { MOVIES_BALANCE } from "./movies";
import { DANCE_BALANCE } from "./dance";
import { COMFORT_FOOD_BALANCE } from "./comfortFood";
import { GOTHAM_BALANCE } from "./gotham";
import { MYTHIC_CREATURES_BALANCE } from "./mythicCreatures";
import { CANDY_BALANCE } from "./candy";
import { GAMER_LIFE_BALANCE } from "./gamerLife";
import { SUPERHEROES_BALANCE } from "./superheroes";
import { TREASURES_BALANCE } from "./treasures";
import { ADVENTURERS_BALANCE } from "./adventurers";
import { BALDURS_GATE_BALANCE } from "./baldursGate";
import { RICHES_BALANCE } from "./riches";
import { GEAR_BALANCE } from "./gear";
import { COSMOS_BALANCE } from "./cosmos";
import { OCEAN_BALANCE } from "./ocean";
import { GAMES_OF_CHANCE_BALANCE } from "./gamesOfChance";
import { STEAMPUNK_BALANCE } from "./steampunk";
import { RELICS_BALANCE } from "./relics";
import { DESSERTS_BALANCE } from "./desserts";
import { DRINKS_BALANCE } from "./drinks";
import { BAKERY_BALANCE } from "./bakery";
import { CRITTERS_BALANCE } from "./critters";
import { WARHAMMER_BALANCE } from "./warhammer";
import { WARCRAFT_BALANCE } from "./warcraft";
import { GOLDEN_ANIMALS_BALANCE } from "./goldenAnimals";
import { PLUSHIES_BALANCE } from "./plushies";
import { FRUITS_BALANCE } from "./fruits";
import { CHOCOLATE_BALANCE } from "./chocolate";
import { CAKES_BALANCE } from "./cakes";
import { MAFIA_BALANCE } from "./mafia";
import { YAKUZA_BALANCE } from "./yakuza";
import { DEMON_GIRLS_BALANCE } from "./demonGirls";
import { CAT_GIRLS_BALANCE } from "./catGirls";
import { CHROME_GIRLS_BALANCE } from "./chromeGirls";
import { ELEMENTAL_WOMEN_BALANCE } from "./elementalWomen";

export const FEATURED_CRIT_BALANCE = {
  ...CYBERPUNK_BALANCE,
  ...ATTITUDE_BALANCE,
  ...ELEMENTS_BALANCE,
  ...SHOWTIME_BALANCE,
  ...GEMS_BALANCE,
  ...HEROES_BALANCE,
  ...OFFICE_BALANCE,
  ...PARTY_BALANCE,
  ...GAME_QUOTES_BALANCE,
  ...BIG_PERSONALITIES_BALANCE,
  ...GOOD_LUCK_BALANCE,
  ...MOVIES_BALANCE,
  ...DANCE_BALANCE,
  ...COMFORT_FOOD_BALANCE,
  ...GOTHAM_BALANCE,
  ...MYTHIC_CREATURES_BALANCE,
  ...CANDY_BALANCE,
  ...GAMER_LIFE_BALANCE,
  ...SUPERHEROES_BALANCE,
  ...TREASURES_BALANCE,
  ...ADVENTURERS_BALANCE,
  ...BALDURS_GATE_BALANCE,
  ...RICHES_BALANCE,
  ...GEAR_BALANCE,
  ...COSMOS_BALANCE,
  ...OCEAN_BALANCE,
  ...GAMES_OF_CHANCE_BALANCE,
  ...STEAMPUNK_BALANCE,
  ...RELICS_BALANCE,
  ...DESSERTS_BALANCE,
  ...DRINKS_BALANCE,
  ...BAKERY_BALANCE,
  ...CRITTERS_BALANCE,
  ...WARHAMMER_BALANCE,
  ...WARCRAFT_BALANCE,
  ...GOLDEN_ANIMALS_BALANCE,
  ...PLUSHIES_BALANCE,
  ...FRUITS_BALANCE,
  ...CHOCOLATE_BALANCE,
  ...CAKES_BALANCE,
  ...MAFIA_BALANCE,
  ...YAKUZA_BALANCE,
  ...DEMON_GIRLS_BALANCE,
  ...CAT_GIRLS_BALANCE,
  ...CHROME_GIRLS_BALANCE,
  ...ELEMENTAL_WOMEN_BALANCE,
} as const;
