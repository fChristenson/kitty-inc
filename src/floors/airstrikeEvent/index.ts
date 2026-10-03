// the "Airstrike" event (explosion; free hires): it covers its crit, whose
// click freezes the screen while the clicked floor's button tosses flare
// wisps onto the empty spots of the floors in view, each landing fizzing
// and blinking to mark its target; then a jet wisp screams in across the
// top of the screen and drops a bomb on each flare as it passes over, each
// whistling down and going off in a white blast, a bang and a jolt as a
// new worker forms in the smoke; the last goes off in a huge blast and
// shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import {
  drawDetonation,
  drawLitFuse,
  DETONATION_MS,
} from "../../shared/explosion";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "airstrike";
const MAX_HIRES = 6;
const FORM_MS = 300;
// the jet flies HIGH px under the top, OVER px past the screen's sides
const HIGH = 60;
const OVER = 80;
const TOSS_MS = 280;
const LOFT = 80;
const FLARE = 0.25;
const FLARE_FUSE = 16;
const JET = 0.7;
const BOMB = 0.3;
const BLAST = 160;
const HIT_SHAKE: [number, number] = [0.7, 1.4];

export const forceAirstrikeEvent = registerWispEvent(
  KEY,
  "Airstrike",
  () => CONFIG.airstrikeEvent.chance,
  (floor, context, area) => {
    const { markMs, flyMs, fallMs, holdMs, mergeMs } = CONFIG.airstrikeEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const jetY = area.top + HIGH;
    const leftX = area.left - OVER;
    const rightX = area.right + OVER;
    const flyAt = markMs + TOSS_MS;
    const jetX = (ms: number) =>
      lerp([leftX, rightX], clamp01((ms - flyAt) / flyMs));
    const passesAt = (x: number) =>
      flyAt + flyMs * ((x - leftX) / (rightX - leftX));
    const strikes = hires
      .map((hire, k) => {
        const spot: Point = { x: hire.x, y: hire.y - 20 };
        const tossed = (markMs * k) / hires.length;
        const drops = passesAt(spot.x);
        const at: Point = { x: spot.x, y: 0 };
        const flare: Point = { x: 0, y: 0 };
        return {
          hire,
          spot,
          tossed,
          drops,
          hits: drops + fallMs,
          bomb: (ms: number): Point | null => {
            if (ms < drops || ms >= drops + fallMs) return null;
            at.y = lerp([jetY, spot.y], easeIn((ms - drops) / fallMs));
            return at;
          },
          flare: (ms: number): Point | null => {
            if (ms < tossed || ms >= drops + fallMs) return null;
            const u = easeOut(clamp01((ms - tossed) / TOSS_MS));
            flare.x = lerp([button.x, spot.x], u);
            flare.y =
              lerp([button.y, spot.y], u) - Math.sin(Math.PI * u) * LOFT;
            return flare;
          },
        };
      })
      .sort((a, b) => a.hits - b.hits);
    const last = strikes[strikes.length - 1];
    const endAt = Math.max(last.hits, flyAt + flyMs);
    const jetAt: Point = { x: 0, y: jetY };
    const jet = (ms: number): Point | null => {
      if (ms < flyAt || ms > flyAt + flyMs) return null;
      jetAt.x = jetX(ms);
      return jetAt;
    };

    const flying = createBeats(
      [flyAt],
      (ms) => ms,
      () => {
        if (cover?.isLive()) playSwoosh();
      },
    );
    const hitting = createBeats(
      strikes,
      (s) => s.hits,
      (s, k) => {
        giveHire(s.hire);
        if (s === last) {
          cover!.blast(s.spot);
          return;
        }
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, strikes.length - 1)));
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
          flying.tick(ms, now);
          hitting.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + DETONATION_MS) return;
          for (const s of strikes) {
            if (ms >= s.tossed + TOSS_MS && ms < s.hits)
              drawLitFuse(
                ctx,
                s.spot,
                clamp01((ms - s.tossed) / (s.hits - s.tossed)),
                FLARE_FUSE,
                now,
              );
            drawWispBetween(
              ctx,
              s.flare,
              ms,
              now,
              WISP_SIZE * FLARE,
              0.5,
              s.tossed,
              s.hits,
            );
            drawWispBetween(
              ctx,
              s.bomb,
              ms,
              now,
              WISP_SIZE * BOMB,
              0.6,
              s.drops,
              s.hits,
            );
            drawDetonation(ctx, s.spot, ms - s.hits, BLAST, now);
          }
          drawWispBetween(
            ctx,
            jet,
            ms,
            now,
            WISP_SIZE * JET,
            1,
            flyAt,
            flyAt + flyMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
