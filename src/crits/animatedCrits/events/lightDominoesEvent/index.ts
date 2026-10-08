// the "Light Dominoes" event (beam; free hires): it covers its crit, whose
// click freezes the screen while pillars of light shoot up out of the
// clicked floor's button and every empty spot, each as tall as the gap to
// the next; the first topples over with gathering speed and slaps down flat
// onto the next spot with a bang and a jolt as a new worker forms there,
// knocking that pillar over in turn, domino after domino, the last falling
// flat in a huge blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBoostEventStream, playExplosion } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import type { Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "lightDominoes";
const MAX_HIRES = 6;
const FORM_MS = 300;
const RISE_MS = 220;
const RISE_STAGGER = 50;
const FADE_MS = 300;
const PILLAR = 12;
const FEET = 30;
const SLAP_SHAKE: [number, number] = [0.6, 1.3];

interface Domino {
  base: Point;
  length: number;
  // its upright and fallen headings
  upright: number;
  fallen: number;
  rises: number;
  falls: number;
  lands: number;
  hire: RewardHire;
  tip: Point;
}

export const forceLightDominoesEvent = registerWispEvent(
  KEY,
  "Light Dominoes",
  () => CONFIG.lightDominoesEvent.chance,
  (floor, context) => {
    const { fallsMs, holdMs, mergeMs } = CONFIG.lightDominoesEvent;
    const found = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (found.length === 0) return;
    // the nearest spot next, from the button on
    const button = getButtonCenter(context.isGroundFloor);
    const bases: Point[] = [{ x: button.x, y: button.y }];
    const hires: RewardHire[] = [];
    const left = [...found];
    while (left.length > 0) {
      const from = bases[bases.length - 1];
      let best = 0;
      for (let i = 1; i < left.length; i++)
        if (
          Math.hypot(left[i].x - from.x, left[i].y - from.y) <
          Math.hypot(left[best].x - from.x, left[best].y - from.y)
        )
          best = i;
      const [hire] = left.splice(best, 1);
      hires.push(hire);
      bases.push({ x: hire.x, y: hire.y + FEET });
    }
    let clock = RISE_MS + RISE_STAGGER * hires.length;
    const dominoes: Domino[] = hires.map((hire, k) => {
      const base = bases[k];
      const to = bases[k + 1];
      const fallen = Math.atan2(to.y - base.y, to.x - base.x);
      // tip over the side it falls toward
      const upright = -Math.PI / 2;
      const falls = clock;
      const lands = falls + lerp(fallsMs, k / Math.max(1, hires.length - 1));
      clock = lands;
      return {
        base,
        length: Math.hypot(to.x - base.x, to.y - base.y),
        upright,
        fallen:
          Math.abs(fallen - upright) > Math.PI
            ? fallen + Math.PI * 2 * Math.sign(upright - fallen)
            : fallen,
        rises: RISE_STAGGER * k,
        falls,
        lands,
        hire,
        tip: { x: 0, y: 0 },
      };
    });
    const last = dominoes[dominoes.length - 1];
    const endAt = last.lands + FADE_MS;

    const slapping = createBeats(
      dominoes,
      (d) => d.lands,
      (d, k) => {
        giveHire(d.hire);
        const at = { x: d.hire.x, y: d.hire.y };
        if (d === last) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(SLAP_SHAKE, k / Math.max(1, dominoes.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => slapping.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt) return;
          for (const d of dominoes) {
            if (ms < d.rises || ms > d.lands + FADE_MS) continue;
            const rise = easeOut(clamp01((ms - d.rises) / RISE_MS));
            const fall = easeIn(clamp01((ms - d.falls) / (d.lands - d.falls)));
            const angle = lerp([d.upright, d.fallen], fall);
            const reach = d.length * rise;
            d.tip.x = d.base.x + Math.cos(angle) * reach;
            d.tip.y = d.base.y + Math.sin(angle) * reach;
            const fade = 1 - clamp01((ms - d.lands) / FADE_MS);
            drawBeam(ctx, d.base, d.tip, PILLAR, 0.85 * fade);
            drawBeamFlare(ctx, d.tip, 10, 0.7 * fade, now);
          }
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
