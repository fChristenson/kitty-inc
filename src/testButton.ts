import { buildFloor, type Floor } from "./floors";
import type { FurnitureSprite } from "./sprites";

// the "Add Floor" dev/test control used to grow the building on demand
export function createTestButtonMarkup(): string {
  return `<button id="add-floor" class="game__button">Add Floor</button>`;
}

interface AddFloorDeps {
  floors: Floor[];
  sprites: FurnitureSprite[];
  floorCountEl: HTMLElement;
  scrollEl: HTMLElement;
  onChange: () => void;
}

export function addFloor(deps: AddFloorDeps): void {
  deps.floors.push(buildFloor(deps.sprites));
  deps.floorCountEl.textContent = String(deps.floors.length);
  deps.onChange();
  deps.scrollEl.scrollTop = 0; // keep the newest floor in view
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-floor")!;
  button.addEventListener("click", onClick);
}
