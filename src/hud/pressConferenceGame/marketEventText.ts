// brief cat-themed market headline generation for the press conference
// mini-game's floating market events — split out of index.ts since this is
// pure content generation with no dependency on the game's own canvas/state

const CAT_WORDS = [
  "Purr",
  "Whisker",
  "Meow",
  "Catnip",
  "Kitten",
  "Feline",
  "Paw",
  "Hairball",
  "Fur",
  "Tabby",
  "Nine Lives",
  "Litter Box",
];
const POSITIVE_MARKET_WORDS = [
  "Boom",
  "Rally",
  "Surge",
  "Spike",
  "Bull Run",
  "Soar",
  "Profit",
  "Hype",
];

// a special event, substituted in for a normal good one some of the time
// (see index.ts's getCrashChance) — always bad, and ends the round on hit
// instead of a normal hit's coin burst
export const MARKET_CRASH_TEXT = "Market Crash";

// one cat-themed word plus one positive market-mood word, instead of a fixed
// pre-written phrase — every spawn combines a fresh random pair. Every event
// that isn't the Market Crash is good now (see index.ts's spawnMarketEvent),
// so this never needs to generate a bad headline
export function generateMarketEventText(): string {
  const catWord = CAT_WORDS[Math.floor(Math.random() * CAT_WORDS.length)];
  const moodWord =
    POSITIVE_MARKET_WORDS[
      Math.floor(Math.random() * POSITIVE_MARKET_WORDS.length)
    ];
  return `${catWord} ${moodWord}`;
}

