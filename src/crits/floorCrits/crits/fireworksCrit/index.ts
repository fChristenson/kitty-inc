// the fireworks floor crit: the number shoots up as a rocket and bursts into
// a shell of copies high over the building that drift down onto every bar in
// view, then a second, bigger shell goes off
import { drawDetonation } from "../../../../shared/explosion";
import { playExplosion } from "../../../../shared/explosionBang";
import { drawWispBetween, WISP_SIZE } from "../../../../shared/wisp";
import { easeOut } from "../../../../shared/easing";
import {
  registerFloorCrit,
  type Point,
  type Running,
  lerp,
  clamp01,
  byHeight,
  drawText,
  along,
  FLOOR_CRIT_FONT,
} from "../../critPlayer";
import { quadratic, holeHash } from "../../critPlayer/shared";

interface Shell {
  rise: [number, number];
  perBar: number;
  least: number;
  font: number;
  blast: number;
  shake: number;
}
// the first shell rises from the number, the second, bigger one from below
const SHELLS: Shell[] = [
  {
    rise: [0, 380],
    perBar: 2,
    least: 8,
    font: FLOOR_CRIT_FONT * 0.8,
    blast: 300,
    shake: 1.4,
  },
  {
    rise: [800, 1150],
    perBar: 3,
    least: 12,
    font: FLOOR_CRIT_FONT,
    blast: 380,
    shake: 2,
  },
];
const FW_SHRINK_MS = 120;
const FW_OUT_MS = 250;
const FW_FALL_MS = 700;
const FW_STAGGER_MS = 50;
// the shells' bursts: above the top bar, kept in view (of the viewport's width)
const FW_ABOVE = 300;
const FW_HIGHEST = 0.5;
const FW_SPREAD = 130;
const FW_LOW = 350;
const FW_LOWEST = 0.9;
// how far a shell flings its copies before they drift down
const FW_RING: Point = { x: 420, y: 300 };
const FW_DRIFT = 120;
const FW_BLAST = 70;
const FW_SHAKE = 0.35;
const FW_TAIL_MS = 900;

const copiesOf = (shell: Shell, bars: number) =>
  Math.max(shell.least, shell.perBar * bars);
const landsAt = (shell: Shell, i: number) =>
  shell.rise[1] + FW_FALL_MS + (i % 5) * FW_STAGGER_MS;

// where shell s bursts, and where its rocket rises from
function shellPath(r: Running, bars: Point[], s: number) {
  const w = r.viewportWidth;
  const order = byHeight(bars);
  const top = bars[order[0]];
  const bottom = bars[order[order.length - 1]];
  const high = Math.max(top.y - FW_ABOVE, -w * FW_HIGHEST);
  return s === 0
    ? { from: { x: 0, y: 0 }, burst: { x: top.x + FW_SPREAD, y: high } }
    : {
        from: {
          x: top.x - FW_SPREAD,
          y: Math.min(bottom.y + FW_LOW, w * FW_LOWEST),
        },
        burst: { x: top.x - FW_SPREAD, y: high - FW_SPREAD / 2 },
      };
}

registerFloorCrit("fireworksCrit", {
  plan(_r, bars, hit) {
    for (const shell of SHELLS)
      for (let i = 0; i < copiesOf(shell, bars.length); i++)
        hit(i % bars.length, landsAt(shell, i));
  },
  draw(ctx, r, ms, bars) {
    const now = r.startedAt + ms;
    if (ms < FW_SHRINK_MS)
      drawText(
        ctx,
        r.glyphs,
        r.label,
        0,
        0,
        r.flashFont * (1 - ms / FW_SHRINK_MS),
      );
    const due = SHELLS.filter((shell) => ms >= shell.rise[1]).length;
    while (r.kicked < due) {
      r.shake(SHELLS[r.kicked++].shake);
      playExplosion();
    }
    SHELLS.forEach((shell, s) => {
      const { from, burst } = shellPath(r, bars, s);
      const [rises, bursts] = shell.rise;
      drawWispBetween(
        ctx,
        (t) => {
          const p = easeOut(clamp01((t - rises) / (bursts - rises)));
          return { x: lerp(from.x, burst.x, p), y: lerp(from.y, burst.y, p) };
        },
        ms,
        now,
        WISP_SIZE * 1.2,
        1,
        rises,
        bursts,
      );
      drawDetonation(ctx, burst, ms - bursts, shell.blast, now);
      const count = copiesOf(shell, bars.length);
      for (let i = 0; i < count; i++) {
        const lands = landsAt(shell, i);
        const to = along(
          r,
          bars,
          i % bars.length,
          holeHash(i + s * 50, 31) * 2 - 1,
        );
        drawDetonation(ctx, to, ms - lands, FW_BLAST, now);
        if (ms < bursts || ms >= lands) continue;
        const a = (i / count) * Math.PI * 2 + s;
        const out = {
          x: burst.x + Math.cos(a) * FW_RING.x,
          y: burst.y + Math.sin(a) * FW_RING.y,
        };
        const t = ms - bursts;
        const at =
          t < FW_OUT_MS
            ? quadratic(burst, out, out, easeOut(t / FW_OUT_MS))
            : quadratic(
                out,
                { x: out.x, y: out.y - FW_DRIFT },
                to,
                ((t - FW_OUT_MS) / (lands - bursts - FW_OUT_MS)) ** 1.5,
              );
        drawText(ctx, r.glyphs, r.label, at.x, at.y, shell.font);
      }
    });
  },
  tailMs: FW_TAIL_MS,
  shake: () => FW_SHAKE,
});
