const sharp = require('sharp');
const path = require('path');
(async () => {
  try {
    const root = path.resolve(__dirname, '..');
    const input = path.join(root, 'logo de kontigo.jpg');
    const out = path.join(root, 'app', 'src', 'assets', 'kontigo-clean-orange.png');
    const size = 200;

    const base = sharp(input).resize(size, size, { fit: 'cover', position: 'center' }).png();
    const grayBuf = await base.clone().grayscale().toBuffer();

    // Threshold to isolate bright parts (symbol)
    const mask = await sharp(grayBuf).threshold(220).toBuffer();

    // Create white canvas and attach mask as alpha channel
    const white = await sharp({ create: { width: size, height: size, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
    const whiteWithAlpha = await sharp(white).ensureAlpha().joinChannel(mask).png().toBuffer();

    // Composite white symbol over orange background (#F7931A)
    await sharp({ create: { width: size, height: size, channels: 4, background: '#F7931A' } })
      .composite([{ input: whiteWithAlpha, blend: 'over' }])
      .png()
      .toFile(out);

    console.log('Created:', out);
  } catch (err) {
    console.error('Error processing kontigo-orange:', err);
    process.exit(1);
  }
})();
