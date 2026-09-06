import { COLOR } from "../../palette";
import { randomInt } from "../../utils";
import { loadSprite, loadImageByName } from "../../loadAssets";

// the "stage" backdrop every press-conference-style mini game sits in front
// of: a crowd of cats (audience.jfif), a raised floor riser the podium cat
// stands on, a talking podium cat cycling random speech poses, and a grid
// that stops at the floor's own top edge instead of running under it. Shared
// between hud/pressConferenceGame and hud/liquidateAssetsGame so both games
// visually read as the same "stage", not a re-skinned lookalike

const AUDIENCE_Y_OFFSET = 120; // how far below its own bottom-aligned position the audience image sits, so only its upper portion peeks up
// how far above the audience's own top edge the podium cat sits — exported so
// any consumer's own score/label positioning can anchor to the exact same
// reference point (see hud/pressConferenceGame/liquidateAssetsGame's render())
export const LABEL_ABOVE_AUDIENCE_OFFSET = 10;
const FLOOR_H = 20; // height of the gradient floor riser strip
const GRID_CELL_PX = 48;

const PODIUM_FRAME_COUNT = 5;
const PODIUM_RENDER_H = 150;
const PODIUM_MARGIN = 16;
const PODIUM_SWITCH_MIN_MS = 500;
const PODIUM_SWITCH_MAX_MS = 900;

export interface PressConferenceScene {
  // canvas-space y of the audience image's own top edge / the floor riser's
  // own top edge — shared reference points for anything anchoring above them
  // (score/budget/influence labels, the podium cat, the grid's own bottom)
  getAudienceTopY: () => number;
  getFloorTopY: () => number;
  getPodiumRect: () => { x: number; y: number; w: number; h: number } | null;
  drawAudience: () => void;
  drawFloor: () => void;
  drawGrid: (worldX: number) => void;
  drawPodium: (now: number) => void;
}

// getSize is called fresh on every draw (not cached), matching how every
// consumer's own canvas size can change between frames via ResizeObserver
export function createPressConferenceScene(
  ctx: CanvasRenderingContext2D,
  getSize: () => { cssW: number; cssH: number },
): PressConferenceScene {
  let podiumSprite: HTMLImageElement | null = null;
  loadSprite("podium").then((img) => {
    podiumSprite = img;
  });
  let podiumFrame = 0;
  let podiumNextSwitchAt = 0;

  let audienceSprite: HTMLImageElement | null = null;
  loadImageByName("audience").then((img) => {
    audienceSprite = img;
  });

  function getAudienceTopY(): number {
    const { cssW, cssH } = getSize();
    if (!audienceSprite) return cssH;
    const renderH =
      cssW * (audienceSprite.naturalHeight / audienceSprite.naturalWidth);
    return cssH - renderH + AUDIENCE_Y_OFFSET;
  }

  function getFloorTopY(): number {
    return getAudienceTopY() - FLOOR_H;
  }

  function drawFloor(): void {
    const { cssW } = getSize();
    const bottom = getAudienceTopY();
    const top = getFloorTopY();
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, COLOR.stageFloorLight);
    gradient.addColorStop(1, COLOR.stageFloorDark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top, cssW, FLOOR_H);
  }

  function drawAudience(): void {
    if (!audienceSprite) return;
    const { cssW } = getSize();
    const renderH =
      cssW * (audienceSprite.naturalHeight / audienceSprite.naturalWidth);
    ctx.globalAlpha = 1;
    ctx.drawImage(audienceSprite, 0, getAudienceTopY(), cssW, renderH);
  }

  // anchored at a fixed screen point (not the line head's own x) so the grid
  // only ever scrolls from worldX (time) — a game whose head is draggable
  // (hud/payTaxes) would otherwise drag the whole grid pattern around with it
  function drawGrid(worldX: number): void {
    const { cssW } = getSize();
    const gridBottom = getFloorTopY();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    const scrollOffset = worldX % GRID_CELL_PX;
    const anchorX = cssW / 2;
    ctx.beginPath();
    for (let x = anchorX - scrollOffset; x < cssW; x += GRID_CELL_PX) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridBottom);
    }
    for (
      let x = anchorX - scrollOffset - GRID_CELL_PX;
      x > 0;
      x -= GRID_CELL_PX
    ) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridBottom);
    }
    for (let y = 0; y < gridBottom; y += GRID_CELL_PX) {
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
    }
    ctx.stroke();
  }

  function getPodiumRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    if (!podiumSprite) return null;
    const { cssW } = getSize();
    const frameW = podiumSprite.naturalWidth / PODIUM_FRAME_COUNT;
    const frameH = podiumSprite.naturalHeight;
    const w = frameW * (PODIUM_RENDER_H / frameH);
    const x = cssW - PODIUM_MARGIN - w;
    const y = getAudienceTopY() - LABEL_ABOVE_AUDIENCE_OFFSET - PODIUM_RENDER_H;
    return { x, y, w, h: PODIUM_RENDER_H };
  }

  function drawPodium(now: number): void {
    if (!podiumSprite) return;
    if (now >= podiumNextSwitchAt) {
      podiumFrame = randomInt(0, PODIUM_FRAME_COUNT - 1);
      podiumNextSwitchAt =
        now + randomInt(PODIUM_SWITCH_MIN_MS, PODIUM_SWITCH_MAX_MS);
    }
    const { x, y, w: renderW } = getPodiumRect()!;
    const frameW = podiumSprite.naturalWidth / PODIUM_FRAME_COUNT;
    const frameH = podiumSprite.naturalHeight;
    ctx.drawImage(
      podiumSprite,
      frameW * podiumFrame,
      0,
      frameW,
      frameH,
      x,
      y,
      renderW,
      PODIUM_RENDER_H,
    );
  }

  return {
    getAudienceTopY,
    getFloorTopY,
    getPodiumRect,
    drawAudience,
    drawFloor,
    drawGrid,
    drawPodium,
  };
}
