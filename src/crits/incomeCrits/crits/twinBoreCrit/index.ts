// Twin Bore, an income crit: the number splits into two drills that fly out
// to the ends of the total and bite into it from both sides at once,
// stalling and grinding, juddering, sparks gushing out of both bites; then
// they bore in towards each other in shoves together, each a jolt and a
// blast at both tips, faster and faster, until they punch through and smash
// together in the middle of the total in the huge blast
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawDrillHead,
  drawDrillSpray,
} from "../../../../shared/animationStyles/drill";
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
import { drawFinale, drawNumberShrink } from "../shared";

const OUT_MS = 180;
const STALL_MS = 340;
const SHOVES = 8;
// each shove quicker than the last
const SHOVE_MS: [number, number] = [180, 90];
// the share of a shove spent lunging; its blasts land as the lunge ends
const LUNGE = 0.4;
const BORE_MS = OUT_MS + STALL_MS;
// they bite BITE px out from the total's middle and meet MEET px apart
const BITE = 470;
const MEET = 40;
const SIZE = 100;
const SPRAY = 80;
const SPRAY_FADE_MS = 300;
const JUDDER_STALL = 16;
const JUDDER_BORE = 7;
const JUDDER_MS = 16;
const TURN_GRIND = 0.06;
const TURN = 0.03;
const TIP = WISP_SIZE * 0.8;
const SHOVE_BLAST = 130;
// rumbles while they stall
const RUMBLES = 6;
const RUMBLE_MS = 55;
const RUMBLE_SHAKE = 1;
// shakes by step: a shove, through
const SHAKES = [0.9, 2.6];

// when shove k starts, and when they're through
const shoves: number[] = [];
let t = BORE_MS;
for (let k = 0; k < SHOVES; k++) {
  shoves.push(t);
  t += lerp(SHOVE_MS[0], SHOVE_MS[1], k / (SHOVES - 1));
}
const THROUGH_MS = t;
const shoveLength = (k: number) =>
  (k < SHOVES - 1 ? shoves[k + 1] : THROUGH_MS) - shoves[k];
const blastAt = (k: number) => shoves[k] + LUNGE * shoveLength(k);

const plays = new WeakSet<Running>();
const tip: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const tipAt = () => tip;

// how far in each drill has bored at ms, 0 (biting) to 1 (met)
function boredAt(ms: number): number {
  if (ms < BORE_MS) return 0;
  if (ms >= THROUGH_MS) return 1;
  let k = 0;
  while (k < SHOVES - 1 && ms >= shoves[k + 1]) k++;
  const u = clamp01((ms - shoves[k]) / (shoveLength(k) * LUNGE));
  return (k + smoothstep(u)) / SHOVES;
}

registerFloorCrit("twinBoreCrit", {
  plan(r, _bars, hit) {
    plays.add(r);
    for (let k = 0; k < SHOVES; k++) hit(0, blastAt(k));
    hit(0, THROUGH_MS, 1);
  },
  draw(ctx, r, ms, bars) {
    if (!plays.has(r)) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    drawNumberShrink(ctx, r, ms);
    while (r.kicked < RUMBLES && ms >= OUT_MS + r.kicked * RUMBLE_MS) {
      r.kicked++;
      r.shake(RUMBLE_SHAKE);
    }
    const bored = boredAt(ms);
    const reach = lerp(BITE, MEET, bored);
    const grinding = ms >= OUT_MS && ms < BORE_MS;
    const since = ms - OUT_MS;
    for (let side = -1; side <= 1; side += 2) {
      const angle = side < 0 ? 0 : Math.PI;
      if (ms < THROUGH_MS) {
        const judder =
          ms >= OUT_MS
            ? (holeHash(Math.floor(ms / JUDDER_MS), 102 + side) - 0.5) *
              (grinding ? JUDDER_STALL : JUDDER_BORE)
            : 0;
        const out = clamp01(ms / OUT_MS) ** 2;
        tip.x = lerp(0, to.x + side * reach, out);
        tip.y = lerp(0, to.y, out) + judder;
        if (since >= 0)
          drawDrillSpray(
            ctx,
            tip,
            angle,
            since,
            0.6 + since / (THROUGH_MS - OUT_MS),
            SPRAY,
            now,
          );
        drawDrillHead(
          ctx,
          tip,
          angle,
          SIZE,
          ms * (grinding ? TURN_GRIND : TURN),
          now,
        );
        drawWisp(ctx, tipAt, ms, now, TIP, 1);
      } else if (ms < THROUGH_MS + SPRAY_FADE_MS) {
        tip.x = to.x + side * MEET;
        tip.y = to.y;
        drawDrillSpray(
          ctx,
          tip,
          angle,
          since,
          1 - (ms - THROUGH_MS) / SPRAY_FADE_MS,
          SPRAY,
          now,
        );
      }
    }
    // a blast at both tips as each shove lands
    for (let n = 0; n < SHOVES * 2; n++) {
      const k = n >> 1;
      blast.x = to.x + (n & 1 ? 1 : -1) * lerp(BITE, MEET, (k + 1) / SHOVES);
      blast.y = to.y;
      drawDetonation(ctx, blast, ms - blastAt(k), SHOVE_BLAST, now);
    }
    drawFinale(ctx, to, ms - THROUGH_MS, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
