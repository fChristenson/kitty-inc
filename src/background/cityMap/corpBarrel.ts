import { getCorporationName, getCorporationCount } from "../../corporationName";
import { getActiveCompanyIndex } from "../../company";
import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import { smoothstep } from "../../shared/easing";

// the scrolling "barrel" of corporation names in the map's bottom-left
// corner, plus the barrel-roll switch-company animation behind it — split
// out of cityMap/index.ts, which only decides WHEN to roll (arrow clicks, a
// newly-bought company becoming active) and reacts to the result via
// onCompanySelected below; this module owns the actual position/animation
// state and the sorted-by-name list <-> real company index mapping.

const CORPORATION_NAME_MARGIN_PX = 40;
const CORPORATION_NAME_LEFT_PX = 40; // leaves room for .city-map__corp-pointer
const CORP_NAME_FONT_SIZE = 22;
const CORP_NAME_SIDE_SCALE = 1; // side rows' font size, as a fraction of the selected one's
const CORP_NAME_SIDE_ALPHA = 0.35; // side rows' opacity
const CORP_NAME_ROW_GAP = 24; // vertical spacing between adjacent rows
const CORP_ROLL_MS = 260;

// lists companies alphabetically, Z-to-A, by name rather than by creation
// order — this maps a barrel POSITION (0..count-1) to the actual company
// index everything else (setActiveCompanyIndex, onSwitchCompany, city map
// state) is keyed by. Recomputed on demand rather than cached: cheap (a
// handful of companies at most) and always correct even right after a new
// one is created
function getSortedCorporationIndices(): number[] {
  const count = getCorporationCount();
  return Array.from({ length: count }, (_, i) => i).sort((a, b) =>
    getCorporationName(b).localeCompare(getCorporationName(a)),
  );
}

export interface CorpBarrelDeps {
  redraw: () => void; // trigger a repaint every roll-animation frame
  // fires once the barrel settles on a (possibly new) company — including the
  // defensive out-of-range clamp in draw() below, for whenever the corp count
  // shrinks out from under the currently-selected position
  onCompanySelected: (companyIndex: number) => void;
}

export interface CorpBarrel {
  draw(ctx: CanvasRenderingContext2D, cssH: number): void;
  companyIndexAtPosition(position: number): number;
  getSelectedPosition(): number;
  // -1 if companyIndex isn't in the current corporation list at all
  resolveTargetPosition(companyIndex: number): number;
  // direction -1 (the action bar's "up") reveals the next position
  // (alphabetically later), direction 1 ("down") reveals the previous one —
  // a no-op past either end of the list
  rollOneStep(direction: -1 | 1): void;
  // rolls directly to targetPosition in one smooth motion (works for any
  // distance, not just an adjacent step) — for jumping straight to a
  // freshly-created company instead of a one-step nudge
  rollToPosition(targetPosition: number): void;
  destroy(): void;
}

export function createCorpBarrel(deps: CorpBarrelDeps): CorpBarrel {
  // which BARREL POSITION (0..count-1, alphabetical by name) is currently
  // selected; the actual company index is derived via companyIndexAtPosition
  // wherever persistence/switching needs it
  let selectedPosition = Math.max(
    0,
    getSortedCorporationIndices().indexOf(getActiveCompanyIndex()),
  );
  // continuous "which position is centered" — equals selectedPosition at
  // rest, animates toward the new one mid-roll (see rollToPosition)
  let corpRollFocus = selectedPosition;
  let corpRollAnimId: number | null = null;

  function companyIndexAtPosition(position: number): number {
    return getSortedCorporationIndices()[position] ?? 0;
  }

  // rendered as a little barrel/reel: the selected corporation full-size and
  // opaque, its neighbors (newer above, older below) smaller and faded
  function draw(ctx: CanvasRenderingContext2D, cssH: number): void {
    const count = getCorporationCount();
    if (selectedPosition > count - 1) {
      selectedPosition = count - 1;
      corpRollFocus = selectedPosition;
      deps.onCompanySelected(companyIndexAtPosition(selectedPosition));
    }
    const sortedIndices = getSortedCorporationIndices();
    const bottom = cssH - CORPORATION_NAME_MARGIN_PX;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    // a couple of rows past the nearest whole ones on each side is plenty —
    // past 1.5 rows away a name is already fully faded (alpha 0)
    const lo = Math.max(0, Math.floor(corpRollFocus) - 2);
    const hi = Math.min(count - 1, Math.ceil(corpRollFocus) + 2);
    for (let i = lo; i <= hi; i++) {
      const distance = i - corpRollFocus;
      const absDistance = Math.abs(distance);
      if (absDistance > 1.5) continue;
      const closeness = 1 - Math.min(1, absDistance); // 1 at the focus, 0 a row away
      const fontSize =
        CORP_NAME_FONT_SIZE *
        (CORP_NAME_SIDE_SCALE + (1 - CORP_NAME_SIDE_SCALE) * closeness);
      const alpha =
        CORP_NAME_SIDE_ALPHA + (1 - CORP_NAME_SIDE_ALPHA) * closeness;
      // higher position draws higher up (smaller y) — the barrel is
      // alphabetical, so "up" reveals the next name later in the alphabet
      const y = bottom - distance * CORP_NAME_ROW_GAP;
      const name = getCorporationName(sortedIndices[i]);
      ctx.font = `900 ${fontSize}px "Fredoka", system-ui, sans-serif`;
      ctx.globalAlpha = alpha;
      drawCartoonText(
        ctx,
        name,
        CORPORATION_NAME_LEFT_PX,
        y,
        COLOR.white,
        COLOR.black,
        5,
      );
      ctx.globalAlpha = 1;
    }
  }

  function rollToPosition(targetPosition: number): void {
    const count = getCorporationCount();
    if (targetPosition < 0 || targetPosition > count - 1) return;
    if (corpRollAnimId !== null) cancelAnimationFrame(corpRollAnimId);
    const fromFocus = corpRollFocus;
    const start = performance.now();
    function frame(now: number): void {
      const t = Math.min(1, (now - start) / CORP_ROLL_MS);
      corpRollFocus = fromFocus + (targetPosition - fromFocus) * smoothstep(t);
      deps.redraw();
      if (t < 1) {
        corpRollAnimId = requestAnimationFrame(frame);
      } else {
        corpRollFocus = targetPosition;
        selectedPosition = targetPosition;
        corpRollAnimId = null;
        deps.onCompanySelected(companyIndexAtPosition(selectedPosition));
        deps.redraw();
      }
    }
    corpRollAnimId = requestAnimationFrame(frame);
  }

  function rollOneStep(direction: -1 | 1): void {
    rollToPosition(selectedPosition + (direction < 0 ? 1 : -1));
  }

  function resolveTargetPosition(companyIndex: number): number {
    return getSortedCorporationIndices().indexOf(companyIndex);
  }

  function destroy(): void {
    if (corpRollAnimId !== null) cancelAnimationFrame(corpRollAnimId);
  }

  return {
    draw,
    companyIndexAtPosition,
    getSelectedPosition: () => selectedPosition,
    resolveTargetPosition,
    rollOneStep,
    rollToPosition,
    destroy,
  };
}
