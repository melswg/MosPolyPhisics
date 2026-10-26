// Export generated artwork into the measured 1000x1000 avatar coordinate system.
const path=require('node:path');
const fs=require('node:fs');
const sharp=require('sharp');
const fitCoat=require('../simplik-hoodie-2026-10-23/fit-v2.cjs');
const folder=__dirname;
const output=path.join(folder,'layers');
async function cleaned(name) {
  const source=path.join(folder,'sources',`${name}.png`);
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Remove generation fringe at source resolution, before resampling to sprite size.
  const alpha=await sharp(source).extractChannel(3).median(7).threshold(160).blur(.4).raw().toBuffer();
  for(let i=0;i<alpha.length;i++) data[i*4+3]=alpha[i];
  return {data,info};
}
function inverse(value, anchors) {
  for(let i=1;i<anchors.length;i++) if(value<=anchors[i][1]) {
    const [a,da]=anchors[i-1],[b,db]=anchors[i];
    return a+(value-da)*(b-a)/(db-da);
  }
  return anchors.at(-1)[0];
}
async function registered(name,xAnchors,yAnchors) {
  const {data,info}=await cleaned(name);
  const out=Buffer.alloc(1000*1000*4);
  for(let y=Math.ceil(yAnchors[0][1]);y<=Math.floor(yAnchors.at(-1)[1]);y++) {
    const sy=inverse(y,yAnchors),ya=Math.floor(sy),yb=Math.min(info.height-1,ya+1),fy=sy-ya;
    for(let x=Math.ceil(xAnchors[0][1]);x<=Math.floor(xAnchors.at(-1)[1]);x++) {
      const horizontal=name==='headphones'&&y<450 ? [[110,282],[1139,718]] : xAnchors;
      const sx=inverse(x,horizontal),xa=Math.floor(sx),xb=Math.min(info.width-1,xa+1),fx=sx-xa;
      const samples=[[xa,ya,(1-fx)*(1-fy)],[xb,ya,fx*(1-fy)],[xa,yb,(1-fx)*fy],[xb,yb,fx*fy]];
      let alpha=0;const rgb=[0,0,0];
      for(const [px,py,w] of samples) {
        if(px<0||py<0||px>=info.width||py>=info.height) continue;
        const i=(py*info.width+px)*4,a=data[i+3]*w;alpha+=a;
        for(let c=0;c<3;c++) rgb[c]+=data[i+c]*a;
      }
      const dest=(y*1000+x)*4;
      for(let c=0;c<3;c++)out[dest+c]=alpha?Math.round(rgb[c]/alpha):0;
      out[dest+3]=Math.round(alpha);
    }
  }
  await sharp(out,{raw:{width:1000,height:1000,channels:4}}).png().toFile(path.join(output,`${name}.png`));
}
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const coat=await cleaned('labcoat');
  const cleanCoat=path.join(folder,'labcoat-clean.png');
  await sharp(coat.data,{raw:{width:coat.info.width,height:coat.info.height,channels:4}}).png().toFile(cleanCoat);
  await fitCoat(cleanCoat,path.join(output,'labcoat.png'));
  fs.copyFileSync(path.join(folder,'../simplik-hoodie-2026-10-23/hoodie-v2.png'),path.join(output,'hoodie.png'));
  await registered('graduate',[[114,270],[1140,730]],[[388,255],[922,445]]);
  await registered('space',[[158,280],[355,347],[900,653],[1095,720]],[[133,266],[330,365],[780,605],[1063,704]]);
  await registered('headphones',[[110,292],[430,352],[626,500],[823,648],[1139,708]],[[210,280],[337,310],[629,450],[642,455],[1018,548]]);
  await registered('glasses',[[26,365],[378,444],[876,556],[1227,635]],[[443,447],[486,454],[780,528],[817,535]]);
  await registered('goggles',[[56,353],[414,444],[847,556],[1199,647]],[[461,444],[548,452],[742,530],[825,538]]);
}
main().catch(error=>{console.error(error);process.exitCode=1});
