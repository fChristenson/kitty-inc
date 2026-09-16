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
