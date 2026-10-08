// the "Coral" event (experiment: diffusion-limited aggregation; cash): it
// covers its crit, whose click freezes the screen while a speck of light
// sticks on the clicked floor's button and glints wander in from all round,
// each sticking the moment it touches the growth, so a branching coral of
// light grows out of the button, ever faster, every spurt a click and a
// jolt; then the whole coral blazes and bursts into cash in a huge blast.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawGlitterLight, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, ringTargets } from "../../../../shared/coinTargets";

const KEY = "coral";
const REWARD = 4;
const CELL = 12;
const GRAINS = 320;
const MAX_STEPS = 1_500_000;
const FLY_MS = 140;
const FLY_FROM = 70;
const GLINT = 7;
const FRESH_MS = 160;
const SPURTS = 6;
const COIN_EVERY = 8;
const COINS = 2;
const REACH: [number, number] = [40, 170];
const SPURT_SHAKE: [number, number] = [0.25, 0.7];

export const forceCoralEvent = registerWispEvent(
  KEY,
  "Coral",
  () => CONFIG.coralEvent.chance,
  (floor, context, area) => {
    const { growMs, holdMs, mergeMs } = CONFIG.coralEvent;
    const cols = Math.ceil((area.right - area.left) / CELL);
    const rows = Math.ceil((area.bottom - area.top) / CELL);
    const button = getButtonCenter(context.isGroundFloor);
    const sx = Math.min(
      cols - 2,
      Math.max(1, Math.floor((button.x - area.left) / CELL)),
    );
    const sy = Math.min(
      rows - 2,
      Math.max(1, Math.floor((button.y - area.top) / CELL)),
    );
    // grown at arm: walkers wander in from a ring round the growth and stick
    const grid = new Uint8Array(cols * rows);
    grid[sy * cols + sx] = 1;
    const stuck: { cx: number; cy: number }[] = [{ cx: sx, cy: sy }];
    let radius = 2;
    let steps = 0;
    const touches = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < cols &&
            ny < rows &&
            grid[ny * cols + nx]
          )
            return true;
        }
      return false;
    };
    while (stuck.length < GRAINS && steps < MAX_STEPS) {
      const a = Math.random() * Math.PI * 2;
      let x = Math.round(sx + Math.cos(a) * (radius + 4));
      let y = Math.round(sy + Math.sin(a) * (radius + 4));
      while (steps++ < MAX_STEPS) {
        const d = Math.hypot(x - sx, y - sy);
        if (
          d > radius * 2 + 12 ||
          x < 1 ||
          y < 1 ||
          x >= cols - 1 ||
          y >= rows - 1
        )
          break;
        if (touches(x, y)) {
          grid[y * cols + x] = 1;
          stuck.push({ cx: x, cy: y });
          radius = Math.max(radius, d);
          break;
        }
        const r = Math.random();
        if (r < 0.25) x++;
        else if (r < 0.5) x--;
        else if (r < 0.75) y++;
        else y--;
      }
    }
    const cells = stuck.map(({ cx, cy }, i) => {
      const at: Point = {
        x: area.left + (cx + 0.5) * CELL,
        y: area.top + (cy + 0.5) * CELL,
      };
      const out =
        Math.atan2(at.y - button.y, at.x - button.x) + (Math.random() - 0.5);
      return {
        at,
        from: {
          x: at.x + Math.cos(out) * FLY_FROM,
          y: at.y + Math.sin(out) * FLY_FROM,
        },
        ms: FLY_MS + growMs * (i / stuck.length) ** 0.85,
      };
    });
    const grownAt = cells[cells.length - 1].ms;
    const burstAt = grownAt + 220;
    const endAt = burstAt + 300;
    const seed = cells[0].at;

    const spurting = createBeats(
      Array.from(
        { length: SPURTS },
        (_, k) => grownAt * ((k + 1) / (SPURTS + 1)) ** 0.85,
      ),
      (ms) => ms,
      (_, k) => {
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(SPURT_SHAKE, k / (SPURTS - 1)));
      },
    );
    const bursting = createBeats(
      [burstAt],
      (ms) => ms,
      () => {
        for (let i = 0; i < cells.length; i += COIN_EVERY)
          cover!.launchFrom(
            cells[i].at,
            clampTargetsY(
              ringTargets(cells[i].at, COINS, REACH),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        cover!.blast(seed);
      },
    );
    const glint: Point = { x: 0, y: 0 };

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          spurting.tick(ms, now);
          bursting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > burstAt) return;
          // blazing up all over just before it bursts
          const blaze = clamp01((ms - grownAt) / (burstAt - grownAt));
          for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            if (ms < c.ms - FLY_MS) break;
            if (ms < c.ms) {
              const u = easeIn((ms - c.ms + FLY_MS) / FLY_MS);
              glint.x = lerp([c.from.x, c.at.x], u);
              glint.y = lerp([c.from.y, c.at.y], u);
              drawGlitterLight(ctx, glint.x, glint.y, GLINT * 0.8, i, 0.7, now);
              continue;
            }
            const fresh = 1 - clamp01((ms - c.ms) / FRESH_MS);
            drawGlitterLight(
              ctx,
              c.at.x,
              c.at.y,
              GLINT * (1 + fresh + blaze),
              i,
              1,
              now,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
