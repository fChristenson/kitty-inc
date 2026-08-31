// generates a fun cat-themed company name for the corporation that owns every city
// on the map (see background/cityMap, which shows the current one bottom-right) and
// remembers it forever once generated — same idea as cityName.ts, just one tier up.
// Only one corporation exists today (index 0, one corporation owning every city),
// but this is keyed by index the same way cityName.ts is, ready for whenever the
// game supports more than one

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

// corporate-flavored words that follow a cat word (e.g. "Whisker" + "Holdings") —
// distinct from cityName.ts's own list since these read as a company, not a place
const CORP_WORDS = [
  "Holdings",
  "Corp.",
  "Inc.",
  "LLC",
  "& Co.",
  "& Sons",
  "Enterprises",
  "Industries",
  "Ventures",
  "Group",
  "Partners",
  "Consolidated",
  "International",
  "Worldwide",
  "Syndicate",
  "Conglomerate",
  "Trust",
  "Capital",
  "Dynamics",
  "Solutions",
  "Systems",
  "Technologies",
  "Brands",
  "Collective",
  "Cooperative",
  "Alliance",
  "Corporation",
  "Investments",
  "Associates",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// a handful of different shapes to combine the word lists into, picked at random
// each time a brand new corporation needs a name — keeps names from all reading
// the same way
const NAME_TEMPLATES: (() => string)[] = [
  () => `${pick(CAT_WORDS)} ${pick(CORP_WORDS)}`,
  () => `${pick(CAT_WORDS)} & ${pick(CAT_WORDS)} ${pick(CORP_WORDS)}`,
  () => `${pick(CAT_WORDS)}'s ${pick(CORP_WORDS)}`,
  () => `${pick(CAT_WORDS)} ${pick(CORP_WORDS)}, ${pick(CORP_WORDS)}`,
];

function generateCorporationName(): string {
  return pick(NAME_TEMPLATES)();
}

const STORAGE_KEY = "cash-clicker:corporation-names";
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

// returns corporationIndex's name, generating (and persisting) a brand new one the
// first time this corporation is ever reached; every call after that returns the
// same name. Call with 0 for now — the game only supports one corporation
export function getCorporationName(corporationIndex: number): string {
  if (!cachedNames) cachedNames = loadNames();
  const existing = cachedNames[corporationIndex];
  if (existing) return existing;
  const name = generateCorporationName();
  cachedNames[corporationIndex] = name;
  saveNames(cachedNames);
  return name;
}

// how many corporations exist so far — always at least 1 (getCorporationName(0)
// lazily creates the first one the moment anything asks how many there are)
export function getCorporationCount(): number {
  getCorporationName(0);
  return (cachedNames as string[]).length;
}

const CORPORATION_BASE_PRICE = 1_000_000; // $ to create the first new corporation
const CORPORATION_COST_MULTIPLIER = 1000; // each one after that costs this much more

// $ cost to create the next corporation — same scaling shape as buildings.ts's
// getBuildingPrice, just keyed off getCorporationCount() instead of a building
// index: the first-ever new corporation (index 1) costs CORPORATION_BASE_PRICE,
// and every one after that costs CORPORATION_COST_MULTIPLIER (1000x) more
export function getCorporationPrice(): number {
  const nextIndex = getCorporationCount();
  return (
    CORPORATION_BASE_PRICE * CORPORATION_COST_MULTIPLIER ** (nextIndex - 1)
  );
}

// generates (and persists) a brand new corporation right after the last one, same
// naming logic as getCorporationName; returns its index. See
// hud/companySelectMenu's "Create new Corporation" item
export function createNewCorporation(): number {
  const index = getCorporationCount();
  getCorporationName(index);
  return index;
}

// wipes every generated corporation name; call alongside clearCityNames() on a
// full game reset, so a fresh game generates a fresh corporation name too
export function clearCorporationNames(): void {
  cachedNames = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}
