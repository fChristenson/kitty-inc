import { loadImageByName } from "../../loadAssets";
import { getEffectiveDpr } from "../../shared/devicePixelRatio";
import { BOUNCE_WIGGLE_PERIOD_MS } from "../../shared/bounceWiggle";

// the city map's bottom-right mascot: a haloed cat meditating on a cloud. It
// sits gray and perfectly still until tapped, then wakes into full color and
// hops once per auto-buy purchase (index.ts spawns the matching "+1" label).
// While it's working it holds still between hops; once there's nothing left to
// buy it drifts back into its idle hover. Two poses, cut from
// src/assets/cloudCatSprites.jfif by scripts/process-cloud-cat.mjs.

const SIZE_FRACTION = 0.152; // of the shorter canvas edge
const MIN_SIZE = 58;
const MAX_SIZE = 106;
const MARGIN = 14;
const FLOAT_PERIOD_MS = 3600;
const FLOAT_AMPLITUDE_PX = 7;
// one full bounce-wiggle cycle, held on the cheering pose the whole time
const CHEER_MS = BOUNCE_WIGGLE_PERIOD_MS;
// how long the wake-up/settle-down colour and hover cross-fades take
const WAKE_MS = 320;

export interface CloudCat {
  draw(
    ctx: CanvasRenderingContext2D,
    cssW: number,
    cssH: number,
    now: number,
  ): void;
  // canvas-space hit test against the cat's resting box
  hitTest(cssW: number, cssH: number, x: number, y: number): boolean;
  // awake: full color + hovering. Asleep: grayscale and completely still
  setAwake(awake: boolean, now: number): void;
  isAwake(): boolean;
  // one hop; returns where the matching coin burst should originate
  cheer(cssW: number, cssH: number, now: number): { x: number; y: number };
  isAnimating(now: number): boolean;
}

interface ScaledSprite {
  source: HTMLImageElement;
  size: number;
  dpr: number;
  canvas: HTMLCanvasElement;
  displayWidth: number;
  displayHeight: number;
}

export function createCloudCat(): CloudCat {
  let idleImage: HTMLImageElement | null = null;
  let happyImage: HTMLImageElement | null = null;
  void Promise.all([
    loadImageByName("cloudCatIdle"),
    loadImageByName("cloudCatHappy"),
  ]).then(([idle, happy]) => {
    idleImage = idle;
    happyImage = happy;
  });

  let cheerStartedAt: number | null = null;
  let awake = false;
  let wakeChangedAt = 0;
  // each pose is cached twice, color and gray: the wake cross-fade stacks them
  const scaledSprites = new Map<string, ScaledSprite>();

  function boxSize(cssW: number, cssH: number): number {
    return Math.max(
      MIN_SIZE,
      Math.min(MAX_SIZE, Math.min(cssW, cssH) * SIZE_FRACTION),
    );
  }

  // pre-downscaled once per size/dpr change: drawing the full-size source
  // every frame makes Chrome resample it at low quality for the first second
  function getScaledImage(
    key: string,
    image: HTMLImageElement,
    size: number,
    gray: boolean,
  ): ScaledSprite {
    const dpr = getEffectiveDpr();
    const cached = scaledSprites.get(key);
    if (cached?.source === image && cached.size === size && cached.dpr === dpr)
      return cached;
    const scale = Math.min(
      size / image.naturalWidth,
      size / image.naturalHeight,
    );
    const displayWidth = image.naturalWidth * scale;
    const displayHeight = image.naturalHeight * scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(displayWidth * dpr));
    canvas.height = Math.max(1, Math.ceil(displayHeight * dpr));
    const context = canvas.getContext("2d")!;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    if (gray) context.filter = "grayscale(1)";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const sprite = {
      source: image,
      size,
      dpr,
      canvas,
      displayWidth,
      displayHeight,
    };
    scaledSprites.set(key, sprite);
    return sprite;
  }

  // resting box, before the hover/hop offsets are applied
  function anchor(cssW: number, cssH: number) {
    const size = boxSize(cssW, cssH);
    return { size, left: cssW - MARGIN - size, top: cssH - MARGIN - size };
  }

  function cheerPhase(now: number): number | null {
    if (cheerStartedAt === null) return null;
    const elapsed = now - cheerStartedAt;
    if (elapsed >= CHEER_MS) {
      cheerStartedAt = null;
      return null;
    }
    return elapsed / CHEER_MS;
  }

  // 0 fully asleep (gray, still), 1 fully awake (color, hovering)
  function wakeAmount(now: number): number {
    const progress = Math.min(1, (now - wakeChangedAt) / WAKE_MS);
    return awake ? progress : 1 - progress;
  }

  return {
    draw(ctx, cssW, cssH, now) {
      const phase = cheerPhase(now);
      const image = phase === null ? idleImage : (happyImage ?? idleImage);
      if (!image?.naturalWidth) return;
      const pose = phase === null ? "idle" : "happy";
      const { size, left, top } = anchor(cssW, cssH);
      const color = getScaledImage(`${pose}-color`, image, size, false);
      const { displayWidth, displayHeight } = color;
      const woken = wakeAmount(now);
      // hovers the whole time it's awake, working or not; a purchase only swaps
      // it to the cheering pose, never moves it
      const hover =
        Math.sin((now / FLOAT_PERIOD_MS) * Math.PI * 2) *
        FLOAT_AMPLITUDE_PX *
        woken;
      const x = left + (size - displayWidth) / 2;
      const y = top + (size - displayHeight) / 2 + hover;
      ctx.save();
      if (woken < 1) {
        const grayscale = getScaledImage(`${pose}-gray`, image, size, true);
        ctx.drawImage(grayscale.canvas, x, y, displayWidth, displayHeight);
      }
      if (woken > 0) {
        ctx.globalAlpha = woken;
        ctx.drawImage(color.canvas, x, y, displayWidth, displayHeight);
      }
      ctx.restore();
    },
    hitTest(cssW, cssH, x, y) {
      const { size, left, top } = anchor(cssW, cssH);
      return x >= left && x <= left + size && y >= top && y <= top + size;
    },
    setAwake(next, now) {
      if (next === awake) return;
      awake = next;
      wakeChangedAt = now;
    },
    isAwake: () => awake,
    cheer(cssW, cssH, now) {
      cheerStartedAt = now;
      const { size, left, top } = anchor(cssW, cssH);
      return { x: left + size / 2, y: top + size / 2 };
    },
    isAnimating(now) {
      return cheerPhase(now) !== null || awake || now - wakeChangedAt < WAKE_MS;
    },
  };
}
