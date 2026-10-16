// every random spawn's tunables, spread into CONFIG (src/config.ts). Pure
// data, so config.ts can read it at load time
export const SPAWN_CONFIG = {
  // the random spawns that wander onto the screen on their own every so
  // often, each tapped for a reward. While none of a kind is out, it rolls
  // every rollEveryMs and spawns with procChance, but not until cooldownMs
  // after the last one left
  randomSpawns: {
    // the gateway across every kind: at most `count` spawn in a round (never
    // more out at once), then none roll until cooldownMs after the last is gone
    gate: { count: 2, cooldownMs: 15_000 },
    // src/spawn/mouse — a mouse running about a random unlocked floor
    mouse: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long it runs about before leaving, pulsing over its last pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
    },
    // src/spawn/bubbles — bubbles blown up the screen: tap one to pop it for
    // what's inside
    bubbles: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long they float before vanishing, pulsing over its last pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
      count: [3, 7],
      // a bubble's odds of holding a crit number, a coin or a badge
      contentOdds: { tier: 0.45, coin: 0.4, badge: 0.15 },
      // a crit number's odds of promoting one of its floor's workers a perma
      // tier instead of adding its levels to the floor's bar
      workerChance: 0.5,
    },
    // src/spawn/wisp — a wisp dashing across the screen, shedding glitter: a
    // swipe sweeps it up into the total
    wisp: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // its dash, then how long the glitter lingers, pulsing over its last
      // pulseMs
      dashMs: 1_600,
      // longer paths (loops, spirals, rows) at the dash's speed, capped here
      maxDashMs: 2_800,
      durationMs: 6_000,
      pulseMs: 2_000,
      specks: 380,
      // all its glitter swept up pays this many seconds of the company's income
      rewardSeconds: 30,
    },
    // src/spawn/coin — black holes opening on the floors, a coin hovering over
    // each: a tap flips one up and it's sucked into the total
    coin: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long each hovers before sinking back, pulsing over its last
      // pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
      count: [3, 7] as [number, number],
      // all of them tapped pay this many seconds of the company's income
      rewardSeconds: 20,
    },
    // src/spawn/pickMe — x3, x7 and x10 pop up over a floor's bar, wisps
    // cover them and shuffle like cups: the tapped one's number is that many
    // levels for the floor
    pickMe: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // from the numbers popping up, the shuffle included, pulsing over its
      // last pulseMs
      durationMs: 8_000,
      pulseMs: 2_000,
    },
    // src/spawn/pacman — a wisp darts in leaving a path of lights ending on a
    // badge: tracing the path onto the badge wins it
    pacman: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long the path waits to be traced, pulsing over its last pulseMs
      durationMs: 7_000,
      pulseMs: 2_000,
      // the wisp's dash laying the path
      dashMs: 1_200,
    },
    // src/spawn/blackHole — a little nebula: hold it down and it collapses
    // into a black hole sucking in the screen, then goes supernova
    blackHole: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      durationMs: 6_000,
      pulseMs: 2_000,
      // how long it must be held
      holdMs: 3_000,
      // the levels it gives each floor in view, and the seconds of the
      // company's income it pays
      levels: 5,
      rewardSeconds: 30,
    },
    // src/spawn/simonSays — the buttons in view flip and show numbers: tapped
    // in order, each tap plays its part of an effect
    simonSays: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      durationMs: 8_000,
      pulseMs: 2_000,
      // how many taps past one per button in view, so a button repeats
      extraTaps: 1,
      // the levels each tap gives its floor, and the seconds of the
      // company's income the last one pays
      levels: 3,
      rewardSeconds: 30,
    },
    // src/spawn/lightningStorm — a ball of lightning on the end of a floor's
    // bar: held and dragged along the bar, it strikes it behind the finger,
    // money spilling out of every strike into the total
    lightningStorm: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      durationMs: 6_000,
      pulseMs: 2_000,
      // strikes along the bar's length, and the seconds of the company's
      // income they pay between them
      strikes: 12,
      rewardSeconds: 30,
    },
    // src/spawn/swarm — a cluster of wisps flies in and settles: each tap
    // scatters it to gather somewhere else, the last one rushes it into the
    // total
    swarm: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long it waits at each spot, pulsing over its last pulseMs
      durationMs: 5_000,
      pulseMs: 2_000,
      taps: 3,
      // the seconds of the company's income the whole swarm pays
      rewardSeconds: 30,
    },
    // src/spawn/pullShot — a wisp in a band of light between two posts:
    // pulled back and let go, it shoots into the total
    pullShot: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      durationMs: 6_000,
      pulseMs: 2_000,
      // the seconds of the company's income a full pull pays; the shortest
      // shot pays minShare of it
      rewardSeconds: 40,
      minShare: 0.25,
    },
    // src/spawn/sweetSpot — a ring closing in on a coin again and again: a
    // tap while it's in the gold zone pays and starts it over with a thinner
    // zone; the last round bursts the coin, a miss ends it
    sweetSpot: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      // how long it waits for a tap each round, pulsing over its last pulseMs
      durationMs: 6_000,
      pulseMs: 2_000,
      // how long the ring takes to close in, every pass
      passMs: 1_000,
      rounds: 5,
      // the seconds of the company's income a match pays, times its round
      // (1, 2, 3...)
      matchSeconds: 5,
    },
    // src/spawn/keepItUp — a wisp twirling, a coin dropping onto it: held
    // down, the wisp darts there and sweeps a line of light the coin bounces
    // on; the last bounce sends it into the total, a miss lets it fall
    keepItUp: {
      rollEveryMs: 5_000,
      procChance: 0.05,
      cooldownMs: 5_000,
      bounces: 6,
      // the seconds of the company's income a bounce pays, times its count
      // (1, 2, 3...), and the last one's into the total
      bounceSeconds: 3,
      finalSeconds: 30,
    },
  },
} as const;
