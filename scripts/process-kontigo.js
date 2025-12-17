const sharp = require('sharp');
const path = require('path');
(async () => {
  try {
    const root = path.resolve(__dirname, '..');
    const input = path.join(root, 'logo de kontigo.jpg');
    const out = path.join(root, 'app', 'src', 'assets', 'kontigo-clean.png');
    const size = 200;

    const img = sharp(input).resize(size, size, { fit: 'cover', position: 'center' });

    // Create a mask by converting to grayscale and thresholding
    const mask = await img.clone().grayscale().normalise().threshold(150).toBuffer();

    // Create white canvas and attach mask as alpha channel
    const white = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();

    const whiteWithAlpha = await sharp(white).removeAlpha().joinChannel(mask).png().toBuffer();

    // Composite white symbol over purple background
    await sharp({ create: { width: size, height: size, channels: 4, background: '#8b5cf6' } })
      .composite([{ input: whiteWithAlpha, blend: 'over' }])
      .png()
      .toFile(out);

    console.log('Created:', out);
  } catch (err) {
    console.error('Error processing kontigo:', err);
    process.exit(1);
  }
})();
