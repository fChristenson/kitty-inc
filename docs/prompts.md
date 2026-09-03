# Asset generation prompts

Raw AI-generated art drops into `src/assets/` (or `src/assets/themes/<name>/`
for a per-theme variant), then a matching `scripts/process-*.mjs` chroma-keys
it from a plain white background to a transparent `.png` (same flood-fill
technique as `process-star.mjs`/`process-coin.mjs`) and crops to its own tight
bounding box. Generate every prompt below on a plain solid white background,
no shadow, no drop shadow, no surrounding scenery — just the subject centered
in frame — so that pipeline can cleanly cut it out.

