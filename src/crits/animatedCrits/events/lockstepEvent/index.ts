// the "Lockstep" event (explosion; cash): it covers its crit, whose click
// freezes the screen while lit bomb wisps pop up all over the screen, each
// fuse blinking to its own beat; group by group their blinks pull into
// step, faster and faster, and the moment a group flashes in unison it goes
// off together in a rolling chain of big blasts, each with its own bang
// and shake and spray of cash; the last group locks step and goes up in a
// cluster round one colossal blast with the hardest shake of all. Pays
// floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWispHead, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";

const KEY = "lockstep";
const REWARD = 4;
// the groups' middles, as shares of the screen across and down
const GROUPS: Point[] = [
  { x: 0.28, y: 0.3 },
  { x: 0.72, y: 0.42 },
  { x: 0.42, y: 0.68 },
];
const PER_GROUP = 5;
const SCATTER = 150;
const POP_MS = 150;
// blinks a second, the slowest and quickest bombs, sped up over the event
const RATE: [number, number] = [2.2, 3.8];
const SPEEDUP = 1.6;
const STEP_MS = 5;
// how hard each group pulls into step once its turn comes
const PULL = 18;
const SYNCED = 0.97;
const CHAIN_MS = 35;
const BLINK = fadeStops(COLOR.heavenlyGold);
const BOMB = 0.36;
const FUSE = 32;
const BLAST = 230;
const CORE = 360;
const COLOSSAL = 720;
const BANG_GAP_MS = 45;
const CHAIN_SHAKE: [number, number] = [0.5, 0.9];
const CORE_SHAKE = 1.4;
const FINAL_SHAKE = 2.6;

interface Bomb {
  at: Point;
  group: number;
  appears: number;
  blows: number;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceLockstepEvent = registerWispEvent(
  KEY,
  "Lockstep",
  () => CONFIG.lockstepEvent.chance,
  (floor, context, area) => {
    const { pullsMs, holdMs, mergeMs } = CONFIG.lockstepEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const centres = GROUPS.map((g) => ({
      x: area.left + width * g.x,
      y: area.top + height * g.y,
    }));
    const bombs: Bomb[] = centres.flatMap((c, group) =>
      Array.from({ length: PER_GROUP }, () => ({
        at: {
          x: c.x + (Math.random() - 0.5) * 2 * SCATTER,
          y: c.y + (Math.random() - 0.5) * 2 * SCATTER * 0.7,
        },
        group,
        appears: Math.random() * POP_MS,
        blows: Infinity,
      })),
    );
    const n = bombs.length;
    // each group starts pulling into step in turn; Kuramoto's coupled
    // oscillators, stepped through at arm
    const pulls = centres.map((_, g) => pullsMs[g]);
    const rates = bombs.map(() => lerp(RATE, Math.random()) * Math.PI * 2);
    const phase = bombs.map(() => Math.random() * Math.PI * 2);
    const samples: Float32Array[] = [];
    const blownAt = centres.map(() => Infinity);
    let ms = 0;
    const deadline = pulls[pulls.length - 1] + 900;
    while (blownAt.some((b) => b === Infinity) && ms < deadline) {
      samples.push(Float32Array.from(phase));
      const speed = 1 + SPEEDUP * (ms / deadline);
      const next = phase.slice();
      for (let i = 0; i < n; i++) {
        const g = bombs[i].group;
        let pull = 0;
        if (ms >= pulls[g])
          for (let j = 0; j < n; j++)
            if (bombs[j].group === g) pull += Math.sin(phase[j] - phase[i]);
        const k =
          ms >= pulls[g] ? PULL * Math.min(1, (ms - pulls[g]) / 300) : 0;
        next[i] =
          phase[i] +
          ((rates[i] * speed + (k / PER_GROUP) * pull) * STEP_MS) / 1000;
      }
      // a group in step blows on its next unison flash
      for (let g = 0; g < centres.length; g++) {
        if (blownAt[g] !== Infinity || ms < pulls[g]) continue;
        let sx = 0;
        let sy = 0;
        for (let i = 0; i < n; i++)
          if (bombs[i].group === g) {
            sx += Math.cos(phase[i]);
            sy += Math.sin(phase[i]);
          }
        const order = Math.hypot(sx, sy) / PER_GROUP;
        const mean = Math.atan2(sy, sx);
        const wrapped = ((mean % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if ((order > SYNCED && wrapped < 0.35) || ms >= pulls[g] + 800)
          blownAt[g] = ms;
      }
      for (let i = 0; i < n; i++) phase[i] = next[i];
      ms += STEP_MS;
    }
    for (let g = 0; g < centres.length; g++)
      if (blownAt[g] === Infinity) blownAt[g] = ms;
    const blasts: Blast[] = [];
    const finalGroup = blownAt.indexOf(Math.max(...blownAt));
    centres.forEach((c, g) => {
      const members = bombs.filter((b) => b.group === g);
      // a rolling chain through the group, nearest the middle last
      members.sort(
        (a, b) =>
          Math.hypot(b.at.x - c.x, b.at.y - c.y) -
          Math.hypot(a.at.x - c.x, a.at.y - c.y),
      );
      members.forEach((b, i) => {
        b.blows = blownAt[g] + i * CHAIN_MS;
        blasts.push({
          at: b.at,
          ms: b.blows,
          size: BLAST,
          shake: lerp(CHAIN_SHAKE, i / (PER_GROUP - 1)),
          coins: 12,
        });
      });
      const final = g === finalGroup;
      blasts.push({
        at: c,
        ms: blownAt[g] + PER_GROUP * CHAIN_MS,
        size: final ? COLOSSAL : CORE,
        shake: final ? FINAL_SHAKE : CORE_SHAKE,
        coins: final ? 0 : 30,
      });
    });
    const colossal = blasts.find((b) => b.size === COLOSSAL)!;
    const endAt = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    const phaseAt = (i: number, t: number) =>
      samples[
        Math.min(samples.length - 1, Math.max(0, Math.floor(t / STEP_MS)))
      ][i];
    const fixed = bombs.map((b) => () => b.at);

    let bang = -Infinity;
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b === colossal) {
          cover!.blast(b.at);
          if (!cover!.isLive()) return;
          playSlamExplosion();
          shakeScreen(b.shake);
          return;
        }
        if (b.coins > 0)
          cover!.launchFrom(
            b.at,
            clampTargetsY(
              sprayTargets(b.at, b.coins, [60, 240]),
              area.top + 40,
              area.bottom - 40,
            ),
          );
        if (!cover!.isLive()) return;
        if (b.ms - bang >= BANG_GAP_MS) {
          bang = b.ms;
          playExplosion();
        }
        shakeScreen(b.shake);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (t, now) => blasting.tick(t, now),
        drawOver: (ctx, t, now) => {
          if (t < 0 || t > endAt) return;
          for (let i = 0; i < n; i++) {
            const b = bombs[i];
            if (t < b.appears || t >= b.blows) continue;
            const grow = easeOut(clamp01((t - b.appears) / POP_MS));
            drawLitFuse(
              ctx,
              b.at,
              clamp01(t / b.blows) * 0.6,
              FUSE * grow,
              now,
            );
            drawWispHead(ctx, fixed[i], t, now, WISP_SIZE * BOMB * grow, 0.5);
            // its blink: a flash each time its phase comes round
            const p =
              ((phaseAt(i, t) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const blink = Math.exp(
              -((Math.min(p, Math.PI * 2 - p) / 0.5) ** 2),
            );
            if (blink < 0.05) continue;
            const prev = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = blink;
            drawGlow(ctx, BLINK, b.at.x, b.at.y, 70 * grow);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = prev;
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, t - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
