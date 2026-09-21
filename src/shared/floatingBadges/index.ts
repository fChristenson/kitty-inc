// A badge icon that fades in, floats up, then fades back out — the earned-badge
// notice the city map's auto-buyer uses instead of a blocking overlay. Same
// "generic particle math lives here once, each consumer keeps its own list/
// loop" split as shared/floatingText and coinBurst.

export interface FloatingBadgeParticle {
  x: number;
  y: number;
  icon: HTMLImageElement | null;
  life: number; // ticks elapsed (~16.67ms each)
  maxLife: number;
}

const FADE_IN_TICKS = 8; // ~133ms
const HOLD_TICKS = 42; // ~700ms fully visible
const FADE_OUT_TICKS = 22; // ~367ms
const FADE_OUT_START = FADE_IN_TICKS + HOLD_TICKS;
export const FLOATING_BADGE_MAX_LIFE_TICKS = FADE_OUT_START + FADE_OUT_TICKS;

export function createFloatingBadgeParticle(
  x: number,
  y: number,
  icon: HTMLImageElement | null,
): FloatingBadgeParticle {
  return { x, y, icon, life: 0, maxLife: FLOATING_BADGE_MAX_LIFE_TICKS };
}

export function updateFloatingBadgeParticles(
  particles: FloatingBadgeParticle[],
  dt: number,
  risePerTick: number,
): void {
  for (const badge of particles) {
    badge.y -= risePerTick * dt;
    badge.life += dt;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life >= particles[i].maxLife) particles.splice(i, 1);
  }
}

export function drawFloatingBadgeParticle(
  ctx: CanvasRenderingContext2D,
  badge: FloatingBadgeParticle,
  size: number,
): void {
  if (!badge.icon?.naturalWidth) return;
  const scale = Math.min(
    size / badge.icon.naturalWidth,
    size / badge.icon.naturalHeight,
  );
  const w = badge.icon.naturalWidth * scale;
  const h = badge.icon.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha =
    badge.life < FADE_IN_TICKS
      ? badge.life / FADE_IN_TICKS
      : badge.life > FADE_OUT_START
        ? Math.max(
            0,
            1 -
              (badge.life - FADE_OUT_START) / (badge.maxLife - FADE_OUT_START),
          )
        : 1;
  ctx.drawImage(badge.icon, badge.x - w / 2, badge.y - h / 2, w, h);
  ctx.restore();
}
