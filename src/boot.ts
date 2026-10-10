// The page's entry: a few KB that start the first screen's downloads, then
// load the game, so the art is fetched and decoded while the game's code is
// still loading and compiling instead of after it
import "./shared/gameClock";
import "./style.css";
import { preloadFirstScreen } from "./loadAssets";

performance.mark("game:boot");
preloadFirstScreen();
void import("./main");
