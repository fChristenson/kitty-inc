import {
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  type CritProcKind,
  type CritTier,
} from "../../shared/critTypes";

export const MAP_CRIT_TEST_KINDS: readonly CritProcKind[] = [
  "chain",
  "upgrade",
  "heavenly",
  "skip",
  "grandOpening",
  "luckyClover",
  "mystic",
  "pair",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "royalFlush",
];

export function createTestButtonMarkup(): string {
  const tiers = [...CRIT_TIER_ORDER]
    .reverse()
    .map(
      (tier) =>
        `<option value="${tier}">${CRIT_TIER_CONFIG[tier].label}</option>`,
    )
    .join("");
  const buttons = [...CRIT_PROC_KINDS]
    .sort((left, right) =>
      CRIT_PROC_INFO[left].label.localeCompare(CRIT_PROC_INFO[right].label),
    )
    .map(
      (kind) =>
        `<button class="game__button" data-crit-kind="${kind}">${CRIT_PROC_INFO[kind].label}</button>`,
    )
    .join("");
  return `
    <div class="test-actions-bar">
      <input type="search" id="test-actions-filter" class="test-actions-filter" placeholder="Filter actions" autocomplete="off" />
      <p class="test-actions-empty" id="test-actions-empty" hidden>No matches</p>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Test Actions</summary>
        <div class="test-actions-dropdown__menu">
          <button id="add-money" class="game__button">Add Money</button>
          <button id="spawn-mouse" class="game__button">Spawn Mouse</button>
          <button id="test-idle-overlay" class="game__button">Idle Overlay</button>
          <button id="test-boost-event" class="game__button">Boost</button>
          <button id="test-union-event" class="game__button">Union</button>
          <button id="test-kickback-event" class="game__button">Kickback</button>
          <button id="test-burst-event" class="game__button">Burst</button>
          <button id="test-spray-event" class="game__button">Spray</button>
          <button id="test-fountain-event" class="game__button">Fountain</button>
          <button id="test-ripple-event" class="game__button">Ripple</button>
          <button id="test-wrecking-ball-event" class="game__button">Wrecking Ball</button>
          <button id="test-piledriver-event" class="game__button">Piledriver</button>
          <button id="test-orbital-strike-event" class="game__button">Orbital Strike</button>
          <button id="test-fuse-event" class="game__button">Fuse</button>
          <button id="test-supernova-event" class="game__button">Supernova</button>
          <button id="test-bowling-event" class="game__button">Bowling</button>
          <button id="test-thunderclap-event" class="game__button">Thunderclap</button>
          <button id="test-chain-reaction-event" class="game__button">Chain Reaction</button>
          <button id="test-bullseye-event" class="game__button">Bullseye</button>
          <button id="test-popcorn-event" class="game__button">Popcorn</button>
          <button id="test-newtons-cradle-event" class="game__button">Newton's Cradle</button>
          <button id="test-juggle-event" class="game__button">Juggle</button>
          <button id="test-boomerang-event" class="game__button">Boomerang</button>
          <button id="test-heartbeat-event" class="game__button">Heartbeat</button>
          <button id="test-clash-event" class="game__button">Clash</button>
          <button id="test-asteroids-event" class="game__button">Asteroids</button>
          <button id="test-whack-a-mole-event" class="game__button">Whack-a-Mole</button>
          <button id="test-drumroll-event" class="game__button">Drumroll</button>
          <button id="test-shell-game-event" class="game__button">Shell Game</button>
          <button id="test-seesaw-event" class="game__button">Seesaw</button>
          <button id="test-scratch-event" class="game__button">Scratch</button>
          <button id="test-tag-event" class="game__button">Tag</button>
          <button id="test-bumpers-event" class="game__button">Bumpers</button>
          <button id="test-catcher-event" class="game__button">Catcher</button>
          <button id="test-implosion-event" class="game__button">Implosion</button>
          <button id="test-atom-event" class="game__button">Atom</button>
          <button id="test-spiral-event" class="game__button">Spiral</button>
          <button id="test-loop-event" class="game__button">Loop</button>
          <button id="test-eternity-event" class="game__button">Eternity</button>
          <button id="test-helix-event" class="game__button">Helix</button>
          <button id="test-yo-yo-event" class="game__button">Yo-Yo</button>
          <button id="test-racetrack-event" class="game__button">Racetrack</button>
          <button id="test-swing-event" class="game__button">Swing</button>
          <button id="test-kaleidoscope-event" class="game__button">Kaleidoscope</button>
          <button id="test-zipper-event" class="game__button">Zipper</button>
          <button id="test-screensaver-event" class="game__button">Screensaver</button>
          <button id="test-sprinkler-event" class="game__button">Sprinkler</button>
          <button id="test-clockwork-event" class="game__button">Clockwork</button>
          <button id="test-hole-in-one-event" class="game__button">Hole in One</button>
          <button id="test-leapfrog-event" class="game__button">Leapfrog</button>
          <button id="test-lineup-event" class="game__button">Lineup</button>
          <button id="test-stampede-event" class="game__button">Stampede</button>
          <button id="test-wormhole-event" class="game__button">Wormhole</button>
          <button id="test-splat-event" class="game__button">Splat</button>
          <button id="test-roulette-event" class="game__button">Roulette</button>
          <button id="test-free-kick-event" class="game__button">Free Kick</button>
          <button id="test-slalom-event" class="game__button">Slalom</button>
          <button id="test-lightning-event" class="game__button">Lightning</button>
          <button id="test-fire-hose-event" class="game__button">Fire Hose</button>
          <button id="test-confluence-event" class="game__button">Confluence</button>
          <button id="test-slosh-event" class="game__button">Slosh</button>
          <button id="test-siphon-event" class="game__button">Siphon</button>
          <button id="test-crossfire-event" class="game__button">Crossfire</button>
          <button id="test-gravity-well-event" class="game__button">Gravity Well</button>
          <button id="test-splashdown-event" class="game__button">Splashdown</button>
          <button id="test-geysers-event" class="game__button">Geysers</button>
          <button id="test-cash-cannon-event" class="game__button">Cash Cannon</button>
          <button id="test-hoover-event" class="game__button">Hoover</button>
          <button id="test-air-show-event" class="game__button">Air Show</button>
          <button id="test-leak-event" class="game__button">Leak</button>
          <button id="test-climb-event" class="game__button">Climb</button>
          <button id="test-kite-event" class="game__button">Kite</button>
          <button id="test-rainbow-event" class="game__button">Rainbow</button>
          <button id="test-branches-event" class="game__button">Branches</button>
          <button id="test-tug-of-war-event" class="game__button">Tug of War</button>
          <button id="test-waterwheel-event" class="game__button">Waterwheel</button>
          <button id="test-braid-event" class="game__button">Braid</button>
          <button id="test-skim-event" class="game__button">Skim</button>
          <button id="test-lattice-event" class="game__button">Lattice</button>
          <button id="test-fireworks-event" class="game__button">Fireworks</button>
          <button id="test-slingshot-event" class="game__button">Slingshot</button>
          <button id="test-marquee-event" class="game__button">Marquee</button>
          <button id="test-crop-duster-event" class="game__button">Crop Duster</button>
          <button id="test-bolas-event" class="game__button">Bolas</button>
          <button id="test-countdown-event" class="game__button">Countdown</button>
          <button id="test-sparkler-event" class="game__button">Sparkler</button>
          <button id="test-slinky-event" class="game__button">Slinky</button>
          <button id="test-pipeline-event" class="game__button">Pipeline</button>
          <button id="test-prism-event" class="game__button">Prism</button>
          <button id="test-trampoline-event" class="game__button">Trampoline</button>
          <button id="test-hummingbird-event" class="game__button">Hummingbird</button>
          <button id="test-dive-bomb-event" class="game__button">Dive Bomb</button>
          <button id="test-ski-jump-event" class="game__button">Ski Jump</button>
          <button id="test-jetpack-event" class="game__button">Jetpack</button>
          <button id="test-bass-drop-event" class="game__button">Bass Drop</button>
          <button id="test-scanner-event" class="game__button">Scanner</button>
          <button id="test-slash-event" class="game__button">Slash</button>
          <button id="test-jackhammer-event" class="game__button">Jackhammer</button>
          <button id="test-pummel-event" class="game__button">Pummel</button>
          <button id="test-overload-event" class="game__button">Overload</button>
          <button id="test-gatling-event" class="game__button">Gatling</button>
          <button id="test-press-event" class="game__button">Press</button>
          <button id="test-drill-event" class="game__button">Drill</button>
          <button id="test-burrow-event" class="game__button">Burrow</button>
          <button id="test-ping-pong-event" class="game__button">Ping Pong</button>
          <button id="test-slam-dunk-event" class="game__button">Slam Dunk</button>
          <button id="test-uppercut-event" class="game__button">Uppercut</button>
          <button id="test-head-hop-event" class="game__button">Head Hop</button>
          <button id="test-paparazzi-event" class="game__button">Paparazzi</button>
          <button id="test-missile-barrage-event" class="game__button">Missile Barrage</button>
          <button id="test-sonic-boom-event" class="game__button">Sonic Boom</button>
          <button id="test-mitosis-event" class="game__button">Mitosis</button>
          <button id="test-plinko-event" class="game__button">Plinko</button>
          <button id="test-hammer-throw-event" class="game__button">Hammer Throw</button>
          <button id="test-snake-event" class="game__button">Snake</button>
          <button id="test-breakout-event" class="game__button">Breakout</button>
          <button id="test-line-clear-event" class="game__button">Line Clear</button>
          <button id="test-break-shot-event" class="game__button">Break Shot</button>
          <button id="test-bullet-hell-event" class="game__button">Bullet Hell</button>
          <button id="test-vortex-event" class="game__button">Vortex</button>
          <button id="test-ricochet-event" class="game__button">Ricochet</button>
          <button id="test-waterfall-event" class="game__button">Waterfall</button>
          <button id="test-conveyor-event" class="game__button">Conveyor</button>
          <button id="test-fireflies-event" class="game__button">Fireflies</button>
          <button id="test-payday-event" class="game__button">Payday</button>
          <button id="test-piggy-bank-event" class="game__button">Piggy Bank</button>
          <button id="test-coin-toss-event" class="game__button">Coin Toss</button>
          <button id="test-hourglass-event" class="game__button">Hourglass</button>
          <button id="test-rocket-event" class="game__button">Rocket</button>
          <button id="test-reveal-event" class="game__button">Reveal</button>
          <button id="test-jackpot-reels-event" class="game__button">Jackpot</button>
          <button id="test-chain-pay-event" class="game__button">Chain Pay</button>
          <button id="test-twister-event" class="game__button">Twister</button>
          <button id="test-downpour-event" class="game__button">Downpour</button>
          <button id="test-trickle-event" class="game__button">Trickle</button>
          <button id="test-magnet-event" class="game__button">Magnet</button>
          <button id="test-spillover-event" class="game__button">Spillover</button>
          <button id="test-constellation-event" class="game__button">Constellation</button>
          <button id="test-ascend-event" class="game__button">Ascend</button>
          <button id="test-rising-tide-event" class="game__button">Rising Tide</button>
          <button id="test-tidal-wave-event" class="game__button">Tidal Wave</button>
          <button id="test-beanstalk-event" class="game__button">Beanstalk</button>
          <button id="test-blessing-event" class="game__button">Blessing</button>
          <button id="test-halo-event" class="game__button">Halo</button>
          <button id="test-comet-event" class="game__button">Comet</button>
          <button id="test-meteor-shower-event" class="game__button">Meteor Shower</button>
          <button id="test-mentor-event" class="game__button">Mentor</button>
          <button id="test-spark-chain-event" class="game__button">Spark Chain</button>
          <button id="test-polish-event" class="game__button">Polish</button>
          <button id="test-lighthouse-event" class="game__button">Lighthouse</button>
          <button id="test-recruit-event" class="game__button">Recruit</button>
          <button id="test-promotion-day-event" class="game__button">Promotion Day</button>
          <button id="test-alchemy-event" class="game__button">Alchemy</button>
          <button id="test-investment-event" class="game__button">Investment</button>
          <button id="test-dividends-event" class="game__button">Dividends</button>
          <button id="test-wisp-event" class="game__button">Wisp</button>
          <button id="test-stream-event" class="game__button">Stream</button>
          <button id="test-trails-event" class="game__button">Trails</button>
          <button id="test-draw-event" class="game__button">Draw</button>
          <label>Draw number <select id="test-draw-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-night-sky-event" class="game__button">Night Sky</button>
          <label>Night Sky number <select id="test-night-sky-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-pitcher-event" class="game__button">Pitcher</button>
          <label>Pitcher number <select id="test-pitcher-event-tier"><option value="random">Random</option>${tiers}</select></label>
          <button id="test-glimmer-event" class="game__button">Glimmer</button>
          <button id="test-hunt-event" class="game__button">Hunt</button>
          <button id="test-swarm-event" class="game__button">Swarm</button>
          <button id="test-renovate-event" class="game__button">Renovate</button>
          <button id="test-upgrade-event" class="game__button">Upgrade</button>
          <button id="test-unlock-event" class="game__button">Unlock</button>
          <label>Unlock crit <select id="test-unlock-event-crit"><option value="random">Random</option><option value="none">No crit</option>${tiers}</select></label>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Crits</summary>
        <div class="test-actions-dropdown__menu">
          <label>Event <select id="test-crit-event"><option value="upgrade">Upgrade click</option><option value="unlock">Floor unlock</option><option value="map">Map unlock</option></select></label>
          <label>Tier <select id="test-crit-tier">${tiers}</select></label>
          <label>Bonus tier <select id="test-crit-bonus"><option value="">None</option>${tiers}</select></label>
          <button class="game__button" data-crit-kind="">Regular Crit</button>
          ${buttons}
        </div>
      </details>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>`;
}

export function wireCritTestActions(
  container: HTMLElement,
  onForce: (
    kind: CritProcKind | null,
    tier: CritTier,
    bonusTier: CritTier | null,
    event: "upgrade" | "unlock" | "map",
  ) => void,
): void {
  const event = container.querySelector<HTMLSelectElement>("#test-crit-event")!;
  const tier = container.querySelector<HTMLSelectElement>("#test-crit-tier")!;
  const bonus = container.querySelector<HTMLSelectElement>("#test-crit-bonus")!;
  const buttons =
    container.querySelectorAll<HTMLButtonElement>("[data-crit-kind]");
  const filter = container.querySelector<HTMLInputElement>(
    "#test-actions-filter",
  )!;
  function updateEvent(): void {
    const map = event.value === "map";
    for (const button of buttons) {
      const kind = button.dataset.critKind as CritProcKind | "";
      const unavailable =
        map && kind !== "" && !MAP_CRIT_TEST_KINDS.includes(kind);
      button.dataset.eventUnavailable = String(unavailable);
      button.hidden = unavailable;
      button.disabled = unavailable;
    }
    bonus.disabled = map;
    if (map) bonus.value = "";
    filter.dispatchEvent(new Event("input"));
  }
  event.addEventListener("change", updateEvent);
  updateEvent();
  for (const button of buttons) {
    button.addEventListener("click", () => {
      if (button.dataset.eventUnavailable === "true") return;
      const kind = button.dataset.critKind as CritProcKind | "";
      onForce(
        kind || null,
        tier.value as CritTier,
        kind && event.value !== "map"
          ? (bonus.value as CritTier) || null
          : null,
        event.value as "upgrade" | "unlock" | "map",
      );
    });
  }
}
