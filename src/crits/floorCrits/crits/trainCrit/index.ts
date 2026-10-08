// the train floor crit: its number pulling a train of copies along the bars
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
} from "../../critPlayer";

const TRAIN_LEAD_MS = 200;
const TRAIN_ROW_MS = 260;
const TRAIN_CARS = 4;
const TRAIN_GAP = 150;
const TRAIN_FONT = 150;
const TRAIN_CAR_FONT = 115;
// how high it rides over each bar's middle, and the rails under it
const TRAIN_RIDE = 95;
const TRAIN_RAIL = 50;

// the train's track: from the flash down a zigzag along the bars, top to
// bottom, one run across each
function trainTrack(r: Running, bars: Point[]) {
  const half = r.play.barHalfWidth - 80;
  const points: Point[] = [{ x: 0, y: 0 }];
  byHeight(bars).forEach((bar, i) => {
    const b = bars[bar];
    const y = b.y - TRAIN_RIDE;
    const [from, to] =
      i % 2 ? [b.x + half, b.x - half] : [b.x - half, b.x + half];
    points.push({ x: from, y }, { x: to, y });
  });
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(
      lengths[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].y - points[i - 1].y,
        ),
    );
  return { points, lengths, total: lengths[lengths.length - 1] };
}

function trackAt(
  track: ReturnType<typeof trainTrack>,
  s: number,
): Point & { angle: number } {
  const { points, lengths } = track;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < s) i++;
  const a = points[i - 1];
  const b = points[i];
  const q = clamp01((s - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1));
  return {
    x: lerp(a.x, b.x, q),
    y: lerp(a.y, b.y, q),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

registerFloorCrit("trainCrit", {
  plan(r, bars, hit) {
    // a steady pace, the cars trailing in off the track's end after
    const track = trainTrack(r, bars);
    const trainMs = TRAIN_LEAD_MS + bars.length * TRAIN_ROW_MS;
    r.span = { from: 0, to: trainMs };
    byHeight(bars).forEach((bar, i) => {
      const mid = (track.lengths[1 + i * 2] + track.lengths[2 + i * 2]) / 2;
      hit(bar, (mid / track.total) * trainMs);
    });
    r.hits.sort((a, b) => a.at - b.at);
    r.endsAt = trainMs * (1 + (TRAIN_CARS * TRAIN_GAP) / track.total);
    return;
  },
  draw(ctx, r, ms, bars) {
    const track = trainTrack(r, bars);
    const trainMs = r.span.to;
    const head = (ms / trainMs) * track.total;
    // the rails it lays as it goes, fading once it's through
    const railFade = clamp01((r.endsAt - ms) / 300);
    ctx.save();
    ctx.globalAlpha = 0.7 * railFade;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 8;
    ctx.setLineDash([30, 22]);
    ctx.beginPath();
    ctx.moveTo(track.points[0].x, track.points[0].y + TRAIN_RAIL);
    for (let i = 1; i < track.points.length; i++) {
      if (track.lengths[i - 1] >= head) break;
      const p =
        track.lengths[i] <= head ? track.points[i] : trackAt(track, head);
      ctx.lineTo(p.x, p.y + TRAIN_RAIL);
    }
    ctx.stroke();
    ctx.restore();
    for (let c = TRAIN_CARS; c >= 0; c--) {
      const s = head - c * TRAIN_GAP;
      if (s < 0 || s >= track.total) continue;
      const p = trackAt(track, s);
      const font =
        c === 0
          ? lerp(r.flashFont, TRAIN_FONT, clamp01(s / TRAIN_GAP))
          : TRAIN_CAR_FONT;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        p.x,
        p.y + Math.sin(ms * 0.05 + c) * 6,
        font,
        { along: p.angle, stretch: 1.15 },
      );
    }
  },
});
