import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// every [label, file] as a numbered, captioned tile on ONE image, so a whole
// batch can be reviewed in a single look
export async function writeContactSheet(
  entries,
  out,
  {
    background = "#ff00ff",
    columns = 8,
    tileWidth = 240,
    tileHeight = 160,
    firstNumber = 1,
  } = {},
) {
  fs.rmSync(out, { force: true });
  if (entries.length === 0) return null;
  const captionHeight = 20;
  const cols = Math.min(columns, entries.length);
  const tiles = await Promise.all(
    entries.map(async ([label, file], index) => {
      const image = await sharp(file)
        .resize(tileWidth, tileHeight, { fit: "contain", background })
        .flatten({ background })
        .png()
        .toBuffer();
      const text = `${index + firstNumber}. ${label}`.replace(/[<>&]/g, "");
      const caption = Buffer.from(
        `<svg width="${tileWidth}" height="${captionHeight}"><rect width="100%" height="100%" fill="black"/><text x="4" y="15" font-size="14" fill="yellow" font-family="Arial">${text}</text></svg>`,
      );
      const left = (index % cols) * tileWidth;
      const top = Math.floor(index / cols) * (tileHeight + captionHeight);
      return [
        { input: caption, left, top },
        { input: image, left, top: top + captionHeight },
      ];
    }),
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({
    create: {
      width: tileWidth * cols,
      height: Math.ceil(entries.length / cols) * (tileHeight + captionHeight),
      channels: 3,
      background: "#222",
    },
  })
    .composite(tiles.flat())
    .png()
    .toFile(out);
  return out;
}
