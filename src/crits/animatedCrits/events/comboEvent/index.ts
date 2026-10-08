// the "Combo" event (an experiment beyond the seven looks: a fighting game
// combo; free upgrade levels): it covers its crit, whose click freezes the
// screen while wisps dart in from both sides and jab the clicked floor's
// income bar, hit after hit ever faster, each a flash, a pop and a jolt and
// a free level, a big gold combo counter beside it popping x1, x2, x3 … as
// it climbs; the last hit is a finisher, the counter slamming "COMBO!" with
// a huge blast and shake and a pile of levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  createCritTextSprite,
  drawCritTextSprite,
  type CritTextSprite,
} from "../../../critFlash/critText";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "combo";
const HITS = 12;
const STYLE = { fontSize: 34, strokeWidth: 6 };
const FINISH_STYLE = { fontSize: 46, strokeWidth: 8 };
// jabs come in from REACH px off, the counter sits ABOVE px over the bar
const REACH = 220;
const ABOVE = 70;
const JAB = 0.4;
const POP = 0.6;
const POP_MS = 160;
const HIT_SHAKE: [number, number] = [0.3, 1.1];

export const forceComboEvent = registerWispEvent(
  KEY,
  "Combo",
  () => CONFIG.comboEvent.chance,
  (floor, context) => {
    const { hitsMs, jabMs, holdMs, mergeMs } = CONFIG.comboEvent;
    const found = findRewardBars(floor, context);
    const bar = found.find((b) => b.floor === floor) ?? found[0];
    if (!bar) return;
    const share = Math.max(1, Math.round(levelsFor(bar.floor) / HITS));
    const counter: Point = { x: bar.center.x, y: bar.center.y - ABOVE };
    const labels: CritTextSprite[] = Array.from({ length: HITS - 1 }, (_, k) =>
      createCritTextSprite(`x${k + 1}`, COLOR.heavenlyGold, STYLE),
    );
    labels.push(
      createCritTextSprite("COMBO!", COLOR.heavenlyGold, FINISH_STYLE),
    );
    let clock: number = jabMs;
    const jabs = Array.from({ length: HITS }, (_, k) => {
      const lands = clock;
      clock += lerp(hitsMs, k / (HITS - 1));
      const angle = (k % 2 === 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.2;
      const from: Point = {
        x: bar.center.x + Math.cos(angle) * REACH,
        y: bar.center.y + Math.sin(angle) * REACH,
      };
      const hit: Point = {
        x: bar.center.x + (Math.random() - 0.5) * bar.box.width * 0.4,
        y: bar.center.y,
      };
      const at: Point = { x: 0, y: 0 };
      return {
        lands,
        hit,
        at: (ms: number): Point => {
          const u = easeIn(clamp01((ms - (lands - jabMs)) / jabMs));
          at.x = lerp([from.x, hit.x], u);
          at.y = lerp([from.y, hit.y], u);
          return at;
        },
      };
    });
    const last = jabs[HITS - 1];
    const endAt = last.lands;

    const hitting = createBeats(
      jabs,
      (j) => j.lands,
      (j, k) => {
        if (j === last) {
          cover!.levels(bar, levelsFor(bar.floor), j.hit);
          cover!.slam(bar);
          cover!.blast(j.hit);
          return;
        }
        cover!.levels(bar, share, j.hit);
        cover!.burst(j.hit, 0.25);
        if (!cover!.isLive()) return;
        if (k % 3 === 2) playExplosion();
        else playBloop();
        shakeScreen(lerp(HIT_SHAKE, k / (HITS - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => hitting.tick(ms, now),
        drawOver: (ctx, ms, now) => {
          if (ms > endAt + holdMs) return;
          for (const j of jabs)
            drawWispBetween(
              ctx,
              j.at,
              ms,
              now,
              WISP_SIZE * JAB,
              0.8,
              j.lands - jabMs,
              j.lands,
            );
          // the counter shows the latest hit, popping in big
          let shown = -1;
          while (shown + 1 < HITS && ms >= jabs[shown + 1].lands) shown++;
          if (shown < 0) return;
          const pop =
            1 + POP * Math.max(0, 1 - (ms - jabs[shown].lands) / POP_MS);
          drawCritTextSprite(ctx, labels[shown], counter.x, counter.y, pop);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
