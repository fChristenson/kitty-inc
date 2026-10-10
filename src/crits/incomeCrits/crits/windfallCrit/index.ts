// the windfall income crit: its number rocketing up into the total, a cluster
// of blasts rattling across the readout, capped by a huge one
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  registerFloorCrit,
  FLOOR_CRIT_FONT,
  lerp,
  drawText,
} from "../../../floorCrits/critPlayer";
import { holeHash } from "../../../floorCrits/critPlayer/shared";

const RISE_MS = 200;
const IMPACT_BLAST = 300;
const BLASTS = 12;
const EVERY_MS = 45;
const BLAST = 190;
const SPREAD_X = 380;
const SPREAD_Y = 60;
const FINALE_GAP_MS = 110;
const FINALE_BLAST = 460;
// a hit's step: 0 a cluster blast, 1 the impact, 2 the finale
const SHAKES = [0.6, 1.4, 2.4];
const blastAt = (i: number) => RISE_MS + (i + 1) * EVERY_MS;
const FINALE_AT = blastAt(BLASTS - 1) + FINALE_GAP_MS;

registerFloorCrit("windfallCrit", {
  plan(_r, _bars, hit) {
    hit(0, RISE_MS, 1);
    for (let i = 0; i < BLASTS; i++) hit(0, blastAt(i));
    hit(0, FINALE_AT, 2);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const to = bars[0];
    if (ms < RISE_MS) {
      // rocketing up, faster and faster, stretched along its flight
      const p = (ms / RISE_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        to.x * p,
        to.y * p,
        lerp(r.flashFont, FLOOR_CRIT_FONT, p),
        { along: Math.atan2(to.y, to.x), stretch: 1 + 0.6 * p },
      );
    }
    drawDetonation(ctx, to, ms - RISE_MS, IMPACT_BLAST, now);
    for (let i = 0; i < BLASTS; i++) {
      const at = blastAt(i);
      if (ms < at || ms > at + DETONATION_MS) continue;
      const spot = {
        x: to.x + (holeHash(i, 41) * 2 - 1) * SPREAD_X,
        y: to.y + (holeHash(i, 42) * 2 - 1) * SPREAD_Y,
      };
      drawDetonation(ctx, spot, ms - at, BLAST, now);
    }
    drawDetonation(ctx, to, ms - FINALE_AT, FINALE_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step],
});
