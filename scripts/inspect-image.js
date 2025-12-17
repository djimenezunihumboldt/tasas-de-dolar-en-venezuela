const sharp = require('sharp');
const path = require('path');
(async () => {
  const file = path.join(__dirname, '..', 'app', 'src', 'assets', 'kontigo-clean.png');
  try {
    const img = sharp(file);
    const meta = await img.metadata();
    console.log('metadata:', meta);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    console.log('info:', info);
    // sample few pixels
    const samples = [];
    const w = info.width, h = info.height, channels = info.channels;
    for (let y=0;y<Math.min(5,h);y++){
      for (let x=0;x<Math.min(5,w);x++){
        const idx = (y*w + x) * channels;
        const px = [];
        for(let c=0;c<channels;c++) px.push(data[idx+c]);
        samples.push({x,y,px});
      }
    }
    console.log('samples (first 5x5 pixels):', samples.slice(0,10));
  } catch (err) {
    console.error('error:', err.message);
    process.exitCode = 1;
  }
})();
