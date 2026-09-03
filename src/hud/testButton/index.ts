import type { Floor } from "../../gameState";

// dev/test-only controls, not part of the real game UI
export function createTestButtonMarkup(): string {
  return `
    <div class="test-actions-bar">
      <button id="add-money" class="game__button">Add Money</button>
      <button id="spawn-mouse" class="game__button">Spawn Mouse</button>
      <button id="spawn-crit" class="game__button">Spawn Crit</button>
      <button id="spawn-mega-crit" class="game__button">Spawn Mega Crit</button>
      <button id="spawn-ultra-crit" class="game__button">Spawn Ultra Crit</button>
      <button id="floor-buy-crit" class="game__button">Floor Crit</button>
      <button id="floor-buy-mega-crit" class="game__button">Floor Mega Crit</button>
      <button id="floor-buy-ultra-crit" class="game__button">Floor Ultra Crit</button>
      <button id="test-press-conference" class="game__button">Press Conf Game</button>
      <button id="test-idle-overlay" class="game__button">Idle Overlay</button>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>
  `;
}

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

export function wireSpawnCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-mega-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-ultra-crit")!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#floor-buy-crit")!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wirePressConferenceTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-press-conference",
  )!;
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
