import type { Floor } from "../../gameState";
import { lt, type BigNumber } from "../bigNumber";

// Repeatedly buys the cheapest upgrade available across `floors`, stopping as
// soon as the cheapest one left is unaffordable. Used by the map's bulk-buy
// gestures (main.ts's cheapest-upgrade sweeps).
//
// The floors are kept in a binary min-heap keyed on upgradeCost so each
// purchase costs O(log n) instead of rescanning every floor: the naive rescan
// froze the page for seconds once a company-wide sweep ran over hundreds of
// floors, since it allocated and walked the whole list again per purchase.
// `buy` is expected to raise that floor's own upgradeCost, which is why the
// floor is re-inserted afterwards rather than dropped.
export function buyCheapestUpgrades(
  floors: Floor[],
  spend: (cost: BigNumber) => boolean,
  buy: (floor: Floor) => void,
  limit = Infinity,
): number {
  const heap = floors.slice();
  for (let i = (heap.length >> 1) - 1; i >= 0; i--) siftDown(heap, i);
  let bought = 0;
  while (heap.length > 0 && bought < limit) {
    const cheapest = heap[0];
    if (!spend(cheapest.upgradeCost)) break;
    buy(cheapest);
    bought += 1;
    siftDown(heap, 0);
  }
  return bought;
}

function siftDown(heap: Floor[], start: number): void {
  const length = heap.length;
  let index = start;
  for (;;) {
    const left = index * 2 + 1;
    if (left >= length) return;
    const right = left + 1;
    const smallest =
      right < length && lt(heap[right].upgradeCost, heap[left].upgradeCost)
        ? right
        : left;
    if (!lt(heap[smallest].upgradeCost, heap[index].upgradeCost)) return;
    [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
    index = smallest;
  }
}
