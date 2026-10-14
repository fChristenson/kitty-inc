// The splash stays up while what the first seconds of play would otherwise
// hitch on runs behind it: the sprite and text warm-ups, the audio device,
// the badge catalog, a few cold frames. Each task is its own macrotask so
// the splash keeps painting; what doesn't fit the budget runs after, sliced
// as before
import { prepareSoon } from "../idle";

type Task = () => unknown;
const tasks: Task[] = [];
let ran = false;

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

// task runs behind the splash, or, once the game shows, a slice after a frame
export function preheat(task: Task): void {
  if (ran) prepareSoon(() => void task());
  else tasks.push(task);
}

// runs the tasks in order until budgetMs is spent; an async one is waited on
// only while the budget lasts, then finishes on its own
export async function runPreheat(budgetMs: number): Promise<void> {
  const end = performance.now() + budgetMs;
  while (tasks.length > 0) {
    const left = end - performance.now();
    if (left <= 0) break;
    // a failed warm-up must never keep the splash up
    const task = tasks.shift()!;
    await Promise.race([
      Promise.resolve()
        .then(task)
        .catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, left)),
    ]);
    await nextTask();
  }
  ran = true;
  for (const task of tasks.splice(0)) prepareSoon(() => void task());
  performance.mark("game:preheated");
}
