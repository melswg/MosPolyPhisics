const path = require('node:path');
const sharp = require('sharp');

async function main(source=path.join(__dirname,'hoodie-v2-source.png'), destination=path.join(__dirname,'hoodie-v2.png')) {
  const {data,info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rows = [];
  for (let y=0;y<info.height;y++) {
    let left=info.width,right=-1;
    for(let x=0;x<info.width;x++) if(data[(y*info.width+x)*4+3]>=8) {left=Math.min(left,x);right=Math.max(right,x);}
    rows[y]={left,right};
  }
  // The first opaque pixel may belong to just one shoulder; never stretch it
  // across the neck opening as a horizontal line.
  const top=rows.findIndex(row=>row.right-row.left>info.width*.35);
  let bottom=rows.length-1;
  while(rows[bottom].right<rows[bottom].left) bottom--;
  const center=Math.round(info.width/2);
  let opening=top;
  while(opening<bottom && data[(opening*info.width+center)*4+3]<128) opening++;
  const out=Buffer.alloc(1000*1000*4);
  // Fit the outer cloth to a concentric sphere with 14 units of fabric thickness.
  // Register the neck opening independently: the unchanged wow mouth ends at y582.
  for(let y=500;y<684;y++) {
    const sourceY=y<=584 ? top+(y-500)*(opening-top)/84 : opening+(y-584)*(bottom-opening)/100;
    const ya=Math.floor(sourceY),yb=Math.min(bottom,ya+1),fy=sourceY-ya;
    const left=rows[ya].left*(1-fy)+rows[yb].left*fy;
    const right=rows[ya].right*(1-fy)+rows[yb].right*fy;
    let half=Math.sqrt(194**2-(y-490)**2);
    // Round the raised shoulder tip instead of stretching its first scanline flat.
    if(y<515) half-=14*(1-Math.sqrt(1-((515-y)/15)**2));
    for(let x=Math.ceil(500-half);x<=Math.floor(500+half);x++) {
      const sx=left+(x-(500-half))*(right-left)/(half*2);
      const xa=Math.floor(sx),xb=Math.min(info.width-1,xa+1),fx=sx-xa;
      const samples=[[xa,ya,(1-fx)*(1-fy)],[xb,ya,fx*(1-fy)],[xa,yb,(1-fx)*fy],[xb,yb,fx*fy]];
      let alpha=0;const rgb=[0,0,0];
      for(const [px,py,w] of samples) {
        const i=(py*info.width+px)*4,a=data[i+3]*w;
        alpha+=a;
        for(let c=0;c<3;c++) rgb[c]+=data[i+c]*a;
      }
      const dest=(y*1000+x)*4;
      for(let c=0;c<3;c++) out[dest+c]=alpha?Math.round(rgb[c]/alpha):0;
      out[dest+3]=Math.round(alpha);
    }
  }
  await sharp(out,{raw:{width:1000,height:1000,channels:4}}).png().toFile(destination);
  console.log({source:{top,opening,bottom},target:{top:500,opening:584,bottom:684,outerRadius:194}});
}
module.exports=main;
if(require.main===module) main().catch(error=>{console.error(error);process.exitCode=1});
