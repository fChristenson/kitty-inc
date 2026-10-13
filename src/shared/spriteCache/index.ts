// baked sprites (text or art drawn once into a canvas, stamped every frame)
// that give an unused one's canvas to the next bake instead of making a new
// canvas: a label whose value keeps changing (a bar's level hit after hit)
// cycles through a few canvases, never one per value. A new canvas costs a
// phone a stalled frame; redrawing into an old one doesn't
export interface Baked {
  canvas: HTMLCanvasElement;
}

// one not drawn for this long is off screen: it gives its canvas up
const STALE_MS = 500;

export interface SpriteCache<T extends Baked> {
  get(key: string): T | undefined;
  set(key: string, sprite: T): void;
  // a canvas to bake the next sprite into, sized w x h (cleared)
  take(w: number, h: number): HTMLCanvasElement;
  readonly size: number;
}

export function createSpriteCache<T extends Baked>(
  max: number,
): SpriteCache<T> {
  const sprites = new Map<string, T>();
  const usedAt = new Map<string, number>();
  return {
    get(key) {
      const sprite = sprites.get(key);
      if (sprite) usedAt.set(key, performance.now());
      return sprite;
    },
    set(key, sprite) {
      sprites.set(key, sprite);
      usedAt.set(key, performance.now());
    },
    take(w, h) {
      const now = performance.now();
      let reuse: string | null = null;
      for (const [key, at] of usedAt)
        if (now - at > STALE_MS) {
          reuse = key;
          break;
        }
      // full: the oldest goes
      if (reuse === null && sprites.size >= max)
        reuse = usedAt.keys().next().value ?? null;
      let canvas: HTMLCanvasElement;
      if (reuse !== null) {
        canvas = sprites.get(reuse)!.canvas;
        sprites.delete(reuse);
        usedAt.delete(reuse);
      } else canvas = document.createElement("canvas");
      // resizing clears it, and resets its context's state
      canvas.width = Math.max(1, Math.ceil(w));
      canvas.height = Math.max(1, Math.ceil(h));
      return canvas;
    },
    get size() {
      return sprites.size;
    },
  };
}
