import { drawCartoonText } from "../../utils";
import { COLOR } from "../../palette";
import { getStickerUrl } from "../../loadAssets";
import { getEffectiveDpr } from "../devicePixelRatio";
import {
  CRIT_PROC_KINDS,
  CRIT_PROC_INFO,
  type CritProcKind,
} from "../critTypes";

export function createCritBadgeRenderer(
  ctx: CanvasRenderingContext2D,
  getSize: () => { cssW: number; cssH: number },
  redraw: () => void,
  onVisibility: (visible: boolean) => void,
) {
  const CRIT_BADGE_PAGE_SIZE = 12;
  const CRIT_BADGE_SIZE_SCALE = 0.75;
  const CRIT_BADGE_ANIMATION_MS = 500;
  const CRIT_BADGE_STAGGER_MS = 200;
  const CRIT_BADGE_GAP = 8;
  let critBadgePages: CritProcKind[][] = [];
  let critBadgePage = 0;
  let critBadgeCounts: Partial<Record<CritProcKind, number>> = {};
  let critBadgeAnimation: {
    startedAt: number;
    mode: "bottom";
  } | null = null;
  const critBadgeImages = new Map<CritProcKind, HTMLImageElement | null>();
  const scaledCritBadgeImages = new Map<
    CritProcKind,
    {
      source: HTMLImageElement;
      size: number;
      dpr: number;
      canvas: HTMLCanvasElement;
      displayWidth: number;
      displayHeight: number;
    }
  >();

  function loadCritBadgeImage(kind: CritProcKind): HTMLImageElement | null {
    if (critBadgeImages.has(kind)) return critBadgeImages.get(kind) ?? null;
    const image = new Image();
    critBadgeImages.set(kind, image);
    image.onload = () => redraw();
    image.onerror = () => {
      critBadgeImages.set(kind, null);
      scaledCritBadgeImages.delete(kind);
      redraw();
    };
    image.src = getStickerUrl(CRIT_PROC_INFO[kind].icon);
    return image;
  }

  function getScaledCritBadgeImage(
    kind: CritProcKind,
    image: HTMLImageElement,
    badgeSize: number,
  ): {
    canvas: HTMLCanvasElement;
    displayWidth: number;
    displayHeight: number;
  } {
    const dpr = getEffectiveDpr();
    const cached = scaledCritBadgeImages.get(kind);
    if (
      cached?.source === image &&
      cached.size === badgeSize &&
      cached.dpr === dpr
    ) {
      return cached;
    }
    const scale = Math.min(
      badgeSize / image.naturalWidth,
      badgeSize / image.naturalHeight,
    );
    const displayWidth = image.naturalWidth * scale;
    const displayHeight = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(displayWidth * dpr));
    canvas.height = Math.max(1, Math.ceil(displayHeight * dpr));
    const context = canvas.getContext("2d")!;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const cachedBadge = {
      source: image,
      size: badgeSize,
      dpr,
      canvas,
      displayWidth,
      displayHeight,
    };
    scaledCritBadgeImages.set(kind, cachedBadge);
    return cachedBadge;
  }

  function showCritBadges(counts: Partial<Record<CritProcKind, number>>): void {
    const kinds = CRIT_PROC_KINDS.filter((kind) => (counts[kind] ?? 0) > 0);
    if (kinds.length === 0) return;
    onVisibility(true);
    critBadgeCounts = counts;
    critBadgePages = [];
    for (let i = 0; i < kinds.length; i += CRIT_BADGE_PAGE_SIZE) {
      critBadgePages.push(kinds.slice(i, i + CRIT_BADGE_PAGE_SIZE));
    }
    critBadgePage = 0;
    critBadgeAnimation = { startedAt: Date.now(), mode: "bottom" };
    for (const kind of critBadgePages[0]) loadCritBadgeImage(kind);
    redraw();
  }

  function advanceCritBadgePage(): void {
    if (critBadgePages.length === 0) return;
    if (critBadgePage < critBadgePages.length - 1) {
      critBadgePage += 1;
      critBadgeAnimation = { startedAt: Date.now(), mode: "bottom" };
      for (const kind of critBadgePages[critBadgePage])
        loadCritBadgeImage(kind);
    } else {
      critBadgePages = [];
      critBadgeCounts = {};
      critBadgeAnimation = null;
      onVisibility(false);
    }
    redraw();
  }

  function drawCritBadgeOverlay(now: number): void {
    if (critBadgePages.length === 0) return;
    const { cssW, cssH } = getSize();
    const page = critBadgePages[critBadgePage];
    const animationDuration =
      CRIT_BADGE_ANIMATION_MS +
      Math.max(0, (page.length - 1) * CRIT_BADGE_STAGGER_MS);
    const progress = critBadgeAnimation
      ? Math.min(1, (now - critBadgeAnimation.startedAt) / animationDuration)
      : 1;
    const eased = 1 - Math.pow(1 - progress, 3);
    if (progress >= 1) critBadgeAnimation = null;

    const headingH = 34;
    const badgeSize =
      CRIT_BADGE_SIZE_SCALE *
      Math.min(
        216,
        (cssW - 48 - CRIT_BADGE_GAP * 2) / 3,
        (cssH - 40 - headingH - CRIT_BADGE_GAP * 3) / 4,
      );
    const panelW = badgeSize * 3 + CRIT_BADGE_GAP * 2;
    const panelH = badgeSize * 4 + CRIT_BADGE_GAP * 3 + headingH;
    const panelX = (cssW - panelW) / 2;
    const panelY = (cssH - panelH) / 2;
    const offsetY =
      critBadgeAnimation?.mode === "bottom" ? (1 - eased) * (panelH + 30) : 0;
    const drawX = panelX;
    const drawY = panelY + offsetY;

    ctx.save();
    // Match the idle-income splash: dim the whole map while the reward stickers
    // take focus, without adding another framed panel behind them.
    ctx.globalAlpha = 0.7 * eased;
    ctx.fillStyle = COLOR.black;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.globalAlpha = 0.98;
    ctx.font = '900 24px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCartoonText(
      ctx,
      "Rewards",
      cssW / 2,
      panelY - 22,
      COLOR.white,
      COLOR.black,
      5,
    );

    for (let index = 0; index < page.length; index++) {
      const kind = page[index];
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = drawX + column * (badgeSize + CRIT_BADGE_GAP);
      const y = drawY + headingH + row * (badgeSize + CRIT_BADGE_GAP);
      const badgeProgress = critBadgeAnimation
        ? Math.min(
            1,
            Math.max(
              0,
              (now -
                critBadgeAnimation.startedAt -
                index * CRIT_BADGE_STAGGER_MS) /
                CRIT_BADGE_ANIMATION_MS,
            ),
          )
        : 1;
      const badgeEased = 1 - Math.pow(1 - badgeProgress, 3);
      const badgeOffsetY = (1 - badgeEased) * (badgeSize + 28);
      const badgeCenterX = x + badgeSize / 2;
      const badgeCenterY = y + badgeSize / 2 + badgeOffsetY;
      const image = loadCritBadgeImage(kind);
      ctx.save();
      ctx.translate(badgeCenterX, badgeCenterY);
      ctx.globalAlpha = 0.98 * badgeEased;
      if (image?.complete && image.naturalWidth > 0) {
        const scaledImage = getScaledCritBadgeImage(kind, image, badgeSize);
        ctx.drawImage(
          scaledImage.canvas,
          -scaledImage.displayWidth / 2,
          -scaledImage.displayHeight / 2,
          scaledImage.displayWidth,
          scaledImage.displayHeight,
        );
      }
      const count = critBadgeCounts[kind] ?? 0;
      {
        ctx.font = '900 14px "Fredoka", system-ui, sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        drawCartoonText(
          ctx,
          `x${count}`,
          badgeSize / 2,
          -badgeSize / 2,
          COLOR.white,
          COLOR.black,
        );
      }
      ctx.restore();
    }
    ctx.restore();
  }

  return {
    show: showCritBadges,
    advance: advanceCritBadgePage,
    draw: drawCritBadgeOverlay,
    loadImage: loadCritBadgeImage,
    get visible() {
      return critBadgePages.length > 0;
    },
    get animating() {
      return critBadgeAnimation !== null;
    },
    close() {
      critBadgePages = [];
      critBadgeCounts = {};
      critBadgeAnimation = null;
      onVisibility(false);
    },
  };
}
