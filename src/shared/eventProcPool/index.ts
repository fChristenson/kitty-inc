// A pool of rare "event button" procs sharing one cooldown: a qualifying click
// rolls the eligible events (in random order, each at its own chance) and at
// most one arms; after that no event in the pool can arm until the cooldown ends
import { pickAtMost } from "../critTypes";

export interface EventProcDef<TTarget, TContext> {
  key: string;
  chance: () => number;
  isArmed(target: TTarget): boolean;
  canArm(target: TTarget, context: TContext): boolean;
  arm(target: TTarget): void;
}

export interface EventProcPool<TTarget, TContext> {
  register(def: EventProcDef<TTarget, TContext>): void;
  // true when an event armed (and the shared cooldown started)
  maybeArm(target: TTarget, context: TContext): boolean;
}

export function createEventProcPool<TTarget, TContext>(
  cooldownMs: () => number,
): EventProcPool<TTarget, TContext> {
  const defs: EventProcDef<TTarget, TContext>[] = [];
  let lastProcAt = -Infinity;
  return {
    register(def) {
      defs.push(def);
    },
    maybeArm(target, context) {
      const now = Date.now();
      if (now - lastProcAt < cooldownMs()) return false;
      if (defs.some((def) => def.isArmed(target))) return false;
      for (const def of pickAtMost(defs, defs.length)) {
        if (!def.canArm(target, context)) continue;
        if (Math.random() < def.chance()) {
          lastProcAt = now;
          def.arm(target);
          return true;
        }
      }
      return false;
    },
  };
}
