// the "Crossblast" event (explosion; free hires): it covers its crit,
// whose click freezes the screen while bomb wisps drop out of the sky one
// after another and land fizzing beside the empty spots on the floors in
// view; each goes off in a cross of blasts racing out along its row and
// column in four straight lines like an arcade bomber's, every step a bang,
// and where a line of blasts reaches an empty spot a new worker forms in
// the smoke with a jolt; the last blows in a huge blast and shake. Then
// the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "crossblast";
const MAX_HIRES = 4;
const FORM_MS = 300;
// a bomb lands OFFSET px beside its spot; its arms reach STEPS blasts of
// STEP px each way, a blast every STEP_MS
const OFFSET = 120;
const STEPS = 4;
const STEP = 60;
const STEP_MS = 45;
const SKY = 60;
const BOMB = 0.45;
const FUSE = 24;
const BLAST = 110;
const CORE = 180;
const BOOM_SHAKE: [number, number] = [0.8, 1.5];

export const forceCrossblastEvent = registerWispEvent(
  KEY,
  "Crossblast",
  () => CONFIG.crossblastEvent.chance,
  (floor, context, area) => {
    const { dropsMs, fallMs, fuseMs, holdMs, mergeMs } = CONFIG.crossblastEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    let clock = 0;
    const bombs = hires.map((hire, k) => {
      const spot: Point = { x: hire.x, y: hire.y - 30 };
      // beside the spot, on whichever side has room
      const side = spot.x - OFFSET > area.left + 20 ? -1 : 1;
      const at: Point = { x: spot.x + side * OFFSET, y: spot.y };
      const drops = clock;
      clock += lerp(dropsMs, k / Math.max(1, hires.length - 1));
      const lands = drops + fallMs;
      const booms = lands + fuseMs;
      const blasts: { at: Point; when: number }[] = [];
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        for (let s = 1; s <= STEPS; s++)
          blasts.push({
            at: { x: at.x + dx * STEP * s, y: at.y + dy * STEP * s },
            when: booms + s * STEP_MS,
          });
      }
      const fall: Point = { x: at.x, y: 0 };
      return {
        hire,
        spot,
        at,
        drops,
        lands,
        booms,
        blasts,
        reaches: booms + Math.ceil(OFFSET / STEP) * STEP_MS,
        wisp: (ms: number): Point | null => {
          if (ms < drops || ms >= booms) return null;
          fall.y = lerp(
            [area.top - SKY, at.y],
            easeIn(clamp01((ms - drops) / fallMs)),
          );
          return fall;
        },
      };
    });
    const last = bombs[bombs.length - 1];
    const endAt = Math.max(...bombs.map((b) => b.reaches));

    const booming = createBeats(
      bombs,
      (b) => b.booms,
      (b, k) => {
        cover!.burst(b.at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / Math.max(1, bombs.length - 1)));
      },
    );
    const reaching = createBeats(
      bombs,
      (b) => b.reaches,
      (b) => {
        giveHire(b.hire);
        if (b === last) cover!.blast(b.spot);
        else cover!.burst(b.spot, 0.5);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          booming.tick(ms, now);
          reaching.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + DETONATION_MS) return;
          for (const b of bombs) {
            if (ms >= b.lands && ms < b.booms)
              drawLitFuse(ctx, b.at, (ms - b.lands) / fuseMs, FUSE, now);
            drawWispBetween(
              ctx,
              b.wisp,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              b.drops,
              b.booms,
            );
            drawDetonation(ctx, b.at, ms - b.booms, CORE, now);
            for (const blast of b.blasts)
              drawDetonation(ctx, blast.at, ms - blast.when, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
