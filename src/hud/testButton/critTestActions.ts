import {
  CRIT_GROUPS,
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  CRIT_TIER_ORDER,
  CRIT_TIER_CONFIG,
  MAP_CRIT_KINDS,
  PLAYED_CRITS,
  type CritGroup,
  type CritMeta,
  type CritProcKind,
  type CritTier,
  type EventCard,
} from "../../crits";
import type { SpawnMeta } from "../../shared/spawnGames";

// a test button, wired by its id or its data attribute
interface TestButton {
  label: string;
  id?: string;
  data?: readonly [name: string, value: string];
  danger?: boolean;
}
// a picker for what the buttons beside it force
interface TestSelect {
  select: string;
  id: string;
  options: readonly (readonly [value: string, label: string])[];
}
type TestItem = TestButton | TestSelect;

function itemMarkup(item: TestItem): string {
  if ("select" in item) {
    const options = item.options
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
    return `<label>${item.select} <select id="${item.id}">${options}</select></label>`;
  }
  const id = item.id ? ` id="${item.id}"` : "";
  const data = item.data ? ` data-${item.data[0]}="${item.data[1]}"` : "";
  const danger = item.danger ? " game__button--danger" : "";
  return `<button${id} class="game__button${danger}"${data}>${item.label}</button>`;
}

function tabMarkup(title: string, items: readonly TestItem[]): string {
  return `<details class="test-actions-dropdown"><summary class="test-actions-dropdown__toggle">${title}</summary><div class="test-actions-dropdown__menu">${items.map(itemMarkup).join("")}</div></details>`;
}

const TEST_ACTION_ITEMS: readonly TestItem[] = [
  { id: "add-money", label: "Add Money" },
  { id: "test-idle-overlay", label: "Idle Overlay" },
  { id: "test-splash", label: "Splash Screen" },
  { data: ["add-badges", "10"], label: "Badges +10" },
  { data: ["add-badges", "100"], label: "Badges +100" },
  { data: ["foil-reveal", "shimmer"], label: "Shimmer Reveal" },
  { data: ["foil-reveal", "glitter"], label: "Glitter Reveal" },
  { id: "test-badge-capsule", label: "Badge Capsule" },
  { id: "test-gold-switch-event", label: "Gold Standard" },
];

// the panel; `events` are the animated crits' cards (loadEventCards),
// `spawns` the random spawns' (src/spawn)
export function createTestButtonMarkup(
  events: readonly EventCard[],
  spawns: readonly (SpawnMeta & { key: string })[],
): string {
  const label = (kind: (typeof CRIT_PROC_KINDS)[number]) =>
    CRIT_PROC_INFO[kind]?.label ?? kind;
  const tiers = [...CRIT_TIER_ORDER]
    .reverse()
    .map((tier) => [tier, CRIT_TIER_CONFIG[tier].label] as const);
  const random = ["random", "Random"] as const;
  const numberPicker = (key: string, name: string): TestSelect => ({
    select: `${name} number`,
    id: `test-${key}-event-tier`,
    options: [random, ...tiers],
  });
  // the events with a picker beside their button
  const pickers: Record<string, TestSelect> = {
    draw: numberPicker("draw", "Draw"),
    "night-sky": numberPicker("night-sky", "Night Sky"),
    pitcher: numberPicker("pitcher", "Pitcher"),
    unlock: {
      select: "Unlock crit",
      id: "test-unlock-event-crit",
      options: [random, ["none", "No crit"], ...tiers],
    },
  };
  // the events' buttons, from their meta.ts: the untested ones (isNew) under
  // New Effects, the rest under Animated Crits
  const eventItems = (isNew: boolean): TestItem[] =>
    events
      .filter((event) => !event.isNew === !isNew)
      .flatMap(({ key, label }) => {
        const button = { id: `test-${key}-event`, label };
        return pickers[key] ? [button, pickers[key]] : [button];
      });
  // the played crits' buttons, from their meta.ts: each group's under its
  // tab, the untested ones (isNew) under New Effects (group null)
  const playedItems = (group: CritGroup | null): TestItem[] =>
    CRIT_GROUPS.flatMap((of) =>
      (Object.entries(PLAYED_CRITS[of]) as [string, CritMeta][])
        .filter(([, meta]) =>
          group === null ? meta.isNew : of === group && !meta.isNew,
        )
        .map(([kind, meta]) => ({
          label: meta.label,
          data: [`${of}-crit`, kind] as const,
        })),
    );
  // the spawns' buttons, from their meta.ts, the untested ones under New Effects
  const spawnItems = (isNew: boolean): TestItem[] =>
    spawns
      .filter((spawn) => !spawn.isNew === !isNew)
      .map(({ key, label }) => ({ label, data: ["spawn", key] as const }));
  const badgeItems: TestItem[] = [
    {
      select: "Event",
      id: "test-crit-event",
      options: [
        ["upgrade", "Upgrade click"],
        ["unlock", "Floor unlock"],
        ["map", "Map unlock"],
      ],
    },
    { select: "Tier", id: "test-crit-tier", options: tiers },
    { data: ["crit-kind", ""], label: "Regular Crit" },
    { id: "test-cash-crit", label: "Cash Crit" },
    ...[...CRIT_PROC_KINDS]
      .sort((left, right) => label(left).localeCompare(label(right)))
      .map((kind) => ({
        data: ["crit-kind", kind] as const,
        label: label(kind),
      })),
  ];
  const tabs: [string, readonly TestItem[]][] = [
    [
      "New Effects",
      [...eventItems(true), ...playedItems(null), ...spawnItems(true)],
    ],
    ["Rate Crits", playedItems("rate")],
    ["Button Crits", playedItems("button")],
    ["Lock Crits", playedItems("lock")],
    ["Animated Crits", eventItems(false)],
    ["Random Spawns", spawnItems(false)],
    ["Test Actions", TEST_ACTION_ITEMS],
    ["Income Crits", playedItems("income")],
    ["Floor Crits", playedItems("floor")],
    ["Badge Crits", badgeItems],
  ];
  return `
    <div class="test-actions-bar">
      <input type="search" id="test-actions-filter" class="test-actions-filter" placeholder="Filter actions" autocomplete="off" />
      <p class="test-actions-empty" id="test-actions-empty" hidden>No matches</p>
      ${tabs.map(([title, items]) => tabMarkup(title, items)).join("")}
      ${itemMarkup({ id: "reset-game", label: "Reset Game", danger: true })}
    </div>`;
}

export function wireCritTestActions(
  container: HTMLElement,
  onForce: (
    kind: CritProcKind | null,
    tier: CritTier,
    event: "upgrade" | "unlock" | "map",
  ) => void,
  // arms a cash crit of the selected tier
  onCash: (tier: CritTier) => void,
): void {
  const event = container.querySelector<HTMLSelectElement>("#test-crit-event")!;
  const tier = container.querySelector<HTMLSelectElement>("#test-crit-tier")!;
  container
    .querySelector<HTMLButtonElement>("#test-cash-crit")!
    .addEventListener("click", () => onCash(tier.value as CritTier));
  const buttons =
    container.querySelectorAll<HTMLButtonElement>("[data-crit-kind]");
  const filter = container.querySelector<HTMLInputElement>(
    "#test-actions-filter",
  )!;
  function updateEvent(): void {
    const map = event.value === "map";
    for (const button of buttons) {
      const kind = button.dataset.critKind as CritProcKind | "";
      const unavailable = map && kind !== "" && !MAP_CRIT_KINDS.includes(kind);
      button.dataset.eventUnavailable = String(unavailable);
      button.hidden = unavailable;
      button.disabled = unavailable;
    }
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
        event.value as "upgrade" | "unlock" | "map",
      );
    });
  }
}
