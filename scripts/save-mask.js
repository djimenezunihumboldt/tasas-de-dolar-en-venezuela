const sharp = require('sharp');
const path = require('path');
(async()=>{
  const input = path.join(__dirname,'..','logo de kontigo.jpg');
  const out = path.join(__dirname,'..','app','src','assets','kontigo-mask.png');
  const size = 200;
  const base = sharp(input).resize(size,size,{fit:'cover',position:'center'}).grayscale();
  const thresh = await base.clone().threshold(220).toBuffer();
  await sharp(thresh).toFile(out);
  console.log('wrote threshold mask to', out);
})();
