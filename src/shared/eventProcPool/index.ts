// A pool of rare "event button" procs sharing one cooldown. A landed crit's
// special slot can be claimed by one of them (rolled in random order, each at
// its own chance), which then arms once that crit is clicked. No event in the
// pool can be claimed while another is claimed, armed or playing out, and the
// cooldown only starts once it has finished
import { pickAtMost } from "../critTypes";

export interface EventProcDef<TTarget, TContext> {
  key: string;
  chance: () => number;
  // whether the event armed on target is still armed or playing out
  isInProgress(target: TTarget): boolean;
  canArm(target: TTarget, context: TContext): boolean;
  arm(target: TTarget, context: TContext): void;
}

export interface EventProcPool<TTarget, TContext> {
  register(def: EventProcDef<TTarget, TContext>): void;
  // true when an event claimed target's crit
  claim(target: TTarget, context: TContext): boolean;
  // true when target's crit carried a claim; it then waits for armTaken
  take(target: TTarget): boolean;
  // target's crit was spent without its claim being taken
  drop(target: TTarget): void;
  // false when the taken event can no longer arm (its claim is then dropped)
  armTaken(target: TTarget, context: TContext): boolean;
  // the event claiming target's not-yet-armed crit, if any
  claimedKey(target: TTarget): string | null;
  // an event reporting it just finished, so the cooldown starts right now
  ended(key: string): void;
  // an event started without a roll (e.g. a dev test hook), so the pool still
  // blocks the others while it runs and starts the cooldown after it
  track(key: string, target: TTarget): void;
  // dev test hook: key claims target's already-armed crit, ignoring chance and cooldown
  forceClaim(key: string, target: TTarget): void;
}

export function createEventProcPool<TTarget, TContext>(
  cooldownMs: () => number,
): EventProcPool<TTarget, TContext> {
  const defs: EventProcDef<TTarget, TContext>[] = [];
  let active: {
    def: EventProcDef<TTarget, TContext>;
    target: TTarget;
    state: "claimed" | "taken" | "armed";
  } | null = null;
  let cooldownFrom = -Infinity;

  // an event can also end without reporting it (e.g. an armed button whose
  // target left the screen), so every claim re-checks it too
  function settle(now: number): void {
    if (
      !active ||
      active.state !== "armed" ||
      active.def.isInProgress(active.target)
    )
      return;
    active = null;
    cooldownFrom = now;
  }

  return {
    register(def) {
      defs.push(def);
    },
    claim(target, context) {
      const now = Date.now();
      settle(now);
      if (active || now - cooldownFrom < cooldownMs()) return false;
      for (const def of pickAtMost(defs, defs.length)) {
        if (!def.canArm(target, context)) continue;
        if (Math.random() < def.chance()) {
          active = { def, target, state: "claimed" };
          return true;
        }
      }
      return false;
    },
    take(target) {
      if (active?.target !== target || active.state !== "claimed") return false;
      active.state = "taken";
      return true;
    },
    drop(target) {
      if (active?.target === target && active.state === "claimed") {
        active = null;
      }
    },
    armTaken(target, context) {
      if (active?.target !== target || active.state !== "taken") return false;
      if (!active.def.canArm(target, context)) {
        active = null;
        return false;
      }
      active.state = "armed";
      active.def.arm(target, context);
      return true;
    },
    claimedKey(target) {
      return active?.target === target && active.state !== "armed"
        ? active.def.key
        : null;
    },
    ended(key) {
      if (active?.def.key === key) settle(Date.now());
    },
    track(key, target) {
      const def = defs.find((d) => d.key === key);
      if (def) active = { def, target, state: "armed" };
    },
    forceClaim(key, target) {
      const def = defs.find((d) => d.key === key);
      if (def) active = { def, target, state: "claimed" };
    },
  };
}
