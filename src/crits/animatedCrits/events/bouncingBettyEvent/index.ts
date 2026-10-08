// the "Bouncing Betty" event (explosion; cash): it covers its crit, whose click
// freezes the screen while bomb wisps are buried along the bottom of the
// screen, fuses fizzing; one after another they spring up out of the ground
// like bouncing mines and go off in mid-air, each a white blast, a bang, a
// big jolt and a spray of coins, ever higher and quicker across the screen;
// the last leaps highest of all in the middle and blows in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawDetonation, drawLitFuse } from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "bouncingBetty";
const REWARD = 4;
const MINES = 6;
const EDGE = 50;
const LOW = 40;
// mines spring JUMP px up, the last one BIG times as high
const JUMP: [number, number] = [120, 260];
const BIG = 1.8;
const SPRING_MS = 220;
const MINE = 0.4;
const FUSE = 20;
const BLAST = 160;
const COINS = 12;
const COIN_REACH: [number, number] = [40, 140];
const BLAST_SHAKE: [number, number] = [0.6, 1.4];

export const forceBouncingBettyEvent = registerWispEvent(
  KEY,
  "Bouncing Betty",
  () => CONFIG.bouncingBettyEvent.chance,
  (floor, context, area) => {
    const { buryMs, minesMs, holdMs, mergeMs } = CONFIG.bouncingBettyEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const ground = area.bottom - LOW;
    const ltr = Math.random() < 0.5;
    let clock: number = buryMs;
    const mines = Array.from({ length: MINES }, (_, k) => {
      const lastOne = k === MINES - 1;
      const x = lastOne
        ? (area.left + area.right) / 2
        : lerp(
            [area.left + EDGE, area.right - EDGE],
            ltr ? k / (MINES - 2) : 1 - k / (MINES - 2),
          );
      const home: Point = { x, y: ground };
      const springs = clock;
      clock += lerp(minesMs, k / (MINES - 1));
      const height = lerp(JUMP, k / (MINES - 1)) * (lastOne ? BIG : 1);
      const blows = springs + SPRING_MS;
      const burst: Point = { x, y: ground - height };
      const at: Point = { x: 0, y: 0 };
      return {
        home,
        burst,
        springs,
        blows,
        lastOne,
        at: (ms: number): Point | null => {
          if (ms >= blows) return null;
          if (ms < buryMs) {
            const u = easeOut(
              clamp01((ms - (k * buryMs) / MINES / 2) / (buryMs / 2)),
            );
            at.x = lerp([button.x, x], u);
            at.y = lerp([button.y, ground], u);
            return at;
          }
          if (ms < springs) return home;
          at.x = x;
          at.y = lerp([ground, burst.y], easeOut((ms - springs) / SPRING_MS));
          return at;
        },
      };
    });
    const endAt = mines[MINES - 1].blows;

    const blowing = createBeats(
      mines,
      (m) => m.blows,
      (m, k) => {
        if (m.lastOne) {
          cover!.blast(m.burst);
          return;
        }
        cover!.launchFrom(m.burst, ringTargets(m.burst, COINS, COIN_REACH));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BLAST_SHAKE, k / (MINES - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => blowing.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + 1_200) return;
          for (const m of mines) {
            if (!m.lastOne)
              drawDetonation(ctx, m.burst, ms - m.blows, BLAST, now);
            const p = m.at(ms);
            if (p) drawLitFuse(ctx, p, clamp01(ms / m.blows), FUSE, now);
            drawWispBetween(
              ctx,
              m.at,
              ms,
              now,
              WISP_SIZE * MINE,
              0.6,
              0,
              m.blows,
            );
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
