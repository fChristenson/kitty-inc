// the "Critical Mass" event (explosion; cash): it covers its crit, whose
// click freezes the screen while lit bomb wisps pop up all over the screen
// and slide together into a tight ball, fuses fizzing ever faster; the ball
// shudders, then cooks off from the outside in, the bombs round it going off
// one after another in a rolling chain of blasts, each with its own bang and
// shake and spray of cash, until the core goes up in a big blast and a
// cluster round it; ball after ball, quicker each time, the last core going
// off in one colossal blast with the hardest shake of all. Pays floor income
// × floor number × REWARD
import { CONFIG } from "../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSlamExplosion,
} from "../../sound";
import { shakeScreen } from "../../screenShake";
import { drawWispHead, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp, smoothstep } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";

const KEY = "criticalMass";
const REWARD = 4;
const SHELL = 7;
const PACK = 46;
const BOMB = 0.38;
const FUSE = 34;
const POP_MS = 160;
const SHUDDER_MS = 140;
const CHAIN_MS = 35;
const SHUDDER = 4;
const BLAST = 170;
const CORE = 360;
const CLUSTER = 200;
const CLUSTER_OFF = 80;
const COLOSSAL = 720;
const SPRAY = 14;
const CORE_SPRAY = 40;
const BANG_GAP_MS = 50;
const CHAIN_SHAKE: [number, number] = [0.4, 0.8];
const CORE_SHAKE: [number, number] = [1.2, 1.7];
const FINAL_SHAKE = 2.6;
// the balls' spots, as shares of the screen across and down
const SPOTS: Point[] = [
  { x: 0.3, y: 0.3 },
  { x: 0.7, y: 0.48 },
  { x: 0.35, y: 0.66 },
];

interface Bomb {
  from: Point;
  slot: Point;
  appears: number;
  packs: number;
  blows: number;
}

interface Blast {
  at: Point;
  ms: number;
  size: number;
  shake: number;
  coins: number;
}

export const forceCriticalMassEvent = registerWispEvent(
  KEY,
  "Critical Mass",
  () => CONFIG.criticalMassEvent.chance,
  (floor, context, area) => {
    const { gatherMs, ballsMs, holdMs, mergeMs } = CONFIG.criticalMassEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const bombs: Bomb[] = [];
    const blasts: Blast[] = [];
    let packs: number = gatherMs;
    SPOTS.forEach((share, k) => {
      const t = k / (SPOTS.length - 1);
      const centre: Point = {
        x: area.left + width * share.x,
        y: area.top + height * share.y,
      };
      const appears = k === 0 ? 0 : packs - gatherMs * 0.7;
      const shudders = packs;
      const cooks = shudders + SHUDDER_MS;
      // the shell first, one after another round the ball, then the core
      for (let i = 0; i <= SHELL; i++) {
        const a = (i / SHELL) * Math.PI * 2;
        const slot: Point =
          i === SHELL
            ? centre
            : {
                x: centre.x + Math.cos(a) * PACK,
                y: centre.y + Math.sin(a) * PACK,
              };
        const blows =
          i === SHELL ? cooks + SHELL * CHAIN_MS : cooks + i * CHAIN_MS;
        bombs.push({
          from: {
            x: area.left + 60 + Math.random() * (width - 120),
            y: area.top + 60 + Math.random() * (height - 120),
          },
          slot,
          appears: appears + Math.random() * POP_MS,
          packs,
          blows,
        });
        if (i < SHELL)
          blasts.push({
            at: slot,
            ms: blows,
            size: BLAST,
            shake: lerp(CHAIN_SHAKE, t),
            coins: SPRAY,
          });
      }
      const coreAt = cooks + SHELL * CHAIN_MS;
      const final = k === SPOTS.length - 1;
      blasts.push({
        at: centre,
        ms: coreAt,
        size: final ? COLOSSAL : CORE,
        shake: final ? FINAL_SHAKE : lerp(CORE_SHAKE, t),
        coins: final ? 0 : CORE_SPRAY,
      });
      for (let c = 0; c < 4; c++) {
        const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
        blasts.push({
          at: {
            x: centre.x + Math.cos(a) * CLUSTER_OFF,
            y: centre.y + Math.sin(a) * CLUSTER_OFF,
          },
          ms: coreAt + 40 + c * 30,
          size: CLUSTER,
          shake: lerp(CHAIN_SHAKE, t),
          coins: SPRAY,
        });
      }
      packs = coreAt + lerp(ballsMs, t);
    });
    const finalBlast = blasts.reduce((a, b) => (b.size === COLOSSAL ? b : a));
    const endAt = Math.max(...blasts.map((b) => b.ms)) + DETONATION_MS;
    const spot: Point = { x: 0, y: 0 };
    const atOf =
      (b: Bomb) =>
      (ms: number): Point | null => {
        if (ms < b.appears || ms >= b.blows) return null;
        if (ms < b.packs) {
          const u = smoothstep(
            clamp01((ms - b.appears - POP_MS) / (b.packs - b.appears - POP_MS)),
          );
          spot.x = lerp([b.from.x, b.slot.x], u);
          spot.y = lerp([b.from.y, b.slot.y], u);
          return spot;
        }
        const shake = SHUDDER * Math.min(1, (ms - b.packs) / SHUDDER_MS);
        spot.x = b.slot.x + Math.sin(ms * 0.9 + b.slot.y) * shake;
        spot.y = b.slot.y + Math.cos(ms * 1.1 + b.slot.x) * shake;
        return spot;
      };
    const ats = bombs.map(atOf);

    let bang = -Infinity;
    const blasting = createBeats(
      blasts,
      (b) => b.ms,
      (b) => {
        if (b === finalBlast) {
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
        tick: (ms, now) => blasting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          for (let i = 0; i < bombs.length; i++) {
            const b = bombs[i];
            const at = ats[i](ms);
            if (!at) continue;
            const grow = easeOut(clamp01((ms - b.appears) / POP_MS));
            drawLitFuse(ctx, at, clamp01(ms / b.blows), FUSE * grow, now);
            drawWispHead(ctx, ats[i], ms, now, WISP_SIZE * BOMB * grow, 0.6);
          }
          for (const b of blasts)
            drawDetonation(ctx, b.at, ms - b.ms, b.size, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
