// generates a fun cat/business-themed name for each city on the map (see
// background/cityMap, which shows one of these per 5-building "page") and
// remembers it forever once generated — the same city always keeps the same name

const CAT_WORDS = [
  "Whisker",
  "Meow",
  "Purr",
  "Paw",
  "Feline",
  "Tabby",
  "Kitten",
  "Claw",
  "Fluff",
  "Tuna",
  "Yarn",
  "Mouser",
  "Scratch",
  "Tail",
  "Fur",
  "Hiss",
  "Pounce",
  "Kibble",
  "Litter",
  "Catnip",
  "Saucer",
  "Whisk",
  "Prowl",
  "Snuggle",
  "Chonk",
  "Fuzz",
  "Pawsome",
  "Furball",
  "Nuzzle",
  "Mewl",
  "Tomcat",
  "Alleycat",
  "Calico",
  "Ginger",
  "Tuxedo",
  "Siamese",
  "Persian",
  "Sphynx",
  "Cattail",
  "Purrfect",
  "Clawford",
  "Whiskington",
  "Meowford",
  "Pawington",
  "Furrington",
  "Napster",
  "Sunbeam",
  "Cuddle",
  "Velvet",
  "Whiskerino",
];

// place-name suffixes stitched straight onto a cat word (e.g. "Whisker" + "ville")
const PLACE_SUFFIXES = [
  "ville",
  "ton",
  "burg",
  "opolis",
  "dale",
  "shire",
  "port",
  "haven",
  "field",
  "wood",
  "brook",
  "vale",
  "gate",
  "borough",
  "ridge",
  "hollow",
  "landing",
  "crossing",
  "heights",
  "bay",
];

// business-y words that follow a cat word as its own separate word (e.g.
// "Whisker" + "Holdings")
const BUSINESS_WORDS = [
  "Holdings",
  "Inc.",
  "Enterprises",
  "Industries",
  "Ventures",
  "Capital",
  "Group",
  "& Co.",
  "Partners",
  "Financial",
  "Trust",
  "Exchange",
  "Union",
  "Consolidated",
  "Global",
  "Dynamics",
  "Solutions",
  "Corp.",
  "Collective",
  "Syndicate",
  "Conglomerate",
  "Cooperative",
  "Alliance",
  "Corporation",
  "Investments",
  "Associates",
  "Brands",
  "Networks",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// a handful of different shapes to combine the word lists into, picked at random
// each time a brand new city needs a name — keeps names from all looking the same
const NAME_TEMPLATES: (() => string)[] = [
  () => `${pick(CAT_WORDS)}${pick(PLACE_SUFFIXES)}`,
  () => `${pick(CAT_WORDS)} ${pick(BUSINESS_WORDS)}`,
  () => `${pick(CAT_WORDS)}${pick(PLACE_SUFFIXES)} ${pick(BUSINESS_WORDS)}`,
  () => `${pick(CAT_WORDS)} & ${pick(CAT_WORDS)} ${pick(BUSINESS_WORDS)}`,
];

function generateCityName(): string {
  return pick(NAME_TEMPLATES)();
}

const STORAGE_KEY = "cash-clicker:city-names";
let cachedNames: string[] | null = null;

function loadNames(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNames(names: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    // storage unavailable/full: the name just regenerates next load, harmless
  }
}

// returns cityIndex's name, generating (and persisting) a brand new one the first
// time this city is ever reached; every call after that returns the same name
export function getCityName(cityIndex: number): string {
  if (!cachedNames) cachedNames = loadNames();
  const existing = cachedNames[cityIndex];
  if (existing) return existing;
  const name = generateCityName();
  cachedNames[cityIndex] = name;
  saveNames(cachedNames);
  return name;
}

// wipes every generated city name; call alongside clearBuildings()/clearTotalIncome()
// on a full game reset, so a fresh game generates fresh names instead of reusing
// whatever the previous save had already stored
export function clearCityNames(): void {
  cachedNames = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}
