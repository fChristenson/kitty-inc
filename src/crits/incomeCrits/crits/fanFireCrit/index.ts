// Fan Fire, an income crit: the green amount drops under the total and turns
// into a gun wisp that fires fans of shots up into the readout, three, then
// five, then seven, each fan wider, denser and quicker than the last, a
// muzzle flash, a kick and a blast across the readout each, a share every
// fan, the gun glowing hotter; then it fires itself in as one heavy slug for
// the huge finale
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/animationStyles/bullets";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import {
  drawWispBetween,
  drawWispHead,
  WISP_SIZE,
} from "../../../../shared/wisp";
import { playSwoosh } from "../../../../sound";
import {
  registerFloorCrit,
  type Point,
  type Running,
  clamp01,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { drawFinale } from "../shared";

// the gun GUN px under the total, the amount dropping there over DROP_MS
const DROP_MS = 150;
const GUN = 560;
// the fans: FANS of them, the first FIRST shots growing by GROW, spread
// SPREAD of the readout's half width (wider each), GAPS_MS apart (closing),
// shots flying SPEED px/ms
const FANS = 6;
const FIRST = 3;
const GROW = 2;
const SPREAD: [number, number] = [120, 340];
const GAPS_MS: [number, number] = [240, 90];
const SPEED = 6.5;
const SHOT = WISP_SIZE * 0.6;
const MUZZLE_MS = 90;
const MUZZLE = 190;
const KICK = 40;
const KICK_MS = 90;
const BLAST: [number, number] = [110, 200];
// the slug: SLUG_GAP_MS after the last fan lands, SLUG_MS up into the total
const SLUG_GAP_MS = 90;
const SLUG_MS = 90;
// shakes by step: a fan in, the finale
const SHAKES = [0.8, 2.8];

interface Fan {
  firedAt: number;
  lands: number;
  bullets: Bullet[];
  spread: number;
}
interface State {
  fans: Fan[];
  slugAt: number;
  endMs: number;
  slug: (ms: number) => Point;
}
const states = new WeakMap<Running, State>();
const GUN_AT: Point = { x: 0, y: GUN };
const UP = -Math.PI / 2;
const gun: Point = { x: 0, y: 0 };
const atGun = () => gun;
const blast: Point = { x: 0, y: 0 };

registerFloorCrit("fanFireCrit", {
  plan(r, _bars, hit) {
    const fans: Fan[] = [];
    let t = DROP_MS + 60;
    for (let k = 0; k < FANS; k++) {
      const u = k / (FANS - 1);
      const count = FIRST + GROW * k;
      const spread = lerp(SPREAD[0], SPREAD[1], u);
      const bullets: Bullet[] = [];
      for (let i = 0; i < count; i++)
        bullets.push(
          aimBullet(
            GUN_AT,
            { x: lerp(-spread, spread, i / (count - 1)), y: 0 },
            t,
            SPEED,
          ),
        );
      const lands = Math.max(...bullets.map((b) => b.hitAt));
      fans.push({ firedAt: t, lands, bullets, spread });
      hit(0, lands);
      t += lerp(GAPS_MS[0], GAPS_MS[1], u);
    }
    const slugAt = fans[FANS - 1].lands + SLUG_GAP_MS;
    const endMs = slugAt + SLUG_MS;
    hit(0, endMs, 1);
    const slug: Point = { x: 0, y: 0 };
    states.set(r, {
      fans,
      slugAt,
      endMs,
      slug: (at) => {
        slug.y = GUN * (1 - clamp01((at - slugAt) / SLUG_MS) ** 2);
        return slug;
      },
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    const to = bars[0];
    const { fans, slugAt, endMs } = state;
    if (ms < DROP_MS) {
      const p = (ms / DROP_MS) ** 2;
      drawText(
        ctx,
        r.glyphs,
        r.label,
        lerp(0, to.x, p),
        lerp(0, to.y + GUN, p),
        r.flashFont * lerp(1, 0.3, p),
      );
    }
    // a whoosh with every fan
    while (r.kicked < fans.length && ms >= fans[r.kicked].firedAt) {
      playSwoosh();
      r.kicked++;
    }
    ctx.save();
    ctx.translate(to.x, to.y);
    // the gun kicking down at every fan, hotter each
    let kick = 0;
    for (let k = 0; k < fans.length; k++) {
      const since = ms - fans[k].firedAt;
      if (since >= 0 && since < KICK_MS) kick = KICK * (1 - since / KICK_MS);
    }
    gun.x = 0;
    gun.y = GUN + kick;
    if (ms >= DROP_MS && ms < slugAt)
      drawWispHead(
        ctx,
        atGun,
        ms,
        now,
        WISP_SIZE * 1.4,
        clamp01((ms - DROP_MS) / (slugAt - DROP_MS)),
      );
    for (let k = 0; k < fans.length; k++) {
      const fan = fans[k];
      drawMuzzleFlash(
        ctx,
        gun,
        UP,
        (ms - fan.firedAt) / MUZZLE_MS,
        MUZZLE * (1 + k * 0.15),
      );
      if (ms >= fan.firedAt && ms < fan.lands)
        drawBullets(ctx, fan.bullets, ms, now, SHOT);
      const u = k / (fans.length - 1);
      const size = lerp(BLAST[0], BLAST[1], u);
      for (let side = -1; side <= 1; side++) {
        blast.x = side * fan.spread * 0.7;
        blast.y = 0;
        drawDetonation(
          ctx,
          blast,
          ms - fan.lands - Math.abs(side) * 30,
          size,
          now,
        );
      }
    }
    // the slug: the gun firing itself in
    drawWispBetween(
      ctx,
      state.slug,
      ms,
      now,
      WISP_SIZE * 1.8,
      1,
      slugAt,
      endMs,
    );
    ctx.restore();
    drawFinale(ctx, to, ms - endMs, now);
  },
  tailMs: DETONATION_MS,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
