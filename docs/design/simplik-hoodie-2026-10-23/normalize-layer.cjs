const path = require('node:path');
const sharp = require('sharp');
(async () => {
  // Export-time fitting to the measured lower sphere, never a CSS transform.
  const sprite = await sharp(path.join(__dirname,'hoodie-source.png'))
    .trim({threshold:5}).resize(356,145,{fit:'fill'}).png().toBuffer();
  await sharp({create:{width:1000,height:1000,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:sprite,left:322,top:538}]).png().toFile(path.join(__dirname,'hoodie-v1.png'));
})().catch(error => {console.error(error);process.exitCode=1});
