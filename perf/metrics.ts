// What a scenario measures: frame times, the game's own redraw time, canvas
// calls per frame, canvases created, long tasks and the JS heap. Recording is
// on only between start() and stop(), so setup work never counts.

export interface Summary {
  name: string;
  ms: number;
  frames: number;
  fps: number;
  frame: Stats;
  // share of frames over 20ms (a dropped 60fps frame) and 33ms (under 30fps)
  over20: number;
  over33: number;
  // frames over 50ms: visible hitches
  hitches: number;
  redraw: Stats;
  longTasks: number;
  longTaskMs: number;
  // canvas calls per frame, by method
  calls: Record<string, number>;
  canvases: number;
  canvasSources: [string, number][];
  bitmaps: number;
  heapStartMb: number;
  heapEndMb: number;
  // heap drops over 1MB between frames: garbage collections
  gcs: number;
  gcMb: number;
}

export interface Stats {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

const COUNTED = [
  "drawImage",
  "fillRect",
  "fill",
  "stroke",
  "fillText",
  "strokeText",
  "setTransform",
  "save",
  "clip",
  "createLinearGradient",
  "createRadialGradient",
  "getImageData",
  "putImageData",
] as const;

let recording = false;
let counts: Record<string, number> = {};
const deltas: number[] = [];
const redraws: number[] = [];
const longTasks: number[] = [];
const sources = new Map<string, number>();
let canvases = 0;
let bitmaps = 0;
let heapStart = 0;
let heapLast = 0;
let gcs = 0;
let gcBytes = 0;
let startedAt = 0;
let lastFrame = 0;
let frameNumber = 0;
// reading the heap size isn't free, so it's sampled this often
const HEAP_EVERY = 10;

const memory = () =>
  (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
    ?.usedJSHeapSize ?? 0;

// a short "file:line < file:line" of who made a canvas
function caller(): string {
  return (new Error().stack ?? "")
    .split("\n")
    .slice(3)
    .filter((line) => line.includes("/src/"))
    .slice(0, 2)
    .map((line) =>
      line
        .trim()
        .replace(/^at\s+/, "")
        .replace(/\(?https?:\/\/[^/]+\/[^/]+\/src\//, "")
        .replace(/\?[^:)]*/, "")
        .replace(/\)$/, ""),
    )
    .join(" < ");
}

// a CPU profile shows this right after each hitch: the samples just before it
// are the work that held the frame up
function hitchMarker(): void {
  const until = performance.now() + 0.3;
  while (performance.now() < until);
}

// wraps the canvas API once, before the game boots
export function instrument(countCalls: boolean): void {
  if (countCalls) {
    const proto = CanvasRenderingContext2D.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    for (const name of COUNTED) {
      const original = proto[name];
      proto[name] = function (this: unknown, ...args: unknown[]) {
        if (recording) counts[name] = (counts[name] ?? 0) + 1;
        return original.apply(this, args);
      };
    }
  }
  const createElement = Document.prototype.createElement;
  Document.prototype.createElement = function (
    this: Document,
    tag: string,
    options?: ElementCreationOptions,
  ) {
    if (recording && tag.toLowerCase() === "canvas") {
      canvases++;
      const at = caller();
      sources.set(at, (sources.get(at) ?? 0) + 1);
    }
    return createElement.call(this, tag, options);
  } as typeof createElement;
  const createBitmap = window.createImageBitmap;
  window.createImageBitmap = function (
    ...args: Parameters<typeof createImageBitmap>
  ) {
    if (recording) bitmaps++;
    return createBitmap.apply(window, args);
  } as typeof createImageBitmap;
  new PerformanceObserver((list) => {
    if (!recording) return;
    for (const entry of list.getEntries()) longTasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: false });
  const frame = (t: number) => {
    requestAnimationFrame(frame);
    if (recording && lastFrame > 0) {
      deltas.push(t - lastFrame);
      if (t - lastFrame > 50) hitchMarker();
    }
    lastFrame = t;
    if (!recording || ++frameNumber % HEAP_EVERY !== 0) return;
    const heap = memory();
    if (heapLast - heap > 1_000_000) {
      gcs++;
      gcBytes += heapLast - heap;
    }
    heapLast = heap;
  };
  requestAnimationFrame(frame);
}

// times each call of the game's redraw while recording
export function timeRedraw(redraw: () => void): () => void {
  return () => {
    if (!recording) return redraw();
    const t0 = performance.now();
    redraw();
    redraws.push(performance.now() - t0);
  };
}

export function start(): void {
  counts = {};
  deltas.length = 0;
  redraws.length = 0;
  longTasks.length = 0;
  sources.clear();
  canvases = 0;
  bitmaps = 0;
  gcs = 0;
  gcBytes = 0;
  heapStart = heapLast = memory();
  startedAt = performance.now();
  lastFrame = 0;
  recording = true;
}

function stats(values: number[]): Stats {
  if (values.length === 0) return { avg: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: sorted[sorted.length - 1],
  };
}

export function stop(name: string): Summary {
  recording = false;
  const ms = performance.now() - startedAt;
  const frames = deltas.length;
  const perFrame = (n: number) => (frames > 0 ? n / frames : 0);
  return {
    name,
    ms,
    frames,
    fps: frames > 0 ? (frames * 1000) / ms : 0,
    frame: stats(deltas),
    over20: perFrame(deltas.filter((d) => d > 20).length),
    over33: perFrame(deltas.filter((d) => d > 33.4).length),
    hitches: deltas.filter((d) => d > 50).length,
    redraw: stats(redraws),
    longTasks: longTasks.length,
    longTaskMs: longTasks.reduce((sum, d) => sum + d, 0),
    calls: Object.fromEntries(
      Object.entries(counts).map(([key, n]) => [key, perFrame(n)]),
    ),
    canvases,
    canvasSources: [...sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
    bitmaps,
    heapStartMb: heapStart / 1e6,
    heapEndMb: memory() / 1e6,
    gcs,
    gcMb: gcBytes / 1e6,
  };
}
