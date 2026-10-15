// Ritual, a rate crit: a pen of light draws one giant magic circle flat under
// its own bar's readout, then a small circle under every other readout, each
// threaded to the big one by a line of light; they all turn together, faster
// and faster, every turn of the big one a jolt, a tick and a throb down every
// thread; then the small ones erupt one after another, quicker each, pillars
// of light up through their readouts as they turn over, and last the big one
// erupts through its own in the big blast: every bar it landed on runs as
// fast as the fastest of them for a while
import meta from "./meta";
import { defineBarEffect, rateCritSpeed } from "../../rateBonus";
import type { Floor } from "../../../../gameState";
import { officeUpgradeSpeedMultiplier } from "../../../../shared/income";
import {
  drawSummon,
  drawSummonPillar,
  planSummon,
  summonLook,
  type Summon,
} from "../../../../shared/animationStyles/summon";
import { drawBeam } from "../../../../shared/animationStyles/beam";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { drawGlow, fadeStops } from "../../../../shared/glowSprite";
import { COLOR } from "../../../../palette";
import { playSpinTick } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 140;
// the big circle HUB_RADIUS px round from HUB_MS, the small ones RADIUS px
// round from SAT_MS, STAGGER_MS apart; all under their readout (READOUT of a
// bar's half width out) by DOWN px
const HUB_MS = 100;
const HUB_RADIUS = 200;
const SAT_MS = 260;
const STAGGER_MS = 35;
const RADIUS = 95;
const READOUT = 0.6;
const DOWN = 40;
const CONTACT_Y = -20;
const HUB_TURNS = 8;
const TURNS = 6;
// the first small one erupting at SPELL_MS, the rest GAP_MS apart (closing),
// all within ERUPT_SPAN; the big one HUB_AFTER after the last
const SPELL_MS = 1150;
const GAP_MS: [number, number] = [110, 45];
const ERUPT_SPAN = 520;
const HUB_AFTER = 170;
// a thread LINE px wide, shooting out in SHOOT_MS once its circle's rim is
// drawn, throbbing THROB as wide on each turn of the big one, flaring FLARE
// as its circle erupts and gone FADE_MS on
const RIM_MS = 240;
const SHOOT_MS = 110;
const LINE = 11;
const THROB = 2.4;
const THROB_MS = 140;
const FLARE = 3.2;
const FADE_MS = 200;
const PILLAR = 560;
const HUB_PILLAR = 1000;
// a small one's eruption: a cheap flash on its readout
const FLASH = 170;
const FLASH_MS = 180;
const HUB_BLAST = 380;
const REV_SHAKE = 0.5;
// shakes by step: -, a small one, the big one
const SHAKES = [0.4, 1, 3];

const FLASH_STOPS = fadeStops(COLOR.heavenlyGold);

interface Circle {
  bar: number;
  summon: Summon;
  // when its thread shoots out
  lineMs: number;
  // its live spot
  at: Point;
}
interface State {
  hub: Circle;
  sats: Circle[];
}
const states = new WeakMap<Running, State>();
const tip: Point = { x: 0, y: 0 };
const readout: Point = { x: 0, y: 0 };

// a run's rewarded bars: the fastest of their speeds as each landed
interface Run {
  fastest: number;
  at: number;
  closed: boolean;
}
const RUN_MS = 6000;
const runs = new WeakMap<Floor, Run>();
interface Pace {
  run: Run;
  // its bar's own speed as the reward landed
  base: number;
  until: number;
}
const paceAt = (v: Pace): number =>
  Math.max(meta.values.min, v.run.fastest / v.base);
const pace = defineBarEffect<Pace>({
  speed: (v) => paceAt(v),
  ended: (v, now) => now >= v.until,
});

registerFloorCrit("ritualCrit", {
  reward(t) {
    t.flipRate();
    pace.delete(t.floor);
    const base = Math.max(
      1e-6,
      officeUpgradeSpeedMultiplier(t.floor) * rateCritSpeed(t.floor, t.now),
    );
    let run = runs.get(t.ownFloor);
    if (!run || run.closed || t.now - run.at > RUN_MS) {
      run = { fastest: 0, at: t.now, closed: false };
      runs.set(t.ownFloor, run);
    }
    run.fastest = Math.max(run.fastest, base);
    if (t.own) run.closed = true;
    const v: Pace = {
      run,
      base,
      until: t.now + (t.own ? meta.values.ownMs : meta.values.ms),
    };
    pace.set(t.floor, v);
    t.punch(`x${Math.round(paceAt(v) * 10) / 10} Pace`);
  },
  plan(r, bars, hit) {
    const order = ownLast(bars);
    const m = order.length - 1;
    const sats: Circle[] = [];
    let erupt = SPELL_MS;
    const gapScale = Math.min(
      1,
      ERUPT_SPAN / Math.max(1, (m - 1) * ((GAP_MS[0] + GAP_MS[1]) / 2)),
    );
    for (let k = 0; k < m; k++) {
      const start = SAT_MS + STAGGER_MS * k;
      sats.push({
        bar: order[k],
        summon: planSummon(start, erupt, TURNS, summonLook(k + 1)),
        lineMs: start + RIM_MS,
        at: { x: 0, y: 0 },
      });
      hit(order[k], erupt, 1);
      erupt += lerp(GAP_MS[0], GAP_MS[1], k / Math.max(1, m - 1)) * gapScale;
    }
    const hubErupt =
      m > 0 ? erupt - GAP_MS[1] * gapScale + HUB_AFTER : SPELL_MS;
    hit(0, hubErupt, 2);
    states.set(r, {
      hub: {
        bar: 0,
        summon: planSummon(HUB_MS, hubErupt, HUB_TURNS, summonLook(6)),
        lineMs: 0,
        at: { x: 0, y: 0 },
      },
      sats,
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const { hub, sats } = state;
    const half = r.play.barHalfWidth;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    hub.at.x = bars[0].x + half * READOUT;
    hub.at.y = bars[0].y + DOWN;
    for (let k = 0; k < sats.length; k++) {
      const c = sats[k];
      const bar = bars[c.bar];
      c.at.x = bar.x + half * READOUT;
      c.at.y = bar.y + DOWN;
    }
    // a jolt, a tick and a throb down every thread at each turn of the big one
    const revs = hub.summon.revs;
    while (r.kicked < revs.length && ms >= revs[r.kicked]) {
      r.shake(REV_SHAKE);
      playSpinTick(1 + r.kicked / revs.length);
      r.kicked++;
    }
    let since = Infinity;
    for (let k = revs.length - 1; k >= 0; k--)
      if (revs[k] <= ms) {
        since = ms - revs[k];
        break;
      }
    const throb = 1 + (THROB - 1) * Math.max(0, 1 - since / THROB_MS);
    for (let k = 0; k < sats.length; k++) {
      const c = sats[k];
      if (ms < c.lineMs) continue;
      const fade = 1 - clamp01((ms - c.summon.eruptMs) / FADE_MS);
      if (fade <= 0) continue;
      const shoot = clamp01((ms - c.lineMs) / SHOOT_MS);
      tip.x = lerp(hub.at.x, c.at.x, shoot);
      tip.y = lerp(hub.at.y, c.at.y, shoot);
      const flare = ms >= c.summon.eruptMs ? FLARE : throb;
      drawBeam(ctx, hub.at, tip, LINE * flare, fade);
    }
    drawSummon(ctx, hub.summon, ms, hub.at, HUB_RADIUS);
    const previous = ctx.globalCompositeOperation;
    const alpha = ctx.globalAlpha;
    for (let k = 0; k < sats.length; k++) {
      const c = sats[k];
      drawSummon(ctx, c.summon, ms, c.at, RADIUS);
      drawSummonPillar(ctx, c.summon, ms, c.at, RADIUS, PILLAR);
      const after = ms - c.summon.eruptMs;
      if (after < 0 || after >= FLASH_MS) continue;
      const u = after / FLASH_MS;
      readout.x = c.at.x;
      readout.y = bars[c.bar].y + CONTACT_Y;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha * (1 - u);
      drawGlow(ctx, FLASH_STOPS, readout.x, readout.y, FLASH * (0.6 + 0.6 * u));
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = previous;
    }
    drawSummonPillar(ctx, hub.summon, ms, hub.at, HUB_RADIUS, HUB_PILLAR);
    readout.x = hub.at.x;
    readout.y = bars[0].y + CONTACT_Y;
    drawDetonation(ctx, readout, ms - hub.summon.eruptMs, HUB_BLAST, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
