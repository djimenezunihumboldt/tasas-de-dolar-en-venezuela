const sharp = require('sharp');
const path = require('path');
(async()=>{
  const file = path.join(__dirname,'..','app','src','assets','kontigo-clean.png');
  try{
    const img = sharp(file);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const total = info.width * info.height;
    let whiteOpaque = 0;
    let purple = 0;
    for(let i=0;i<data.length;i+=info.channels){
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if(r===255 && g===255 && b===255 && a===255) whiteOpaque++;
      if(r===139 && g===92 && b===246) purple++;
    }
    console.log('total pixels', total);
    console.log('white opaque', whiteOpaque, (whiteOpaque/total*100).toFixed(2)+'%');
    console.log('exact purple pixels', purple);
  }catch(e){console.error(e);process.exit(1)}
})();
