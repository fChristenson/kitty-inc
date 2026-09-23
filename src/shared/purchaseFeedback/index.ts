const JUMP_DURATION_MS = 500;
const JUMP_HEIGHT_PX = 8;
const startedAtByTarget = new Map<number, number>();

export function getPurchaseJumpOffset(target: number, now: number): number {
  const startedAt = startedAtByTarget.get(target);
  if (startedAt === undefined) return 0;
  const elapsed = now - startedAt;
  if (elapsed >= JUMP_DURATION_MS) {
    startedAtByTarget.delete(target);
    return 0;
  }
  return -JUMP_HEIGHT_PX * Math.sin((Math.PI * elapsed) / JUMP_DURATION_MS);
}

export function createPurchaseFeedback(effects: {
  sound: () => void;
  burst: (x: number, y: number, scale: number) => void;
  redraw: () => void;
}) {
  return (target: number, x: number, y: number, scale: number): void => {
    startedAtByTarget.set(target, Date.now());
    effects.sound();
    effects.burst(x, y, scale);
    effects.redraw();
  };
}
