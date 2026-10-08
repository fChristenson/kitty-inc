// The simulations: each drives the real game the way a player would (taps,
// holds, test-bar buttons) and measures a window of frames. Loaded only once
// the game has booted, so these imports share the game's module instances.
import {
  loadEventCatalog,
  CRIT_PROC_INFO,
  CRIT_PROC_KINDS,
  CRIT_TIER_CONFIG,
  CRIT_TIER_ORDER,
  FEATURED_CRIT_KINDS,
  SPECIAL_CRIT_GATEWAY,
  setCritRandom,
} from "../src/crits";
import { shakeScreen } from "../src/shared/screenShake";
import {
  applyBoostAll,
  getButtonCenter,
  spawnCoinBurst,
  triggerOvertimeBoost,
} from "../src/floors";
import { fromNumber } from "../src/shared/bigNumber";

import { getActiveCorporationIndices } from "../src/company";

import type { Floor } from "../src/gameState";
import type { PerfBridge } from "../src/shared/perfBridge";
import { start, stop, type Summary } from "./metrics";

export interface Scenario {
  name: string;
  about: string;
  run: (bridge: PerfBridge) => Promise<Summary>;
}

// a run's crits: the game's odds, crit tiers without any procs or events, or
// none at all. Picked per run with a name suffix: "hold@off", "hold@tiers"
export const CRIT_MODES = {
  on: "the game's crit odds, procs and events included",
  frequent: "the game's crits five times as often, procs and events included",
  tiers: "crit tiers only: no procs, no events",
  off: "no crits at all",
} as const;
export type CritMode = keyof typeof CRIT_MODES;

export function parseRunName(name: string): {
  base: string;
  mode: CritMode | null;
} {
  const at = name.lastIndexOf("@");
  const mode = at < 0 ? "" : name.slice(at + 1);
  return mode in CRIT_MODES
    ? { base: name.slice(0, at), mode: mode as CritMode }
    : { base: name, mode: null };
}

const gameOdds = {
  gateway: SPECIAL_CRIT_GATEWAY.chance,
  tiers: CRIT_TIER_ORDER.map((tier) => CRIT_TIER_CONFIG[tier].chance),
};

// mulberry32: the same stream of numbers for the same seed
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FREQUENT = 5;

let scenarioRandom: () => number = Math.random;

// sets a run's crit odds and seeds its dice, so the same run lands the same
// crits every time (crit rolls follow the clicks, not the frame rate); seed 0
// rolls freely
export function prepareRun(mode: CritMode, seed: number): void {
  CRIT_TIER_ORDER.forEach((tier, i) => {
    CRIT_TIER_CONFIG[tier].chance =
      mode === "off"
        ? 0
        : gameOdds.tiers[i] * (mode === "frequent" ? FREQUENT : 1);
  });
  SPECIAL_CRIT_GATEWAY.chance =
    mode === "on" || mode === "frequent" ? gameOdds.gateway : 0;
  setCritRandom(seed ? seeded(seed) : Math.random);
  scenarioRandom = seed ? seeded(seed + 1) : Math.random;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const canvas = () =>
  document.getElementById("game-canvas") as HTMLCanvasElement;

function click(selector: string): void {
  document.querySelector<HTMLElement>(selector)?.click();
}

// synthetic presses can't capture a real pointer
function disableCapture(): void {
  const target = canvas();
  target.setPointerCapture = () => {};
  target.releasePointerCapture = () => {};
}

function pointer(type: string, at: { x: number; y: number }): void {
  canvas().dispatchEvent(
    new PointerEvent(type, {
      clientX: at.x,
      clientY: at.y,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      bubbles: true,
    }),
  );
}

function buttonPoint(bridge: PerfBridge, floor: Floor) {
  const isGround = bridge.getActiveFloors().indexOf(floor) === 0;
  const center = getButtonCenter(isGround);
  return bridge.floorToClient(floor, center.x, center.y);
}

function press(bridge: PerfBridge, floor: Floor): () => void {
  const at = buttonPoint(bridge, floor);
  if (!at) return () => {};
  disableCapture();
  pointer("pointerdown", at);
  return () => pointer("pointerup", at);
}

function tap(bridge: PerfBridge, floor: Floor): void {
  press(bridge, floor)();
}

// runs fn every ms until the returned stop is called
function every(ms: number, fn: () => void): () => void {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}

async function measure(name: string, ms: number): Promise<Summary> {
  start();
  await sleep(ms);
  return stop(name);
}

// coin bursts at three spots on each of the lowest floors, like every
// manager boosting at once
function burstStorm(bridge: PerfBridge): () => void {
  let round = 0;
  return every(250, () => {
    const floors = bridge.getActiveFloors().filter((f) => f.unlocked);
    for (let i = 0; i < Math.min(4, floors.length); i++)
      for (const x of [350, 650, 950])
        spawnCoinBurst(floors[i], x, 520, () => {});
    if (round++ % 8 === 0) applyBoostAll(floors);
  });
}

const tiers = ["crit", "mega", "ultra"];
// arms a random special crit at a random tier on the ground floor
function armRandomCrit(): void {
  const tier = document.querySelector<HTMLSelectElement>("#test-crit-tier");
  if (tier) tier.value = tiers[Math.floor(scenarioRandom() * tiers.length)];
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-crit-kind]"),
  ].filter((button) => button.dataset.critKind && !button.disabled);
  buttons[Math.floor(scenarioRandom() * buttons.length)]?.click();
}

const ground = (bridge: PerfBridge) => bridge.getActiveFloors()[0];
const second = (bridge: PerfBridge) =>
  bridge.getActiveFloors()[1] ?? ground(bridge);

// arms one crit from the test bar on the next upgrade click (kind "" is a
// regular crit), then clicks the ground floor's button
function forceCrit(bridge: PerfBridge, kind: string, tier: string): void {
  const event = document.querySelector<HTMLSelectElement>("#test-crit-event");
  if (event) event.value = "upgrade";
  const select = document.querySelector<HTMLSelectElement>("#test-crit-tier");
  if (select) select.value = tier;
  document
    .querySelector<HTMLButtonElement>(`[data-crit-kind="${kind}"]`)
    ?.click();
  setTimeout(() => tap(bridge, ground(bridge)), 50);
}

const FEATURED = new Set<string>(FEATURED_CRIT_KINDS);
const PROCS = CRIT_PROC_KINDS.filter((kind) => !FEATURED.has(kind));
// procs that reach past the crit's floor: every floor, building or worker
const WIDE_PROCS = PROCS.filter((kind) =>
  /\b(every|all)\b/i.test(CRIT_PROC_INFO[kind].description),
);
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(scenarioRandom() * items.length)];

// one forced crit every everyMs on the ground floor, the tier cycling
function critSeries(
  name: string,
  everyMs: number,
  kind: () => string,
): Scenario["run"] {
  return async (bridge) => {
    click("#add-money");
    bridge.scrollToFloor(ground(bridge), 0.6);
    await sleep(300);
    let n = 0;
    const fire = () => forceCrit(bridge, kind(), tiers[n++ % tiers.length]);
    fire();
    const stopCrits = every(everyMs, fire);
    const summary = await measure(name, 9000);
    stopCrits();
    return summary;
  };
}

export const SCENARIOS: Scenario[] = [
  {
    name: "idle",
    about: "a busy building on screen, nothing touched",
    run: async (bridge) => {
      bridge.scrollToFloor(bridge.getActiveFloors()[2] ?? ground(bridge));
      await sleep(500);
      return measure("idle", 6000);
    },
  },
  {
    name: "scroll",
    about: "wheel-scrolling up and down the building",
    run: async () => {
      const t0 = performance.now();
      const stopScroll = every(16, () => {
        const up = Math.sin((performance.now() - t0) / 1200) > 0;
        canvas().dispatchEvent(
          new WheelEvent("wheel", { deltaY: up ? -60 : 60, bubbles: true }),
        );
      });
      const summary = await measure("scroll", 6000);
      stopScroll();
      return summary;
    },
  },
  {
    name: "hold",
    about: "long-press on an upgrade button: coin bursts, crits, bar overspeed",
    run: async (bridge) => {
      click("#add-money");
      const floor = second(bridge);
      bridge.scrollToFloor(floor, 0.6);
      await sleep(300);
      const release = press(bridge, floor);
      const summary = await measure("hold", 8000);
      release();
      return summary;
    },
  },
  {
    name: "overtime",
    about: "a long-press during Overtime",
    run: async (bridge) => {
      click("#add-money");
      const floor = second(bridge);
      triggerOvertimeBoost(floor, fromNumber(0));
      bridge.scrollToFloor(floor, 0.6);
      await sleep(300);
      const release = press(bridge, floor);
      const summary = await measure("overtime", 8000);
      release();
      return summary;
    },
  },
  {
    name: "burst-storm",
    about: "coin bursts on every visible floor four times a second",
    run: async (bridge) => {
      bridge.scrollToFloor(second(bridge));
      const stopStorm = burstStorm(bridge);
      const summary = await measure("burst-storm", 6000);
      stopStorm();
      return summary;
    },
  },
  {
    name: "crits",
    about: "a random special crit at a random tier every 1.5s",
    run: async (bridge) => {
      click("#add-money");
      bridge.scrollToFloor(ground(bridge), 0.6);
      await sleep(300);
      const fire = () => {
        armRandomCrit();
        setTimeout(() => tap(bridge, ground(bridge)), 50);
      };
      fire();
      const stopCrits = every(1500, fire);
      const summary = await measure("crits", 9000);
      stopCrits();
      return summary;
    },
  },
  {
    name: "crit-tiers",
    about: "a regular crit every second, x5, x25, x125 in turn",
    run: critSeries("crit-tiers", 1000, () => ""),
  },
  {
    name: "featured",
    about: "a featured crit (icon reveal) every 1.5s, tiers in turn",
    run: critSeries("featured", 1500, () => pick(FEATURED_CRIT_KINDS)),
  },
  {
    name: "procs",
    about: "a special (non-featured) crit every 1.5s, tiers in turn",
    run: critSeries("procs", 1500, () => pick(PROCS)),
  },
  {
    name: "shakes",
    about: "a crit-sized screen shake every 400ms over the busy building",
    run: async (bridge) => {
      bridge.scrollToFloor(second(bridge));
      await sleep(300);
      const stopShakes = every(400, () => shakeScreen(1.3));
      const summary = await measure("shakes", 6000);
      stopShakes();
      return summary;
    },
  },
  {
    name: "shake-storm",
    about: "shakes every 150ms, stacked to the max, while holding the button",
    run: async (bridge) => {
      click("#add-money");
      const floor = second(bridge);
      bridge.scrollToFloor(floor, 0.6);
      await sleep(300);
      const release = press(bridge, floor);
      const stopShakes = every(150, () => shakeScreen(1.3));
      const summary = await measure("shake-storm", 8000);
      stopShakes();
      release();
      return summary;
    },
  },
  {
    name: "chaos",
    about: "holding the button while crits land and coin bursts storm",
    run: async (bridge) => {
      click("#add-money");
      bridge.scrollToFloor(ground(bridge), 0.6);
      await sleep(300);
      const release = press(bridge, ground(bridge));
      const stopStorm = burstStorm(bridge);
      const stopCrits = every(1200, armRandomCrit);
      const summary = await measure("chaos", 8000);
      stopCrits();
      stopStorm();
      release();
      return summary;
    },
  },
  {
    name: "map",
    about: "the city map open",
    run: async () => {
      click("#action-bar-map");
      await sleep(800);
      const summary = await measure("map", 5000);
      click("#action-bar-map");
      return summary;
    },
  },
  {
    name: "wide-crits",
    about: "a crit reaching every floor or building every 1.5s (try ?late=1)",
    run: critSeries("wide-crits", 1500, () => pick(WIDE_PROCS)),
  },
  {
    name: "building-hop",
    about: "switching to another building every 600ms (try ?late=1)",
    run: async (bridge) => {
      const count = bridge.buildingCount();
      let n = 0;
      const stopHop = every(600, () => {
        n = (n + 7) % count;
        void bridge.goToBuilding(n);
      });
      const summary = await measure("building-hop", 6000);
      stopHop();
      return summary;
    },
  },
  {
    name: "company-switch",
    about:
      "switching company every 1.5s: saves one, loads the next (try ?late=1)",
    run: async (bridge) => {
      const companies = getActiveCorporationIndices();
      let n = Math.max(0, companies.indexOf(bridge.activeCompany()));
      const stopSwitch = every(1500, () => {
        n = (n + 1) % companies.length;
        void bridge.switchCompany(companies[n]);
      });
      const summary = await measure("company-switch", 9000);
      stopSwitch();
      return summary;
    },
  },
];

// one event: armed on the ground floor from its test button, then tapped
export function eventScenario(id: string): Scenario {
  const name = `event:${id}`;
  return {
    name,
    about: `the ${id} event, start to finish`,
    run: async (bridge) => {
      // the events load after startup; the test button waits for them too
      await loadEventCatalog();
      click("#add-money");
      click(`#test-${id}-event`);
      await sleep(200);
      tap(bridge, ground(bridge));
      return measure(name, 4500);
    },
  };
}

// every event with a test button
export function eventIds(): string[] {
  return [
    ...document.querySelectorAll<HTMLButtonElement>(
      "button[id^='test-'][id$='-event']",
    ),
  ].map((button) => button.id.slice(5, -6));
}

// one floor crit: armed on the ground floor from its test button, then tapped
export function floorCritScenario(kind: string): Scenario {
  const name = `floor-crit:${kind}`;
  return {
    name,
    about: `the ${kind} floor crit, start to finish`,
    run: async (bridge) => {
      click("#add-money");
      bridge.scrollToFloor(ground(bridge), 0.6);
      click(`[data-crit-moment="${kind}"]`);
      await sleep(300);
      tap(bridge, ground(bridge));
      return measure(name, 4000);
    },
  };
}

// every floor crit with a test button
export function floorCritKinds(): string[] {
  return [
    ...document.querySelectorAll<HTMLButtonElement>("[data-crit-moment]"),
  ].map((button) => button.dataset.critMoment!);
}

// a spread across the event templates
export const SAMPLE_EVENTS = [
  "clutter",
  "sinkhole",
  "gatling",
  "carpet-bombing",
  "murmuration",
  "deluge",
  "glitter-spill",
  "grand-prix",
  "breakthrough",
  "spirit-bomb",
  "chladni",
  "arc-swarm",
];

// what grows with the company: run with ?late=1
export const LATE_SCENARIOS = [
  "startup",
  "idle",
  "scroll",
  "hold",
  "crits",
  "wide-crits",
  "map",
  "building-hop",
  "company-switch",
];
