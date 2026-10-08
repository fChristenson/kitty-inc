// a street race in shared/fps's world (x right, y up, z away, in screen
// widths), seen from behind the car: a straight road with its lines and
// kerbs, pavements and blocks of buildings down both sides built from fps
// floors, walls and faces, and a finish gate across the road's end with a
// window in it for the event to fill
import { COLOR } from "../../palette";
import {
  drawFpsFace,
  drawFpsFlat,
  drawFpsWall,
  fpsSight,
  type Fps,
  type FpsPoint,
} from "../fps";
import { hash01 } from "../twinkle";

export interface RoadStreet {
  // the road's half width, then the kerb's and pavement's widths
  half: number;
  kerb: number;
  pavement: number;
  // a block's length, the alley after it, its depth back from the pavement
  // and its height range
  block: number;
  alley: number;
  depth: number;
  heights: [number, number];
  // varies the blocks' heights and lit windows
  salt: number;
}

export const ROAD_STREET: RoadStreet = {
  half: 0.9,
  kerb: 0.08,
  pavement: 0.3,
  block: 2.2,
  alley: 0.5,
  depth: 1.5,
  heights: [0.9, 2.6],
  salt: 0,
};

// a bend in the road from `from` to `to` along it, turning `turn` radians
// per unit (right for positive)
export interface RoadCurve {
  from: number;
  to: number;
  turn: number;
}

// how far right the road at z shows from a view at camZ that faces along the
// road where it is: the curve's turn summed between them; pass it as the
// Fps's bend
export function roadBend(curve: RoadCurve, camZ: number, z: number): number {
  const a = Math.max(camZ, curve.from);
  const b = Math.min(z, curve.to);
  if (b <= a) return 0;
  return curve.turn * (b - a) * (z - (a + b) / 2);
}

// the street is drawn this far ahead of the view
const REACH = 26;

// the road's segments, its centre dashes and their gaps
const SEG = 1;
const DASH = 0.5;
const DASH_W = 0.025;
const EDGE_W = 0.02;
// windows on a block's face: their size, spacing and how far they're inset
// from its ends and up from the ground, and the windows lit
const WINDOW_W = 0.3;
const WINDOW_H = 0.2;
const WINDOW_EVERY_Z = 0.6;
const WINDOW_EVERY_Y = 0.36;
const WINDOW_FROM_Y = 0.3;
const WINDOW_LIT = 0.55;
// blocks this near get windows; farther they're too small to see
const WINDOW_REACH = 14;
const ASPHALT = [COLOR.cauldronIron, COLOR.cauldronIronDark];
const KERB = [COLOR.white, COLOR.fullHouseCrimson];
const PAVEMENT = COLOR.disabledGray;
const BLOCK_FACE = [COLOR.wall, COLOR.wallShadow];
const BLOCK_END = COLOR.unionBossSlate;
const WINDOW_DARK = COLOR.cauldronIronDark;
const WINDOW_LIT_COLOR = COLOR.goldenTicketYellow;
const LINE = COLOR.white;

// the road from the view out to `end` (or REACH ahead), then the blocks
// lining it, far to near
export function drawRoadStreet(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  street: RoadStreet,
  end: number,
): void {
  end = Math.min(end, fps.cam.z + REACH);
  const { half, kerb, pavement } = street;
  const near = Math.floor(fps.cam.z / SEG);
  for (let k = Math.ceil(end / SEG) - 1; k >= near; k--) {
    const z0 = k * SEG;
    const z1 = Math.min(end, z0 + SEG);
    drawFpsFlat(ctx, fps, 0, -half, half, z0, z1, ASPHALT[k % 2]);
    drawFpsFlat(ctx, fps, 0, -DASH_W, DASH_W, z0, z0 + DASH, LINE);
    for (const side of [-1, 1]) {
      const edge = side * (half - 0.06);
      drawFpsFlat(ctx, fps, 0, edge - EDGE_W, edge + EDGE_W, z0, z1, LINE);
      // the kerb's stripes, then the pavement
      for (let h = 0; h < 2; h++)
        drawFpsFlat(
          ctx,
          fps,
          0,
          side * half,
          side * (half + kerb),
          z0 + h * 0.5,
          Math.min(z1, z0 + h * 0.5 + 0.5),
          KERB[h],
        );
      drawFpsFlat(
        ctx,
        fps,
        0,
        side * (half + kerb),
        side * (half + kerb + pavement),
        z0,
        z1,
        PAVEMENT,
      );
    }
  }
  const pitch = street.block + street.alley;
  const first = Math.floor(fps.cam.z / pitch);
  for (let k = Math.ceil(end / pitch) - 1; k >= first; k--)
    for (const side of [-1, 1]) drawBlock(ctx, fps, street, k, side, end);
}

// block k on one side: the face along the road with its windows, and its
// near end
function drawBlock(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  street: RoadStreet,
  k: number,
  side: number,
  end: number,
): void {
  const z0 = k * (street.block + street.alley);
  const z1 = Math.min(end, z0 + street.block);
  if (z1 <= z0) return;
  const salt = street.salt + (side > 0 ? 7 : 0);
  const [low, high] = street.heights;
  const tall = low + (high - low) * hash01(k, salt);
  const inner = side * (street.half + street.kerb + street.pavement);
  const outer = inner + side * street.depth;
  // the face in road-segment pieces, so it follows a bend
  for (let z = z0; z < z1; z += SEG)
    drawFpsWall(
      ctx,
      fps,
      inner,
      0,
      tall,
      z,
      Math.min(z1, z + SEG),
      BLOCK_FACE[k % 2],
    );
  if (z0 - fps.cam.z < WINDOW_REACH)
    for (let y = WINDOW_FROM_Y; y + WINDOW_H < tall - 0.1; y += WINDOW_EVERY_Y)
      for (
        let z = z0 + WINDOW_EVERY_Z / 2;
        z + WINDOW_W < z1;
        z += WINDOW_EVERY_Z
      )
        drawFpsWall(
          ctx,
          fps,
          inner,
          y,
          y + WINDOW_H,
          z,
          z + WINDOW_W,
          hash01(k * 31 + Math.round(y * 10), z + salt) < WINDOW_LIT
            ? WINDOW_LIT_COLOR
            : WINDOW_DARK,
        );
  drawFpsFace(
    ctx,
    fps,
    z0,
    Math.min(inner, outer),
    Math.max(inner, outer),
    0,
    tall,
    BLOCK_END,
  );
}

// the finish gate across the road's end at z: pillars and a top round a
// window w wide and h high on the road, a chequered banner over it; `inside`
// fills the window, given its top-left and bottom-right on screen
const BANNER_H = 0.22;
const CHECKS = 12;
const GATE = COLOR.unionBossSlate;
const CHECK = [COLOR.white, COLOR.black];
// the gate's pillars either side of the window and its top over the banner
const PILLAR = 0.35;
const TOP = 0.3;

export function drawFinishGate(
  ctx: CanvasRenderingContext2D,
  fps: Fps,
  z: number,
  w: number,
  h: number,
  inside: (topLeft: FpsPoint, bottomRight: FpsPoint) => void,
): void {
  const a = fpsSight(fps, -w / 2, h, z);
  const b = fpsSight(fps, w / 2, 0, z);
  if (a && b) inside(a, b);
  const top = h + BANNER_H + TOP;
  drawFpsFace(ctx, fps, z, -w / 2 - PILLAR, -w / 2, 0, top, GATE);
  drawFpsFace(ctx, fps, z, w / 2, w / 2 + PILLAR, 0, top, GATE);
  drawFpsFace(ctx, fps, z, -w / 2, w / 2, h + BANNER_H, top, GATE);
  const check = w / CHECKS;
  for (let i = 0; i < CHECKS; i++)
    for (let r = 0; r < 2; r++)
      drawFpsFace(
        ctx,
        fps,
        z,
        -w / 2 + i * check,
        -w / 2 + (i + 1) * check,
        h + (r * BANNER_H) / 2,
        h + ((r + 1) * BANNER_H) / 2,
        CHECK[(i + r) % 2],
      );
}
