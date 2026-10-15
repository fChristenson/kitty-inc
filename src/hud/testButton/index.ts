import type { Floor } from "../../gameState";
import {
  CRIT_PROC_KINDS,
  BADGE_GLITTER_AT,
  BADGE_SHIMMER_AT,
  commitCritCounts,
  getCritProcCount,
  queueBadgeFoilReveal,
  type BadgeFoil,
  type ButtonCritKind,
  type FloorCritKind,
  type IncomeCritKind,
  type LockCritKind,
  type RateCritKind,
  type CritProcKind,
} from "../../crits";
export { createTestButtonMarkup, wireCritTestActions } from "./critTestActions";

// arms a crit of a random badge brought up to the foil, revealed once clicked
export function wireFoilRevealTestButtons(
  container: HTMLElement,
  armCrit: (kind: CritProcKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-foil-reveal]",
  )) {
    const foil = button.dataset.foilReveal as BadgeFoil;
    const at = foil === "glitter" ? BADGE_GLITTER_AT : BADGE_SHIMMER_AT;
    button.addEventListener("click", () => {
      const kind =
        CRIT_PROC_KINDS[Math.floor(Math.random() * CRIT_PROC_KINDS.length)];
      const missing = at - getCritProcCount(kind);
      if (missing > 0) commitCritCounts({ [kind]: missing });
      queueBadgeFoilReveal(kind, foil);
      armCrit(kind);
    });
  }
}

// adds to every crit's landed count, qualifying the badges for their foil rolls
export function wireAddBadgesTestButtons(container: HTMLElement): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-add-badges]",
  )) {
    const amount = Number(button.dataset.addBadges);
    button.addEventListener("click", () => {
      const draft: Partial<Record<CritProcKind, number>> = {};
      for (const kind of CRIT_PROC_KINDS) draft[kind] = amount;
      commitCritCounts(draft);
    });
  }
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-money")!;
  button.addEventListener("click", onClick);
}

// puts a random spawn out
export function wireSpawnTestButtons(
  container: HTMLElement,
  onClick: (key: string) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-spawn]",
  ))
    button.addEventListener("click", () => onClick(button.dataset.spawn!));
}

export function wireIdleOverlayTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-idle-overlay")!;
  button.addEventListener("click", onClick);
}

export function wireSplashTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#test-splash")!;
  button.addEventListener("click", onClick);
}

// each "#test-<key>-event" button, with the value of the picker beside it
// ("#test-<key>-event-tier" or "-crit") if it has one
export function wireEventTestButtons(
  container: HTMLElement,
  keys: readonly string[],
  onClick: (key: string, pick: string | undefined) => void,
): void {
  for (const key of keys) {
    const pick = container.querySelector<HTMLSelectElement>(
      `#test-${key}-event-tier, #test-${key}-event-crit`,
    );
    container
      .querySelector<HTMLButtonElement>(`#test-${key}-event`)!
      .addEventListener("click", () => onClick(key, pick?.value));
  }
}

export function wireBadgeCapsuleTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-badge-capsule",
  )!;
  button.addEventListener("click", onClick);
}

// arms a crit carrying a floor crit
export function wireFloorCritTestButtons(
  container: HTMLElement,
  onClick: (kind: FloorCritKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-floor-crit]",
  ))
    button.addEventListener("click", () =>
      onClick(button.dataset.floorCrit as FloorCritKind),
    );
}

// arms a crit carrying an income crit
export function wireIncomeCritTestButtons(
  container: HTMLElement,
  onClick: (kind: IncomeCritKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-income-crit]",
  ))
    button.addEventListener("click", () =>
      onClick(button.dataset.incomeCrit as IncomeCritKind),
    );
}

// arms a crit carrying a button or a lock crit
export function wireButtonCritTestButtons(
  container: HTMLElement,
  onClick: (kind: ButtonCritKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-button-crit]",
  ))
    button.addEventListener("click", () =>
      onClick(button.dataset.buttonCrit as ButtonCritKind),
    );
}

export function wireLockCritTestButtons(
  container: HTMLElement,
  onClick: (kind: LockCritKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-lock-crit]",
  ))
    button.addEventListener("click", () =>
      onClick(button.dataset.lockCrit as LockCritKind),
    );
}

export function wireRateCritTestButtons(
  container: HTMLElement,
  onClick: (kind: RateCritKind) => void,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-rate-crit]",
  ))
    button.addEventListener("click", () =>
      onClick(button.dataset.rateCrit as RateCritKind),
    );
}

export function wireResetButton(
  container: HTMLElement,
  buildings: Floor[][],
): void {
  const button = container.querySelector<HTMLButtonElement>("#reset-game")!;
  button.addEventListener("click", () => {
    // also truncate the in-memory array: main.ts's beforeunload handler persists
    // buildings on the way out, and without this it would just re-save the stale
    // data right after localStorage.clear() removes it, undoing the reset before
    // the reload even happens
    buildings.length = 0;
    localStorage.clear();
    location.reload();
  });
}

// sorts every dropdown's buttons by name; a control (label) right after a
// button moves with it, and controls ahead of the first button stay on top
export function sortTestActionMenus(container: HTMLElement): void {
  for (const menu of container.querySelectorAll<HTMLElement>(
    ".test-actions-dropdown__menu",
  )) {
    const groups: Element[][] = [];
    for (const child of Array.from(menu.children)) {
      if (child instanceof HTMLButtonElement) groups.push([child]);
      else if (groups.length) groups[groups.length - 1].push(child);
    }
    groups.sort((a, b) =>
      (a[0].textContent ?? "").localeCompare(b[0].textContent ?? ""),
    );
    for (const group of groups) menu.append(...group);
  }
}

// live text filter over every dev button in the bar. Matching buttons stay
// visible and their section is forced open; a section with no matches is
// hidden entirely. Whatever the player had open by hand is remembered and
// restored once the filter is cleared
export function wireTestActionsFilter(container: HTMLElement): void {
  const input = container.querySelector<HTMLInputElement>(
    "#test-actions-filter",
  );
  if (!input) return;
  const empty = container.querySelector<HTMLParagraphElement>(
    "#test-actions-empty",
  );
  const dropdowns = Array.from(
    container.querySelectorAll<HTMLDetailsElement>(".test-actions-dropdown"),
  );
  let manualOpenState: boolean[] | null = null;

  function apply(): void {
    const query = input!.value.trim().toLowerCase();
    const filtering = query.length > 0;
    if (filtering && manualOpenState === null) {
      manualOpenState = dropdowns.map((d) => d.open);
    }
    let totalMatches = 0;
    dropdowns.forEach((dropdown, index) => {
      const toggle = dropdown.querySelector<HTMLElement>(
        ".test-actions-dropdown__toggle",
      );
      let matches = 0;
      for (const button of dropdown.querySelectorAll<HTMLButtonElement>(
        ".game__button",
      )) {
        const hit =
          button.dataset.eventUnavailable !== "true" &&
          (!filtering ||
            (button.textContent ?? "").toLowerCase().includes(query));
        button.hidden = !hit;
        if (hit) matches++;
      }
      totalMatches += matches;
      const hasEventSelector =
        dropdown.querySelector("#test-crit-event") !== null;
      dropdown.hidden = filtering && matches === 0 && !hasEventSelector;
      dropdown.classList.toggle(
        "test-actions-dropdown--filtered",
        filtering && matches > 0,
      );
      if (filtering) dropdown.open = matches > 0 || hasEventSelector;
      else if (manualOpenState) dropdown.open = manualOpenState[index];
      if (toggle) toggle.dataset.matches = filtering ? String(matches) : "";
    });
    if (!filtering) manualOpenState = null;
    if (empty) empty.hidden = !filtering || totalMatches > 0;
  }

  input.addEventListener("input", apply);
  apply();
}
