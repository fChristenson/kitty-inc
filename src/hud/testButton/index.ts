import type { Floor } from "../../gameState";
export { createTestButtonMarkup, wireCritTestActions } from "./critTestActions";

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-money")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMouseButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-mouse")!;
  button.addEventListener("click", onClick);
}

export function wireIdleOverlayTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-idle-overlay")!;
  button.addEventListener("click", onClick);
}

export function wireBoostEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-boost-event")!;
  button.addEventListener("click", onClick);
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
