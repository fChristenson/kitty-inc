import "./style.css";
import bgUrl from "./assets/bg.png";

const spriteModules = import.meta.glob<string>("./assets/sprites/sprite-*.png", {
  eager: true,
  import: "default",
});
const spriteUrls = Object.keys(spriteModules)
  .sort()
  .map((key) => spriteModules[key]);

// native size of bg.png
const FLOOR_W = 1248;
const FLOOR_H = 721;

// the floor plane band inside each bg.png slice (rest is ceiling/walls/windows)
const FLOOR_BOTTOM = 705;
const FLOOR_X_MIN = 150;
const FLOOR_X_MAX = 1100;
const FURNITURE_MAX_H = 195;
const FURNITURE_RISE = 60;

interface Placement {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Floor {
  furniture: Placement[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomSprites(images: HTMLImageElement[], count: number): HTMLImageElement[] {
  const pool = [...images];
  const picked: HTMLImageElement[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randomInt(0, pool.length - 1);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function buildFloor(spriteImages: HTMLImageElement[]): Floor {
  const count = randomInt(2, 3);
  const chosen = pickRandomSprites(spriteImages, count);
  const usableW = FLOOR_X_MAX - FLOOR_X_MIN;
  const slotWidth = usableW / chosen.length;

  const furniture: Placement[] = chosen.map((img, i) => {
    const scale = Math.min(FURNITURE_MAX_H / img.naturalHeight, 1);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const slotCenter = FLOOR_X_MIN + slotWidth * i + slotWidth / 2;
    const jitter = (Math.random() - 0.5) * slotWidth * 0.4;
    const x = Math.min(Math.max(slotCenter + jitter - w / 2, FLOOR_X_MIN), FLOOR_X_MAX - w);
    const y = FLOOR_BOTTOM - h - FURNITURE_RISE;
    return { img, x, y, w, h };
  });

  return { furniture };
}

async function main() {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("#app not found");

  app.innerHTML = `
    <div class="game">
      <header class="game__header">
        <h1>Skyscraper Clicker</h1>
        <p class="game__floor-count">Floors: <span id="floor-count">0</span></p>
      </header>
      <div class="game__scroll" id="scroll">
        <canvas id="building"></canvas>
      </div>
      <button id="add-floor" class="game__button">Add Floor</button>
    </div>
  `;

  const canvas = app.querySelector<HTMLCanvasElement>("#building")!;
  const ctx = canvas.getContext("2d")!;
  const scrollEl = app.querySelector<HTMLDivElement>("#scroll")!;
  const floorCountEl = app.querySelector<HTMLSpanElement>("#floor-count")!;
  const addFloorBtn = app.querySelector<HTMLButtonElement>("#add-floor")!;

  const [bgImage, ...spriteImages] = await Promise.all([
    loadImage(bgUrl),
    ...spriteUrls.map(loadImage),
  ]);

  const floors: Floor[] = [];

  function render() {
    canvas.width = FLOOR_W;
    canvas.height = Math.max(floors.length, 1) * FLOOR_H;
    for (let r = 0; r < floors.length; r++) {
      const floor = floors[floors.length - 1 - r];
      const offsetY = r * FLOOR_H;
      ctx.drawImage(bgImage, 0, offsetY, FLOOR_W, FLOOR_H);
      for (const p of floor.furniture) {
        ctx.drawImage(p.img, p.x, p.y + offsetY, p.w, p.h);
      }
    }
  }

  function addFloor() {
    floors.push(buildFloor(spriteImages));
    floorCountEl.textContent = String(floors.length);
    render();
    scrollEl.scrollTop = 0; // keep the newest floor in view
  }

  addFloorBtn.addEventListener("click", addFloor);

  addFloor(); // ground floor
}

main();
