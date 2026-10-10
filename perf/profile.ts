// Samples the JS stack while a scenario records (the JS Self-Profiling API;
// the dev server and preview send the Document-Policy header it needs) and
// sums it per function: where each run's time actually goes
export interface ProfileSummary {
  sampleMs: number;
  samples: number;
  // ms of samples with each function on top of the stack (its own work), and
  // anywhere on it (its work and everything it calls)
  self: [string, number][];
  total: [string, number][];
}

interface Trace {
  resources: string[];
  frames: { name: string; resourceId?: number; line?: number }[];
  stacks: { parentId?: number; frameId: number }[];
  samples: { timestamp: number; stackId?: number }[];
}
interface SelfProfiler {
  readonly sampleInterval: number;
  stop(): Promise<Trace>;
}
type ProfilerCtor = new (options: {
  sampleInterval: number;
  maxBufferSize: number;
}) => SelfProfiler;

// the browser picks its own interval (about 10ms on Windows); ask for its
// finest
const SAMPLE_MS = 1;
const MAX_SAMPLES = 100_000;
const TOP = 60;
// a sample's weight is the gap to the next, but never more than this many
// intervals (the page was busy elsewhere, or idle)
const MAX_GAP = 4;

let profiler: SelfProfiler | null = null;

export function startProfile(): void {
  const Profiler = (window as unknown as { Profiler?: ProfilerCtor }).Profiler;
  profiler = null;
  if (!Profiler) return;
  try {
    profiler = new Profiler({
      sampleInterval: SAMPLE_MS,
      maxBufferSize: MAX_SAMPLES,
    });
  } catch {
    // the page wasn't served with Document-Policy: js-profiling
  }
}

// "name file:line", the file relative to src/ (or the build's chunk)
function frameLabel(trace: Trace, frameId: number): string {
  const frame = trace.frames[frameId];
  const url =
    frame.resourceId === undefined ? "" : trace.resources[frame.resourceId];
  const file = url
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/kitty-inc\//, "")
    .replace(/^src\//, "")
    .replace(/\?.*$/, "")
    .replace(/-[\w-]{8}\.js$/, ".js");
  const where = file ? ` ${file}${frame.line ? `:${frame.line}` : ""}` : "";
  return `${frame.name || "(anonymous)"}${where}`;
}

const top = (sums: Map<string, number>): [string, number][] =>
  [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP)
    .map(([label, ms]) => [label, Math.round(ms * 10) / 10]);

function summarize(trace: Trace, sampleMs: number): ProfileSummary {
  const labels = new Map<number, string>();
  const label = (frameId: number) => {
    let text = labels.get(frameId);
    if (text === undefined) {
      text = frameLabel(trace, frameId);
      labels.set(frameId, text);
    }
    return text;
  };
  const self = new Map<string, number>();
  const total = new Map<string, number>();
  const seen = new Set<string>();
  let samples = 0;
  trace.samples.forEach((sample, i) => {
    if (sample.stackId === undefined) return;
    samples++;
    const next = trace.samples[i + 1];
    const ms = next
      ? Math.min(next.timestamp - sample.timestamp, sampleMs * MAX_GAP)
      : sampleMs;
    let stack: Trace["stacks"][number] | undefined =
      trace.stacks[sample.stackId];
    // a built-in (drawImage, measureText) is named with what called it
    const topFrame = trace.frames[stack.frameId];
    const caller =
      topFrame.resourceId === undefined && stack.parentId !== undefined
        ? trace.stacks[stack.parentId].frameId
        : undefined;
    const own =
      caller === undefined
        ? label(stack.frameId)
        : `${label(stack.frameId)} < ${label(caller)}`;
    self.set(own, (self.get(own) ?? 0) + ms);
    seen.clear();
    while (stack) {
      const name = label(stack.frameId);
      if (!seen.has(name)) {
        seen.add(name);
        total.set(name, (total.get(name) ?? 0) + ms);
      }
      stack =
        stack.parentId === undefined ? undefined : trace.stacks[stack.parentId];
    }
  });
  return { sampleMs, samples, self: top(self), total: top(total) };
}

export async function stopProfile(): Promise<ProfileSummary | undefined> {
  const running = profiler;
  profiler = null;
  if (!running) return undefined;
  const trace = await running.stop();
  return summarize(trace, running.sampleInterval);
}
