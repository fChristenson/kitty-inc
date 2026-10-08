// the bubble floor crit: its number blown into bubbles that pop on the bars
import { registerFloorCrit, drawText, along } from "../../critPlayer";
import { BURST_MS } from "../../critPlayer/shared";

const BUBBLES_PER_BAR = 2;
const BUBBLE_R = 75;
const BUBBLE_FONT = 70;
const BUBBLE_WOBBLE = 40;
const BUBBLE_POP_MS = 150;
const BUBBLE_SHAKE = 0.25;

function bubble(i: number, barCount: number) {
  return {
    bar: i % barCount,
    delay: i * 40,
    duration: 600 + ((i * 53) % 250),
    // where along its bar, -1..1
    along: ((i * 71) % 100) / 50 - 1,
  };
}

registerFloorCrit("bubbleCrit", {
  plan(_r, bars, hit) {
    for (let i = 0; i < bars.length * BUBBLES_PER_BAR; i++) {
      const b = bubble(i, bars.length);
      hit(b.bar, b.delay + b.duration);
    }
  },
  draw(ctx, r, ms, bars) {
    if (ms < BURST_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 + ms / (BURST_MS * 2)),
        { alpha: 1 - ms / BURST_MS },
      );
    ctx.save();
    ctx.lineWidth = 6;
    for (let i = 0; i < bars.length * BUBBLES_PER_BAR; i++) {
      const b = bubble(i, bars.length);
      const t = ms - b.delay;
      if (t < 0 || t >= b.duration + BUBBLE_POP_MS) continue;
      const to = along(r, bars, b.bar, b.along);
      if (t >= b.duration) {
        // popped: a ring bursting off where it landed
        const q = (t - b.duration) / BUBBLE_POP_MS;
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          to.x,
          to.y - BUBBLE_R,
          BUBBLE_R * (1 + 0.8 * q),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        continue;
      }
      // wobbling down onto its bar, blown up to size as it leaves
      const p = t / b.duration;
      const grow = Math.min(1, p * 5);
      const x = to.x * p + Math.sin(p * 9 + i) * BUBBLE_WOBBLE * (1 - p);
      const y = (to.y - BUBBLE_R) * p;
      const radius = BUBBLE_R * grow;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(186,230,253,0.18)";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(
        x - radius * 0.4,
        y - radius * 0.45,
        radius * 0.22,
        radius * 0.12,
        -0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      drawText(ctx, r.glyphs, r.label, x, y, BUBBLE_FONT * grow);
    }
    ctx.restore();
  },
  tailMs: BUBBLE_POP_MS,
  shake: () => BUBBLE_SHAKE,
});
