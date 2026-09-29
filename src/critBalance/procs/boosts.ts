// worker boosts and timed speedups: odds and effect sizes, spread into CONFIG.crit
export const BOOSTS_BALANCE = {
  // "boost crit" — a separate, independent roll from chain, but only ever
  // checked once a crit/mega/ultra tier has already landed on this same
  // click: it piggybacks on that tier's own free-upgrade payout instead of
  // replacing it, adding a free worker boost on top
  boostChance: 0.1,
  // "sunshine crit" — same free-worker-boost reward as boost above, just
  // its own longer duration (see shared/critTypes' SUNSHINE_BOOST_DURATION_MS)
  sunshineChance: 0.08,
  // "snowday crit" — same free-worker-boost reward as sunshine above, just
  // its own longer duration still (see shared/critTypes' SNOWDAY_BOOST_DURATION_MS)
  snowdayChance: 0.06,
  // "night shift crit" — same building-wide free-worker-boost reward as
  // boost/sunshine/snowday above, but SHORTER than plain boost's own
  // duration, and temporarily counts as +1 worker for boost-strength
  // purposes (see shared/critTypes' NIGHT_SHIFT_BOOST_DURATION_MS)
  nightShiftChance: 0.08,
  // "Rush Hour" crit — for rushHourDurationMs, every unlocked floor's own
  // income timer is capped at rushHourIntervalSeconds (never slowed down —
  // see shared/critTypes' isRushHourActive), stacking with whatever worker
  // boost/office-upgrade speedup already applies; a floor already faster
  // than the cap is left completely untouched
  rushHourChance: 0.08,
  rushHourIntervalSeconds: 0.5,
  rushHourDurationMs: 15000,
  // "Rate Lock" crit — for one floor, guarantees a half-length income interval
  // multiplier for a short window without changing its stored interval
  rateLockChance: 0.08,
  rateLockSpeedMultiplier: 0.5,
  rateLockDurationMs: 10000,
  // "Espresso Shot" crit — boosts every unlocked floor's workers for the
  // regular boost duration, with the same canonical worker-speed behavior
  espressoShotChance: 0.08,
  // "Coffee Run" crit — same building-wide free-worker-boost reward as
  // boost/sunshine/snowday, but the longest duration of the family (a full
  // minute), so rarer than any of them
  coffeeRunChance: 0.03,
  // "Team Lunch" crit — doubles the normal boost duration for every actual
  // worker on only the floor where the crit landed
  teamLunchChance: 0.08,
  // "Night Owl" crit — Night Shift's reward with twice the virtual-worker
  // bump (+2 instead of +1), so a touch rarer than it
  nightOwlChance: 0.05,
  powerSurgeChance: 0.05,
} as const;
