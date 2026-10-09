// the beatmap floor crit, a rhythm game like osu!: circles pop up over the
// bars on the beat, each with a ring closing in on it, and the number, now a
// cursor wisp, darts onto each one exactly as its ring closes, every hit a
// blast on that bar; the beat speeds up and up, then a spinner whirls the
// cursor round its own bar into a huge blast
import { COLOR } from "../../../../palette";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import { drawGlow } from "../../../../shared/glowSprite";
import { drawWisp, WISP_SIZE } from "../../../../shared/wisp";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  drawText,
  along,
  glowStops,
} from "../../critPlayer";

const BEAT_IN_MS = 300;
const NOTES = 16;
// between notes, quickening from the first to the last
const BEAT_GAPS: [number, number] = [220, 90];
const FIRST_NOTE = BEAT_IN_MS + 250;
// each circle shows this long before its beat, its ring closing in
const APPROACH_MS = 420;
const NOTE_R = 70;
const RING_FROM = 3;
const RING_W = 10;
const NOTE_BLAST = 140;
const CURSOR = 0.8;
const SPIN_LAG = 60;
const SPIN_MS = 450;
const SPIN_LAPS = 5;
const SPIN_R: [number, number] = [300, 110];
const BEAT_BOOM = 440;
const NOTE_SHAKE = 0.5;
const BOOM_SHAKE = 2.6;
const BEAT_TAIL_MS = 1000;
const TAU = Math.PI * 2;
const GOLD_GLOW = glowStops(COLOR.heavenlyGold);

interface Note {
  bar: number;
  side: number;
  ms: number;
}

// the notes' bars, sides and beats, planned once a run
const planned = new WeakMap<Running, Note[]>();
function notesOf(r: Running, bars: Point[]): Note[] {
  const cached = planned.get(r);
  if (cached) return cached;
  const notes: Note[] = [];
  let ms = FIRST_NOTE;
  let bar = 0;
  for (let k = 0; k < NOTES; k++) {
    // jump to another bar most beats, so the cursor darts across the screen
    if (bars.length > 1 && k % 3 !== 2)
      bar =
        (bar + 1 + Math.floor(Math.random() * (bars.length - 1))) % bars.length;
    notes.push({ bar, side: lerp(-0.85, 0.85, Math.random()), ms });
    ms += lerp(BEAT_GAPS[0], BEAT_GAPS[1], k / (NOTES - 1));
  }
  planned.set(r, notes);
  return notes;
}
const spinAt = (notes: Note[]) => notes[notes.length - 1].ms + SPIN_LAG;
const boomAt = (notes: Note[]) => spinAt(notes) + SPIN_MS;

const spot: Point = { x: 0, y: 0 };
const from: Point = { x: 0, y: 0 };
const cursor: Point = { x: 0, y: 0 };

registerFloorCrit("beatmapCrit", {
  plan(r, bars, hit) {
    const notes = notesOf(r, bars);
    for (const n of notes) hit(n.bar, n.ms);
    hit(0, boomAt(notes), 1);
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    const notes = notesOf(r, bars);
    const spin = spinAt(notes);
    const boom = boomAt(notes);
    const noteAt = (n: Note, into: Point) => {
      const p = along(r, bars, n.bar, n.side);
      into.x = p.x;
      into.y = p.y;
      return into;
    };
    // the cursor eases onto each note on its beat, then whirls round its bar
    const cursorAt = (t: number): Point => {
      if (t >= spin) {
        const u = clamp01((t - spin) / SPIN_MS);
        const a = u * u * TAU * SPIN_LAPS;
        const radius = lerp(SPIN_R[0], SPIN_R[1], u);
        cursor.x = bars[0].x + Math.cos(a) * radius;
        cursor.y = bars[0].y + Math.sin(a) * radius;
        return cursor;
      }
      let prevMs = BEAT_IN_MS;
      from.x = 0;
      from.y = 0;
      for (const n of notes) {
        if (t < n.ms) {
          noteAt(n, spot);
          const u = 1 - (1 - clamp01((t - prevMs) / (n.ms - prevMs))) ** 3;
          cursor.x = lerp(from.x, spot.x, u);
          cursor.y = lerp(from.y, spot.y, u);
          return cursor;
        }
        noteAt(n, from);
        prevMs = n.ms;
      }
      // the last note to the spinner's start
      const u = clamp01((t - prevMs) / SPIN_LAG);
      cursor.x = lerp(from.x, bars[0].x + SPIN_R[0], u);
      cursor.y = lerp(from.y, bars[0].y, u);
      return cursor;
    };

    if (ms < BEAT_IN_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        lerp(r.flashFont, r.flashFont * 0.3, ms / BEAT_IN_MS),
      );
    for (const n of notes) {
      const u = (ms - (n.ms - APPROACH_MS)) / APPROACH_MS;
      if (u < 0 || ms >= n.ms) continue;
      noteAt(n, spot);
      ctx.save();
      ctx.globalAlpha *= clamp01(u * 3);
      ctx.globalCompositeOperation = "lighter";
      drawGlow(ctx, GOLD_GLOW, spot.x, spot.y, NOTE_R * 1.6);
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = RING_W;
      ctx.strokeStyle = COLOR.white;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, NOTE_R * lerp(RING_FROM, 1, u), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, NOTE_R, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (ms >= spin && ms < boom) {
      const u = (ms - spin) / SPIN_MS;
      ctx.save();
      ctx.globalAlpha *= 0.9;
      ctx.lineWidth = RING_W * 1.4;
      ctx.strokeStyle = COLOR.heavenlyGold;
      ctx.beginPath();
      ctx.arc(
        bars[0].x,
        bars[0].y,
        lerp(SPIN_R[0], SPIN_R[1], u) + NOTE_R * 0.6,
        0,
        TAU,
      );
      ctx.stroke();
      ctx.restore();
    }
    if (ms >= BEAT_IN_MS * 0.6 && ms < boom)
      drawWisp(
        ctx,
        (t) => cursorAt(Math.max(BEAT_IN_MS * 0.6, t)),
        ms,
        now,
        WISP_SIZE * CURSOR,
        ms >= spin ? clamp01((ms - spin) / SPIN_MS) : 0.4,
      );
    for (const n of notes) {
      if (ms < n.ms || ms - n.ms > DETONATION_MS) continue;
      drawDetonation(ctx, noteAt(n, spot), ms - n.ms, NOTE_BLAST, now);
    }
    drawDetonation(ctx, bars[0], ms - boom, BEAT_BOOM, now);
  },
  tailMs: BEAT_TAIL_MS,
  shake: (step) => (step === 1 ? BOOM_SHAKE : NOTE_SHAKE),
});
