// the "Rocket" event: it covers its crit, whose click freezes the screen while
// a rocket stands on an open spot of the clicked floor and the button pours
// coins into it, its engine revving as they land. It blasts off up through
// the floors in view, knocking past each one, and bursts high on the screen
// into a firework of coins and bills that merge into the total. Pays the
// floor's income times its floor number once per floor it flew past
// (see ../moneyCover)
import type { Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { pickCritTierByOdds } from "../../../critTypes";
import { createEventFx, drawWhiteBurst } from "../../../../shared/eventFx";
import { streamCoins } from "../../../../shared/eventStream";
import { drawGlimmer, hash01 } from "../../../../shared/twinkle";
import { fillOutlined } from "../../../../utils";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import { BTN_H, BTN_W } from "../../../../floors/upgradeButton";
import {
  forceClaimEventProc,
  isVisibleOnFloor,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import {
  canStartMoneyCover,
  isMoneyCoverRunning,
  startMoneyCover,
  type CoverArea,
} from "../../moneyCover";
import { WORKER_FEET_Y } from "../../../../floors/worker";
import { findFloorLines } from "../../onScreenWorkers";
import { FLOOR_W } from "../../../../floors/constants";
import { drawRocket, ROCKET_HEIGHT, ROCKET_WINDOW } from "./rocket";
import { clamp01, easeOut } from "../../../../shared/easing";

const KEY = "rocket";
const COINS = 260;
const SCALE = 1.2;
// the firework bursts this far down the screen, this wide (of its shorter side)
const BURST_AT = 0.3;
const BURST_RADIUS = 0.34;
const POP_MS = 450;
const FLOOR_SHAKE = 0.35;
const BURST_SHAKE = 1.2;
const TRAIL = 10;
const TRAIL_MS = 30;
const TRAIL_SIZE = 18;
// it stands and flies up the floor's middle
const PAD_X = FLOOR_W / 2;
// before lift-off it crouches down this far as its engine roars up, rumbling
const CROUCH_MS = 260;
const CROUCH = 0.22;
const RUMBLE_PX = 4;
const LAUNCH_SHAKE = 0.6;
// then springs up tall, wobbling back to just a little stretched for speed
const SPRING = 0.45;
const SPRING_DECAY = 6;
const SPRING_HZ = 2.4;
const SPEED_STRETCH = 0.1;
// speed warps: streaks rushing down past it, longer and brighter as it speeds up
const WARPS = 22;
const WARP_SPREAD = 190; // px either side of it
const WARP_SPAN = 900; // px of sky the streaks cycle through
const WARP_SPEED = 3.2; // px a ms
const WARP_LENGTH: [number, number] = [70, 260];
const FLIGHT_FLAME = 1.4;
// smoke billowing out along the floor at lift-off, and puffing off behind it
const LAUNCH_PUFFS = 12;
const LAUNCH_PUFF_MS = 800;
const PUFF_EVERY_MS = 45;
const PUFF_MS = 450;

type Pt = { x: number; y: number };

// streaks of light rushing down past the rocket at (x, y), speed 0..1
function drawWarps(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  speed: number,
  now: number,
): void {
  if (speed <= 0) return;
  ctx.save();
  ctx.strokeStyle = COLOR.white;
  ctx.lineCap = "round";
  for (let i = 0; i < WARPS; i++) {
    const length =
      (WARP_LENGTH[0] + (WARP_LENGTH[1] - WARP_LENGTH[0]) * hash01(i, 6)) *
      speed;
    const along =
      (now * WARP_SPEED * (0.7 + 0.6 * hash01(i, 7)) +
        hash01(i, 8) * WARP_SPAN) %
      WARP_SPAN;
    const top = y - WARP_SPAN / 2 + along;
    // thinner and fainter the farther out from the rocket
    const off = (hash01(i, 9) - 0.5) * 2;
    ctx.globalAlpha = speed * (0.75 - 0.45 * Math.abs(off));
    ctx.lineWidth = 2 + 4 * (1 - Math.abs(off));
    ctx.beginPath();
    ctx.moveTo(x + off * WARP_SPREAD, top);
    ctx.lineTo(x + off * WARP_SPREAD, top + length);
    ctx.stroke();
  }
  ctx.restore();
}

// one cartoon smoke puff, outlined, fading as it grows
function drawPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
): void {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  fillOutlined(ctx, COLOR.rocketSmoke, 3);
  ctx.globalAlpha = 1;
}

// the cloud it blasts off from, billowing out both ways along the floor, and
// the puffs it leaves behind it on the way up
function drawSmoke(
  ctx: CanvasRenderingContext2D,
  pad: Pt,
  launchAt: number,
  burstAt: number,
  flightAt: (at: number) => Pt,
  now: number,
): void {
  if (now < launchAt) return;
  for (
    let k = Math.floor((Math.min(now, burstAt) - launchAt) / PUFF_EVERY_MS);
    k >= 0;
    k--
  ) {
    const born = launchAt + k * PUFF_EVERY_MS;
    const age = (now - born) / PUFF_MS;
    if (age >= 1) break;
    const at = flightAt(born);
    drawPuff(
      ctx,
      at.x + (hash01(k, 1) - 0.5) * 30,
      at.y + 10 + age * 30,
      10 + 26 * easeOut(age),
      0.85 * (1 - age),
    );
  }
  const age = (now - launchAt) / LAUNCH_PUFF_MS;
  if (age >= 1) return;
  for (let i = 0; i < LAUNCH_PUFFS; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 60 + 200 * hash01(i, 2);
    drawPuff(
      ctx,
      pad.x + side * (20 + reach * easeOut(age)),
      pad.y - 12 - 40 * hash01(i, 3) * age,
      (18 + 26 * hash01(i, 4)) * (0.5 + easeOut(age)),
      1 - age,
    );
  }
}

// where the firework bursts, floor-local: straight above the pad
function burstPoint(area: CoverArea): Pt {
  return { x: PAD_X, y: area.top + (area.bottom - area.top) * BURST_AT };
}

// the firework's coins: a ball of them round the burst, thinning out at its edge
function fireworkSpots(area: CoverArea): Pt[] {
  const burst = burstPoint(area);
  const radius =
    Math.min(area.right - area.left, area.bottom - area.top) * BURST_RADIUS;
  return Array.from({ length: COINS }, () => {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (0.25 + 0.75 * Math.sqrt(Math.random()));
    return {
      x: burst.x + Math.cos(angle) * r,
      y: Math.max(area.top + 40, burst.y + Math.sin(angle) * r),
    };
  });
}

// where the rocket stands on the clicked floor, if it's in view
function findPad(floor: Floor, context: EventProcContext): Pt | null {
  const entry = context.getOnScreenFloors?.().find((f) => f.floor === floor);
  if (!entry || !floor.unlocked) return null;
  const pad = { x: PAD_X, y: WORKER_FEET_Y };
  return isVisibleOnFloor(entry, pad.y - (ROCKET_HEIGHT * SCALE) / 2)
    ? pad
    : null;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.rocketEvent.chance,
    isInProgress: () => isMoneyCoverRunning(KEY),
    canArm: (floor, context) =>
      canStartMoneyCover(context) && findPad(floor, context) !== null,
    arm: (floor, context) => {
      const pad = findPad(floor, context);
      const area = context.getScreenAreaLocal?.(floor);
      if (!pad || !area) return;
      const { fillMs, flyMs, mergeMs } = CONFIG.rocketEvent;
      const burst = burstPoint(area);
      // every floor between its pad and the burst, its own included
      const floorsPassed = findFloorLines(floor, context.getOnScreenFloors)
        .filter((y) => y > burst.y && y <= pad.y)
        .sort((a, b) => b - a);
      const fx = createEventFx(fillMs);
      const startedAt = performance.now();
      const launchAt = startedAt + fillMs;
      const burstAt = launchAt + flyMs;
      // straight up from the pad, ever faster
      const flightAt = (now: number) => {
        const t = clamp01((now - launchAt) / flyMs);
        return { x: pad.x, y: pad.y + (burst.y - pad.y) * t * t };
      };
      const cover = startMoneyCover(
        KEY,
        floor,
        context,
        { durationMs: fillMs + flyMs + CONFIG.rocketEvent.durationMs, mergeMs },
        {
          layout: fireworkSpots,
          rewardMultiplier: Math.max(1, floorsPassed.length),
          drawExtra: (ctx, getFloorRect) => {
            const rect = getFloorRect(floor);
            if (!rect) return;
            const now = performance.now();
            ctx.save();
            ctx.translate(rect.left, rect.top);
            if (now >= burstAt) {
              drawWhiteBurst(ctx, burst.x, burst.y, (now - burstAt) / POP_MS);
              ctx.restore();
              return;
            }
            const scale = SCALE;
            drawSmoke(ctx, pad, launchAt, burstAt, flightAt, now);
            if (now < launchAt) {
              // crouching down as the engine roars up, rumbling on the pad
              const crouch = clamp01(
                (now - (launchAt - CROUCH_MS)) / CROUCH_MS,
              );
              const rumble = Math.sin(now / 17) * RUMBLE_PX * crouch;
              fx.draw(ctx, pad.x, pad.y - (ROCKET_HEIGHT * SCALE) / 2, (t) =>
                drawRocket(
                  ctx,
                  pad.x + rumble,
                  pad.y,
                  {
                    flame: Math.max(fx.progress(now) * 0.5, crouch),
                    rotation: t.rotation,
                    scale,
                    stretch: 1 - CROUCH * easeOut(crouch),
                  },
                  now,
                ),
              );
            } else {
              for (let k = TRAIL; k >= 1; k--) {
                const at = now - k * TRAIL_MS;
                if (at < launchAt) continue;
                const p = flightAt(at);
                drawGlimmer(
                  ctx,
                  p.x,
                  p.y + 20,
                  TRAIL_SIZE * (1 - k / (TRAIL + 1)),
                  now / 200 + k,
                  COLOR.heavenlyGold,
                );
              }
              const p = flightAt(now);
              const s = (now - launchAt) / 1000;
              drawWarps(
                ctx,
                p.x,
                p.y - (ROCKET_HEIGHT * SCALE) / 2,
                clamp01((now - launchAt) / flyMs),
                now,
              );
              drawRocket(
                ctx,
                p.x,
                p.y,
                {
                  flame: FLIGHT_FLAME,
                  rotation: 0,
                  scale,
                  // springs up tall off the pad, then flies a little stretched
                  stretch:
                    1 +
                    SPEED_STRETCH * clamp01(s * 4) +
                    SPRING *
                      Math.exp(-s * SPRING_DECAY) *
                      Math.cos(s * SPRING_HZ * Math.PI * 2),
                },
                now,
              );
            }
            ctx.restore();
          },
        },
      );
      if (!cover) return;
      const porthole = {
        x: pad.x + ROCKET_WINDOW.x * SCALE,
        y: pad.y + ROCKET_WINDOW.y * SCALE,
      };
      streamCoins(
        [
          {
            floor,
            x: cover.button.x,
            y: cover.button.y,
            spreadX: BTN_W * 0.75,
            spreadY: BTN_H / 2,
          },
        ],
        {
          target: porthole,
          durationMs: fillMs,
          isRunning: cover.isLive,
          onEachArrive: () => fx.hit(performance.now()),
        },
      );
      playBoostEventStream();

      // a knock as it punches up past each floor above its own
      setTimeout(() => {
        if (!cover.isLive()) return;
        shakeScreen(LAUNCH_SHAKE);
        playSwoosh();
      }, fillMs);
      for (const y of floorsPassed.slice(1)) {
        const t = Math.sqrt((pad.y - y) / (pad.y - burst.y));
        setTimeout(
          () => {
            if (cover.isLive()) shakeScreen(FLOOR_SHAKE);
          },
          fillMs + t * flyMs,
        );
      }
      setTimeout(() => {
        if (!cover.isLive()) return;
        cover.launchFrom(burst, cover.spots);
        playExplosion();
        shakeScreen(BURST_SHAKE);
      }, fillMs + flyMs);
    },
  },
  { label: "Rocket", color: COLOR.rocketRed },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Rocket
export function forceRocketEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), null, "upgrade");
  forceClaimEventProc(KEY, floor);
}
