// the drill bit income crit: the number spins into a drill that flies up
// under the total and bites in, stalling and grinding with sparks gushing out
// both sides, then bores up through it in eight shoves, each a jolt and a
// blast, punching out the top in the huge blast
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawDrillHead, drawDrillSpray } from "../../../../shared/drill";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import { smoothstep } from "../../../../shared/easing";
import {
  registerFloorCrit,
  lerp,
  clamp01,
  type Point,
  type Running,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";
import { drawFinale, drawNumberShrink, readoutSpot } from "../shared";

const UP_MS = 160;
const STALL_MS = 320;
const SHOVES = 8;
const SHOVE_MS = 150;
// the share of a shove spent lunging; its blast lands as the lunge ends
const LUNGE = 0.4;
const BORE_MS = UP_MS + STALL_MS;
const THROUGH_MS = BORE_MS + SHOVES * SHOVE_MS;
const SIZE = 110;
// where it bites, under the total, and where it's through, over it
const CONTACT = 60;
const OUT = 70;
const SPRAY_UP = 20;
const SPRAY = 90;
const SPRAY_FADE_MS = 300;
const JUDDER_STALL = 18;
const JUDDER_BORE = 8;
const JUDDER_MS = 16;
const TURN_GRIND = 0.06;
const TURN = 0.03;
const TIP = WISP_SIZE * 0.8;
const SHOVE_BLAST = 160;
// rumbles while it stalls
const RUMBLES = 6;
const RUMBLE_MS = 55;
const RUMBLE_SHAKE = 1;
// shakes by step: a shove, through
const SHAKES = [0.9, 2.4];

const shoveAt = (k: number) => BORE_MS + (k + LUNGE) * SHOVE_MS;
const spots = new WeakMap<Running, Point[]>();
const tip: Point = { x: 0, y: 0 };
const sparks: Point = { x: 0, y: 0 };
const tipAt = () => tip;

function tipY(to: Point, ms: number): number {
  const contact = to.y + CONTACT;
  if (ms < UP_MS) return lerp(0, contact, (ms / UP_MS) ** 2);
  if (ms < BORE_MS) return contact;
  const k = Math.min(SHOVES, (ms - BORE_MS) / SHOVE_MS);
  const whole = Math.floor(k);
  const lunge = Math.min(
    SHOVES,
    whole + smoothstep(clamp01((k - whole) / LUNGE)),
  );
  return lerp(contact, to.y - OUT, lunge / SHOVES);
}

registerFloorCrit("drillBitCrit", {
  plan(r, bars, hit) {
    const blasts: Point[] = [];
    for (let k = 0; k < SHOVES; k++) {
      blasts.push(readoutSpot(bars[0], k, 101));
      hit(0, shoveAt(k));
    }
    spots.set(r, blasts);
    hit(0, THROUGH_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    const blasts = spots.get(r);
    if (!blasts) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < RUMBLES && ms >= UP_MS + r.kicked * RUMBLE_MS) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    const since = ms - UP_MS;
    if (since >= 0 && ms < THROUGH_MS + SPRAY_FADE_MS) {
      const fade = ms > THROUGH_MS ? 1 - (ms - THROUGH_MS) / SPRAY_FADE_MS : 1;
      sparks.x = to.x;
      sparks.y = to.y + CONTACT - SPRAY_UP;
      drawDrillSpray(
        ctx,
        sparks,
        -Math.PI / 2,
        since,
        (0.6 + since / (THROUGH_MS - UP_MS)) * fade,
        SPRAY,
        now,
      );
    }
    if (ms < THROUGH_MS) {
      const grinding = ms >= UP_MS && ms < BORE_MS;
      const judder =
        ms >= UP_MS
          ? (holeHash(Math.floor(ms / JUDDER_MS), 102) - 0.5) *
            (grinding ? JUDDER_STALL : JUDDER_BORE)
          : 0;
      tip.x = lerp(0, to.x, clamp01(ms / UP_MS)) + judder;
      tip.y = tipY(to, ms);
      drawDrillHead(
        ctx,
        tip,
        -Math.PI / 2,
        SIZE,
        ms * (grinding ? TURN_GRIND : TURN),
        now,
      );
      drawWisp(ctx, tipAt, ms, now, TIP, 1);
    }
    for (let k = 0; k < SHOVES; k++)
      drawDetonation(ctx, blasts[k], ms - shoveAt(k), SHOVE_BLAST, now);
    drawFinale(ctx, to, ms - THROUGH_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
