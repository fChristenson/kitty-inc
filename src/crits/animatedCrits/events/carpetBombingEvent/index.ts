// the "Carpet Bombing" event (explosion; cash): it covers its crit, whose
// click freezes the screen while a bomber wisp roars in across the top of
// the screen, dropping a long stick of fizzing bomb wisps behind it; they
// tumble down one after another and go off in a rolling line of blasts
// across the screen, each a bang, a big jolt and cash blown everywhere; the
// last and biggest goes off in a huge blast and shake and the cash sweeps
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";

const KEY = "carpetBombing";
const REWARD = 4;
const BOMBS = 8;
// the bomber flies HIGH px under the screen's top; bombs land LOW of the way
// down, carried FORWARD px on by its speed
const HIGH = 60;
const LOW: [number, number] = [0.55, 0.85];
const FORWARD = 90;
const BOMBER = 0.9;
const BOMB = 0.4;
const FUSE = 22;
const BLAST = 150;
const BLAST_COINS = 26;
const BLAST_RING: [number, number] = [60, 220];
const BOOM_SHAKE: [number, number] = [1, 1.8];

export const forceCarpetBombingEvent = registerWispEvent(
  KEY,
  "Carpet Bombing",
  () => CONFIG.carpetBombingEvent.chance,
  (floor, context, area) => {
    const { flyMs, fallMs, holdMs, mergeMs } = CONFIG.carpetBombingEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const fromLeft = Math.random() < 0.5;
    const enter = fromLeft ? area.left - 80 : area.right + 80;
    const exit = fromLeft ? area.right + 80 : area.left - 80;
    const y = area.top + HIGH;
    const bomberX = (ms: number) => lerp([enter, exit], clamp01(ms / flyMs));
    const dir = fromLeft ? 1 : -1;
    const bombs = Array.from({ length: BOMBS }, (_, k) => {
      // dropped evenly across the screen
      const share = (k + 0.5) / BOMBS;
      const dropX =
        area.left + width * (fromLeft ? share : 1 - share) - dir * FORWARD;
      const drops = flyMs * ((dropX - enter) / (exit - enter));
      const from: Point = { x: dropX, y };
      const to: Point = {
        x: dropX + dir * FORWARD,
        y: area.top + height * lerp(LOW, Math.random()),
      };
      const at: Point = { x: 0, y: 0 };
      const booms = drops + fallMs;
      return {
        to,
        drops,
        booms,
        at: (ms: number): Point | null => {
          if (ms < drops || ms >= booms) return null;
          const u = (ms - drops) / fallMs;
          at.x = lerp([from.x, to.x], u);
          at.y = lerp([from.y, to.y], easeIn(u));
          return at;
        },
      };
    });
    const endAt = Math.max(flyMs, bombs[BOMBS - 1].booms);
    const planeAt: Point = { x: 0, y };
    const plane = (ms: number): Point | null => {
      if (ms < 0 || ms > flyMs) return null;
      planeAt.x = bomberX(ms);
      return planeAt;
    };

    const booming = createBeats(
      bombs,
      (b) => b.booms,
      (b, k) => {
        if (k === BOMBS - 1) {
          cover!.blast(b.to);
          return;
        }
        cover!.launchFrom(b.to, ringTargets(b.to, BLAST_COINS, BLAST_RING));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / (BOMBS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => booming.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          drawWispBetween(
            ctx,
            plane,
            ms,
            now,
            WISP_SIZE * BOMBER,
            0.8,
            0,
            flyMs,
          );
          for (const b of bombs) {
            const p = b.at(ms);
            if (p) drawLitFuse(ctx, p, (ms - b.drops) / fallMs, FUSE, now);
            drawWispBetween(
              ctx,
              b.at,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              b.drops,
              b.booms,
            );
            drawDetonation(ctx, b.to, ms - b.booms, BLAST, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
