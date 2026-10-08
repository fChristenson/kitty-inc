// a first-person view into a simple 3D world drawn with flat quads, like an
// old shooter: the world's walls, faces and flats (./world), drawn far to
// near, enemies standing in it (./enemy) or floating heads (./head) and the
// player's gun on top (./gun)
export * from "./world";
export { drawFpsEnemy, type FpsEnemyLook, type FpsEnemyPose } from "./enemy";
export {
  drawFpsHead,
  FPS_HEAD_RADIUS,
  type FpsHeadDrawn,
  type FpsHeadLook,
  type FpsHeadPose,
} from "./head";
export { drawFpsGun, type FpsGunPose } from "./gun";
