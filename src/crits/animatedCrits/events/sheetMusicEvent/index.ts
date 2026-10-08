// the "Sheet Music" event (wisp; cash): it covers its crit, whose click
// freezes the screen while five faint lines of light stretch across it like
// a musical staff and a note wisp springs out of the clicked floor's button,
// hopping from line to line across the staff in a tune, every note a flash,
// a bloop, a jolt and a pop of coins, the tune ever faster; at the end of
// the bar five notes ring out at once in a chord, a huge blast and shake.
// Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../../shared/screenShake";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { ringTargets } from "../../../../shared/coinTargets";
import { drawBeam } from "../../../../shared/beam";

const KEY = "sheetMusic";
const REWARD = 4;
const LINES = 5;
// the staff spans SPAN of the screen's height round its middle
const SPAN = 0.3;
const EDGE = 40;
const NOTES = [2, 4, 3, 1, 0, 2, 4, 3, 1, 2, 3, 4];
const HOP = 40;
const NOTE = 0.36;
const POP = 6;
const POP_REACH: [number, number] = [20, 70];
const NOTE_SHAKE: [number, number] = [0.25, 0.9];
const STAFF = 5;

export const forceSheetMusicEvent = registerWispEvent(
  KEY,
  "Sheet Music",
  () => CONFIG.sheetMusicEvent.chance,
  (floor, context, area) => {
    const { staffMs, tuneMs, chordMs, holdMs, mergeMs } =
      CONFIG.sheetMusicEvent;
    const button = getButtonCenter(context.isGroundFloor);
    const mid = (area.top + area.bottom) / 2;
    const span = (area.bottom - area.top) * SPAN;
    const lineY = (l: number) => mid + span * (l / (LINES - 1) - 0.5);
    const left = area.left + EDGE;
    const right = area.right - EDGE;
    const staff = Array.from({ length: LINES }, (_, l) => ({
      from: { x: left, y: lineY(l) },
      to: { x: right, y: lineY(l) },
    }));
    const notes = NOTES.map((l, k) => ({
      spot: {
        x: lerp([left + 40, right - 40], k / (NOTES.length - 1)),
        y: lineY(l),
      },
      lands: staffMs + tuneMs * Math.sqrt((k + 1) / NOTES.length),
    }));
    const tuneEnd = notes[notes.length - 1].lands;
    const chordAt = tuneEnd + chordMs;
    const endAt = chordAt;
    const at: Point = { x: 0, y: 0 };
    const note = (ms: number): Point | null => {
      if (ms > tuneEnd) return null;
      let from: Point = button;
      let start = 0;
      for (const n of notes) {
        if (ms <= n.lands) {
          const u = clamp01((ms - start) / (n.lands - start));
          at.x = lerp([from.x, n.spot.x], u);
          at.y = lerp([from.y, n.spot.y], u) - Math.sin(Math.PI * u) * HOP;
          return at;
        }
        from = n.spot;
        start = n.lands;
      }
      return null;
    };
    const chord = Array.from({ length: LINES }, (_, l) => {
      const spot: Point = { x: right - 40, y: lineY(l) };
      return (ms: number): Point | null =>
        ms < tuneEnd || ms > chordAt ? null : spot;
    });
    const center: Point = { x: right - 40, y: mid };

    const playing = createBeats(
      notes,
      (n) => n.lands,
      (n, k) => {
        cover!.launchFrom(n.spot, ringTargets(n.spot, POP, POP_REACH));
        cover!.burst(n.spot, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(NOTE_SHAKE, k / (notes.length - 1)));
      },
    );
    const finale = createBeats(
      [chordAt],
      (ms) => ms,
      () => cover!.blast(center),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          playing.tick(ms, now);
          finale.tick(ms, now);
        },
        drawUnder: (ctx, ms) => {
          if (ms > endAt + 300) return;
          const fade =
            clamp01(ms / staffMs) * (ms > endAt ? 1 - (ms - endAt) / 300 : 1);
          for (const s of staff)
            drawBeam(ctx, s.from, s.to, STAFF, 0.35 * fade);
        },
        drawOver: (ctx, ms, now) => {
          drawWispBetween(
            ctx,
            note,
            ms,
            now,
            WISP_SIZE * NOTE,
            0.5,
            0,
            tuneEnd,
          );
          for (const c of chord)
            drawWispBetween(
              ctx,
              c,
              ms,
              now,
              WISP_SIZE * NOTE,
              1,
              tuneEnd,
              chordAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
