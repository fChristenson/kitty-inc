import { smoothstep } from "../../shared/easing";

// the exact same bounce+squash-stretch transform the map's prev/next arrows
// play via CSS (city-map-arrow-bounce-move/-warp, style.css) — replicated here
// in plain math since the price text these apply to is drawn on canvas, not a
// DOM element a CSS animation could target directly
export const PRICE_WIGGLE_PERIOD_MS = 900;
const PRICE_WIGGLE_AMPLITUDE_PX = 10;

// city-map-arrow-bounce-warp's own keyframe stops (time fraction, scaleX, scaleY);
// interpolated (with the same ease-in-out) between whichever pair of stops the
// current phase falls between
const PRICE_WIGGLE_WARP_STOPS: [number, number, number][] = [
  [0, 1, 1],
  [0.3, 0.88, 1.16],
  [0.5, 1.14, 0.86],
  [0.7, 0.88, 1.16],
  [1, 1, 1],
];

// the exact same translate+scale the arrows' two CSS animations produce at a
// given point (0..1) in their shared 0.9s cycle
export function getPriceWiggleTransform(phase: number): {
  translateY: number;
  scaleX: number;
  scaleY: number;
} {
  const translateY =
    phase < 0.5
      ? -PRICE_WIGGLE_AMPLITUDE_PX * smoothstep(phase / 0.5)
      : -PRICE_WIGGLE_AMPLITUDE_PX * smoothstep(1 - (phase - 0.5) / 0.5);
  let scaleX = 1;
  let scaleY = 1;
  for (let i = 0; i < PRICE_WIGGLE_WARP_STOPS.length - 1; i++) {
    const [t0, x0, y0] = PRICE_WIGGLE_WARP_STOPS[i];
    const [t1, x1, y1] = PRICE_WIGGLE_WARP_STOPS[i + 1];
    if (phase >= t0 && phase <= t1) {
      const eased = smoothstep((phase - t0) / (t1 - t0));
      scaleX = x0 + (x1 - x0) * eased;
      scaleY = y0 + (y1 - y0) * eased;
      break;
    }
  }
  return { translateY, scaleX, scaleY };
}
