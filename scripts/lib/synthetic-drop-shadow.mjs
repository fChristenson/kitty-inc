import sharp from "sharp";

// composites a soft synthetic drop shadow behind an already chroma-keyed,
// cropped RGBA icon buffer. Needed because a soft AI-art drop shadow sits at
// nearly the SAME whiteness as the plain background it's cast on (its outer
// edge is a gaussian falloff that blends into the background well before it
// reaches true background whiteness) — any global whiteness threshold that
// fully clears the background necessarily clips almost all of that shadow
// away too (see process-upgrade.mjs/process-ball.mjs's own WHITE_HI). This
// regenerates an equivalent shadow instead, from the icon's OWN alpha
// silhouette: blurred, offset down-right, tinted black/translucent, and
// placed underneath the untouched icon on a padded transparent canvas.
export async function addDropShadow(
  data,
  width,
  height,
  { offsetX = 14, offsetY = 14, blurPx = 12, opacity = 0.3, padding = 50 } = {},
) {
  const silhouette = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    silhouette[i * 4 + 3] = data[i * 4 + 3];
  }
  const blurred = await sharp(silhouette, {
    raw: { width, height, channels: 4 },
  })
    .blur(blurPx)
    .raw()
    .toBuffer();
  // scale the blurred silhouette's own alpha down to `opacity`; RGB already 0
  // (black) from the zero-filled buffer above
  for (let i = 0; i < width * height; i++) {
    blurred[i * 4 + 3] = Math.round(blurred[i * 4 + 3] * opacity);
  }

  const paddedW = width + padding * 2;
  const paddedH = height + padding * 2;
  const composited = await sharp({
    create: {
      width: paddedW,
      height: paddedH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: blurred,
        raw: { width, height, channels: 4 },
        left: padding + offsetX,
        top: padding + offsetY,
      },
      {
        input: data,
        raw: { width, height, channels: 4 },
        left: padding,
        top: padding,
      },
    ])
    .raw()
    .toBuffer();

  return { data: composited, width: paddedW, height: paddedH };
}
