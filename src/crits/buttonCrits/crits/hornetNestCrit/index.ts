// Hornet Nest, a button crit: the number bursts into specks of glitter strewn
// round every button; beside each button a nest starts to buzz and the
// specks swarm in to it, a few then a flood, whirling round it faster and
// faster as it swells and trembles; it bursts and the whole swarm stings
// into the button's end in a blast, the button turning over: each of its
// next taps also hires a worker on the most upgraded floor; button after
// button, quicker each, its own last and biggest
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import { isFloorMaxed, type Floor } from "../../../../gameState";
import { trembleAt } from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";
import { stampGlimmer } from "../../../../shared/twinkle";
import { drawWispHead, WISP_SIZE } from "../../../../shared/wisp";
import { COLOR } from "../../../../palette";
import { BTN_W } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 120;
// the nest NEST px off a button's left end; its specks strewn out to SCATTER
// px round it (FLING_MS out), SPECKS of them (its own OWN_SPECKS)
const NEST = 180;
const SCATTER = 420;
const FLING_MS = 160;
const SPECKS = 40;
const OWN_SPECKS = 70;
const SPECK = 17;
// gathering over GATHER_MS (quicker each, its own OWN_GATHER_MS), each speck
// flying in over FLY_MS, whirling round it RING px out (swelling to SWELL
// times) at a spin rising through SPIN_HZ; the next nest STAGGER_MS on
const GATHER_MS: [number, number] = [520, 380];
const OWN_GATHER_MS = 620;
const FLY_MS = 130;
const RING = 34;
const SWELL = 2.2;
const SPIN_HZ: [number, number] = [1, 5];
const STAGGER_MS: [number, number] = [110, 60];
const TREMBLE = 12;
// the sting: STING_MS into the button's end, specks STING_STAGGER_MS apart
const STING_MS = 100;
const STING_STAGGER_MS = 1.5;
const LEAD = WISP_SIZE;
const BLAST = 170;
const OWN_BLAST = 380;
// shakes by step: -, a button, its own
const SHAKES = [0.4, 1.1, 3];

interface Nest {
  bar: number;
  own: boolean;
  start: number;
  burst: number;
  stung: number;
  // live: the nest and the button's end
  at: Point;
  end: Point;
}
interface State {
  nests: Nest[];
  // each speck's nest, its place in it, where it's strewn (from its nest),
  // when it arrives
  nestOf: Uint8Array;
  rank: Uint16Array;
  spots: Point[];
  arrives: Float32Array;
}
const states = new WeakMap<Running, State>();
const speck: Point = { x: 0, y: 0 };
const shiver: Point = { x: 0, y: 0 };
const blast: Point = { x: 0, y: 0 };
const head: Point = { x: 0, y: 0 };
const atHead = () => head;

// each tap also hiring on the open floor with the most upgrades
const stingTaps = defineTapPerk("Sting", (t) => {
  let lead: Floor | null = null;
  for (const floor of t.floors)
    if (
      floor.unlocked &&
      !isFloorMaxed(floor) &&
      (!lead || floor.upgradeCount > lead.upgradeCount)
    )
      lead = floor;
  if (lead) t.hire(lead);
});

registerFloorCrit("hornetNestCrit", {
  reward(t) {
    stingTaps.add(t.floor, t.own ? meta.values.taps * 2 : meta.values.taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const nests: Nest[] = [];
    const nestOf: number[] = [];
    const rank: number[] = [];
    const spots: Point[] = [];
    const arrives: number[] = [];
    let t = IN_MS + FLING_MS;
    order.forEach((bar, k) => {
      const own = bar === 0;
      const u = k / Math.max(1, order.length - 2);
      const gather = own ? OWN_GATHER_MS : lerp(GATHER_MS[0], GATHER_MS[1], u);
      const count = own ? OWN_SPECKS : SPECKS;
      for (let i = 0; i < count; i++) {
        const n = spots.length;
        const a = holeHash(n, 3310) * Math.PI * 2;
        const d = SCATTER * (0.3 + 0.7 * Math.sqrt(holeHash(n, 3311)));
        spots.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.6 });
        nestOf.push(k);
        rank.push(i);
        // a trickle, then a flood
        arrives.push(
          t + FLY_MS + (gather - FLY_MS) * Math.sqrt((i + 1) / count),
        );
      }
      const burst = t + gather;
      const stung = burst + (count - 1) * STING_STAGGER_MS + STING_MS;
      nests.push({
        bar,
        own,
        start: t,
        burst,
        stung,
        at: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
      });
      hit(bar, stung, own ? 2 : 1);
      t += lerp(STAGGER_MS[0], STAGGER_MS[1], u);
    });
    states.set(r, {
      nests,
      nestOf: Uint8Array.from(nestOf),
      rank: Uint16Array.from(rank),
      spots,
      arrives: Float32Array.from(arrives),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { nests, nestOf, rank, spots, arrives } = state;
    if (ms < IN_MS) {
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + 0.4 * (ms / IN_MS)),
        {
          alpha: 1 - ms / IN_MS,
        },
      );
      return;
    }
    for (let k = 0; k < nests.length; k++) {
      const n = nests[k];
      const button = bars[n.bar];
      n.end.x = button.x - BTN_W / 2;
      n.end.y = button.y;
      n.at.x = n.end.x - NEST;
      n.at.y = button.y;
    }
    const flung = clamp01((ms - IN_MS) / FLING_MS);
    const out = 1 - (1 - flung) ** 2;
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    beginLightBatch(ctx);
    for (let i = 0; i < spots.length; i++) {
      const n = nests[nestOf[i]];
      const since = ms - n.burst;
      const g = clamp01((ms - n.start) / (n.burst - n.start));
      // whirling round the nest, swelling and trembling as it fills
      trembleAt(g, ms + i, TREMBLE, shiver);
      const ring =
        RING * (1 + (SWELL - 1) * g) * (0.5 + (0.5 * ((i * 7) % 11)) / 10);
      const secs = Math.max(0, ms - n.start) / 1000;
      const a =
        holeHash(i, 3312) * Math.PI * 2 +
        Math.PI *
          2 *
          (SPIN_HZ[0] * secs + ((SPIN_HZ[1] - SPIN_HZ[0]) * secs * g) / 2);
      const rx = n.at.x + Math.cos(a) * ring + shiver.x;
      const ry = n.at.y + Math.sin(a) * ring * 0.7 + shiver.y;
      if (since >= 0) {
        // stinging into the button's end
        const u = clamp01((since - rank[i] * STING_STAGGER_MS) / STING_MS) ** 2;
        if (u >= 1) continue;
        speck.x = lerp(rx, n.end.x, u);
        speck.y = lerp(ry, n.end.y, u);
      } else if (ms >= arrives[i]) {
        speck.x = rx;
        speck.y = ry;
      } else {
        const u = clamp01((ms - (arrives[i] - FLY_MS)) / FLY_MS) ** 3;
        const lx = n.at.x + spots[i].x * out;
        const ly = n.at.y + spots[i].y * out + Math.sin(ms * 0.02 + i) * 6;
        speck.x = lerp(lx, rx, u);
        speck.y = lerp(ly, ry, u);
      }
      stampGlimmer(
        ctx,
        speck.x,
        speck.y,
        SPECK,
        i,
        i % 3 ? COLOR.heavenlyGold : COLOR.white,
      );
    }
    endLightBatch(ctx);
    ctx.globalCompositeOperation = previous;
    for (let k = 0; k < nests.length; k++) {
      const n = nests[k];
      if (ms >= n.start && ms < n.burst) {
        head.x = n.at.x;
        head.y = n.at.y;
        drawWispHead(
          ctx,
          atHead,
          ms,
          now,
          LEAD * (n.own ? 1.4 : 1),
          clamp01((ms - n.start) / (n.burst - n.start)),
        );
      }
      blast.x = n.end.x;
      blast.y = n.end.y;
      drawDetonation(ctx, blast, ms - n.stung, n.own ? OWN_BLAST : BLAST, now);
    }
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
