// Merger, an income crit: the green amount bursts into a magic circle drawn
// flat under the total, and a row of small ones either side of it, each its
// own look; all of them turn, faster and faster, a jolt and a tick at every
// turn of the big one; then the small ones rip in one after another from the
// inside out, quicker each, and merge into it, every merge a pillar of light
// up through the readout, a blast and a share, the big circle swelling; it
// whips round and erupts in a huge pillar: the finale
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale, drawNumberShrink } from "../shared";

const IN_MS = 120;
// the circles DOWN px under the total: the big one RADIUS round, growing
// GROW a merge and throbbing THROB on each, the small ones SMALL round
// SPACING apart (squeezed onto the screen), drawn STAGGER_MS apart
const DOWN = 170;
const RADIUS = 150;
const GROW = 22;
const THROB = 0.25;
const THROB_MS = 150;
const SMALL = 75;
const PAIRS = 3;
const SPACING = 190;
const EDGE = 90;
const STAGGER_MS = 50;
// the merges: the first SPELL_MS in, GAPS_MS apart (closing), each sliding
// in over SLIDE_MS; the big one erupting ERUPT_MS after the last
const SPELL_MS = 620;
const GAPS_MS: [number, number] = [190, 80];
const SLIDE_MS = 110;
const ERUPT_MS = 300;
const TURNS = 9;
const PILLAR = 520;
const BIG_PILLAR = 900;
const BLAST = 170;
const REV_SHAKE = 0.35;
// shakes by step: a merge, the eruption
const SHAKES = [0.9, 2.8];

interface Small {
  x: number;
  summon: Summon;
  merge: number;
}
interface State {
  big: Summon;
  smalls: Small[];
  merges: number[];
}
const states = new WeakMap<Running, State>();
const centre: Point = { x: 0, y: 0 };
const at: Point = { x: 0, y: 0 };

registerFloorCrit("mergerCrit", {
  plan(r, bars, hit) {
    const to = bars[0];
    const reach = Math.max(
      SPACING,
      Math.min(SPACING * PAIRS, r.viewportWidth / 2 - EDGE - Math.abs(to.x)),
    );
    // inside out, alternating sides
    const xs: number[] = [];
    for (let k = 1; k <= PAIRS; k++)
      xs.push(-(reach * k) / PAIRS, (reach * k) / PAIRS);
    let merge = IN_MS + STAGGER_MS * xs.length + SPELL_MS;
    const smalls: Small[] = xs.map((x, k) => {
      const when = merge;
      merge += lerp(GAPS_MS[0], GAPS_MS[1], k / (xs.length - 1));
      return {
        x,
        summon: planSummon(
          IN_MS + STAGGER_MS * (k + 1),
          when,
          6,
          summonLook(k + 1),
        ),
        merge: when,
      };
    });
    const erupt = smalls[smalls.length - 1].merge + ERUPT_MS;
    for (const s of smalls) hit(0, s.merge);
    hit(0, erupt, 1);
    states.set(r, {
      big: planSummon(IN_MS, erupt, TURNS, summonLook(0)),
      smalls,
      merges: smalls.map((s) => s.merge),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { big, smalls, merges } = state;
    drawNumberShrink(ctx, r, ms);
    centre.x = to.x;
    centre.y = to.y + DOWN;
    // a jolt and a tick at every turn of the big one
    while (r.kicked < big.revs.length && ms >= big.revs[r.kicked]) {
      r.shake(REV_SHAKE);
      playSpinTick(1 + r.kicked / big.revs.length);
      r.kicked++;
    }
    let merged = 0;
    let since = Infinity;
    for (let k = 0; k < merges.length; k++)
      if (ms >= merges[k]) {
        merged++;
        since = ms - merges[k];
      }
    const throb = 1 + THROB * Math.max(0, 1 - since / THROB_MS);
    const radius = (RADIUS + GROW * merged) * throb;
    for (let k = 0; k < smalls.length; k++) {
      const s = smalls[k];
      const u = clamp01((ms - s.merge + SLIDE_MS) / SLIDE_MS) ** 2;
      at.x = centre.x + s.x * (1 - u);
      at.y = centre.y;
      drawSummon(ctx, s.summon, ms, at, SMALL * (1 + u));
      drawSummonPillar(ctx, s.summon, ms, centre, radius * 0.6, PILLAR);
      drawDetonation(ctx, to, ms - s.merge, BLAST, now);
    }
    drawSummon(ctx, big, ms, centre, radius);
    drawSummonPillar(ctx, big, ms, centre, radius, BIG_PILLAR);
    drawFinale(ctx, to, ms - big.eruptMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
