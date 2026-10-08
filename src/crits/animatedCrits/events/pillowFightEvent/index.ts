// the "Pillow Fight" event (clutter; free upgrade levels): it covers its
// crit, whose click freezes the screen while two pillow wisps swing in from
// either side and smack each other mid-screen, three times, quicker each
// time, every smack bursting a cloud of glitter feathers that flutter down
// all over the screen; then one huge glittering broom cleans them up in
// brisk strokes: in from the left and the right, pushing the feathers into
// a line over the clicked floor's bar, then down and up along it into one
// heap, which settles with a jolt and drops onto the bar in a huge blast of
// free levels. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { COLOR } from "../../../../palette";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { stampGlimmer } from "../../../../shared/twinkle";
import {
  drawBroom,
  heapSpots,
  planSweep,
  scatterEvenly,
  simulateSweep,
  sweepLane,
  type BroomState,
} from "../../../../shared/clutter";
import { findRewardBars, levelsFor } from "../../eventRewards";

const KEY = "pillowFight";
const FEATHERS = 300;
const FEATHER = 10;
const MARGIN = 40;
const PILLOW = 1.3;
const SMACK_GAPS = [220, 170];
const TOUCH = 30;
const PULL = 190;
const LIFT = 60;
const FLING = 60;
const FLUTTER = 16;
const SETTLE_MS = 80;
// strokes in from each side, then along the line from each end
const IN = 2;
const ALONG = 2;
const KEEP_OFF = 24;
const SHORT = 220;
const ABOVE = 80;
const MOUND_W = 120;
const MOUND_H = 60;
const FADE_MS = 160;
const GATHER_MS = 180;
const DROP_MS = 220;
const SMACK_SHAKE = [0.5, 0.8, 1.1];
const STROKE_SHAKE = 0.3;
const GATHER_SHAKE = 0.8;

export const forcePillowFightEvent = registerWispEvent(
  KEY,
  "Pillow Fight",
  () => CONFIG.pillowFightEvent.chance,
  (floor, context, area) => {
    const { swingMs, flutterMs, dragMs, liftMs, levelShare, holdMs, mergeMs } =
      CONFIG.pillowFightEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const height = area.bottom - area.top;
    const centre: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + height * 0.38,
    };
    const smacks: number[] = [swingMs];
    for (const gap of SMACK_GAPS) smacks.push(smacks[smacks.length - 1] + gap);
    const lastSmack = smacks[smacks.length - 1];

    const spots = scatterEvenly(
      {
        left: area.left + MARGIN,
        top: area.top + MARGIN,
        right: area.right - MARGIN,
        bottom: area.bottom - MARGIN,
      },
      FEATHERS,
    );
    // each feather drifts from a random smack to a random spot
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j], spots[i]];
    }
    const flings = spots.map((_, i) => ({
      born: smacks[i % smacks.length],
      from: {
        x: centre.x + (Math.random() * 2 - 1) * FLING,
        y: centre.y + (Math.random() * 2 - 1) * FLING,
      },
    }));

    const heapX = Math.min(
      area.right - MARGIN * 2,
      Math.max(area.left + MARGIN * 2, bar.center.x),
    );
    const heapY = bar.box.y - ABOVE;
    const midY = (area.top + area.bottom) / 2;
    const sweep = planSweep(
      [
        ...sweepLane(
          { x: area.left - 20, y: midY },
          { x: heapX - KEEP_OFF, y: midY },
          IN,
          0,
          height * 1.05,
        ),
        ...sweepLane(
          { x: area.right + 20, y: midY },
          { x: heapX + KEEP_OFF, y: midY },
          IN,
          Math.PI,
          height * 1.05,
        ),
        ...sweepLane(
          { x: heapX, y: area.top - 20 },
          { x: heapX, y: heapY - KEEP_OFF },
          ALONG,
          Math.PI / 2,
          SHORT,
        ),
        ...sweepLane(
          { x: heapX, y: area.bottom + 20 },
          { x: heapX, y: heapY + KEEP_OFF },
          ALONG,
          -Math.PI / 2,
          SHORT,
        ),
      ],
      lastSmack + flutterMs + SETTLE_MS,
      dragMs,
      liftMs,
    );
    const swept = simulateSweep(sweep, spots);
    const mounds = heapSpots(
      { x: heapX, y: heapY + MOUND_H / 2 },
      FEATHERS,
      MOUND_W,
      MOUND_H,
    );
    const gathered = sweep.endMs + GATHER_MS;
    const landsAt = gathered + DROP_MS;
    const endAt = landsAt + FADE_MS;
    const landing: Point = { x: heapX, y: bar.center.y };

    // the pillows swing in, pull back between smacks, then fly off
    const pillows = [-1, 1].map((side) => {
      const p: Point = { x: 0, y: 0 };
      return (ms: number): Point | null => {
        if (ms < 0 || ms > lastSmack + 300) return null;
        let off: number;
        let lift = 0;
        if (ms < smacks[0]) {
          off =
            TOUCH + (1 - easeIn(ms / smacks[0])) * (centre.x - area.left + 100);
        } else if (ms < lastSmack) {
          let k = 0;
          while (ms >= smacks[k + 1]) k++;
          const u = (ms - smacks[k]) / (smacks[k + 1] - smacks[k]);
          off = TOUCH + Math.sin(Math.PI * u) * PULL;
          lift = Math.sin(Math.PI * u) * LIFT;
        } else {
          const u = easeIn(clamp01((ms - lastSmack) / 300));
          off = TOUCH + u * 700;
          lift = u * 200;
        }
        p.x = centre.x + side * off;
        p.y = centre.y - lift;
        return p;
      };
    });

    const smacking = createBeats(
      smacks,
      (ms) => ms,
      (_, k) => {
        cover!.burst(centre, 0.8);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(SMACK_SHAKE[k]);
      },
    );
    const stroking = createBeats(
      sweep.starts,
      (ms) => ms,
      () => {
        if (!cover!.isLive()) return;
        playSwoosh();
        shakeScreen(STROKE_SHAKE);
      },
    );
    const gathering = createBeats(
      [gathered],
      (ms) => ms,
      () => {
        cover!.burst({ x: heapX, y: heapY }, 0.6);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(GATHER_SHAKE);
      },
    );
    const dropping = createBeats(
      [landsAt],
      (ms) => ms,
      () => {
        cover!.levels(bar, levelsFor(bar.floor, levelShare, 5), landing);
        cover!.slam(bar);
        cover!.blast(landing);
      },
    );

    const broom: BroomState = {
      x: 0,
      y: 0,
      heading: 0,
      length: 0,
      pushing: false,
    };
    const feather: Point = { x: 0, y: 0 };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          smacking.tick(ms, now);
          stroking.tick(ms, now);
          gathering.tick(ms, now);
          dropping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const fade = 1 - clamp01((ms - landsAt) / FADE_MS);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = fade;
          for (let i = 0; i < FEATHERS; i++) {
            const { born, from } = flings[i];
            if (ms < born) continue;
            if (ms < sweep.startMs) {
              const t = clamp01((ms - born) / flutterMs);
              const u = easeOut(t);
              feather.x =
                lerp([from.x, spots[i].x], u) +
                Math.sin(ms * 0.012 + i) * FLUTTER * (1 - t);
              feather.y = lerp([from.y, spots[i].y], u);
            } else if (ms < sweep.endMs) {
              swept.at(i, ms, feather);
            } else {
              const end = swept.end(i);
              const mound = mounds[i];
              const g = easeOut(clamp01((ms - sweep.endMs) / GATHER_MS));
              const d = easeIn(clamp01((ms - gathered) / DROP_MS));
              feather.x = lerp([lerp([end.x, mound.x], g), landing.x], d);
              feather.y = lerp([lerp([end.y, mound.y], g), landing.y], d);
            }
            stampGlimmer(
              ctx,
              feather.x,
              feather.y,
              FEATHER,
              i * 1.3 + ms * 0.003,
              i % 3 === 0 ? COLOR.white : COLOR.heavenlyGold,
            );
          }
          ctx.restore();
          for (const at of pillows)
            drawWispBetween(
              ctx,
              at,
              ms,
              now,
              WISP_SIZE * PILLOW,
              0.5,
              0,
              lastSmack + 300,
            );
          // faded in on its first stroke's start and out after its last
          const b = sweep.at(
            Math.min(Math.max(ms, sweep.startMs), sweep.endMs - 1),
            broom,
          );
          const shown =
            clamp01((ms - (sweep.startMs - FADE_MS)) / FADE_MS) *
            (1 - clamp01((ms - sweep.endMs) / FADE_MS));
          if (b) drawBroom(ctx, b, shown, ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
