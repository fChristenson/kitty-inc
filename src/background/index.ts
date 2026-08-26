// this module's own facade: background/ holds the single game-world canvas
// (gameCanvas) and its purely-internal clouds/stars/city sub-parts; anything
// outside src/background must import through here, never reach into a nested path
export { createGameCanvas } from "./gameCanvas";
export type { GameCanvas, GameCanvasDeps } from "./gameCanvas";
export { loadCityImage } from "./city";
