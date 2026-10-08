// the "Mortar" event (explosion; cash): it covers its crit, whose click
// freezes the screen while a mortar wisp settles over the clicked floor's
// button and thumps shell after shell straight up out of the top of the
// screen, ever faster; a beat later they come whistling back down, fuses
// fizzing, in a walking barrage that marches up the screen from the bottom,
// every shell a white blast, a bang, a jolt and cash blown everywhere; the
// last and biggest lands at the top in a huge blast and shake. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../../../shared/explosion";
import { ringTargets } from "../../../../shared/coinTargets";

const KEY = "mortar";
const REWARD = 4;
const SHELLS = 7;
// shells come down over the band ROWS of the screen, bottom to top
const ROWS: [number, number] = [0.85, 0.12];
const SKY = 80;
const MORTAR = 0.6;
const SHELL = 0.38;
const FUSE = 20;
const BLAST = 170;
const COINS = 14;
const SPRAY: [number, number] = [40, 150];
const BOOM_SHAKE: [number, number] = [0.8, 1.6];

export const forceMortarEvent = registerWispEvent(
  KEY,
  "Mortar",
  () => CONFIG.mortarEvent.chance,
  (floor, context, area) => {
    const { gapsMs, upMs, hangMs, downMs, holdMs, mergeMs } =
      CONFIG.mortarEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const mortar: Point = { x: button.x, y: button.y - 30 };
    let clock = 200;
    const shells = Array.from({ length: SHELLS }, (_, k) => {
      const fired = clock;
      clock += lerp(gapsMs, k / (SHELLS - 1));
      const lands: Point = {
        x: area.left + width * (0.15 + 0.7 * Math.random()),
        y: area.top + height * lerp(ROWS, k / (SHELLS - 1)),
      };
      const falls = fired + upMs + hangMs;
      const hits = falls + downMs;
      const at: Point = { x: 0, y: 0 };
      return {
        fired,
        falls,
        hits,
        lands,
        at: (ms: number): Point | null => {
          if (ms < fired || ms >= hits) return null;
          if (ms < fired + upMs) {
            at.x = mortar.x;
            at.y = lerp(
              [mortar.y, area.top - SKY],
              easeOut((ms - fired) / upMs),
            );
            return at;
          }
          if (ms < falls) return null;
          at.x = lands.x;
          at.y = lerp([area.top - SKY, lands.y], easeIn((ms - falls) / downMs));
          return at;
        },
      };
    });
    const last = shells[SHELLS - 1];
    const endAt = last.hits;
    const mortarAt: Point = { x: 0, y: 0 };
    const mortarWisp = (ms: number): Point | null => {
      if (ms > last.fired + 400) return null;
      let thump = 0;
      for (const s of shells) {
        const t = (ms - s.fired) / 150;
        if (t > 0 && t < 1) thump = Math.max(thump, 1 - t);
      }
      const u = easeOut(Math.min(1, ms / 200));
      mortarAt.x = mortar.x;
      mortarAt.y = lerp([button.y, mortar.y], u) + thump * 8;
      return mortarAt;
    };

    const thumping = createBeats(
      shells,
      (s) => s.fired,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      shells,
      (s) => s.hits,
      (s, k) => {
        if (s === last) {
          cover!.blast(s.lands);
          return;
        }
        cover!.launchFrom(s.lands, ringTargets(s.lands, COINS, SPRAY));
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(BOOM_SHAKE, k / (SHELLS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          thumping.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + DETONATION_MS) return;
          for (const s of shells) {
            if (ms >= s.falls && ms < s.hits) {
              const p = s.at(ms);
              if (p)
                drawLitFuse(
                  ctx,
                  p,
                  clamp01((ms - s.falls) / downMs),
                  FUSE,
                  now,
                );
            }
            drawWispBetween(
              ctx,
              s.at,
              ms,
              now,
              WISP_SIZE * SHELL,
              0.6,
              s.fired,
              s.hits,
            );
            drawDetonation(ctx, s.lands, ms - s.hits, BLAST, now);
          }
          drawWispBetween(
            ctx,
            mortarWisp,
            ms,
            now,
            WISP_SIZE * MORTAR,
            0.7,
            0,
            last.fired + 400,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
