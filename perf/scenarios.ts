// The simulations: each drives the real game the way a player would (taps,
// holds, test-bar buttons) and measures a window of frames. Loaded only once
// the game has booted, so these imports share the game's module instances.
import {
  applyBoostAll,
  getButtonCenter,
  spawnCoinBurst,
  triggerOvertimeBoost,
} from "../src/floors";
import { fromNumber } from "../src/shared/bigNumber";
import type { Floor } from "../src/gameState";
import type { PerfBridge } from "../src/shared/perfBridge";
import { start, stop, type Summary } from "./metrics";

export interface Scenario {
  name: string;
  about: string;
  run: (bridge: PerfBridge) => Promise<Summary>;
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
  if (tier) tier.value = tiers[Math.floor(Math.random() * tiers.length)];
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-crit-kind]"),
  ].filter((button) => button.dataset.critKind && !button.disabled);
  buttons[Math.floor(Math.random() * buttons.length)]?.click();
}

const ground = (bridge: PerfBridge) => bridge.getActiveFloors()[0];
const second = (bridge: PerfBridge) =>
  bridge.getActiveFloors()[1] ?? ground(bridge);

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
];

// one event: armed on the ground floor from its test button, then tapped
export function eventScenario(id: string): Scenario {
  const name = `event:${id}`;
  return {
    name,
    about: `the ${id} event, start to finish`,
    run: async (bridge) => {
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
