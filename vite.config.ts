import { defineConfig } from "vite";

// served from https://fChristenson.github.io/kitty-inc/ (a GitHub Pages project
// site, not a custom domain or a <user>.github.io repo), so every asset URL must be
// prefixed with the repo name or they'd 404 once deployed
export default defineConfig({
  base: "/kitty-inc/",
});
