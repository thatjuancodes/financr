const DEFAULT_MAX_WIDTH = 2200;

async function preprocessImage(buffer) {
  let sharp;
  try {
    sharp = require("sharp");
  } catch (error) {
    throw new Error("Image preprocessing dependencies are unavailable");
  }

  return sharp(buffer)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: DEFAULT_MAX_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();
}

module.exports = {
  preprocessImage,
};
