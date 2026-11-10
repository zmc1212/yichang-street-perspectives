import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original Yichang street compositions, based on CBD and Guomao reference photos.
// Building dimensions and the relation between streets are artistic approximations.
const LOOP = 24000;
const TAU = Math.PI * 2;
const palette = {
  cream:'#e8dbc4', stone:'#c6bda7', warm:'#b88866', coral:'#d86a49', navy:'#234147',
  glass:'#52838a', mint:'#91b2a5', dark:'#273c3d', pavement:'#d3d1bb', asphalt:'#747e77',
  yellow:'#e4b657', green:'#607e68', leaf:'#789576', bark:'#756756', steel:'#536665'
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
  function building(x,z,w,d,h,{base=palette.cream,seed=1,glass=false,shop=true,roof=true}={}){
    box(w,h,d,x,h/2,z,base);
    const fm=facade(w,h,{cols:Math.max(4,Math.round(w/2.1)),rows:Math.max(4,Math.round(h/3)),seed,base:glass?palette.navy:'#566b68',warm:glass?.32:.12});
    plane(w-.8,h-4.5,x,(h+3.5)/2,z+d/2+.1,fm);
    plane(d-.6,h-4.5,x+w/2+.1,(h+3.5)/2,z,fm,Math.PI/2);
    plane(d-.6,h-4.5,x-w/2-.1,(h+3.5)/2,z,fm,-Math.PI/2);
    for(let row=4.1;row<h;row+=3.1){ box(w+.25,.25,d+.25,x,row,z,base); }
    box(w+.5,.5,d+.5,x,h,z,base);
    if(roof)roofEquipment(x,z,w,d,h);
    if(shop) shopfronts(x,z+d/2+.3,w,seed);
    return {x,z,w,d,h};
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
  function pavement(x,z,w,d){box(w,.22,d,x,.12,z,palette.pavement);box(w,.3,.25,x,.15,z+d/2,palette.cream);}

  // One painted road surface avoids coplanar crossing markings and distant z-fighting.
  const road=canvasTexture(2048,3072,(c,W,H)=>{
    c.fillStyle=isCBD?'#7b8278':'#6d7b79';c.fillRect(0,0,W,H);
    const px=x=>(x+80)/160*W, pz=z=>(z+140)/190*H;
    c.lineWidth=3;c.strokeStyle='rgba(20,42,38,.11)';
    for(let k=0;k<10000;k++){const x=seeded(k*2)*W,y=seeded(k*2+1)*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y+4);c.stroke();}
    c.fillStyle='#c1bd9c';
    for(let z=-130;z<36;z+=7){c.fillRect(px(-.2),pz(z),px(.2)-px(-.2),35);}
    c.fillStyle='#ede9cc';
    for(let x=-67;x<70;x+=7){c.fillRect(px(x),pz(21.9),46,5);}
    // The long street meets a broad foreground avenue.
    for(const zz of [3,29])for(let x=-9;x<9;x+=1.5)c.fillRect(px(x),pz(zz),14,105);
    for(const xx of [-18,17])for(let z=14;z<27;z+=1.6)c.fillRect(px(xx),pz(z),72,13);
    c.lineWidth=5;c.strokeStyle='#d3c897';
    for(const off of [-.5,.5]){c.beginPath();c.moveTo(px(-73),pz(23+off));c.lineTo(px(73),pz(23+off));c.stroke();}
    c.fillStyle='#e8e5cb';c.font='bold 66px sans-serif';c.textAlign='center';
    for(const x of [-29,31]){c.save();c.translate(px(x),pz(16));c.rotate(Math.PI/2);c.fillText('↑',0,0);c.restore();}
    // Pavement joints, drains and subtle repaired asphalt.
    c.fillStyle='rgba(48,63,54,.22)';c.fillRect(px(-6),pz(-28),110,75);
    c.strokeStyle='#505e57';c.lineWidth=3;
    for(let z=-130;z<40;z+=15){c.beginPath();c.arc(px(7),pz(z),14,0,TAU);c.stroke();}
  });
  const ground=plane(160,190,0,-.02,-45,customMaterial({map:road,color:'#fff'}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  // Continue the street surface beyond the detailed block without raising a platform.
  const groundExtension=plane(1600,1900,0,-.065,-45,material(isCBD?'#7b8278':'#6d7b79'));
  groundExtension.rotation.x=-Math.PI/2;groundExtension.receiveShadow=true;groundExtension.castShadow=false;
  // Pavements leave the primary road and its cross street continuous.
  for(const side of [-1,1]){pavement(side*34,-57,46,140);pavement(side*38,39,55,16);}
  for(const side of [-1,1])for(let k=0;k<7;k++){
    const z=4-k*18;box(.4,.3,2.7,side*11.2,.22,z,palette.cream);
    box(.8,.04,1.4,side*11.7,.27,z,material('#546a64'));
    for(let j=0;j<6;j++)box(.05,.03,1.25,side*11.4+j*.12,.3,z,palette.stone);
  }

  // Architectural compositions: each landmark keeps its distinct silhouette.
  if(isCBD){
    const x=-30,z=-20,w=35,d=34,h=24;
    box(w,h,d,x,h/2,z,palette.warm);
    box(w+1,.75,d+1,x,h,z,palette.cream);
    box(w,.65,.65,x,6.5,z+d/2+.2,palette.cream);
    const glass=facade(35,24,{cols:15,rows:6,seed:21,warm:.22});
    plane(w-1,7.7,x,4.1,z+d/2+.13,glass);
    plane(d-.8,h-1,x-w/2-.12,h/2,z,glass,-Math.PI/2);
    plane(d-.8,h-1,x+w/2+.12,h/2,z,glass,Math.PI/2);
    box(27,14,.65,x+2,16,-2.65,'#64716a');
    const lineMat=material('#c2d6c5',{emissive:'#abc7c1',emissiveIntensity:0});emissives.push({mat:lineMat,value:.95});
    for(let i=0;i<35;i++){box(.17,13.7,.4,x-11.4+i*.79,16,-2.08,lineMat);}
    sign('CBD · 购物中心',x+2,17,-1.72,26,3.7,'#576b64','#ffb061',{sub:'YICHANG · CITY LIFE',size:130,bright:true});
    box(w+.3,.45,.7,x,24.55,-3,palette.yellow);
    // Tall glazed stair tower, a recognizable CBD facade feature.
    box(6.6,24.4,5.2,-48.1,12.2,-2.5,'#385f63');
    const stairMat=facade(6,25,{cols:3,rows:8,seed:36,warm:.18});
    plane(6.4,24,-48.1,12.3,.22,stairMat);
    plane(5,24,-44.74,12.3,-2.5,stairMat,Math.PI/2);
    for(let y=2;y<24;y+=3){box(6.6,.2,5.3,-48.1,y,-2.5,palette.cream);const st=box(5.3,.18,.45,-48.1,y+1.3,.49,palette.stone);st.rotation.z=(Math.floor(y/3)%2===0?1:-1)*.35;}
    roofEquipment(x,z,w,d,h);
    shopfronts(x,-2.1,w,2);
    // The side passage recalls the dense, awning-lined Tieluba food street.
    for(let i=0;i<4;i++){
      const zz=-20-i*22;
      building(24,zz,20,19,22+(i%3)*4,{base:i%2? '#baa993':'#d8c9ae',seed:50+i});
      const sideFace=facade(18,20,{cols:5,rows:6,seed:110+i,warm:.18});plane(18,18,13.85,15,zz,sideFace,-Math.PI/2);
      for(let lev=8;lev<22;lev+=4){
        box(2.1,.25,15,12.9,lev,zz,palette.cream);
        for(let rail=0;rail<7;rail++)box(.08,.9,.08,11.9,lev+.5,zz-6+rail*2,palette.dark);
        box(.1,.1,15,11.9,lev+.98,zz,palette.dark);
      }
      for(let j=0;j<3;j++){
        const zz2=zz-6+j*6,cor=(i+j)%2?palette.coral:'#407a6b';
        const aw=box(3.1,.15,5.3,11.8,3.4,zz2,cor);aw.rotation.z=-.12;
        box(.14,.42,5.3,10.3,3.08,zz2,cor);
        box(1.5,1.3,3.8,12,.8,zz2,palette.warm);
        const names=['小巷热面','宜昌凉虾','三峡小食','街边烧烤'];
        const sm=customMaterial({map:textTexture(names[(i+j)%4],cor,'#fff1c6',{size:105}),side:THREE.DoubleSide,emissive:'#fff',emissiveIntensity:0});emissives.push({mat:sm,value:.8});
        const s=plane(5,1,10.16,4.3,zz2,sm,-Math.PI/2);glow.push(s);
      }
    }
    building(-31,-68,34,28,38,{base:'#a3aea0',seed:9,glass:true});
    building(-28,-107,35,22,45,{base:'#718f88',seed:11,glass:true});
    sign('铁路坝小吃街',21.6,9.5,-7.8,16,1.8,'#b25e42','#f3e7ca',{sub:'一城烟火 · 巷里相逢',size:125});
  } else {
    // Guomao's wide retail podium and separate dark-glass tower, not twin towers.
    const mx=-26,mz=-26,mw=39,md=38,mh=23;
    box(mw,mh,md,mx,mh/2,mz,'#2c434a');
    const gm=facade(mw,mh,{cols:17,rows:7,seed:73,warm:.34});
    plane(mw-.4,mh-.4,mx,mh/2,mz+md/2+.12,gm);
    plane(md-.4,mh-.4,mx-mw/2-.12,mh/2,mz,gm,-Math.PI/2);
    plane(md-.4,mh-.4,mx+mw/2+.12,mh/2,mz,gm,Math.PI/2);
    for(let y=3;y<mh;y+=3.4)box(mw+.35,.28,md+.35,mx,y,mz,'#778f86');
    const finmat=material('#adc9bf',{emissive:'#b8e0d6',emissiveIntensity:0});emissives.push({mat:finmat,value:.9});
    for(let k=0;k<25;k++)box(.14,5.4,.42,mx-mw/2+.7+k*1.57,21.3,-6.65,finmat);
    box(mw+.7,.45,md+.7,mx,mh+.4,mz,'#a3bcb0');
    roofEquipment(mx,mz,mw,md,mh);
    const tx=-36,tz=-43,tw=21,td=24,th=59;
    box(tw,th,td,tx,th/2,tz,'#1e3c43');
    const tower=facade(tw,th,{cols:12,rows:20,seed:100,warm:.45});
    plane(tw-.3,th-2,tx,th/2,tz+td/2+.12,tower);
    plane(td-.3,th-2,tx+tw/2+.12,th/2,tz,tower,Math.PI/2);
    plane(td-.3,th-2,tx-tw/2-.12,th/2,tz,tower,-Math.PI/2);
    for(let y=4;y<53;y+=2.8)box(tw+.25,.18,td+.25,tx,y,tz,'#7c9689');
    for(let k=0;k<8;k++){box(.18,th,.4,tx-tw/2+k*3,th/2,tz+td/2+.26,'#19363d');}
    const crownMat=material('#9ecbb9',{emissive:'#9de0c8',emissiveIntensity:0});emissives.push({mat:crownMat,value:1.05});
    for(let k=0;k<25;k++){const yy=54.7+seeded(k+3)*2.1;box(.18,2.2+seeded(k)*2.6,.35,tx-tw/2+.6+k*.81,yy,tz+td/2+.35,crownMat);}
    sign('国 贸',tx,55.6,tz+td/2+.65,18,5.7,'#24454b','#b7e0c4',{size:180,bright:true});
    roofEquipment(tx,tz,tw,td,th);
    sign('国贸购物广场',mx,8.6,-6.5,26,2.5,'#27474d','#eee2b2',{sub:'GUOMAO · YICHANG',size:134,bright:true});
    shopfronts(mx,-6.35,mw,4);
    // A broad screen with a locally drawn campaign, not an external billboard image.
    const adTex=canvasTexture(1024,512,(c,W,H)=>{
      c.fillStyle='#d77658';c.fillRect(0,0,W,H);c.fillStyle='#edcc89';c.beginPath();c.arc(W*.8,H*.38,H*.48,0,TAU);c.fill();
      c.fillStyle='#305b56';c.beginPath();c.moveTo(440,H);c.quadraticCurveTo(650,30,W,H*.7);c.lineTo(W,H);c.fill();
      c.fillStyle='#fff1d0';c.font=font(105,700);c.fillText('宜昌，好有趣。',45,180,800);c.font=font(38,500);c.fillText('去街角，遇见下一段风景',50,270);c.font=font(25);c.fillText('YICHANG / A DIFFERENT PERSPECTIVE',52,425);
    });
    const adm=customMaterial({map:adTex,emissive:'#fff',emissiveMap:adTex,emissiveIntensity:0});emissives.push({mat:adm,value:1.0});
    const ad=plane(17,7.5,-31,15,-6.37,adm);glow.push(ad);
    // A green foreground edge and a low commercial block frame the opposite side.
    building(33,-39,28,37,27,{base:'#bec4ad',seed:33});
    building(29,-82,27,27,35,{base:'#94a79c',seed:35,glass:true});
    building(-31,-94,27,23,42,{base:'#899c90',seed:37,glass:true});
    sign('国贸',-31,44,-81.9,10,3.1,'#5a5145','#f0a078',{size:150,bright:true});
    box(19,.45,21,28,.42,-8,'#80946c');
    for(let k=0;k<4;k++)box(19,.16,.24,28,.72,-17+k*5.6,'#c7ccb1');
    sign('东山大道',17,7.2,7,7.2,1.55,'#47746b','#f1edcf',{sub:'DONGSHAN AVENUE',size:116});
  }

  // Distant skyline silhouettes are fully modeled so oblique reveals remain populated.
  for(let i=0;i<8;i++){
    const x=(i-3.5)*16,zz=-131-seeded(i+17)*13,h=24+seeded(i+37)*30;
    if(Math.abs(x)<7)continue;
    building(x,zz,13+seeded(i)*4,18,h,{base:['#93aaa0','#b5bca7','#768e87'][i%3],seed:200+i,shop:false});
  }
  // Planters, street trees, furniture and details are repeated in depth for the illusion.
  function tree(x,z,scale=1){
    box(2.8,.55,2.8,x,.45,z,palette.cream);box(2.45,.12,2.45,x,.79,z,'#6b7354');
    cyl(.18,.28,4.5*scale,x,2.5*scale,z,palette.bark,8);
    const crown=sphere(2.3*scale,x,6*scale,z,palette.leaf);crown.scale.set(1.1,.82,1);
    sphere(1.8*scale,x-1.3*scale,5.8*scale,z+.4,palette.green);
    sphere(1.7*scale,x+1.2*scale,6.6*scale,z-.3,'#8ca37b');
    for(const zz of [-.8,.8])box(.1,2.3,.1,x+.55,1.6,z+zz,palette.steel);
  }
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const z=4-i*19,scale=.9+seeded(i+side*3)*.16;
    tree(side*(isCBD?13.5:13.9),z,scale);
  }
  [ [-58,8],[-58,-14],[48,5],[52,-17],[48,-52],[-57,-66] ].forEach((p,i)=>tree(p[0],p[1],1.2));
  function bench(x,z,rot=0){
    const b=new THREE.Group();b.position.set(x,.35,z);b.rotation.y=rot;group.add(b);
    for(let j=0;j<4;j++){box(3.1,.13,.16,0,.6,-.35+j*.21,palette.warm,b,false);box(3.1,.13,.15,0,1.1+j*.17,-.45,palette.warm,b,false);}
    for(const side of [-1,1]){box(.12,.75,.9,side*1.22,.3,0,palette.steel,b,false);box(.12,1.65,.1,side*1.22,.9,-.48,palette.steel,b,false);}
    b.traverse(o=>{if(o.isMesh)staticMeshes.push(o);});
  }
  bench(-15.5,-10,Math.PI/2);bench(16,-5,-Math.PI/2);bench(18,-46,-Math.PI/2);bench(-17,-54,Math.PI/2);
  function bin(x,z){box(.65,1.1,.65,x,.76,z,'#4b7166');box(.73,.18,.73,x,1.39,z,palette.steel);box(.36,.13,.05,x,1.25,z+.38,palette.dark);}
  for(const side of [-1,1])for(let i=0;i<4;i++)bin(side*12.7,-7-i*27);
  function streetlight(x,z,side=1){
    cyl(.085,.14,9,x,4.5,z,palette.steel,8);
    box(2.3,.1,.12,x-side*1.0,8.9,z,palette.steel);
    const m=material('#f2e7bb',{emissive:'#fff0b0',emissiveIntensity:0});if(!emissives.some(a=>a.mat===m))emissives.push({mat:m,value:2});
    const l=box(1.25,.18,.4,x-side*2.1,8.85,z,m);glow.push(l);
    box(.48,.75,.38,x,1.1,z,palette.steel);
    if(z>0){const light=new THREE.PointLight('#e0bd71',0,14,2);light.position.set(x-side*2.1,8.2,z);group.add(light);lamps.push(light);}
  }
  for(const side of [-1,1])for(let i=0;i<5;i++)streetlight(side*10.6,9-i*27,side);
  function trafficLight(x,z,rot=0){
    cyl(.09,.12,6.1,x,3.05,z,palette.steel,8);
    box(.9,2.4,.6,x,5.8,z,palette.dark);
    ['#d77859','#d7b967','#6fa68a'].forEach((color,i)=>{
      const m=material(color,{emissive:color,emissiveIntensity:i===2?.8:.15});const s=sphere(.23,x,6.55-i*.72,z+.38,m);glow.push(s);
    });
    box(2.8,.13,.13,x+(x<0?1:-1)*1.3,7.08,z,palette.steel);
  }
  trafficLight(-10.4,7);trafficLight(10.6,30);
  // Foreground road signs and information pylons have legible, correct place names.
  const avenue=isCBD?'夷陵大道':'东山大道';
  cyl(.08,.1,5.3,-18,2.65,10,palette.steel,8);
  sign(avenue,-18,4.9,10.1,6.3,1.2,'#487c70','#fff2d0',{sub:isCBD?'YILING AVENUE':'DONGSHAN AVENUE',size:115});
  box(1.2,2.6,.5,16,1.6,8,palette.dark);
  sign('街角导览',16,2.1,8.31,1.03,1.5,'#e6dcb9','#375c54',{size:120,vertical:true});
  for(let k=0;k<5;k++){
    const x=-6+k*3;const c=new THREE.Group();c.position.set(x,0,3);group.add(c);
    box(.55,.12,.55,0,.07,0,palette.dark,c,false);cyl(.055,.24,.85,0,.55,0,palette.coral,8,c,false);cyl(.115,.16,.17,0,.55,0,palette.cream,8,c,false);
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
  bicycle(15,1,Math.PI/2);bicycle(15,3,Math.PI/2);bicycle(-16,-20,Math.PI/2);

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
  car(-5.3,-8,'#e6b463',0);car(5.3,-34,'#b8c8b9',Math.PI);car(-34,18,'#548f7b',Math.PI/2,'bus');car(28,27,'#d9d0ad',-Math.PI/2);car(4.7,-75,'#c87960',Math.PI);

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
  for(let i=0;i<18;i++){
    const side=i%2?-1:1,x=side*(12.1+seeded(i+21)*5),z=8-seeded(i+7)*91;
    person(x,z,i,.94+seeded(i)*.15,i%4!==0);
  }
  // Small social groups read as intentional visitors rather than uniformly scattered dots.
  person(-8.5,2,23,1,true);person(-7.4,2.8,24,.85,true);person(7.5,-4,25,1,false);

  // Restrained rain is a single draw call and only appears in rain-night mode.
  const rainCount=600, rainGeo=new THREE.BufferGeometry(),rainPositions=new Float32Array(rainCount*6),rainSeeds=[];
  for(let i=0;i<rainCount;i++)rainSeeds.push([seeded(i*3)*124-62,seeded(i*3+1)*65,seeded(i*3+2)*152-118]);
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rainMat=new THREE.LineBasicMaterial({color:'#b5d3cf',transparent:true,opacity:.20,depthWrite:false});materials.set(rainMat.uuid,rainMat);
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
    if(glow.includes(mesh)||noInk.includes(mesh)||Array.isArray(mesh.material))continue;
    const key=mesh.material.uuid;
    if(!batches.has(key))batches.set(key,{mat:mesh.material,geos:[],meshes:[]});
    const b=batches.get(key), geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
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
  }
  function animate(ms,shot={}){
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
    for(const {obj,index} of swapObjects){obj.position.z=3-(shot.lay||0)*index*3.2;obj.scale.setScalar(shot.cs||1);}
    if(night){
      const pos=rainGeo.attributes.position.array;
      for(let i=0;i<rainCount;i++){
        const [x,y,z]=rainSeeds[i],yy=((y-t*65*4)%65+65)%65,o=i*6;
        pos[o]=x;pos[o+1]=yy;pos[o+2]=z;pos[o+3]=x-.12;pos[o+4]=yy+.78;pos[o+5]=z+.07;
      }
      rainGeo.attributes.position.needsUpdate=true;
    }
  }
  function dispose(){
    group.traverse(o=>{if(o.geometry)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  const focus=isCBD?{
    x:-3,y:14,zf:-12,W:98,
    heroBounds:[
      {min:[-48,0,-38],max:[-11.5,29,-.5]},
      {min:[-51.6,0,-5.5],max:[-44.5,25,.8]}
    ],
    target:{left:.08,right:.88,top:.12,bottom:.78}
  }:{
    x:-5,y:23,zf:-26,W:112,
    heroBounds:[
      {min:[-46,0,-45.5],max:[-5.8,28,-4.5]},
      {min:[-47.3,0,-55.5],max:[-24.5,64,-30.3]}
    ],
    target:{left:.08,right:.88,top:.12,bottom:.78}
  };
  return {group,glow,noInk,focus,animate,setNight,dispose};
}
