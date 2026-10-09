// what a bubble holds, drawn small: a crit number, a gold coin or a badge.
// Every look is rastered once onto a small canvas and stamped after that
import {
  CRIT_PROC_INFO,
  CRIT_TIER_CONFIG,
  createCritTextSprite,
  drawCritTextSprite,
  type CritProcKind,
  type CritTextSprite,
  type CritTier,
} from "../crits";
import { getStickerUrl, loadImageByName } from "../loadAssets";
import { loadImage } from "../utils";

export type BubbleContent =
  | { kind: "tier"; tier: CritTier }
  | { kind: "coin" }
  | { kind: "badge"; badge: CritProcKind };

// images are rastered this many px across, about the biggest they draw
const IMAGE_PX = 240;
const TIER_STYLE = { fontSize: 96, strokeWidth: 12 };
// sharp enough for a number swollen to a smash
const TIER_RES = 4;

const images = new Map<string, HTMLCanvasElement | null>();
const tiers = new Map<CritTier, CritTextSprite>();

function rasterize(image: HTMLImageElement): HTMLCanvasElement {
  const scale = IMAGE_PX / Math.max(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function load(key: string, image: () => Promise<HTMLImageElement>): void {
  if (images.has(key)) return;
  images.set(key, null);
  image()
    .then((loaded) => images.set(key, rasterize(loaded)))
    .catch(() => {});
}

const imageKey = (content: BubbleContent): string =>
  content.kind === "badge" ? `badge:${content.badge}` : content.kind;

// starts loading (or rastering) what a bubble holding content draws
export function prepareMini(content: BubbleContent): void {
  if (content.kind === "coin") load("coin", () => loadImageByName("coin"));
  else if (content.kind === "badge")
    load(imageKey(content), () =>
      loadImage(getStickerUrl(CRIT_PROC_INFO[content.badge].icon)),
    );
  else if (!tiers.has(content.tier)) {
    const { label, color } = CRIT_TIER_CONFIG[content.tier];
    tiers.set(
      content.tier,
      createCritTextSprite(label, color, TIER_STYLE, TIER_RES),
    );
  }
}

// content centered on (x, y), about size across
export function drawMini(
  ctx: CanvasRenderingContext2D,
  content: BubbleContent,
  x: number,
  y: number,
  size: number,
): void {
  if (size <= 0) return;
  if (content.kind === "tier") {
    const sprite = tiers.get(content.tier);
    if (!sprite) return;
    const scale = Math.min(
      (size * 1.15) / sprite.width,
      (size * 1.1) / sprite.height,
    );
    drawCritTextSprite(ctx, sprite, x, y, scale);
    return;
  }
  const image = images.get(imageKey(content));
  if (!image) return;
  const scale = size / Math.max(image.width, image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
}
