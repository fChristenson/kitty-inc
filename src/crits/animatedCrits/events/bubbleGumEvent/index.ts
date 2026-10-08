// the "Bubble Gum" event (experiment: blowing bubble gum; cash): it covers
// its crit, whose click freezes the screen while a chewer wisp pops out of
// the clicked floor's button and starts blowing a bubble, a ring of light
// swelling and wobbling bigger and bigger until "POP!", a bang, a jolt and
// a ring of coins bursting out of it; each bubble blown bigger than the
// last, until a giant one fills the screen and pops in a huge blast and
// shake. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeOut, lerp } from "../../../../shared/easing";
import { drawBeam } from "../../../../shared/beam";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import {
  createCritTextSprite,
  drawCritTextSprite,
} from "../../../critFlash/critText";
import { COLOR } from "../../../../palette";

const KEY = "bubbleGum";
const REWARD = 4;
const BUBBLES = 3;
const SIZES = [110, 190, 300];
const SIDES = 24;
const WIDTH = 9;
const SETUP_MS = 220;
const CALL_MS = 340;
const STYLE = { fontSize: 56, strokeWidth: 9 };
const CHEWER = 0.5;
const COINS = 30;
const POP_SHAKE: [number, number] = [0.8, 1.3];

export const forceBubbleGumEvent = registerWispEvent(
  KEY,
  "Bubble Gum",
  () => CONFIG.bubbleGumEvent.chance,
  (floor, context, area) => {
    const { blowMs, holdMs, mergeMs } = CONFIG.bubbleGumEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const mouth: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 + 160,
    };
    const pop = createCritTextSprite("POP!", COLOR.heavenlyGold, STYLE);
    let clock: number = SETUP_MS;
    const bubbles = SIZES.slice(0, BUBBLES).map((size, k) => {
      const blows = clock;
      const pops = blows + lerp(blowMs, k / (BUBBLES - 1));
      clock = pops + 80;
      // it swells upward out of the mouth, so its middle rises as it grows
      const hub: Point = { x: mouth.x, y: mouth.y - size };
      return {
        size,
        blows,
        pops,
        hub,
        final: k === BUBBLES - 1,
        ring: Array.from(
          { length: SIDES + 1 },
          () => ({ x: 0, y: 0 }) as Point,
        ),
      };
    });
    const last = bubbles[BUBBLES - 1];
    const endAt = last.pops;
    const chewerAt: Point = { x: 0, y: 0 };
    const chewer = (ms: number): Point => {
      const u = easeOut(clamp01(ms / SETUP_MS));
      chewerAt.x = lerp([button.x, mouth.x], u);
      chewerAt.y = lerp([button.y, mouth.y], u) + Math.sin(ms / 70) * 3;
      return chewerAt;
    };

    const popping = createBeats(
      bubbles,
      (b) => b.pops,
      (b, k) => {
        cover!.launchFrom(
          b.hub,
          ringTargets(b.hub, COINS * (k + 1), [b.size * 0.5, b.size * 1.3]),
        );
        if (b.final) {
          cover!.blast(b.hub);
          return;
        }
        cover!.burst(b.hub, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(POP_SHAKE, k / (BUBBLES - 2)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => popping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + CALL_MS) return;
          for (const b of bubbles) {
            if (ms >= b.blows && ms < b.pops) {
              const g = easeOut((ms - b.blows) / (b.pops - b.blows));
              const r = b.size * g;
              const cy = mouth.y - r;
              const strain = 1 - g;
              for (let i = 0; i <= SIDES; i++) {
                const a = (i / SIDES) * Math.PI * 2;
                const wob =
                  1 + Math.sin(a * 3 + ms / 60) * 0.06 * (0.3 + strain);
                b.ring[i].x = mouth.x + Math.cos(a) * r * wob;
                b.ring[i].y = cy + Math.sin(a) * r * wob;
              }
              for (let i = 1; i <= SIDES; i++)
                drawBeam(ctx, b.ring[i - 1], b.ring[i], WIDTH, 0.5 + 0.4 * g);
            }
            const c = (ms - b.pops) / CALL_MS;
            if (c < 0 || c >= 1) continue;
            ctx.globalAlpha = 1 - c * c;
            drawCritTextSprite(
              ctx,
              pop,
              b.hub.x,
              b.hub.y,
              (b.final ? 1.6 : 1) * (1 + 0.5 * (1 - clamp01(c * 3))),
            );
            ctx.globalAlpha = 1;
          }
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              chewer,
              ms,
              now,
              WISP_SIZE * CHEWER,
              0.6,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
