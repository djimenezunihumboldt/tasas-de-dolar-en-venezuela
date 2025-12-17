const sharp = require('sharp');
const path = require('path');
(async()=>{
  const file = path.join(__dirname,'..','app','src','assets','kontigo-clean2.png');
  const {data,info} = await sharp(file).raw().toBuffer({resolveWithObject:true});
  const w = info.width;
  for(let y=0;y<10;y++){
    let row='';
    for(let x=0;x<10;x++){
      const i=(y*w+x)*4;
      row += `(${data[i]},${data[i+1]},${data[i+2]}) `;
    }
    console.log(row);
  }
})();
