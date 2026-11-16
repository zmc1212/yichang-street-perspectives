import * as THREE from 'three';

/**
 * Yiling bridge surroundings, original geometry reconstructed from public aerials.
 * Local metres: city = -X, Dianjun = +X; upstream / Moji = -Z;
 * downstream / Jiumatou / riverside Wanda = +Z. Coordinates are photographic
 * estimates, not a survey or a GIS model. Moji's published 217 m is ASL, so the
 * relative-to-river terrain here peaks at approximately 170 m.
 * References: Yichang Forestry park photographs (2022); local aerial (2022);
 * riverside photos (2023); North approach completion aerial (July 2026).
 */
export function buildBridgeContext(api){
  const {group,mesh,box,cyl,plane,beam,texture,material,customMaterial,instance,
    emissives,noInk,font,rnd}=api;
  const TAU=Math.PI*2, smooth=THREE.MathUtils.smoothstep, clamp=THREE.MathUtils.clamp;
  const cityShore=z=>-351-17*Math.sin(z/480)+9*Math.sin(z/970);
  const widen=api.riverWiden||0;
  const hillShore=z=>349+widen+18*Math.sin(z/420)+10*Math.sin(z/740);
  const ground=9.5;
  const pale='#bfc1b8', kerb='#c5c8bf', darkRoof='#727973';
  const road=material('#545e60'), path=material('#aaada4');

  function repeatTexture(w,h,draw){const t=texture(w,h,draw);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
  const stoneTex=repeatTexture(512,512,(c,W,H)=>{
    c.fillStyle='#92998e';c.fillRect(0,0,W,H);
    for(let row=0;row<16;row++)for(let col=-1;col<10;col++){
      const x=col*58+(row%2)*29,y=row*32,v=rnd(row*137+col*41);
      c.fillStyle=`rgba(${111+v*54},${121+v*50},${110+v*48},.6)`;c.fillRect(x+1,y+1,56,30);
      c.strokeStyle='rgba(55,67,59,.22)';c.lineWidth=1;c.strokeRect(x,y,58,32);
      c.fillStyle='rgba(211,213,190,.13)';c.fillRect(x+3,y+2,50,2);
    }
    for(let i=0;i<1500;i++){c.fillStyle=i%3?'rgba(43,64,49,.09)':'rgba(202,207,184,.1)';c.fillRect(rnd(i*7)*W,rnd(i*7+1)*H,1+rnd(i*7+2)*6,1);}
  });
  const stone=customMaterial({map:stoneTex,color:'#fff',side:THREE.DoubleSide});
  const grassTex=repeatTexture(512,512,(c,W,H)=>{
    c.fillStyle='#73845e';c.fillRect(0,0,W,H);
    for(let i=0;i<7000;i++){c.fillStyle=i%3?'rgba(32,62,37,.07)':'rgba(199,187,125,.12)';c.fillRect(rnd(i*4)*W,rnd(i*4+1)*H,1+rnd(i*4+2)*12,1+rnd(i*4+3)*5);}
  });
  const lawn=customMaterial({map:grassTex,color:'#9aaa7b',side:THREE.DoubleSide});
  const asphaltTex=repeatTexture(512,512,(c,W,H)=>{
    c.fillStyle='#61686a';c.fillRect(0,0,W,H);
    for(let i=0;i<5500;i++){c.fillStyle=i%2?'rgba(29,36,35,.13)':'rgba(213,217,205,.09)';c.fillRect(rnd(i*3)*W,rnd(i*3+1)*H,1+rnd(i*3+2)*2,1);}
  });
  const asphalt=customMaterial({map:asphaltTex,color:'#c2c9c6',side:THREE.DoubleSide});
  const cityGroundTex=repeatTexture(512,512,(c,W,H)=>{
    c.fillStyle='#929087';c.fillRect(0,0,W,H);
    for(let i=0;i<85;i++){const x=rnd(i*9)*W,y=rnd(i*9+1)*H,w=18+rnd(i*9+2)*80,h=12+rnd(i*9+3)*56;c.fillStyle=['#98958a','#8a8b83','#a39c8b','#8c9189','#a09c90'][i%5];c.fillRect(x,y,w,h);}
    for(let i=0;i<9;i++){c.fillStyle='rgba(75,82,78,.22)';c.fillRect(rnd(i*13)*W,0,3+rnd(i*13+1)*7,H);c.fillRect(0,rnd(i*13+2)*H,W,3+rnd(i*13+3)*7);}
  });
  const urbanGround=customMaterial({map:cityGroundTex,color:'#cbc9ba',side:THREE.DoubleSide});
  function ribbon(shore,sign,a,b,ya,yb,mat,{z0=-8000,z1=8000,step=25,uvScale=12}={}){
    const n=Math.ceil((z1-z0)/step),p=[],u=[],ix=[];
    for(let i=0;i<=n;i++){
      const z=z0+(z1-z0)*i/n,s=shore(z);
      p.push(s+sign*a,typeof ya==='function'?ya(z):ya,z,s+sign*b,typeof yb==='function'?yb(z):yb,z);
      u.push(a/uvScale,z/uvScale,b/uvScale,z/uvScale);
      if(i<n){const k=i*2;if(sign>0)ix.push(k,k+2,k+1,k+1,k+2,k+3);else ix.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));geo.setIndex(ix);geo.computeVertexNormals();
    return mesh(geo,mat);
  }
  function surfacePath(points,width,mat,y=.06){
    const p=[],u=[],ix=[];
    let travelled=0;
    points.forEach((pt,i)=>{
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],dx=next[0]-prev[0],dz=next[2]-prev[2],l=Math.hypot(dx,dz)||1;
      if(i)travelled+=Math.hypot(pt[0]-prev[0],pt[2]-prev[2]);
      const ox=-dz/l*width/2,oz=dx/l*width/2;
      p.push(pt[0]+ox,pt[1]+y,pt[2]+oz,pt[0]-ox,pt[1]+y,pt[2]-oz);u.push(0,travelled/12,width/12,travelled/12);
      if(i<points.length-1){const k=i*2;ix.push(k,k+2,k+1,k+1,k+2,k+3);}
    });
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));geo.setIndex(ix);geo.computeVertexNormals();return mesh(geo,mat);
  }
  function smoothPath(points,n=80){return new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))).getPoints(n).map(p=>p.toArray());}

  // City bank: low-water revetment, narrow lower promenade, retaining wall,
  // mature park, at-grade Yanjiang Avenue. The width changes gently along shore.
  ribbon(cityShore,-1,-9,3,-1.6,.5,'#909581');
  ribbon(cityShore,-1,3,27,.5,5.5,stone,{uvScale:5});
  ribbon(cityShore,-1,27,34,5.5,5.5,path);
  ribbon(cityShore,-1,34,36,5.5,9.3,stone,{uvScale:5});
  ribbon(cityShore,-1,36,79,9.3,ground,lawn,{uvScale:18});
  ribbon(cityShore,-1,79,84,9.6,9.6,path);
  ribbon(cityShore,-1,84,112,ground,ground,asphalt,{uvScale:12});
  ribbon(cityShore,-1,112,119,9.6,9.6,path);
  ribbon(cityShore,-1,119,10000,ground,ground,urbanGround,{step:180,uvScale:160});
  for(const d of [83.7,111.8])ribbon(cityShore,-1,d,d+.35,9.72,9.72,kerb);
  // A slim central fence and actual sized lane marks, not an oversized divider.
  ribbon(cityShore,-1,97.8,98.05,10.3,10.3,'#bca657',{z0:-2100,z1:2300});
  ribbon(cityShore,-1,97.85,97.95,9.55,10.25,'#5d6661',{z0:-2100,z1:2300});
  for(let z=-2300;z<2600;z+=16){
    const x=cityShore(z);
    for(const d of [90.9,105.2])box(.12,.028,7,x-d,ground+.035,z,'#d7d8c8');
    if(Math.abs(z)>50&&z%48===0){
      cyl(.12,.17,8,x-82,13.6,z,'#7c8781',5);
      beam([x-82,17.5,z],[x-88,17.8,z],.16,.16,'#7c8781');
      box(1.5,.15,.45,x-88.1,17.8,z,'#c6cdc2');
    }
  }
  // Each access has a short staircase across the sloped bank and a landing.
  for(const z of[-1020,-720,-390,-160,135,360,650,920,1230,1590]){
    const x=cityShore(z);
    for(let s=0;s<19;s++)box(1.18,.3,5.6,x-5-s*1.15,.65+s*.26,z,'#a4aaa0');
    box(7,.18,9,x-31,5.58,z,'#b7bbb0');
    for(let s=0;s<12;s++)box(.38,.32,5.1,x-34.5-s*.36,5.65+s*.31,z,'#aaaFA5');
    for(const dz of[-2.9,2.9])beam([x-6,1.6,z+dz],[x-28,6.5,z+dz],.08,.08,'#858d7f');
  }
  // Paved park pockets and wandering paths are deliberately irregular.
  const parkPockets=[[-1040,29,72],[-560,27,55],[-210,29,60],[155,32,75],[515,30,65],[970,33,88],[1450,31,80]].map(([z,w,d])=>[cityShore(z)-57,z,w,d]);
  for(const [x,z,w,d] of parkPockets){box(w,.13,d,x,9.62,z,'#b5b6a8');
    box(w*.8,.16,2.2,x,9.75,z-d*.36,'#8f9b8a');
  }
  for(const [z0,z1]of[[-1400,-80],[80,1850]]){
    const pts=[];for(let z=z0;z<=z1;z+=25)pts.push([cityShore(z)-56-7*Math.sin(z/83),9.62,z]);surfacePath(pts,3.2,path,.06);
  }
  // Small park furniture at a human scale.
  for(let i=0;i<54;i++){
    const z=-1250+i*49+rnd(i*13)*14,x=cityShore(z)-39-rnd(i*9)*10;
    if(Math.abs(z)<42)continue;
    box(1.8,.15,.5,x,10.03,z,'#716e54');box(1.8,.48,.09,x,10.4,z-.23,'#81795a');
    for(const dx of[-.63,.63])box(.12,.5,.44,x+dx,9.78,z,'#586052');
    if(i%4===0){cyl(.11,.14,4,x-1.8,11.6,z+5,'#737f74',5);box(.8,.14,.4,x-1.8,13.65,z+5,'#d1cdb0');}
  }
  for(const [z,w,d]of[[-600,14,8],[-255,11,8],[290,16,10],[1030,13,9]]){
    const x=cityShore(z)-63;box(w,3.8,d,x,11.5,z,'#b9b8a9');box(w+1.8,.45,d+1.5,x,13.6,z,darkRoof);
    box(w*.55,2.2,.08,x,11.5,z+d/2+.1,'#596d65');
  }

  // Moji is a steep, connected forested ridge on the upstream side. Preserve
  // the hills, including the near-shore cliff; camera clearance must be handled
  // by the camera. Only the actual narrow bridge approach cuts the terrain.
  const peaks=[
    [555,-205,119,190,250],[825,-540,171,310,350],
    [665,-1030,144,250,350],[1080,-1420,157,430,430],
    [1810,-1010,151,440,550],[1940,-1820,163,540,700],
    [765,390,63,310,410],[1170,880,100,490,620],
    [2040,390,128,700,760],[2750,-1300,195,900,1350],
    [4600,-3600,250,1650,1700],[5200,2400,215,1900,2200],
    [8000,-800,275,2600,2700]
  ];
  const inlandRoute=[[1520,-2100,24],[1490,-1550,25],[1360,-1000,23],[1210,-500,20],[1040,-90,14],[1120,230,12],[1400,700,23],[1650,1250,29],[2070,1900,35]];
  function roadValley(z){
    let j=0;while(j<inlandRoute.length-2&&z>inlandRoute[j+1][1])j++;
    const a=inlandRoute[j],b=inlandRoute[j+1],t=clamp((z-a[1])/(b[1]-a[1]),0,1);
    return [a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t];
  }
  const hillHeight=(x,z)=>{
    const d=x-hillShore(z);if(d<0)return -1;
    let h=6;
    for(const [cx,cz,peak,sx,sz]of peaks){
      const profile=peak*Math.exp(-Math.pow(Math.abs((x-cx)/sx),1.65)-Math.pow(Math.abs((z-cz)/sz),1.65));
      h=Math.max(h,profile);
    }
    h+=2.7*Math.sin(x*.029+z*.019)+1.7*Math.sin(z*.057-x*.043);
    h=3.1+(h-3.1)*smooth(d,2,59);
    // Forty metre corridor at road level, with finite, steep cut shoulders.
    if(x>405&&x<1800){const cut=smooth(Math.abs(z),21,48),level=Math.max(9.8,(api.structure?.deckHeightAt(x)??13)-3);h=level+(h-level)*cut;}
    // Lower landscaped valley behind the first ridge, visible in park photos.
    const valley=Math.exp(-(((x-1020)/165)**2)-((z+150)/185)**2);
    h-=Math.max(0,h-17)*valley*.78;
    if(z>-2200&&z<2050){const [rx,ry]=roadValley(z),edge=smooth(Math.abs(x-rx),14,72);h=Math.min(h,ry+(h-ry)*edge);}
    return Math.max(2.4,h);
  };
  ribbon(hillShore,1,-9,9,-1.6,3,'#8c947d');
  ribbon(hillShore,1,9,19,3,z=>hillHeight(hillShore(z)+19,z),stone,{uvScale:7});
  // Dense vertices near the cliff and town; coarse far skirt extends well past
  // all camera frusta and avoids the old rectangular patch of floating land.
  const xs=[19,26,36,48,62,80,102,128,158,194,236,284,340,405,480,565,660,770,895,1035,1190,1360,1545,1750,1980,2240,2540,2900,3400,4100,5000,6200,7700,9800,12500];
  const zSamples=[];for(let z=-8000;z<=-2800;z+=400)zSamples.push(z);for(let z=-2600;z<=2600;z+=26)zSamples.push(z);for(let z=2800;z<=8000;z+=400)zSamples.push(z);
  const zs=[...new Set([...zSamples,-60,-48,-40,-30,-21,21,30,40,48,60])].sort((a,b)=>a-b);
  const hp=[],hc=[],hu=[],hi=[];
  for(let j=0;j<zs.length;j++)for(let i=0;i<xs.length;i++){
    const z=zs[j],x=hillShore(z)+xs[i],y=hillHeight(x,z),n=rnd(i*17+j*37);
    hp.push(x,y,z);hu.push(x/35,z/35);
    const col=new THREE.Color('#3d573e').lerp(new THREE.Color('#62734a'),n*.72);hc.push(col.r,col.g,col.b);
    if(i<xs.length-1&&j<zs.length-1){const k=j*xs.length+i;hi.push(k,k+xs.length,k+1,k+1,k+xs.length,k+xs.length+1);}
  }
  const terrain=new THREE.BufferGeometry();terrain.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));terrain.setAttribute('color',new THREE.Float32BufferAttribute(hc,3));terrain.setAttribute('uv',new THREE.Float32BufferAttribute(hu,2));terrain.setIndex(hi);terrain.computeVertexNormals();
  mesh(terrain,customMaterial({vertexColors:true,color:'#fff',side:THREE.DoubleSide}));
  // Exposed rock seams on the steep toe, interrupted by trees and pockets of soil.
  for(let i=0;i<37;i++){
    const z=-1280+i*29+rnd(i*11)*15,x=hillShore(z)+18+rnd(i*5)*16,y=hillHeight(x,z);
    if(y<7)continue;
    const r=mesh(new THREE.DodecahedronGeometry(1,0),['#777d6a','#92907b','#777f70'][i%3],x,y-1,z);
    r.scale.set(5+rnd(i)*5,5+rnd(i+5)*9,6+rnd(i+3)*10);r.rotation.set(rnd(i)*.5,rnd(i+3),.3);
  }
  // A narrow riverside trail appears only where the cliff allows it. Jiangnan
  // Avenue is inland behind the ridge, not a giant stripe around the river edge.
  const hillTrail=[];for(let z=-1650;z<-100;z+=18){const x=hillShore(z)+39+8*Math.sin(z/170);hillTrail.push([x,hillHeight(x,z)+.5,z]);}
  surfacePath(hillTrail,2.6,'#b9b8a3');
  const inlandRoad=[];for(let z=-2100;z<=1900;z+=25){const [x]=roadValley(z);inlandRoad.push([x,hillHeight(x,z)+.35,z]);}
  surfacePath(inlandRoad,21,asphalt);surfacePath(inlandRoad,1.2,'#9ba18d',.1);
  for(let i=3;i<inlandRoad.length;i+=4){const [x,y,z]=inlandRoad[i];box(.16,.04,6,x+4.1,y+.12,z,'#d5d4bf');}
  // The former interpolated approach spur climbed the cut face and appeared
  // as an unsupported black band. Keep only the evidenced valley entrance.
  const parkRoad=[];for(let i=0;i<=12;i++){const z=-145+i*55/12,x=1015+i*25/12;parkRoad.push([x,hillHeight(x,z)+.35,z]);}surfacePath(parkRoad,6.5,asphalt);
  // Small visitor plaza and parking clearing at the valley entrance.
  const plazaX=1015,plazaZ=-145,plazaY=hillHeight(plazaX,plazaZ)+.25;
  box(61,.3,39,plazaX,plazaY,plazaZ,'#aaa99a');
  for(let i=0;i<9;i++){box(5,.025,.12,plazaX-24+i*6,plazaY+.17,plazaZ-11,'#d4d0b9');box(.12,.025,9,plazaX-26+i*6,plazaY+.17,plazaZ-7,'#d4d0b9');}
  box(5,18,2.2,plazaX+19,plazaY+9,plazaZ-14,'#8d8974');
  box(23,4,2.2,plazaX+9,plazaY+16,plazaZ-14,'#8d8974');
  box(5,18,2.2,plazaX-1,plazaY+9,plazaZ-14,'#8d8974');

  // Foliage is a connected canopy made of varied, overlapping lobes. It has
  // no evenly spaced rows of identical giant spheres. Park trunks remain visible.
  const crowns=[],farCrowns=[],forestLobes=[],trunks=[],leafPalette=['#466344','#506a43','#5c7447','#3c5b3d','#65794a','#4f6849','#727e4d'];
  const hillBuildings=[[430,290,34,20,8],[470,342,47,24,7],[508,409,37,21,10],[445,473,45,23,8],[523,527,57,27,9],[488,623,30,21,7],[561,705,38,28,10]]
    .map(([x,z,w,d,h])=>[x+widen,z,w,d,h]);
  function forestClear(x,z,pad=0){
    if(Math.abs(z)<48+pad&&x<1840)return true;
    if(((x-plazaX)/(48+pad))**2+((z-plazaZ)/(35+pad))**2<1.4)return true;
    if(z>-2200&&z<2050&&Math.abs(x-roadValley(z)[0])<19+pad)return true;
    return hillBuildings.some(([bx,bz,w,d])=>Math.abs(x-bx)<w/2+8+pad&&Math.abs(z-bz)<d/2+8+pad);
  }
  // A continuous, non-flat canopy skin fills the densely forested near-bank
  // mountain. Separate tree crowns supply the silhouette; the skin prevents
  // grass showing between trees as if this were an open landscaped lawn.
  // This is original 3D geometry, not a photograph or a distant billboard.
  const cp=[],cc=[],cu=[],ci=[],cCols=54,cRows=300,canopyColorA=new THREE.Color('#344d35'),canopyColorB=new THREE.Color('#657849');
  const canopyPoint=(i,j)=>{
    const z=-2100+j*12,offset=14+i*12,x=hillShore(z)+offset;
    const edge=smooth(offset,14,38)*smooth(662-offset,0,48)*smooth(z+2100,0,60)*smooth(1500-z,0,60);
    const rough=1.5*Math.sin(x*.34+z*.15)+1.3*Math.cos(z*.29-x*.19)+.7*Math.sin(x*.71+z*.49);
    const y=hillHeight(x,z)+(7.1+rough)*edge;
    return [x,y,z,edge];
  };
  for(let j=0;j<=cRows;j++)for(let i=0;i<=cCols;i++){
    const [x,y,z]=canopyPoint(i,j),n=.27+.23*Math.sin(x*.052+z*.034)+.18*Math.cos(z*.063-x*.029)+rnd(i*41+j*67)*.25;
    cp.push(x,y,z);cu.push(x/12,z/12);const c=canopyColorA.clone().lerp(canopyColorB,clamp(n,0,1));cc.push(c.r,c.g,c.b);
    if(i<cCols&&j<cRows){const [mx,,mz]=canopyPoint(i+.5,j+.5);if(!forestClear(mx,mz,4)){const k=j*(cCols+1)+i;ci.push(k,k+cCols+1,k+1,k+1,k+cCols+1,k+cCols+2);}}
  }
  const canopyGeo=new THREE.BufferGeometry();canopyGeo.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));canopyGeo.setAttribute('color',new THREE.Float32BufferAttribute(cc,3));canopyGeo.setAttribute('uv',new THREE.Float32BufferAttribute(cu,2));canopyGeo.setIndex(ci);canopyGeo.computeVertexNormals();
  const canopySkin=mesh(canopyGeo,customMaterial({color:'#fff',vertexColors:true,side:THREE.DoubleSide}));canopySkin.castShadow=false;noInk.push(canopySkin);
  // Low polygon crown lobes overlap the skin at a much denser, geographically
  // targeted interval. They are partly embedded, so the forest reads as a
  // connected rough volume, not a field of separate spherical tree ornaments.
  for(let j=0;j<153;j++)for(let i=0;i<29;i++){
    const seed=j*173+i*37,z=-1500+j*18+(rnd(seed+1)-.5)*9,x=hillShore(z)+22+i*18+(rnd(seed+2)-.5)*8;
    if(forestClear(x,z,6)||rnd(seed+3)>.7)continue;
    const y=hillHeight(x,z),r=5+rnd(seed+4)*3.6;
    for(let l=0;l<2;l++)forestLobes.push({pos:[x+(l?2.7:-2.2),y+7+rnd(seed+5+l)*2,z+(rnd(seed+8+l)-.5)*6],scale:[r,3+rnd(seed+12+l)*2.8,r*(.75+rnd(seed+16+l)*.45)],rotation:[rnd(seed)*.22,rnd(seed+9)*TAU,rnd(seed+7)*.19],color:leafPalette[Math.floor(rnd(seed+20+l)*leafPalette.length)]});
  }
  function tree(x,z,height=10,y=ground,seed=1,forest=false){
    const r=height*(.24+rnd(seed+15)*.12),lean=(rnd(seed+7)-.5)*1.8;
    // Preserve every tree and overlapping lobe; only distant crown tessellation
    // changes. Distance is measured to the actual main bridge segment, not to
    // the world origin, so both bridgehead parks retain full crown detail.
    const crownSet=Math.hypot(Math.max(0,Math.abs(x)-468),z)>1100?farCrowns:crowns;
    if(!forest||rnd(seed+8)>.55)trunks.push({pos:[x,y+height*.28,z],scale:[.16+height*.019,height*.56,.16+height*.019],color:'#65674d'});
    for(let l=0;l<3;l++){
      const a=rnd(seed*13+l*31)*TAU,s=.68+rnd(seed*9+l*29)*.4;
      crownSet.push({pos:[x+Math.cos(a)*r*.5+lean,y+height*(.67+l*.055),z+Math.sin(a)*r*.5],scale:[r*s,r*(.8+rnd(seed+l)*.7),r*(.7+rnd(seed+2*l)*.65)],rotation:[rnd(seed+l)*.25,a,rnd(seed+l*3)*.22],color:leafPalette[Math.floor(rnd(seed+11*l)*leafPalette.length)]});
    }
  }
  // Jittered forest samples, two densities; keep true roads and the valley clear.
  for(let i=0;i<7400;i++){
    const z=-2500+rnd(i*7+107)*4000,x=hillShore(z)+31+rnd(i*7+109)*1980,y=hillHeight(x,z);
    if(forestClear(x,z,1))continue;
    const density=.61+.17*Math.sin(z/131)+.14*Math.sin(x/98+z/76);
    if(rnd(i*7+111)>density)continue;
    const near=x<1100&&z>-1800&&z<700;
    if(!near&&i%2)continue;
    tree(x,z,(near?8:11)+rnd(i*7+113)*(near?8:13),y,i+4000,true);
  }
  for(let i=0;i<390;i++){
    const z=-1760+rnd(i*11+3)*3900,x=cityShore(z)-40-rnd(i*11+2)*35;
    if(Math.abs(z)<44)continue;
    if(parkPockets.some(p=>Math.abs(x-p[0])<p[2]*.4&&Math.abs(z-p[1])<p[3]*.4))continue;
    tree(x,z,8+rnd(i*11+4)*10,ground,i+12000);
  }
  for(let i=0;i<110;i++){
    const z=-1700+rnd(i*17+1)*3500,x=cityShore(z)-122-rnd(i*17+2)*16;
    if(Math.abs(z)<47)continue;tree(x,z,8+rnd(i*17+3)*7,ground,i+16000);
  }

  // Modular facade materials keep a consistent 3–3.5 m storey height, instead
  // of stretching the same sixteen windows onto every possible building mass.
  const styles=[
    ['#c8c3b2','#606f6c','#a69d88'],['#b9bcb3','#65736f','#979e91'],
    ['#c8c9bc','#657978','#a4aea3'],['#aeb9b7','#526d70','#899e9c'],
    ['#d4c5ad','#66716b','#b29b7e'],['#b3b0a3','#5a6b67','#8b9285'],
    ['#bfc5bf','#4f6869','#92a19a'],['#929f9e','#496265','#7b8f8d']
  ];
  const facades=styles.map(([base,window,trim],style)=>{
    const map=repeatTexture(512,512,(c,W,H)=>{
      c.fillStyle=base;c.fillRect(0,0,W,H);
      for(let r=0;r<4;r++)for(let k=0;k<4;k++){
        const x=k*128,y=r*128,n=rnd(r*37+k*11+style*103);
        c.fillStyle=window;c.fillRect(x+24,y+21,78,74);
        c.fillStyle='rgba(200,220,213,.22)';c.fillRect(x+27,y+24,72,5);
        c.fillStyle=trim;c.fillRect(x+62,y+19,4,78);c.fillRect(x+21,y+65,84,4);
        if(style===0||style===4){c.fillStyle=trim;c.fillRect(x+13,y+94,102,10);c.fillStyle='rgba(46,61,52,.22)';c.fillRect(x+14,y+103,101,7);}
        if(n<.32){c.fillStyle='rgba(219,208,175,.5)';c.fillRect(x+28,y+26,29,64);}
        if(style===5&&n>.5){c.fillStyle='#979f91';c.fillRect(x+103,y+84,20,15);c.fillStyle='#5a665a';c.fillRect(x+106,y+87,14,9);}
      }
      c.fillStyle=trim;for(let r=0;r<4;r++)c.fillRect(0,r*128+121,W,7);
      if(style===3||style===7){c.fillStyle='rgba(226,231,215,.2)';for(let k=0;k<=4;k++)c.fillRect(k*128,0,5,H);}
      for(let i=0;i<250;i++){c.fillStyle='rgba(52,62,51,.025)';c.fillRect(rnd(i*3)*W,rnd(i*3+1)*H,1,5+rnd(i*3+2)*24);}
    });
    const lit=repeatTexture(512,512,(c,W,H)=>{
      c.fillStyle='#000';c.fillRect(0,0,W,H);
      for(let r=0;r<4;r++)for(let k=0;k<4;k++)if(rnd(r*37+k*11+style*103)<.25){c.fillStyle='#a58d5f';c.fillRect(k*128+25,r*128+22,76,72);}
    });
    const m=customMaterial({map,color:'#fff',emissive:'#fff',emissiveMap:lit,emissiveIntensity:0});emissives.push({mat:m,value:.62});return m;
  });
  function facade(w,h,x,y,z,style,ry,parent){
    const geo=new THREE.PlaneGeometry(w,h),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*w/13,uv.getY(i)*h/12.8);}uv.needsUpdate=true;
    const p=mesh(geo,facades[style],x,y,z,parent);p.rotation.y=ry;p.castShadow=false;
  }
  const footprints=[];
  function building({x,z,w,d,h,style=0,rot=0,kind='slab',detail=true,y=ground}){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;group.add(g);
    footprints.push({x,z,w,d,h});
    const base=styles[style][0];
    box(w,h,d,0,h/2,0,base,g);
    facade(w-.3,h-1,0,h/2,d/2+.035,style,0,g);facade(w-.3,h-1,0,h/2,-d/2-.035,style,Math.PI,g);
    facade(d-.3,h-1,w/2+.035,h/2,0,style,Math.PI/2,g);facade(d-.3,h-1,-w/2-.035,h/2,0,style,-Math.PI/2,g);
    box(w+.8,.65,d+.8,0,h+.325,0,base,g);
    box(w-1,.18,d-1,0,h+.69,0,darkRoof,g);
    for(const x1 of[-w*.31,w*.31])box(5.2,2.8,4.5,x1,h+1.9,-d*.15,'#9fa79b',g);
    if(kind==='tower'){
      // Distinct projecting balcony bays and roof crowns make the riverfront
      // residences readable as slab towers in a real Chinese neighbourhood.
      for(const zz of[-d*.27,d*.27]){
        box(2.2,h-3,Math.min(8,d*.25),w/2+.8,(h-3)/2,zz,styles[style][2],g);
        facade(Math.min(8,d*.25)-.2,h-4,w/2+1.92,(h-3)/2,zz,style,Math.PI/2,g);
      }
      box(w*.82,3.2,d*.82,0,h+2.2,0,base,g);box(w*.55,2.8,d*.5,0,h+5.2,0,base,g);
      if(detail)for(let floor=4;floor<h-2;floor+=3.2)for(const zz of[-d*.3,d*.3])box(2.5,.16,d*.23,w/2+1.1,floor,zz,base,g);
    }else if(kind==='old'){
      // Old blocks have stair boxes, small rooftop services, patchy flat roofs.
      for(let xx=-w*.3;xx<w*.45;xx+=14)box(4.4,3.2,d*.67,xx,h+1.9,-d*.08,'#aaa99b',g);
      if(detail)for(let zz=-d*.32;zz<d*.35;zz+=5.7)box(1.1,1.1,.6,w/2+.6,6.8,zz,'#979f91',g);
    }else if(kind==='glass'){
      for(const zz of[-d/2,d/2])box(w+.6,1.1,.4,0,h*.58,zz,'#b0beb8',g);
      box(w*.8,4,d*.8,0,h+2.8,0,'#8e9f9a',g);
    }
    return g;
  }
  function b(x,z,w,d,h,style=0,kind='slab',rot=0,detail=true){return building({x,z,w,d,h,style,kind,rot,detail});}
  // Named features are deliberately limited to evidence-backed places. The
  // many anonymous residential masses are manually grouped from aerials.
  // Near bridge / upstream: beige residential slabs set behind the park.
  const towers=[
    [-515,-160,27,44,91,4],[-566,-190,29,43,102,0],[-620,-165,28,45,96,4],
    [-523,-287,28,38,79,0],[-583,-315,29,45,91,4],[-650,-304,30,46,87,0],
    [-552,-433,26,43,72,1],[-624,-455,27,40,79,2],[-700,-420,30,44,84,1],
    [-499,-635,30,47,67,2],[-576,-645,32,49,74,0],[-665,-662,31,44,80,2],
    [-745,-570,29,49,92,0],[-806,-505,27,42,84,4],
    [-552,172,29,39,64,1],[-612,210,27,43,77,2],[-690,182,33,41,72,1],
    [-579,341,27,41,92,2],[-654,371,31,46,88,0],[-727,321,29,44,81,2],
    [-587,995,30,43,99,0],[-657,1042,30,47,104,2],[-730,1032,30,48,97,0],
    [-532,1180,32,44,77,2],[-615,1230,31,45,89,0],[-708,1235,29,44,81,2],
    [-810,755,31,47,88,1],[-865,826,30,48,102,0],[-923,912,31,46,96,2]
  ];
  towers.forEach(([x,z,w,d,h,s],i)=>b(x,z,w,d,h,s,'tower',i%4===0?.045:0));
  // The closest ground floors are shops and podiums, not towers planted in grass.
  for(const [x,z,w,d,h,s]of[[-530,-200,80,85,9.6,4],[-614,-307,110,67,10,0],[-540,-470,69,59,12,1],[-563,210,90,81,9,1],[-646,355,111,92,10,2]])b(x,z,w,d,h,s,'slab',0,false);
  // Dense old city behind the river frontage. Individually composed courtyards
  // and narrow alleys deliberately break the old seven-by-eight high-rise grid.
  const oldBlocks=[
    [-548,-76,65,15,18,5],[-644,-80,70,16,21,1],[-750,-95,80,15,18,5],
    [-717,-217,63,17,21,5],[-783,-264,17,70,18,1],[-785,-189,67,15,18,5],
    [-757,-342,72,16,21,1],[-857,-343,82,16,18,5],[-890,-265,16,91,21,1],
    [-848,-130,72,17,18,1],[-958,-152,62,16,21,5],[-1003,-238,17,91,18,1],
    [-908,-462,96,15,21,5],[-1019,-455,74,17,18,1],[-979,-372,16,67,21,5],
    [-758,92,72,16,18,1],[-848,94,72,16,21,5],[-932,86,62,16,18,1],
    [-811,191,17,78,21,5],[-917,198,91,17,18,1],[-1025,190,66,17,21,5],
    [-847,297,75,17,18,5],[-963,293,83,17,24,1],[-1052,314,17,71,18,5],
    [-791,427,17,75,21,1],[-887,420,81,17,21,5],[-990,421,74,17,18,1],
    [-775,-735,88,16,21,1],[-887,-708,73,15,18,5],[-980,-663,17,79,21,1],
    [-710,-855,81,16,21,5],[-810,-846,84,17,18,1],[-932,-850,89,15,21,5],
    [-771,1117,65,16,18,5],[-872,1137,78,18,24,1],[-966,1073,17,84,21,5],
    [-1085,570,86,17,21,1],[-1133,693,18,84,24,5],[-1047,788,88,17,18,1]
  ];oldBlocks.forEach(([x,z,w,d,h,s],i)=>b(x,z,w,d,h,s,'old',(i%7===0?.035:0)));
  // Second line skyline: several distinct developments, spaced across hills and
  // old neighbourhoods. Low detail in the distance keeps the scene responsive.
  const farTowers=[[-1040,-1000,85],[-1120,-1080,92],[-1210,-1060,80],[-1150,-810,108],[-1240,-760,103],[-1320,-880,97],[-1100,-540,78],[-1190,-500,84],[-1290,-440,73],[-1280,-180,90],[-1390,-220,96],[-1470,-130,88],[-1250,280,99],[-1340,340,105],[-1430,270,96],[-1180,1030,93],[-1280,1090,98],[-1370,1030,91],[-890,1420,90],[-970,1450,98],[-1070,1480,102],[-630,1540,83],[-716,1630,94],[-805,1650,90],[-590,-1250,73],[-680,-1320,80],[-810,-1340,77],[-1030,-1600,95],[-1170,-1660,101],[-1290,-1580,92]];
  farTowers.forEach(([x,z,h],i)=>b(x,z,29+i%3*3,44+i%4*3,h,i%5,'tower',(i%3-1)*.035,false));
  // Distant city fabric, irregular blocks with a much lower skyline resolution.
  for(let i=0;i<112;i++){
    const z=-4300+rnd(i*11+1)*8900,x=-1500-rnd(i*11+2)*4300;
    if(Math.abs(z)<65)continue;
    b(x,z,35+rnd(i*11+3)*34,40+rnd(i*11+4)*53,18+rnd(i*11+5)*77,i%5,'slab',(rnd(i*11+6)-.5)*.14,false);
  }
  // Downstream: riverside Wanda's broad retail podium and the 21-storey hotel.
  // Their placement is approximate, but the large mall / tall hotel / apartment
  // relationship is based on the aerial, not an invented landmark silhouette.
  b(-604,729,156,180,22,4,'slab');
  b(-661,732,49,117,26,4,'slab');
  const mallRoof=box(125,.7,151,-604,32.3,729,'#a8aca0');
  for(let i=0;i<6;i++)box(8,2.1,13,-653+i*20,33.5,728+(i%2)*37,'#9aa599');
  b(-511,812,39,57,76,4,'glass');
  b(-533,814,77,92,13,4,'slab');
  // Hotel river facade has a narrower central glazing band and solid end walls.
  box(.3,66,23,-491.25,ground+39,812,'#597a7d');
  for(let yy=18;yy<80;yy+=3.2)box(.42,.17,24,-491.05,yy,812,'#bdc3b5');
  const textMat=(text,color='#dedccc',bg='#7b8177',w=1024,h=128)=>{
    const map=texture(w,h,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=font(70,600);c.fillText(text,W/2,H/2);});return customMaterial({map,color:'#fff',side:THREE.DoubleSide});
  };
  plane(47,5,-525.2,30.2,729,textMat('万达广场','#e9e3d1','#a58063'),Math.PI/2);
  plane(28,2.6,-491,84.2,812,textMat('皇冠假日酒店','#ded6bd','#777c71'),Math.PI/2);
  // A glass office volume seen beyond the retail cluster, kept anonymous.
  b(-740,617,41,50,123,3,'glass');

  // Actual city street structure: the bridge axis is Shengli Third Road, with
  // Yanjiang Avenue at the water and additional parallel streets inland.
  // Trace modest streets through the actual gaps in the placed blocks. These
  // are contextual streets, so they are anonymous; no road slices through a tower.
  const streetPaths=[];
  function neighbourhoodStreet(nominal,range=150){
    const points=[],step=25,candidates=[];for(let x=nominal-range;x<=nominal+range;x+=10)candidates.push(x);
    let prev=nominal;
    for(let z=-1900;z<=2200;z+=step){
      const choices=candidates.map(x=>{
        const hit=footprints.some(b=>Math.abs(z-b.z)<b.d/2+18&&Math.abs(x-b.x)<b.w/2+17);
        return {x,cost:(hit?100000:0)+Math.abs(x-nominal)*.23+Math.abs(x-prev)};
      }).sort((a,b)=>a.cost-b.cost);
      const x=choices[0].x;points.push([x,ground+.08,z]);prev=x;
    }
    // Intersections are at grade. The thin raised pavements follow both sides.
    streetPaths.push(points);surfacePath(points,18,asphalt,.02);
    for(let i=1;i<points.length;i+=2){const p=points[i],a=points[i-1],angle=Math.atan2(p[0]-a[0],p[2]-a[2]);const dash=box(.13,.027,6,p[0],ground+.15,p[2],'#cccdbb');dash.rotation.y=angle;}
  }
  for(const x of[-760,-1110,-1460])neighbourhoodStreet(x,x===-760?115:135);
  for(const z of[-1130,-535,484,1330]){
    box(980,.09,12,-978,ground+.1,z,asphalt);
    for(let x=-500;x>-1500;x-=27)box(10,.025,.13,x,ground+.16,z,'#d3d2c0');
  }
  // Ground road remains visible below the separately built elevated approach.
  box(1950,.11,36,-1430,ground+.09,0,asphalt);
  for(let x=-485;x>-2350;x-=22)for(const z of[-11,11])box(8,.03,.13,x,ground+.17,z,'#d7d8c6');
  // Side alleys and pavement edges tie each group together at close range.
  for(const [x,z,w,d]of[[-590,-93,255,8],[-840,-368,350,8],[-898,-109,300,7],[-890,250,340,9],[-670,510,310,8],[-807,987,420,9]])box(w,.08,d,x,ground+.12,z,'#737d76');

  // Tight low-rise urban fabric fills the real old-town texture behind the
  // frontage. Test full footprints against existing towers and traced streets;
  // add small slabs around courts, rather than isolated high-rises on green land.
  const crossStreets=[-1130,-535,484,1330],alleyRects=[[-590,-93,255,8],[-840,-368,350,8],[-898,-109,300,7],[-890,250,340,9],[-670,510,310,8],[-807,987,420,9]];
  function vacantCity(x,z,w,d,margin=3){
    if(x+w/2>cityShore(z)-128||Math.abs(z)<d/2+25)return false;
    if(crossStreets.some(sz=>Math.abs(z-sz)<d/2+10)&&x>-1490)return false;
    if(alleyRects.some(([ax,az,aw,ad])=>Math.abs(x-ax)<(w+aw)/2+2&&Math.abs(z-az)<(d+ad)/2+2))return false;
    if(footprints.some(f=>Math.abs(x-f.x)<(w+f.w)/2+margin&&Math.abs(z-f.z)<(d+f.d)/2+margin))return false;
    for(const pts of streetPaths){const k=clamp(Math.round((z+1900)/25),0,pts.length-1);for(let t=Math.max(0,k-2);t<=Math.min(pts.length-1,k+2);t++)if(Math.abs(z-pts[t][2])<d/2+15&&Math.abs(x-pts[t][0])<w/2+14)return false;}
    return true;
  }
  for(let j=0;j<81;j++)for(let i=0;i<21;i++){
    const seed=i*97+j*139,x=-520-i*61+(rnd(seed+3)-.5)*17,z=-1740+j*45+(rnd(seed+4)-.5)*10;
    if(rnd(seed+2)>.86)continue;
    const turned=rnd(seed+7)<.21,w=turned?14+rnd(seed+9)*5:31+rnd(seed+9)*22,d=turned?30+rnd(seed+10)*18:13+rnd(seed+10)*5;
    if(!vacantCity(x,z,w,d))continue;
    const h=12.8+Math.floor(rnd(seed+13)*4)*3.2;
    // A paved court makes the city base read as urban blocks at aerial distance.
    box(w+6,.035,d+6,x,ground+.04,z,['#a29d8c','#92968b','#a9a291'][i%3]);
    b(x,z,w,d,h,[1,5,5,0,2][(i+j)%5],'old',0,false);
  }
  // Far city remains continuously built up. Larger, simpler masses represent
  // groups of old blocks with roof terraces, with a fraction of near-detail cost.
  for(let j=0;j<57;j++)for(let i=0;i<24;i++){
    const seed=i*71+j*193,x=-1840-i*156+(rnd(seed+5)-.5)*42,z=-4200+j*148+(rnd(seed+6)-.5)*38;
    if(rnd(seed+2)>.82)continue;
    const w=65+rnd(seed+11)*48,d=42+rnd(seed+12)*42;
    if(!vacantCity(x,z,w,d,8))continue;
    const h=13+rnd(seed+15)*20;
    // A pair of offset wings creates a courtyard/roofscape silhouette.
    b(x,z,w,d*.34,h,(i+j)%3===0?5:1,'slab',0,false);
    b(x-w*.31,z+d*.32,w*.32,d*.5,h+3.2,(i+j)%4===0?0:5,'slab',0,false);
    box(w+11,.04,d+12,x,ground+.05,z,'#96968b');
  }

  // Jiumatou / Three Gorges visitor waterfront: narrow gangways, floating
  // pontoons, moored white tourist vessels and service boats lie downstream.
  function vessel(x,z,length=68,width=13,seed=1,heading=0){
    const g=new THREE.Group();g.position.set(x,.5,z);g.rotation.y=heading;group.add(g);
    const outline=new THREE.Shape();outline.moveTo(-width*.42,-length*.48);outline.lineTo(width*.42,-length*.48);outline.lineTo(width*.5,length*.25);outline.quadraticCurveTo(width*.45,length*.43,0,length*.52);outline.quadraticCurveTo(-width*.45,length*.43,-width*.5,length*.25);outline.closePath();
    const hull=new THREE.ExtrudeGeometry(outline,{depth:2.7,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.4,bevelThickness:.3});hull.rotateX(-Math.PI/2);
    mesh(hull,'#404f50',0,0,0,g);box(width*.9,.45,length*.82,0,2.8,-length*.04,'#d6d8c8',g);
    for(let deck=0;deck<3;deck++){
      const l=length*(.69-deck*.08),y=4+deck*3.2;
      box(width*(.8-deck*.06),2.6,l,0,y,-length*.05,'#d4d7cd',g);
      for(const side of[-1,1]){
        box(.07,1.5,l*.9,side*width*(.403-deck*.03),y+.22,-length*.05,'#4f7074',g);
        for(let zz=-l*.44;zz<l*.42;zz+=3.6)box(.12,1.7,.17,side*width*(.41-deck*.03),y+.2,zz-length*.05,'#d1d7cd',g);
        box(.12,.16,l+1,side*width*(.43-deck*.03),y+1.55,-length*.05,'#eee8d2',g);
      }
      box(width*(.9-deck*.06),.25,l+2,0,y+1.5,-length*.05,'#d6d9cf',g);
    }
    box(width*.62,.22,length*.35,0,12.2,-length*.05,'#97a69a',g);
    box(3.2,2.5,4.3,0,13.4,-length*.13,'#c6ccc0',g);cyl(.1,.13,6,0,15,length*.21,'#a4b1a7',5,g);
    for(const side of[-1,1])for(let j=0;j<4;j++){box(.5,.9,1.5,side*width*.49,5.2,-length*.18+j*length*.13,seed%2?'#c97143':'#d8b552',g);}
    // Real hull silhouette, decks and window band are all 3D, not photo cards.
    return g;
  }
  const moorings=[[305,63,13],[490,76,14],[682,84,15],[914,67,13],[1110,93,16],[1340,76,14]];
  for(let i=0;i<moorings.length;i++){
    const [z,L,W]=moorings[i],sx=cityShore(z),px=sx+47+i%2*8;
    const gang=box(67,1.1,4.1,sx+15,3.7,z-33,'#989f90');gang.rotation.z=-.045;
    for(const dz of[-2,2])beam([sx-18,6,z-33+dz],[sx+49,3,z-33+dz],.08,.1,'#b5bdb0');
    box(17,2.2,L*.9,px,1.6,z,'#828e81');
    for(let zz=-L*.4;zz<L*.4;zz+=11)cyl(.17,.2,3.7,px+7.3,4,z+zz,'#7f9285',5);
    vessel(px+22,z,L,W,i,i%2?.025:-.025);
  }
  // Low, long passenger-service building behind the gangways.
  b(-450,1103,25,101,7.8,2,'slab');
  plane(57,3.3,-437.35,15.2,1103,textMat('三峡游客中心','#e2e1d3','#527275'),Math.PI/2);
  // Downstream hill-bank low roofs appear in the aerial; keep them sparse.
  for(const [x,z,w,d,h]of hillBuildings){
    const y=hillHeight(x,z);box(w,h,d,x,y+h/2,z,'#b6bdb0');box(w+1,.65,d+1,x,y+h+.3,z,'#8a9790');
    for(let k=-w*.35;k<w*.4;k+=6)box(2.9,2.8,.08,x+k,y+4,z+d/2+.07,'#607a75');
  }

  // A small number of parked / at-grade road vehicles provide the actual scale
  // of the landscape; bridge traffic is built by the separate bridge module.
  function car(x,y,z,seed,angle=0){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;group.add(g);
    const colors=['#d8ddd5','#d2d2c6','#657e81','#8d9997','#a07b70','#e3deca'];
    box(1.8,1.1,4.2,0,.65,0,colors[seed%colors.length],g);box(1.6,.7,2.5,0,1.4,-.12,'#667c7c',g);box(1.62,.12,2.2,0,1.8,-.1,colors[seed%colors.length],g);
    for(const xx of[-.91,.91])for(const zz of[-1.3,1.3]){const w=cyl(.34,.34,.17,xx,.36,zz,'#3f4944',6,g);w.rotation.z=Math.PI/2;}
  }
  for(let i=0;i<48;i++){const z=-1600+rnd(i*7+3)*3600;if(Math.abs(z)<55)continue;const lane=i%2?92:104;car(cityShore(z)-lane,ground+.1,z,i,i%2?Math.PI:0);}
  for(let i=0;i<7;i++)car(plazaX-22+i*6,plazaY+.2,plazaZ-4,80+i,0);
  // Small urban canopy patches within the courtyards and beside streets.
  for(let i=0;i<170;i++){
    const x=-560-rnd(i*7+191)*930,z=-1450+rnd(i*7+193)*3000;
    if(Math.abs(z)<34||footprints.some(b=>Math.abs(x-b.x)<b.w*.6+3&&Math.abs(z-b.z)<b.d*.6+3))continue;
    if([-740,-1080,-1440].some(rx=>Math.abs(x-rx)<18))continue;
    tree(x,z,7+rnd(i*7+195)*9,ground,20000+i);
  }
  for(const [items,detail]of[[crowns,1],[farCrowns,0]])if(items.length){const canopies=instance(new THREE.IcosahedronGeometry(1,detail),material('#fff'),items);canopies.castShadow=false;noInk.push(canopies);}
  if(forestLobes.length){const edgeCrowns=instance(new THREE.IcosahedronGeometry(1,0),material('#fff'),forestLobes);edgeCrowns.castShadow=false;noInk.push(edgeCrowns);}
  if(trunks.length){const stems=instance(new THREE.CylinderGeometry(1,1,1,5),material('#fff'),trunks);stems.castShadow=false;}
  return {cityShore,hillShore,hillHeight,facades,towers:footprints};
}
