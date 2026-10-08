// the "Ripple Mines" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while lit mine wisps pop up on every empty spot
// in view, fuses fizzing; the clicked floor's button goes off in a big blast
// and its shockwave ripples outward as a ring of glitter, setting off each
// mine as it reaches it: a big blast bursting into a cluster of smaller
// ones, a bang and a jolt, and a new worker forming in the smoke; the last
// mine goes up in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawGlitterLight,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "rippleMines";
const MAX_HIRES = 6;
const FORM_MS = 300;
const ARM_MS = 320;
const LIFT = 30;
const MINE = 0.4;
const FUSE = 16;
const START_BLAST = 260;
const MINE_BLAST = 210;
const CLUSTER_BLAST = 100;
const CLUSTER_REACH = 60;
const RIPPLE_DOTS = 28;
const GLITTER = 9;
const BANG_GAP_MS = 60;
const MINE_SHAKE: [number, number] = [0.8, 1.5];

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
}

export const forceRippleMinesEvent = registerWispEvent(
  KEY,
  "Ripple Mines",
  () => CONFIG.rippleMinesEvent.chance,
  (floor, context) => {
    const { waveMs, holdMs, mergeMs } = CONFIG.rippleMinesEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const spots = hires.map((h): Point => ({ x: h.x, y: h.y - LIFT }));
    const far = Math.max(
      ...spots.map((s) => Math.hypot(s.x - button.x, s.y - button.y)),
    );
    const mines = hires
      .map((hire: RewardHire, i) => ({
        hire,
        spot: spots[i],
        ms:
          ARM_MS +
          (waveMs * Math.hypot(spots[i].x - button.x, spots[i].y - button.y)) /
            far,
        at: (): Point => spots[i],
      }))
      .sort((a, b) => a.ms - b.ms);
    const last = mines[mines.length - 1];
    const blasts: Blast[] = [
      { at: button, ms: ARM_MS, size: START_BLAST, shake: 1.2 },
    ];
    mines.forEach((m, k) => {
      blasts.push({
        at: m.spot,
        ms: m.ms,
        size: MINE_BLAST,
        shake: lerp(MINE_SHAKE, k / Math.max(1, mines.length - 1)),
      });
      for (let c = 0; c < 3; c++) {
        const a = (c / 3) * Math.PI * 2 + k;
        blasts.push({
          at: {
            x: m.spot.x + Math.cos(a) * CLUSTER_REACH,
            y: m.spot.y + Math.sin(a) * CLUSTER_REACH * 0.6,
          },
          ms: m.ms + 40 + c * 30,
          size: CLUSTER_BLAST,
          shake: 0.4,
        });
      }
    });
    const endAt = last.ms + 160;
    let lastBang = -Infinity;

    const booming = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (!cover?.isLive()) return;
        if (b.ms - lastBang >= BANG_GAP_MS) {
          lastBang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );
    const hiring = createBeats(
      mines,
      (m) => m.ms,
      (m) => {
        giveHire(m.hire);
        if (m === last) cover!.blast(m.spot);
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
          hiring.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 900) return;
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
          const pop = easeOut(clamp01(ms / ARM_MS));
          for (const m of mines) {
            if (ms >= m.ms) continue;
            drawLitFuse(ctx, m.spot, ms / m.ms, FUSE * pop, now);
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MINE * pop,
              0.5,
              0,
              m.ms,
            );
          }
          const r = (ms - ARM_MS) / waveMs;
          if (r <= 0 || r >= 1) return;
          for (let d = 0; d < RIPPLE_DOTS; d++) {
            const a = (d / RIPPLE_DOTS) * Math.PI * 2;
            drawGlitterLight(
              ctx,
              button.x + Math.cos(a) * far * r,
              button.y + Math.sin(a) * far * r,
              GLITTER,
              d,
              1 - r * 0.5,
              now,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
