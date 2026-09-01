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
const NEGATIVE_MARKET_WORDS = [
  "Crash",
  "Meltdown",
  "Selloff",
  "Slump",
  "Panic",
  "Plunge",
  "Losses",
  "Downturn",
];

// a special bad event, substituted in for a normal one MARKET_CRASH_CHANCE of
// the time — always bad, but ends the round on hit instead of the usual
// bad-hit explosion+shake+burn-rate penalty (see index.ts's spawnMarketEvent)
export const MARKET_CRASH_TEXT = "Market Crash";
export const MARKET_CRASH_CHANCE = 0.12;

// one cat-themed word plus one market-mood word, instead of a fixed
// pre-written phrase — every spawn combines a fresh random pair
export function generateMarketEventText(good: boolean): string {
  const catWord = CAT_WORDS[Math.floor(Math.random() * CAT_WORDS.length)];
  const moodWords = good ? POSITIVE_MARKET_WORDS : NEGATIVE_MARKET_WORDS;
  const moodWord = moodWords[Math.floor(Math.random() * moodWords.length)];
  return `${catWord} ${moodWord}`;
}
