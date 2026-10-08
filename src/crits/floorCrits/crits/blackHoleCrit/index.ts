// the blackHole floor crit: a black hole swallowing every bar's coins and flinging them back
import { drawDetonation } from "../../../../shared/explosion";
import { drawGravityHole } from "../../../../shared/clutter";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  registerFloorCrit,
  HIT_SHAKE,
  clamp01,
  drawText,
  drawPays,
} from "../../critPlayer";
import { holeHash } from "../../critPlayer/shared";

// a black hole opening where the number is, swallowing it and the coins off
// every bar, then collapsing in a blast that flings them back
const HOLE_OPEN_MS = 250;
const HOLE_SIZE = 460;
const HOLE_SUCK_MS = 450;
// coins it swallows: one in BAR_SHARE off a bar, the rest from all over
// the screen; all of them flung back onto the bars
const HOLE_COINS = 800;
const HOLE_BAR_SHARE = 3;
// they leave over this long, one after another
const HOLE_SUCK_SPREAD_MS = 400;
// how far round its bar a coin starts, up or down
const HOLE_COIN_SCATTER = 60;
// the screen they come from, of the viewport's width from its middle
const HOLE_FIELD: [number, number] = [0.55, 0.9];
const HOLE_COLLAPSE_MS = 1150;
const HOLE_SHRINK_MS = 150;
const HOLE_RETURN_MS = 250;
const HOLE_RETURNED_MS = HOLE_COLLAPSE_MS + HOLE_RETURN_MS;
const HOLE_BLAST = 300;
const HOLE_SHAKE = 2.2;
const HOLE_COIN = 45;
const HOLE_PAYS = "x2";
const HOLE_FONT = 120;
const HOLE_TAIL_MS = 800;
// each coin's own randoms, -1..1 (where it starts and lands) and 0..1 (when
// it leaves, its size)
const holeU = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => holeHash(i, 1) * 2 - 1,
);
const holeV = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => holeHash(i, 2) * 2 - 1,
);
const holeStart = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => HOLE_OPEN_MS + holeHash(i, 3) * HOLE_SUCK_SPREAD_MS,
);
const holeSize = Float32Array.from(
  { length: HOLE_COINS },
  (_, i) => HOLE_COIN * (0.7 + 0.6 * holeHash(i, 4)),
);
const holeCoins: CoinBurstSprite[] = Array.from(
  { length: HOLE_COINS },
  (_, i) => ({
    kind: i % 4 === 0 ? "bill" : "coin",
    spinFrame: 0,
    axisAngle: (holeHash(i, 5) - 0.5) * Math.PI,
  }),
);

registerFloorCrit("blackHoleCrit", {
  plan(_r, bars, hit) {
    bars.forEach((_, bar) => hit(bar, HOLE_RETURNED_MS));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    // the number swallowed first, spiralling into the hole as it opens
    const gulp = clamp01(ms / HOLE_OPEN_MS);
    if (gulp < 1)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont * (1 - gulp), {
        rot: gulp * gulp * 6,
      });
    const size =
      ms < HOLE_COLLAPSE_MS - HOLE_SHRINK_MS
        ? HOLE_SIZE *
          (1 - (1 - gulp) ** 3) *
          (1 + 0.15 * clamp01((ms - HOLE_OPEN_MS) / 700))
        : HOLE_SIZE *
          1.15 *
          clamp01((HOLE_COLLAPSE_MS - ms) / HOLE_SHRINK_MS) ** 2;
    ctx.save();
    drawGravityHole(ctx, { x: 0, y: 0 }, size, 1, ms, now);
    ctx.restore();
    const base = ctx.getTransform();
    const w = r.viewportWidth;
    const n = bars.length;
    beginCoinBatch(ctx);
    // coins off every bar and from all over the screen spiralling into it
    for (let i = 0; i < HOLE_COINS; i++) {
      const p = (ms - holeStart[i]) / HOLE_SUCK_MS;
      if (p < 0 || p >= 1) continue;
      let x: number;
      let y: number;
      if (i % HOLE_BAR_SHARE === 0) {
        const b = bars[i % n];
        x = b.x + holeU[i] * (r.moment.barHalfWidth - 60);
        y = b.y + holeV[i] * HOLE_COIN_SCATTER;
      } else {
        x = holeU[i] * w * HOLE_FIELD[0];
        y = holeV[i] * w * HOLE_FIELD[1];
      }
      const a = Math.atan2(y, x) + p * p * 5;
      const reach = Math.hypot(x, y) * (1 - p) ** 1.5;
      const coin = holeCoins[i];
      coin.spinFrame = ms * 0.02 + i;
      drawCoinBurstFrame(
        ctx,
        coin,
        Math.cos(a) * reach,
        Math.sin(a) * reach,
        holeSize[i] * (1 - p * 0.7),
        base,
      );
    }
    // the collapse, flinging them all back out onto the bars
    const since = ms - HOLE_COLLAPSE_MS;
    if (since >= 0 && r.kicked === 0) {
      r.kicked = 1;
      r.shake(HOLE_SHAKE);
    }
    drawDetonation(ctx, { x: 0, y: 0 }, since, HOLE_BLAST, now);
    const back = since / HOLE_RETURN_MS;
    if (back >= 0 && back < 1)
      for (let i = 0; i < HOLE_COINS; i++) {
        const b = bars[i % n];
        const k = back * back;
        const coin = holeCoins[i];
        coin.spinFrame = ms * 0.02 + i;
        drawCoinBurstFrame(
          ctx,
          coin,
          (b.x + holeV[i] * (r.moment.barHalfWidth - 60)) * k,
          (b.y + holeU[i] * HOLE_COIN_SCATTER) * k,
          holeSize[i] * 1.2,
          base,
        );
      }
    endCoinBatch(ctx);
    bars.forEach((b) =>
      drawPays(
        ctx,
        r,
        HOLE_PAYS,
        b,
        ms - HOLE_RETURNED_MS,
        HOLE_FONT,
        HOLE_TAIL_MS,
      ),
    );
  },
  tailMs: HOLE_TAIL_MS,
  shake: () => HIT_SHAKE,
});
