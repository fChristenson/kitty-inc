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
