const sharp = require('sharp');
const path = require('path');
(async()=>{
  const file = path.join(__dirname,'..','app','src','assets','kontigo-clean2.png');
  const {data,info} = await sharp(file).raw().toBuffer({resolveWithObject:true});
  const w = info.width;
  const h = info.height;
  for(let yy=95;yy<105;yy++){
    let row='';
    for(let xx=95;xx<105;xx++){
      const i=(yy*w+xx)*4;
      row += `(${data[i]},${data[i+1]},${data[i+2]}) `;
    }
    console.log(row);
  }
})();
