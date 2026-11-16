import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCbd } from './landmarks/cbd.js';
import { buildGuomao } from './landmarks/guomao.js';
import { buildGuomaoWeather } from './landmarks/guomao-weather.js';

// Original Yichang street compositions, based on CBD and Guomao reference photos.
// Building dimensions and the relation between streets are artistic approximations.
const LOOP = 24000;
const TAU = Math.PI * 2;
const palette = {
  cream:'#d5d4c9', stone:'#b2b4ac', warm:'#9b806a', coral:'#a76a53', navy:'#293e43',
  glass:'#536d70', mint:'#79948a', dark:'#303a3c', pavement:'#b9bcb6', asphalt:'#696e72',
  yellow:'#bdae79', green:'#3e5d45', leaf:'#48694b', bark:'#6e6559', steel:'#65706e'
};
const seeded = (n) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };

export function createWorld(id = 'cbd') {
  const isCBD = id !== 'guomao';
  const group = new THREE.Group(); group.name = isCBD ? 'CBD · 购物中心' : '国贸 · 东山大道';
  const glow = [], noInk = [], staticMeshes = [], materials = new Map(), textures = [], animated = [], lamps = [], emissives = [], umbrellas = [];
  const swapObjects = [];
  let night = false;

  function material(color, options={}) {
    const key = color + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({color, ...options}));
    return materials.get(key);
  }
  function customMaterial(options) { const m = new THREE.MeshLambertMaterial(options); materials.set(m.uuid,m); return m; }
  function addMesh(geometry, mat, x=0,y=0,z=0, parent=group, merge=true) {
    const obj = new THREE.Mesh(geometry, typeof mat === 'string' ? material(mat) : mat);
    obj.position.set(x,y,z); obj.castShadow = true; obj.receiveShadow = true; parent.add(obj);
    if (merge && parent === group) staticMeshes.push(obj);
    return obj;
  }
  function box(w,h,d,x,y,z,col,parent=group,merge=true) { return addMesh(new THREE.BoxGeometry(w,h,d),col,x,y,z,parent,merge); }
  function cyl(rt,rb,h,x,y,z,col,n=10,parent=group,merge=true) { return addMesh(new THREE.CylinderGeometry(rt,rb,h,n),col,x,y,z,parent,merge); }
  function sphere(r,x,y,z,col,parent=group,merge=true) { return addMesh(new THREE.IcosahedronGeometry(r,1),col,x,y,z,parent,merge); }
  function plane(w,h,x,y,z,mat,ry=0,parent=group,merge=true) {
    const o=addMesh(new THREE.PlaneGeometry(w,h),mat,x,y,z,parent,merge); o.rotation.y=ry; o.castShadow=false; return o;
  }
  function canvasTexture(width,height,draw) {
    const c=document.createElement('canvas'); c.width=width/2; c.height=height/2;
    const ctx=c.getContext('2d');ctx.scale(.5,.5);
    draw(ctx,width,height);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
    textures.push(t); return t;
  }
  // Generated photographic textures load asynchronously; callers keep the
  // material and the map fills in. `ready` holds the scene behind the loader
  // so the first rendered frame already contains the final surfaces.
  const textureLoader=new THREE.TextureLoader(), pendingTextures=[];
  // Chrome refuses a crossOrigin="anonymous" image request from a file:// page,
  // so the double-click entry (local.bundle.js) loads the same PNGs without it.
  if (location.protocol === 'file:') textureLoader.crossOrigin = undefined;
  function imageTexture(path) {
    let settle;
    const ready=new Promise(resolve=>{settle=resolve;});
    // The file:// bundle carries the same photographs as data URLs, because a
    // local PNG cannot be uploaded to WebGL from a disk page.
    const t=textureLoader.load(globalThis.__LOCAL_TEXTURES__?.[path] || path,()=>{
      t.userData.onLoad?.forEach(fn=>fn());
      settle();
    },undefined,settle);
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
    textures.push(t);pendingTextures.push(ready);return t;
  }
  function font(size,weight=600) { return `${weight} ${size}px "Scene Sans", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`; }
  function textTexture(text, bg, fg, {sub='',size=100,vertical=false,border=false}={}) {
    const w=vertical?256:1024,h=vertical?1024:256;
    return canvasTexture(w,h,(c,W,H)=>{
      c.fillStyle=bg; c.fillRect(0,0,W,H);
      if(border){ c.strokeStyle=fg;c.lineWidth=8;c.strokeRect(14,14,W-28,H-28); }
      c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font=font(size,700);
      if(vertical){ [...text].forEach((letter,i,all)=>c.fillText(letter,W/2,H*(i+.5)/all.length)); }
      else { c.fillText(text,W/2,sub?H*.40:H*.52,W-70); if(sub){c.font=font(28,500);c.globalAlpha=.8;c.fillText(sub,W/2,H*.79,W-70);} }
    });
  }
  function sign(text,x,y,z,w,h,bg=palette.dark,fg=palette.cream,opts={}) {
    const tex=textTexture(text,bg,fg,opts);
    const m=customMaterial({map:tex,color:'#ffffff',emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:0,side:THREE.DoubleSide});
    emissives.push({mat:m,value:opts.bright?1.2:.75});
    const back=box(w+.25,h+.25,.4,x,y,z-.21,palette.dark);
    const face=plane(w,h,x,y,z+.02,m,opts.ry||0); glow.push(face);
    return face;
  }
  function fin(x,y,z,w,h,d,col=palette.cream){return box(w,h,d,x,y,z,col);}
  function facade(w,h,{base=palette.navy,cols=8,rows=10,seed=1,warm=.22}={}) {
    const tex=canvasTexture(1024,1024,(c,W,H)=>{
      c.fillStyle=base;c.fillRect(0,0,W,H);
      const cw=W/cols,ch=H/rows;
      for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
        const n=seeded(seed+r*17+k*7);c.fillStyle=n<warm?'#c4ba83':n<.55?'#4f7a7b':'#326068';
        c.fillRect(k*cw+5,r*ch+5,cw-10,ch-14);
        c.fillStyle='rgba(233,236,210,.25)';c.fillRect(k*cw+8,r*ch+8,cw-16,5);
        c.fillStyle='rgba(18,44,49,.5)';c.fillRect(k*cw+cw*.48,r*ch+7,3,ch-18);
      }
      c.fillStyle='rgba(223,232,213,.16)';c.beginPath();c.moveTo(W*.65,0);c.lineTo(W,0);c.lineTo(W*.48,H);c.lineTo(W*.22,H);c.closePath();c.fill();
    });
    const lit=canvasTexture(1024,1024,(c,W,H)=>{
      c.fillStyle='#000';c.fillRect(0,0,W,H);const cw=W/cols,ch=H/rows;
      for(let r=0;r<rows;r++)for(let k=0;k<cols;k++)if(seeded(seed+r*17+k*7)<warm+.18){c.fillStyle=seeded(r*4+k)>.4?'#cabc81':'#9dcec0';c.fillRect(k*cw+7,r*ch+7,cw-14,ch-20);}
    });
    const m=customMaterial({map:tex,color:'#ffffff',emissive:'#ffffff',emissiveMap:lit,emissiveIntensity:0});emissives.push({mat:m,value:.9});return m;
  }
  function roofEquipment(x,z,w,d,y,style=0){
    box(w+.65,.6,d+.65,x,y+.3,z,palette.cream);
    for(const side of [-1,1])box(.25,.8,d,x+side*w/2,y+.8,z,palette.stone);
    box(w,.8,.25,x,y+.8,z-d/2,palette.stone);
    for(let i=0;i<3;i++){
      const hx=x-w*.29+i*w*.25;
      box(2.1,1.3,2.9,hx,y+1.25,z-d*.12,palette.steel);
      const fan=cyl(.55,.55,.12,hx,y+1.95,z-d*.12,palette.dark,12);
      box(1.9,.18,2.7,hx,y+1.92,z-d*.12,palette.stone);
    }
    cyl(.08,.08,4.3,x+w*.35,y+2.4,z-d*.25,palette.steel,6);
    box(1.5,.08,.1,x+w*.35,y+4.2,z-d*.25,palette.steel);
  }
  function shopfronts(x,z,w,seed=1){
    const names=['江边咖啡','一碗热面','慢慢书店','山城小铺','橘子汽水','巷里鲜花','街角面包','三峡茶事'];
    const colors=[palette.mint,palette.coral,palette.navy,palette.yellow];
    const n=Math.max(2,Math.floor(w/5.5)),cw=w/n;
    for(let i=0;i<n;i++){
      const sx=x-w/2+cw*(i+.5),color=colors[(i+seed)%colors.length];
      box(cw-.28,3.4,.3,sx,1.9,z,palette.dark);
      const m=material('#73918a');box(cw-.7,2.5,.15,sx,1.55,z+.24,m);
      for(let k=1;k<3;k++)box(.1,2.65,.18,sx-cw/2+k*cw/3,1.6,z+.38,palette.cream);
      sign(names[(i+seed)%names.length],sx,3.65,z+.5,cw-.2,.85,color,'#fff5da',{size:92});
      const aw=box(cw-.1,.16,1.4,sx,2.95,z+.85,color);aw.rotation.x=.13;
      box(cw-.1,.4,.12,sx,2.82,z+1.5,color);
      if(i%2===0){box(.65,1.05,.3,sx+cw*.31,.62,z+1.5,palette.cream);sign('今日营业',sx+cw*.31,.75,z+1.69,.56,.55,palette.cream,palette.dark,{size:110});}
    }
  }
  function pavement(x,z,w,d){
    box(w,.18,d,x,.1,z,palette.pavement);box(w,.22,.22,x,.12,z+d/2,'#a9afa9');
    const tex=canvasTexture(256,256,(c,W,H)=>{c.fillStyle='#b9bcb6';c.fillRect(0,0,W,H);c.strokeStyle='#aaafa9';c.lineWidth=1.2;for(let y=0;y<H;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();for(let xx=(y%128?0:64);xx<W;xx+=128){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+64);c.stroke();}}});
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(w/4,d/4);
    const floor=plane(w-.05,d-.05,x,.198,z,customMaterial({map:tex,color:'#fff'}));floor.rotation.x=-Math.PI/2;
  }

  // One painted road surface carries continuous carriageway and crossing markings.
  const road=canvasTexture(2048,3072,(c,W,H)=>{
    c.fillStyle='#696e72';c.fillRect(0,0,W,H);
    const px=x=>(x+130)/260*W,pz=z=>(z+155)/220*H;
    const rect=(x,z,w,d)=>c.fillRect(px(x),pz(z),w/260*W,d/220*H);
    c.strokeStyle='rgba(24,34,39,.095)';c.lineWidth=2;
    for(let k=0;k<14000;k++){const x=seeded(k*2)*W,y=seeded(k*2+1)*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+2,y+3);c.stroke();}
    // Four lanes across the foreground avenue and a narrower side street.
    c.fillStyle='#cfcfc4';
    for(let x=-125;x<126;x+=8){rect(x,18.5,4,.14);rect(x,30.5,4,.14);}
    for(let z=-146;z<2;z+=8){rect(-.08,z,.16,3.3);}
    for(const x of[-8.7,8.7])rect(x,-148,.12,151);
    c.fillStyle='#b7ad73';rect(-127,24.1,254,.13);rect(-127,24.55,254,.13);
    // Pedestrian crossings connect the pavement, not arbitrary road centres.
    c.fillStyle='#dbdcd3';
    for(let z=12.5;z<36.8;z+=1.45)rect(-5.5,z,11,.68);
    for(let x=-8.4;x<8.4;x+=1.4)rect(x,5.2,.65,4.8);
    rect(-8.6,3.8,8,.28);rect(.6,-.1,8,.28);
    // Stopping lines and a marked bus bay along the near commercial frontage.
    rect(-9,12.3,.26,10.5);rect(9,25.6,.26,11.3);
    c.strokeStyle='#d0c899';c.lineWidth=3;c.setLineDash([14,10]);
    c.strokeRect(px(isCBD?-75:-95),pz(12.6),21/260*W,3.7/220*H);c.setLineDash([]);
    c.fillStyle='#d4d6cf';c.font=font(48,600);c.textAlign='center';
    for(const x of[-101,-30,39,96]){
      c.save();c.translate(px(x),pz(20.7));c.rotate(Math.PI/2);c.fillText('↑',0,0);c.restore();
      c.save();c.translate(px(x),pz(33));c.rotate(-Math.PI/2);c.fillText('↑',0,0);c.restore();
    }
    c.strokeStyle='#4f5a5c';c.lineWidth=3;
    for(let z=-132;z<0;z+=27){c.beginPath();c.arc(px(5.7),pz(z),6,0,TAU);c.stroke();}
  });
  const ground=plane(260,220,0,-.02,-45,customMaterial({map:road,color:'#fff'}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  const groundExtension=plane(1600,1900,0,-.065,-45,material('#696e72'));
  groundExtension.rotation.x=-Math.PI/2;groundExtension.receiveShadow=true;groundExtension.castShadow=false;
  pavement(-68,-69,122,156);
  pavement(isCBD?35:46,-69,isCBD?50:74,156);
  pavement(0,52,260,23);
  // Tactile paving is on the sidewalk, with a clear approach to the crossing.
  for(const [x,z,w,d]of[[-61,7.7,93,.48],[isCBD?34:46,7.7,isCBD?47:72,.48],[-9.9,-62,.48,135],[10.5,-62,.48,135]]){
    box(w,.035,d,x,.255,z,'#b7aa79');
    if(w>d)for(let k=-1;k<=1;k++)box(w,.025,.035,x,.286,z+k*.12,'#d0c18c');
    else for(let k=-1;k<=1;k++)box(.035,.025,d,x+k*.12,.286,z,'#d0c18c');
  }
  for(const x of[-8.8,8.8])for(let i=0;i<4;i++)for(let j=0;j<5;j++){
    cyl(.035,.035,.025,x+(i-1.5)*.14,.29,8.7+(j-2)*.14,'#d0c18c',5);
  }
  for(const side of[-1,1])for(let k=0;k<5;k++){
    const x=side*9.3,z=-4-k*26;box(.55,.025,1.25,x,.258,z,'#586361');
    for(let j=0;j<5;j++)box(.04,.02,1.1,x-.21+j*.105,.276,z,'#8c9690');
  }
  function guardRail(x0,x1,z){
    box(x1-x0,.065,.065,(x0+x1)/2,1.21,z,'#9fa7a3');
    box(x1-x0,.055,.055,(x0+x1)/2,.5,z,'#9fa7a3');
    for(let x=x0;x<=x1;x+=3.6){cyl(.045,.065,1.18,x,.62,z,'#9fa7a3',6);box(.25,.08,.25,x,.08,z,'#777f7b');}
    for(let x=x0+.5;x<x1;x+=.55)box(.035,.68,.035,x,.85,z,'#9fa7a3');
  }
  guardRail(-124,-11,24.4);guardRail(11,124,24.4);
  guardRail(isCBD?15:17,isCBD?55:78,11.2);

  // Main landmarks are separately reconstructed from the local reference photographs.
  const kit={THREE,group,material,customMaterial,addMesh,box,cyl,sphere,plane,canvasTexture,imageTexture,font,textTexture,sign,facade,roofEquipment,shopfronts,emissives,glow,noInk,staticMeshes,seeded,palette};
  const architecture=isCBD?buildCbd(kit):buildGuomao(kit);
  // The Guomao frontage borrows the rainy-night-store language: a dark, humid
  // street where every lamp leaves a long additive streak on the wet paving.
  const weather=isCBD?null:buildGuomaoWeather({THREE,canvasTexture,noInk,seeded});
  if(weather)group.add(weather.group);

  // Ordinary older apartments use punched windows and small balconies, not curtain walls.
  function apartment(x,z,w,d,floors,{wall='#c9c6bd',seed=0,stores=true,balconies=true}={}){
    const h=3.5+floors*2.85,front=z+d/2;
    box(w,h,d,x,h/2,z,wall);
    box(w+.25,.3,d+.25,x,h+.1,z,'#b6b8b3');
    for(const side of [-1,1])box(.17,.65,d+.1,x+side*w/2,h+.52,z,'#a8aaa5');
    box(w,.65,.17,x,h+.52,z-d/2,'#a8aaa5');
    const bays=Math.max(3,Math.floor(w/3.6)),bay=w/bays;
    const frame=material('#e2e1d9'),pane=material('#485253'),paneLight=material('#727e7b');
    for(let r=0;r<floors;r++)for(let j=0;j<bays;j++){
      const xx=x-w/2+bay*(j+.5),yy=5+r*2.85;
      box(1.75,1.8,.14,xx,yy,front+.08,frame);
      box(1.53,1.59,.12,xx,yy,front+.2,(j+r+seed)%4?pane:paneLight);
      box(.055,1.6,.14,xx,yy,front+.3,frame);
      box(1.76,.12,.35,xx,yy-.93,front+.17,'#9eaaa5');
      if((j+r+seed)%3===0){
        box(.78,.5,.42,xx+.9,yy-.93,front+.31,'#b7bcb4');
        const fan=cyl(.17,.17,.025,xx+.9,yy-.93,front+.54,'#78827d',8);fan.rotation.x=Math.PI/2;
        box(.74,.055,.4,xx+.9,yy-1.22,front+.31,'#7b827a');
      }
      if(balconies&&r>0&&j%3===1){
        box(2.3,.16,1.05,xx,yy-1.04,front+.48,'#aaa9a1');
        box(2.3,.09,.08,xx,yy-.35,front+1,'#656e69');
        for(let k=0;k<6;k++)box(.045,.65,.045,xx-1+k*.4,yy-.68,front+1,'#747c76');
        box(.07,.65,.95,xx-1.1,yy-.68,front+.53,'#747c76');
        box(.07,.65,.95,xx+1.1,yy-.68,front+.53,'#747c76');
        if((r+j+seed)%4===0){box(.6,.28,.36,xx-.5,yy-.8,front+.7,'#7b6a57');sphere(.3,xx-.5,yy-.55,front+.7,'#526b45');}
      }
    }
    // Side walls remain mostly plaster, with individual windows and drainage pipes.
    for(const side of [-1,1]){
      for(let r=0;r<floors;r++)for(let j=0;j<Math.max(2,Math.floor(d/4.5));j++){
        const zz=z-d/2+2.4+j*4.2,yy=5+r*2.85;
        box(.14,1.7,1.45,x+side*(w/2+.06),yy,zz,frame);
        box(.14,1.47,1.22,x+side*(w/2+.15),yy,zz,pane);
      }
      cyl(.045,.045,h-.5,x+side*(w/2+.2),(h-.5)/2,front-.5,'#939d96',5);
    }
    if(stores){
      const labels=['便民超市','家常小馆','手机维修','早点铺','巷口茶饮','文具百货'];
      for(let j=0;j<Math.max(2,Math.floor(w/5.5));j++){
        const n=Math.max(2,Math.floor(w/5.5)),cw=w/n,xx=x-w/2+cw*(j+.5),color=['#586a66','#8e6b58','#687a7a'][Math.abs(j+seed)%3];
        box(cw-.3,2.7,.17,xx,1.5,front+.13,'#596662');
        box(.1,2.7,.22,xx,1.5,front+.28,'#c9ccc2');
        sign(labels[(j+seed)%labels.length],xx,3.25,front+.35,cw-.15,.7,color,'#e2dfd2',{size:96});
        if(j%2===1){const aw=box(cw-.1,.12,1.2,xx,2.8,front+.72,color);aw.rotation.x=.12;box(cw-.1,.23,.1,xx,2.62,front+1.28,color);}
      }
    }
    // A water tank and roof utility room replace the repeated rooftop AC triplets.
    box(3.6,1.65,3,x-w*.22,h+.95,z-d*.2,'#b5b5aa');
    if(seed%2===0)cyl(.8,.8,1.5,x+w*.25,h+1,z-d*.2,'#8b938b',12);
    return {x,z,w,d,h};
  }

  if(isCBD){
    apartment(-70,-66,34,24,6,{wall:'#bdbeb5',seed:2,stores:false});
    apartment(-33,-70,27,23,5,{wall:'#cfccc0',seed:5,stores:false});
    apartment(-91,-102,31,22,7,{wall:'#c4c3bb',seed:3,stores:false,balconies:false});
    apartment(-51,-111,30,22,6,{wall:'#bbbbb1',seed:6,stores:false});
    apartment(23,-23,22,25,5,{wall:'#c6c4bb',seed:8});
    apartment(25,-54,24,24,6,{wall:'#d1cdc1',seed:11});
    apartment(24,-85,23,24,5,{wall:'#bdbdb5',seed:14});
    apartment(23,-115,22,22,6,{wall:'#cbc8be',seed:17,stores:false});
    // Narrow side-facing stalls and weathered green/red awnings recall Tieluba.
    for(let i=0;i<10;i++){
      const z=-15-i*8.5,col=i%3===0?'#876254':i%3===1?'#4f7667':'#6c7467';
      box(2.25,2.7,6.2,11.8,1.5,z,'#9b9c8f');
      const aw=box(3.6,.13,6.2,11.05,3.14,z,col);aw.rotation.z=-.1;
      box(.1,.35,6.2,9.3,2.93,z,col);
      const tex=textTexture(['宜昌凉虾','热干面','小巷小食','米酒汤圆'][i%4],col,'#eee4cf',{size:110});
      const mat=customMaterial({map:tex,color:'#fff',emissive:'#fff',emissiveMap:tex,emissiveIntensity:0,side:THREE.DoubleSide});emissives.push({mat,value:.55});
      const label=plane(5.7,.75,9.12,3.65,z,mat,-Math.PI/2);glow.push(label);
      box(1.2,.9,4,10,.65,z,'#a49175');
    }
    sign('铁路坝小吃街',23,5.2,-9.9,13.5,1.25,'#785447','#e9e1ce',{size:120});
  }else{
    // Lower hotel mass to the west; the eastern side is intentionally an open square.
    const hx=-101,hz=-87,hw=23,hd=24,hh=49;
    box(hw,hh,hd,hx,hh/2,hz,'#a7a89e');
    const hotelFace=canvasTexture(512,1024,(c,W,H)=>{
      c.fillStyle='#6e7774';c.fillRect(0,0,W,H);
      for(let r=0;r<17;r++)for(let j=0;j<6;j++){
        c.fillStyle=(r+j)%5===0?'#a8a389':'#3d4948';c.fillRect(j*W/6+9,r*H/17+6,W/6-18,H/17-16);
      }
      c.fillStyle='#c2c2b1';for(let r=0;r<17;r++)c.fillRect(0,r*H/17,W,3);
    });
    const hotelMat=customMaterial({map:hotelFace,color:'#fff'});
    plane(hw-1,hh-2,hx,hh/2,hz+hd/2+.1,hotelMat);
    plane(hd-1,hh-2,hx+hw/2+.1,hh/2,hz,hotelMat,Math.PI/2);
    for(const side of[-1,1])box(.55,hh+.5,hd+.3,hx+side*(hw/2-.4),hh/2,hz,'#c5c0aa');
    sign('国贸酒店',hx,hh+1.2,hz+hd/2+.3,16,2.4,'#656459','#ba6e5f',{size:134});
    apartment(-91,-124,32,24,6,{wall:'#b6b9ae',seed:25,stores:false});
    apartment(-55,-127,29,24,7,{wall:'#c4c1b7',seed:28,stores:false});
    apartment(54,-132,34,21,5,{wall:'#c2c5bb',seed:31,stores:false});
    // Yiling Square cue: a broad, quiet paved foreground with green islands and tree rows.
    for(const [x,z,w,d]of[[33,-26,26,30],[63,-26,21,30],[32,-67,24,33],[64,-69,22,36]]){
      box(w,.08,d,x,.26,z,'#5d7051');
      box(w+.2,.12,.25,x,.28,z+d/2,'#929a8a');
    }
    // A central walking axis and restrained paving bands keep the square legible.
    for(let z=-98;z<7;z+=9)box(69,.024,.28,46,.252,z,'#b0b2aa');
    for(let x=14;x<82;x+=10)box(.28,.024,108,x,.252,-46,'#b0b2aa');
    cyl(2.7,2.7,.2,47,.35,-51,'#a5aca2',40);
    cyl(1.95,1.95,.14,47,.52,-51,'#657e7a',32);
  }

  // Street trees follow real sidewalk edges; the square uses loose peripheral rows.
  function tree(x,z,scale=1){
    box(1.8,.1,1.8,x,.25,z,'#8b9385');box(1.5,.035,1.5,x,.32,z,'#5b6151');
    cyl(.13,.24,4.1*scale,x,2.27*scale,z,palette.bark,9);
    const crown=sphere(2.25*scale,x,5.55*scale,z,'#3d5d43');crown.scale.set(1.16,.9,.97);
    sphere(1.7*scale,x-1.3*scale,5.4*scale,z+.5,'#47664a');
    sphere(1.6*scale,x+1.1*scale,6.15*scale,z-.25,'#506f4e');
    sphere(1.25*scale,x+.2,5.1*scale,z+1.3,'#344f3b');
  }
  const treePositions=isCBD?
    [[-103,7.8,1.1],[-77,8.1,.96],[-28,8.1,.9],[-11,7.8,1],[-10.2,-35,.93],[10.4,-37,1.03],[10.3,-64,1],[10.6,-90,.92],[39,4.5,1.2],[48,-39,1.16]]:
    [[-107,8,1.1],[-89,8,1.03],[-11.6,6.8,1.12],[17,-7,1.1],[17,-33,1.14],[17,-62,1.08],[17,-88,1.13],[77,-8,1.12],[77,-32,1.18],[77,-61,1.08],[77,-91,1.15],[34,-104,1.12],[55,-104,1.13]];
  treePositions.forEach(([x,z,scale])=>tree(x,z,scale));
  function bench(x,z,rot=0){
    const b=new THREE.Group();b.position.set(x,.35,z);b.rotation.y=rot;group.add(b);
    for(let j=0;j<4;j++){box(3.1,.13,.16,0,.6,-.35+j*.21,palette.warm,b,false);box(3.1,.13,.15,0,1.1+j*.17,-.45,palette.warm,b,false);}
    for(const side of [-1,1]){box(.12,.75,.9,side*1.22,.3,0,palette.steel,b,false);box(.12,1.65,.1,side*1.22,.9,-.48,palette.steel,b,false);}
    b.traverse(o=>{if(o.isMesh)staticMeshes.push(o);});
  }
  if(isCBD){bench(-10,-18,Math.PI/2);bench(10.5,-25,-Math.PI/2);bench(-101,5.3,0);}else{bench(24,-11,0);bench(66,-45,Math.PI/2);bench(50,-99,0);}
  function bin(x,z){box(.65,1.1,.65,x,.76,z,'#4b7166');box(.73,.18,.73,x,1.39,z,palette.steel);box(.36,.13,.05,x,1.25,z+.38,palette.dark);}
  for(const [x,z]of(isCBD?[[-10,-14],[10.5,-29],[-78,7.5]]:[[20,-13],[69,-48],[-83,7.5]]))bin(x,z);
  function streetlight(x,z,dx=0,dz=1){
    cyl(.075,.115,8.3,x,4.15,z,palette.steel,8);
    const arm=box(dx?2.2:.12,.1,dz?2.2:.12,x+dx*.9,8.18,z+dz*.9,palette.steel);
    const m=material('#e0dec6',{emissive:'#f1dfb2',emissiveIntensity:0});
    if(!emissives.some(a=>a.mat===m))emissives.push({mat:m,value:1.4});
    const l=box(dx?1.1:.42,.16,dz?1.1:.42,x+dx*1.8,8.12,z+dz*1.8,m);glow.push(l);
    box(.35,.6,.3,x,.65,z,palette.steel);
    if(z>0&&x<0){const light=new THREE.PointLight('#dbbf86',0,12,2);light.position.set(x+dx*1.8,7.7,z+dz*1.8);group.add(light);lamps.push(light);}
  }
  for(const x of[-113,-92,-16,25,61,103])streetlight(x,10,0,1);
  for(const z of[-25,-63,-102])streetlight(-9.6,z,1,0);
  if(!isCBD)for(const z of[-22,-70])streetlight(77,z,-1,0);
  function trafficLight(x,z,rot=0){
    cyl(.09,.12,6.1,x,3.05,z,palette.steel,8);
    box(.9,2.4,.6,x,5.8,z,palette.dark);
    ['#d77859','#d7b967','#6fa68a'].forEach((color,i)=>{
      const m=material(color,{emissive:color,emissiveIntensity:i===2?.8:.15});const s=sphere(.23,x,6.55-i*.72,z+.38,m);glow.push(s);
    });
    box(2.8,.13,.13,x+(x<0?1:-1)*1.3,7.08,z,palette.steel);
  }
  trafficLight(-10.4,7);trafficLight(10.6,30);
  const avenue=isCBD?'夷陵大道':'东山大道';
  cyl(.07,.09,5.1,-9.7,2.55,10,palette.steel,8);
  sign(avenue,-9.7,4.75,10.1,5.4,.9,'#42677a','#e6e9e1',{sub:isCBD?'YILING AVENUE':'DONGSHAN AVENUE',size:114});
  function busShelter(x,z){
    const frame=material('#4f5c5a'),glass=material('#75827b');
    for(const xx of[-4.8,0,4.8])box(.12,3.1,.13,x+xx,1.76,z-.7,frame);
    box(10.6,.17,2.7,x,3.35,z,frame);
    box(10.5,.07,2.6,x,3.48,z,'#b8bdb3');
    for(const xx of[-3.6,-1.2,1.2,3.6]){
      box(2.2,1.8,.065,x+xx,1.9,z-.7,glass);
      box(.055,1.83,.08,x+xx-1.1,1.9,z-.65,'#aeb5ac');
    }
    box(5.8,.12,.47,x,.72,z-.15,'#8b9187');
    for(const xx of[-2.4,2.4])box(.09,.6,.35,x+xx,.4,z-.15,frame);
    sign('公交候车',x-2.4,3.1,z+1.36,3.3,.48,'#4c645d','#e6e8db',{size:110});
    sign(avenue,x+2.5,2.2,z-.59,2,1.4,'#d5d8cb','#4b5b57',{size:115,sub:'文明候车'});
  }
  busShelter(isCBD?-68:-88,8.2);
  for(let k=0;k<4;k++){
    const c=new THREE.Group();c.position.set(-11.4-k*.9,0,7);group.add(c);
    cyl(.105,.13,.78,0,.6,0,'#747c79',8,c,false);
    cyl(.108,.108,.09,0,.84,0,'#b6bcad',8,c,false);
    box(.3,.06,.3,0,.23,0,'#8e9690',c,false);
    swapObjects.push({obj:c,index:k});
  }
  function bicycle(x,z,rot=0){
    const g=new THREE.Group();g.position.set(x,.34,z);g.rotation.y=rot;group.add(g);
    const metal=material('#405f59');
    for(const side of [-1,1]){
      const wheel=addMesh(new THREE.TorusGeometry(.4,.055,5,16),palette.dark,side*.66,.43,0,g,false);wheel.rotation.y=0;
      const hub=cyl(.05,.05,.18,side*.66,.43,0,metal,6,g,false);hub.rotation.x=Math.PI/2;
    }
    const beam=(a,b)=>{const pa=new THREE.Vector3(...a),pb=new THREE.Vector3(...b),d=pb.clone().sub(pa),m=addMesh(new THREE.CylinderGeometry(.035,.035,d.length(),5),metal,0,0,0,g,false);m.position.copy(pa.add(pb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());};
    beam([-.66,.43,0],[-.2,.95,0]);beam([-.2,.95,0],[.25,.45,0]);beam([.25,.45,0],[-.66,.43,0]);beam([.25,.45,0],[.45,1.02,0]);beam([.45,1.02,0],[-.2,.95,0]);beam([.45,1.02,0],[.66,.43,0]);
    box(.35,.1,.2,-.2,1.03,0,palette.dark,g,false);box(.15,.06,.6,.45,1.12,0,palette.dark,g,false);
    g.traverse(o=>{if(o.isMesh)staticMeshes.push(o);});
  }
  bicycle(isCBD?10.8:13.5,-14,Math.PI/2);bicycle(isCBD?10.8:13.5,-16.3,Math.PI/2);bicycle(-10.2,-29,Math.PI/2);

  function car(x,z,color='#d8aa72',yaw=0,kind='car'){
    const g=new THREE.Group();g.position.set(x,.03,z);g.rotation.y=yaw;group.add(g);
    const bus=kind==='bus',w=bus?2.8:2.1,len=bus?8.8:4.5;
    box(w,bus?2.9:.9,len,0,bus?1.7:.8,0,color,g,false);
    box(bus?w-.14:1.75,bus?1.1:.85,bus?len-.5:2.5,0,bus?2.3:1.56,bus?0:-.25,palette.navy,g,false);
    if(!bus){box(1.68,.13,2.55,0,2.01,-.25,color,g,false);box(.1,.82,2.5,0,1.56,-.25,color,g,false);box(1.8,.8,.13,0,1.56,-.25,color,g,false);}
    else{
      // Glazing sits outside the solid bus body, so the body cannot hide it.
      for(const side of [-1,1]){
        box(.075,1.12,len-1.05,side*(w/2+.08),2.32,-.05,palette.navy,g,false);
        for(let i=0;i<7;i++)box(.09,1.2,.12,side*(w/2+.13),2.32,-3.55+i*1.17,color,g,false);
        box(.09,.1,len-.8,side*(w/2+.13),2.89,-.05,palette.cream,g,false);
        box(.09,.12,len-.8,side*(w/2+.13),1.76,-.05,color,g,false);
      }
      box(w-.26,1.17,.08,0,2.27,len/2+.085,palette.navy,g,false);
      box(.095,1.19,.1,0,2.27,len/2+.14,color,g,false);
      box(w-.34,.82,.08,0,2.28,-len/2-.085,palette.navy,g,false);
      box(w+.1,.13,len-.1,0,3.22,0,palette.cream,g,false);
      box(.66,.23,.085,0,.75,len/2+.16,'#41696f',g,false);
    }
    for(const side of [-1,1])for(const zz of [-len*.31,len*.31]){
      const tire=cyl(.43,.43,.23,side*(w/2+.06),.52,zz,palette.dark,12,g,false);tire.rotation.z=Math.PI/2;
      const hub=cyl(.23,.23,.25,side*(w/2+.09),.52,zz,palette.stone,10,g,false);hub.rotation.z=Math.PI/2;
    }
    box(w-.2,.18,.18,0,.66,len/2+.04,palette.steel,g,false);
    for(const side of [-1,1]){
      box(.4,.24,.07,side*w*.31,.99,len/2+.1,'#eee2a5',g,false);box(.3,.2,.07,side*w*.33,.95,-len/2-.1,palette.coral,g,false);
      box(.22,.18,.35,side*(w/2+.13),1.5,.5,color,g,false);
    }
    box(.58,.19,.06,0,.56,len/2+.15,'#41696f',g,false);
    animated.push({kind:'car',obj:g,x,z,yaw,phase:seeded(x+z),moving:false});return g;
  }
  car(-4.6,-45,'#c1c8c4',0);car(4.7,-88,'#a8b6b4',Math.PI);car(isCBD?-63:-83,15,'#d1d8cf',Math.PI/2,'bus');car(33,32.2,'#b9c0bd',-Math.PI/2);car(-26,20.4,'#aaa69b',Math.PI/2);

  function person(x,z,seed=0,scale=1,walking=true){
    const g=new THREE.Group();g.position.set(x,.28,z);g.scale.setScalar(scale);group.add(g);
    const bodyColors=['#8d7060','#d2b478','#4c7772','#c67962','#c5c9ad','#6f8290'];
    const shirt=bodyColors[seed%bodyColors.length],pants=['#445353','#6d7067','#485e6b'][seed%3],skin='#cba88a';
    const torso=cyl(.19,.23,.62,0,1.15,0,shirt,8,g,false);torso.scale.z=.72;
    const head=addMesh(new THREE.SphereGeometry(.155,8,6),skin,0,1.66,0,g,false);head.scale.set(.86,1.12,.9);
    const hair=addMesh(new THREE.SphereGeometry(.16,8,5,0,TAU,0,Math.PI*.62),seed%3===0?'#6e6052':'#33413c',0,1.69,0,g,false);
    const legs=[],arms=[];
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.115,.91,0);g.add(leg);legs.push(leg);
      cyl(.075,.065,.58,0,-.29,0,pants,6,leg,false);box(.14,.11,.28,0,-.61,.07,palette.dark,leg,false);
      const arm=new THREE.Group();arm.position.set(side*.25,1.4,0);g.add(arm);arms.push(arm);
      cyl(.07,.055,.48,0,-.22,0,shirt,6,arm,false);sphere(.06,0,-.49,0,skin,arm,false);
    }
    if(seed%5===0){box(.23,.42,.33,.32,.86,-.06,palette.warm,g,false);}
    if(seed%4===0){
      const u=new THREE.Group();u.position.set(.2,2.1,0);g.add(u);
      const canopy=addMesh(new THREE.ConeGeometry(.75,.3,10,1,true),seed%8===0?palette.yellow:palette.mint,0,0,0,u,false);canopy.material.side=THREE.DoubleSide;
      cyl(.018,.018,1.2,0,-.5,0,palette.steel,5,u,false);u.visible=false;umbrellas.push(u);
    }
    animated.push({kind:'person',obj:g,x,z,seed,legs,arms,walking,scale});return g;
  }
  for(let i=0;i<10;i++){
    const x=(isCBD?-82:-75)+i*(isCBD?7.2:6.3),z=5.9+seeded(i+7)*1.7;
    person(x,z,i,.94+seeded(i)*.15,i%4!==0);
  }
  for(let i=0;i<8;i++){
    const x=isCBD?(i%2?-10.8:10.6):(48+seeded(i+4)*2.8),z=-15-i*10.2;
    person(x,z,i+10,.94+seeded(i)*.13,i%3!==0);
  }
  person(isCBD?-59:-46,6.2,23,1,true);person(isCBD?-57.6:-44.6,6.5,24,.85,true);
  person(isCBD?10.9:24,-8,25,1,false);

  // Restrained rain is a single draw call and only appears in rain-night mode.
  // Guomao carries the denser, brighter weather of the rainy-night reference.
  const rainCount=isCBD?600:1500, rainGeo=new THREE.BufferGeometry(),rainPositions=new Float32Array(rainCount*6),rainSeeds=[];
  for(let i=0;i<rainCount;i++)rainSeeds.push([seeded(i*3)*(isCBD?124:152)-(isCBD?62:94),seeded(i*3+1)*65,seeded(i*3+2)*(isCBD?152:172)-(isCBD?118:122)]);
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rainMat=new THREE.LineBasicMaterial({color:'#b5d3cf',transparent:true,opacity:isCBD?.20:.30,depthWrite:false});materials.set(rainMat.uuid,rainMat);
  const rain=new THREE.LineSegments(rainGeo,rainMat);rain.visible=false;rain.frustumCulled=false;group.add(rain);noInk.push(rain);

  // Each articulated person renders as five meshes; rigid cars render as one.
  // Vertex colours preserve the wardrobe palette while sharing one material.
  const characterMaterial=customMaterial({color:'#ffffff',vertexColors:true,side:THREE.DoubleSide});
  function mergeRigidChildren(root){
    const parents=[];root.traverse(o=>{if(o.isGroup)parents.push(o);});
    for(const parent of parents){
      const meshes=parent.children.filter(o=>o.isMesh&&!o.material.map);
      if(meshes.length<2)continue;
      const geos=meshes.map(mesh=>{
        mesh.updateMatrix();let geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geo.applyMatrix4(mesh.matrix);
        for(const attr of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(attr))geo.deleteAttribute(attr);
        if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
        const col=mesh.material.color,colors=new Float32Array(geo.attributes.position.count*3);
        for(let i=0;i<colors.length;i+=3){colors[i]=col.r;colors[i+1]=col.g;colors[i+2]=col.b;}
        geo.setAttribute('color',new THREE.BufferAttribute(colors,3));return geo;
      });
      const geo=mergeGeometries(geos,false);
      if(geo){const m=new THREE.Mesh(geo,characterMaterial);m.castShadow=true;m.receiveShadow=true;parent.add(m);meshes.forEach(o=>{o.removeFromParent();o.geometry.dispose();});}
      geos.forEach(g=>g.dispose());
    }
  }
  animated.forEach(item=>mergeRigidChildren(item.obj));
  swapObjects.forEach(item=>mergeRigidChildren(item.obj));

  // Static geometry batching keeps the four-pass ink pipeline practical in real time.
  group.updateMatrixWorld(true);
  const batches=new Map();
  for(const mesh of staticMeshes){
    if(mesh.isInstancedMesh||glow.includes(mesh)||noInk.includes(mesh)||Array.isArray(mesh.material))continue;
    const key=mesh.material.uuid;
    if(!batches.has(key))batches.set(key,{mat:mesh.material,geos:[],meshes:[]});
    const b=batches.get(key), geo=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrixWorld);
    for(const attr of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(attr))geo.deleteAttribute(attr);
    if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));
    b.geos.push(geo);b.meshes.push(mesh);
  }
  for(const {mat,geos,meshes} of batches.values()){
    if(geos.length<2){geos.forEach(g=>g.dispose());continue;}
    const merged=mergeGeometries(geos,false);
    if(!merged){geos.forEach(g=>g.dispose());continue;}
    const m=new THREE.Mesh(merged,mat);m.castShadow=true;m.receiveShadow=true;group.add(m);
    meshes.forEach(o=>{o.removeFromParent();o.geometry.dispose();});geos.forEach(g=>g.dispose());
  }

  function setNight(value){
    night=Boolean(value);emissives.forEach(({mat,value})=>mat.emissiveIntensity=night?value:0);
    lamps.forEach(l=>l.intensity=night?18:0);umbrellas.forEach(u=>u.visible=night);rain.visible=night;
    // Local sources are declared by the landmark itself; everything else keeps
    // the shared day/night contract.
    group.traverse(o=>{if(o.isLight&&o.userData.nightIntensity!==undefined)o.intensity=night?o.userData.nightIntensity:0;});
    weather?.setNight(night);
  }
  function animate(ms,shot={},camera){
    const t=((ms%LOOP)+LOOP)%LOOP/LOOP;
    for(const item of animated){
      if(item.kind==='person'){
        const phase=t*TAU*16+item.seed*1.17,walk=item.walking;
        // Reversible short strolls avoid visible teleports at a loop seam.
        const shift=walk?Math.sin(t*TAU+item.seed)*1.6:0;
        item.obj.position.z=item.z+shift;item.obj.position.y=.28+(walk?Math.abs(Math.sin(phase))*.027:0);
        item.obj.rotation.y=walk?(Math.atan2(.14,Math.cos(t*TAU+item.seed))):item.seed*.8;
        item.legs.forEach((l,i)=>l.rotation.x=walk?Math.sin(phase+i*Math.PI)*.38:0);
        item.arms.forEach((l,i)=>l.rotation.x=walk?-Math.sin(phase+i*Math.PI)*.3:0);
      }
    }
    for(const {obj,index} of swapObjects){obj.position.z=7-(shot.lay||0)*index*2.7;obj.scale.setScalar(shot.cs||1);}
    if(night){
      const pos=rainGeo.attributes.position.array;
      for(let i=0;i<rainCount;i++){
        const [x,y,z]=rainSeeds[i],yy=((y-t*65*4)%65+65)%65,o=i*6;
        pos[o]=x;pos[o+1]=yy;pos[o+2]=z;pos[o+3]=x-.12;pos[o+4]=yy+.78;pos[o+5]=z+.07;
      }
      rainGeo.attributes.position.needsUpdate=true;
      weather?.update(ms,camera);
    }
  }
  function dispose(){
    weather?.dispose();
    group.traverse(o=>{if(o.geometry)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  const focus=architecture.focus;
  // The night grade is opt-in per world so CBD and the bridge keep their look.
  const visual=isCBD?undefined:{kind:'city',rain:1,glowBoost:1.45,reflectGain:.62,
    nightAmbient:'#6f84b0',nightAmbientIntensity:.68,nightSun:'#8aa2e2',nightSunIntensity:.42};
  return {group,glow,noInk,focus,visual,animate,setNight,dispose,ready:Promise.all(pendingTextures)};
}
