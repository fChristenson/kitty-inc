// the "Pistons" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a row of lit bomb wisps lines up along the
// bottom of the screen like an engine's cylinders; they fire in an engine's
// firing order, each a big blast, a bang and a jolt that slams it up like a
// piston and spurts a jet of cash up into the total, revving faster and
// faster into a roar; then it hits the redline and every cylinder fires at
// once in a row of blasts under a colossal one, the hardest shake. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { pourLine, sampleLine, totalSpot, type Pour } from "../../cashFlow";

const KEY = "pistons";
const REWARD = 4;
const CYLINDERS = 5;
const ORDER = [0, 3, 1, 4, 2];
const FIRINGS = 12;
const BOTTOM = 150;
const MARGIN = 0.14;
const STROKE = 90;
const STROKE_MS = 160;
const BOMB = 0.45;
const FUSE = 14;
const BLAST = 170;
const REDLINE_BLAST = 230;
const COLOSSAL = 520;
const CORE_DELAY_MS = 130;
const BANG_GAP_MS = 60;
const FIRE_SHAKE: [number, number] = [0.5, 1.2];
const REDLINE_SHAKE = 2;

interface Firing {
  cylinder: number;
  at: number;
  size: number;
  redline: boolean;
}

export const forcePistonsEvent = registerWispEvent(
  KEY,
  "Pistons",
  () => CONFIG.pistonsEvent.chance,
  (floor, context, area) => {
    const { firstMs, firesMs, redlineGapMs, jetMs, holdMs, mergeMs } =
      CONFIG.pistonsEvent;
    const total = totalSpot(area);
    const width = area.right - area.left;
    const y = area.bottom - BOTTOM;
    const homes: Point[] = Array.from({ length: CYLINDERS }, (_, i) => ({
      x: area.left + width * lerp([MARGIN, 1 - MARGIN], i / (CYLINDERS - 1)),
      y,
    }));
    let clock: number = firstMs;
    const firings: Firing[] = [];
    for (let i = 0; i < FIRINGS; i++) {
      firings.push({
        cylinder: ORDER[i % CYLINDERS],
        at: clock,
        size: BLAST,
        redline: false,
      });
      clock += lerp(firesMs, i / (FIRINGS - 1));
    }
    const redlineAt = clock - lerp(firesMs, 1) + redlineGapMs;
    for (let c = 0; c < CYLINDERS; c++)
      firings.push({
        cylinder: c,
        at: redlineAt,
        size: REDLINE_BLAST,
        redline: true,
      });
    const coreAt = redlineAt + CORE_DELAY_MS;
    const core: Point = { x: area.left + width / 2, y };
    const jets = homes.map((home) =>
      sampleLine(
        (u) => ({
          x: lerp([home.x, total.x], u * u),
          y: lerp([home.y, total.y], u),
        }),
        24,
      ),
    );
    const pour: Pour = {
      coinsAlong: 380,
      width: 28,
      streamMs: jetMs,
      travelMs: 600,
    };
    // each cylinder's piston kicks up on every firing and drops back
    const strokes = homes.map((_, c) =>
      firings.filter((f) => f.cylinder === c).map((f) => f.at),
    );
    const pistons = homes.map((home, c) => {
      const at: Point = { x: home.x, y: home.y };
      return (ms: number): Point => {
        let kick = 0;
        for (const s of strokes[c]) {
          const since = ms - s;
          if (since >= 0 && since < STROKE_MS)
            kick = Math.sin((Math.PI * since) / STROKE_MS);
        }
        at.y = home.y - kick * STROKE;
        return at;
      };
    });
    let lastBang = -Infinity;

    const firing = createBeats(
      firings,
      (f) => f.at,
      (f, i) => {
        pourLine(cover!, jets[f.cylinder], pour);
        if (!cover!.isLive()) return;
        if (f.redline) {
          if (f.cylinder !== 0) return;
          playExplosion();
          shakeScreen(REDLINE_SHAKE);
          return;
        }
        shakeScreen(lerp(FIRE_SHAKE, i / (FIRINGS - 1)));
        if (f.at - lastBang >= BANG_GAP_MS) {
          lastBang = f.at;
          playExplosion();
        }
      },
    );
    const finale = createBeats(
      [coreAt],
      (ms) => ms,
      () => cover!.blast(core),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: coreAt + pour.travelMs + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > coreAt + 900) return;
          for (const f of firings)
            drawDetonation(ctx, homes[f.cylinder], ms - f.at, f.size, now);
          drawDetonation(ctx, core, ms - coreAt, COLOSSAL, now);
          if (ms >= redlineAt) return;
          // the fuses burn down toward the redline
          const burn = clamp01(ms / redlineAt);
          for (let c = 0; c < CYLINDERS; c++) {
            drawLitFuse(ctx, pistons[c](ms), burn, FUSE, now);
            drawWispBetween(
              ctx,
              pistons[c],
              ms,
              now,
              WISP_SIZE * BOMB,
              0.5,
              0,
              redlineAt,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
