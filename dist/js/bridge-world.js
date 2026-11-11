import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Original Yiling Yangtze Bridge scene, reconstructed from exterior photographs.
 * Main bridge: 120 + 348 + 348 + 120 m; 23 m deck; three towers, one central
 * cable plane with paired stays. All geometry is authored in metres, then the
 * complete group is scaled by .35 for the shared illustration renderer.
 * Tower tops (126 / 106.5 m) and the approx. 24 m deck elevation are photographic
 * proportions, not survey elevations. The two banks are contextual reconstructions.
 */
const SCALE=.35, LOOP=24000, TAU=Math.PI*2, DECK=24;
const rnd=n=>{const v=Math.sin(n*127.1+19.71)*43758.5453;return v-Math.floor(v);};

export function createBridgeWorld(){
  const group=new THREE.Group();group.name='夷陵长江大桥 · 一桥连两岸';
  const glow=[],noInk=[],staticMeshes=[],materialCache=new Map(),textures=new Set(),geometries=new Set();
  const emissives=[],lights=[],animated=[],nightObjects=[],nightVisible=[],foliage=[],trunks=[];
  let night=false;
  const white='#d8d8cc',concrete='#b9bdb2',red='#a94348',steel='#808b88';

  function material(color,options={}){
    const key=color+JSON.stringify(options);
    if(!materialCache.has(key))materialCache.set(key,new THREE.MeshLambertMaterial({color,...options}));
    return materialCache.get(key);
  }
  function customMaterial(options){const m=new THREE.MeshLambertMaterial(options);materialCache.set(m.uuid,m);return m;}
  function mesh(geo,mat,x=0,y=0,z=0,parent=group,merge=true){
    geometries.add(geo);const o=new THREE.Mesh(geo,typeof mat==='string'?material(mat):mat);
    o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);
    if(merge&&parent===group)staticMeshes.push(o);return o;
  }
  function box(w,h,d,x,y,z,mat,parent=group,merge=true){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent,merge);}
  function cyl(r1,r2,h,x,y,z,mat,n=8,parent=group,merge=true){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),mat,x,y,z,parent,merge);}
  function plane(w,h,x,y,z,mat,ry=0,parent=group,merge=true){const o=mesh(new THREE.PlaneGeometry(w,h),mat,x,y,z,parent,merge);o.rotation.y=ry;o.castShadow=false;return o;}
  function beam(a,b,w,d,mat,parent=group,merge=true){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
    const o=box(w,delta.length(),d,0,0,0,mat,parent,merge);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  }
  function texture(w,h,draw){
    const c=document.createElement('canvas');c.width=Math.round(w/2);c.height=Math.round(h/2);
    const ctx=c.getContext('2d');ctx.scale(.5,.5);draw(ctx,w,h);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.add(t);return t;
  }
  const font=(px,weight=600)=>`${weight} ${px}px "Scene Sans","Noto Sans CJK SC","Microsoft YaHei",sans-serif`;
  function emitting(color,strength){const m=material(color,{emissive:color,emissiveIntensity:0});if(!emissives.some(x=>x.mat===m))emissives.push({mat:m,value:strength});return m;}
  function instance(geo,mat,items){
    geometries.add(geo);const m=new THREE.InstancedMesh(geo,mat,items.length),o=new THREE.Object3D();
    items.forEach((p,i)=>{
      o.position.set(...(p.pos||[0,0,0]));o.scale.set(...(p.scale||[1,1,1]));o.rotation.set(0,0,0);o.quaternion.identity();
      if(p.quaternion)o.quaternion.copy(p.quaternion);if(p.rotation)o.rotation.set(...p.rotation);o.updateMatrix();m.setMatrixAt(i,o.matrix);
      if(p.color)m.setColorAt(i,new THREE.Color(p.color));
    });
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();group.add(m);return m;
  }
  function prismX(x0,x1,zy,mat){
    const shape=new THREE.Shape();zy.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:x1-x0,bevelEnabled:false,steps:1,curveSegments:1});g.rotateY(Math.PI/2);
    return mesh(g,mat,x0,0,0);
  }

  // A continuous river, with subtle world-scale streaks rather than a rectangular base.
  const waterTex=texture(1024,1024,(c,W,H)=>{
    c.fillStyle='#9daeb5';c.fillRect(0,0,W,H);
    for(let i=0;i<3600;i++){
      const x=rnd(i*5)*W,y=rnd(i*5+1)*H,w=3+rnd(i*5+2)*30;
      c.fillStyle=i%2?'rgba(158,185,170,.065)':'rgba(18,60,66,.055)';c.fillRect(x,y,w,.6+rnd(i*5+3)*1.4);
    }
  });
  waterTex.wrapS=waterTex.wrapT=THREE.RepeatWrapping;waterTex.repeat.set(120,120);
  const waterMat=customMaterial({map:waterTex,color:'#5c7c80'});
  const water=plane(24000,24000,0,0,0,waterMat,0,group,false);water.rotation.x=-Math.PI/2;water.receiveShadow=true;

  const cityShore=z=>-351-16*Math.sin(z/320)+10*Math.sin(z/780);
  const hillShore=z=>349+13*Math.sin(z/270)+18*Math.sin(z/680);
  function bankRibbon(shore,sign,a,b,ya,yb,mat,{z0=-8000,z1=8000,steps=320,uvScale=20}={}){
    const pos=[],uv=[],idx=[];
    for(let i=0;i<=steps;i++){
      const z=z0+(z1-z0)*i/steps,s=shore(z);
      pos.push(s+sign*a,ya,z,s+sign*b,yb,z);uv.push(a/uvScale,z/uvScale,b/uvScale,z/uvScale);
      if(i<steps){const k=i*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const o=mesh(g,mat);o.material.side=THREE.DoubleSide;return o;
  }
  const stoneTex=texture(512,512,(c,W,H)=>{
    c.fillStyle='#9a9d8f';c.fillRect(0,0,W,H);c.strokeStyle='#7d8376';c.lineWidth=2;
    for(let y=0;y<H;y+=32){for(let x=(y%64?0:-28);x<W;x+=56){c.fillStyle=`rgba(182,185,166,${.05+rnd(x+y)*.16})`;c.fillRect(x+1,y+1,54,30);c.strokeRect(x,y,56,32);}}
  });stoneTex.wrapS=stoneTex.wrapT=THREE.RepeatWrapping;
  const stone=customMaterial({map:stoneTex,color:'#fff',side:THREE.DoubleSide});
  bankRibbon(cityShore,-1,-8,6,-2,.9,'#9b9981');
  bankRibbon(cityShore,-1,6,28,.9,5.8,stone,{uvScale:7});
  bankRibbon(cityShore,-1,28,39,5.8,5.8,'#afb3a8');
  bankRibbon(cityShore,-1,39,42,5.8,9.6,stone,{uvScale:8});
  bankRibbon(cityShore,-1,42,67,9.6,9.7,'#607a52');
  bankRibbon(cityShore,-1,67,74,9.7,9.7,'#b5b9ad');
  bankRibbon(cityShore,-1,74,103,9.55,9.55,'#687172');
  bankRibbon(cityShore,-1,103,112,9.7,9.7,'#afb5a9');
  bankRibbon(cityShore,-1,112,10000,9.5,10.2,'#a4aa98');
  // The city bank's road, kerbs and steps follow the river rather than a straight slab.
  bankRibbon(cityShore,-1,73.5,74.2,9.8,9.8,'#d0d2c4');
  bankRibbon(cityShore,-1,102.7,103.3,9.8,9.8,'#c6cabe');
  const pathLine=[];
  for(let z=-1550;z<1550;z+=28){
    const x=cityShore(z);box(.17,.035,10,x-88.5,9.6,z,'#c7c9bd');
    for(const offset of[48,118]){tree(x-offset,z,1.05+rnd(z)*.2);}
    if(Math.abs(z)>45&&Math.abs(z)<650){
      box(4.8,.6,1.1,x-33,6.5,z,'#858975');box(.3,1.1,1.2,x-35,6.15,z,'#696f63');box(.3,1.1,1.2,x-31,6.15,z,'#696f63');
    }
    if(z%56===0&&Math.abs(z)<650){
      for(let k=0;k<7;k++)box(4.5,.68,1.6,x-17-k*2,1.4+k*.68,z,'#aaa99a');
    }
  }

  // Continuous, gently irregular wooded hills on the opposite bank. High ridges
  // sit behind the bridge; the +Z foreground is lower so the three towers stay visible.
  const peaks=[
    [570,-230,138,190,280],[820,-590,176,260,390],[630,-1120,149,220,440],
    [1120,-1500,212,410,490],[1480,-450,183,510,520],[680,760,46,260,620],
  ];
  function hillHeight(x,z){
    const d=Math.max(0,x-hillShore(z));
    let y=4.5;
    for(const [cx,cz,h,sx,sz]of peaks)y+=h*Math.exp(-(((x-cx)/sx)**2)-(((z-cz)/sz)**2));
    y+=Math.sin(x*.021+z*.008)*3.5+Math.sin(z*.025-x*.013)*2;
    const fade=Math.min(1,d/65),height=Math.max(2,3.8+(y-3.8)*fade);
    // The bridgehead opens into a broad, gently graded riverside lowland.
    // Keep both the long-lens sightlines and the close approach above terrain;
    // distant wooded ridges remain outside this opening, on either side.
    const fromTower=Math.max(0,x-348);
    const lowlandMin=-.5*fromTower-100,lowlandMax=.85*fromTower+120;
    const outside=Math.max(lowlandMin-z,z-lowlandMax,0);
    return 5+(height-5)*THREE.MathUtils.smoothstep(outside,0,150);
  }
  bankRibbon(hillShore,1,-9,16,-1.9,3.8,'#94977f');
  bankRibbon(hillShore,1,16,24,3.8,4.9,stone,{uvScale:9});
  bankRibbon(hillShore,1,24,37,5,5,'#66716b');
  bankRibbon(hillShore,1,37,42,5,5.2,'#9ca894');
  // Preserve the detailed near-bank grid; only the distant skirt uses broad cells.
  const hillOffsets=Array.from({length:67},(_,i)=>42+2260*i/66).concat([3000,4000,5200,6600,8200,10000]);
  const hp=[],hc=[],huv=[],hi=[],nx=hillOffsets.length-1,nz=320,zmin=-8000,zmax=8000;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const z=zmin+(zmax-zmin)*j/nz,x=hillShore(z)+hillOffsets[i],y=hillHeight(x,z);
    hp.push(x,y,z);huv.push(i/nx,j/nz);
    const col=new THREE.Color().setRGB(.16+rnd(i*11+j)*.034,.25+rnd(i*7+j)*.05,.18+rnd(i*13+j)*.027);hc.push(col.r,col.g,col.b);
    if(j<nz&&i<nx){const k=j*(nx+1)+i;hi.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1);}
  }
  const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));hg.setAttribute('color',new THREE.Float32BufferAttribute(hc,3));hg.setAttribute('uv',new THREE.Float32BufferAttribute(huv,2));hg.setIndex(hi);hg.computeVertexNormals();
  mesh(hg,customMaterial({color:'#fff',vertexColors:true,side:THREE.DoubleSide}));
  for(let i=0;i<360;i++){
    const z=-1500+rnd(i*7)*2100,x=hillShore(z)+48+rnd(i*7+1)*510,y=hillHeight(x,z);
    tree(x,z,.95+rnd(i*7+2)*.55,y);
  }
  // A handful of low buildings and a riverside lane, kept clear of the bridgehead.
  for(let i=0;i<9;i++){
    const z=-120-i*70,x=hillShore(z)+57;
    const h=8+rnd(i+8)*8;box(19,h,12,x,hillHeight(x,z)+h/2,z,'#b1b8aa');
    box(21,.6,14,x,hillHeight(x,z)+h+.4,z,'#6d7e77');
  }

  // A varied but subordinate city skyline: high masses are on the -Z background.
  const facadeMats=[];
  for(let style=0;style<5;style++){
    const tex=texture(512,1024,(c,W,H)=>{
      c.fillStyle=['#babcb1','#aeb6b2','#c6c3b5','#9caeb0','#b9b6a7'][style];c.fillRect(0,0,W,H);
      const rows=16,cols=5,cw=W/cols,rh=H/rows;
      for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
        c.fillStyle=rnd(r*23+k*7+style)<.12?'#a9a78e':'#657570';c.fillRect(k*cw+cw*.24,r*rh+rh*.2,cw*.48,rh*.56);
        c.fillStyle='#969f94';c.fillRect(k*cw+cw*.17,r*rh+rh*.78,cw*.62,3);
      }
      if(style%2===0){c.fillStyle='rgba(240,239,219,.23)';for(let k=0;k<cols;k++)c.fillRect(k*cw,0,5,H);}
    });
    const lit=texture(512,1024,(c,W,H)=>{
      c.fillStyle='#000';c.fillRect(0,0,W,H);
      for(let r=0;r<16;r++)for(let k=0;k<5;k++)if(rnd(r*23+k*7+style)<.15){c.fillStyle='#a59369';c.fillRect(k*W/5+W*.048,r*H/16+H*.0125,W*.096,H*.035);}
    });
    const m=customMaterial({map:tex,color:'#fff',emissive:'#fff',emissiveMap:lit,emissiveIntensity:0});emissives.push({mat:m,value:.7});facadeMats.push(m);
  }
  function cityBuilding(x,z,w,d,h,style){
    const y=10;box(w,h,d,x,y+h/2,z,['#bec0b4','#acb5ad','#c7c2b1','#a0adab','#b6b7ac'][style]);
    const mat=facadeMats[style];plane(w-.6,h-2,x,y+h/2,z+d/2+.08,mat);
    plane(d-.6,h-2,x+w/2+.08,y+h/2,z,mat,Math.PI/2);
    box(w+.6,.9,d+.6,x,y+h+.45,z,'#9ea99c');box(w*.36,2.1,d*.3,x+w*.16,y+h+1.6,z-d*.13,'#9aa69d');
  }
  for(let i=0;i<56;i++){
    const row=Math.floor(i/8),col=i%8,z=-130-row*115+rnd(i*7)*20;
    const x=cityShore(z)-135-col*53-rnd(i*9)*12,w=25+rnd(i*3)*16,d=23+rnd(i*3+1)*20;
    let h=28+rnd(i*3+2)*65;if(col>4)h*=.82;
    cityBuilding(x,z,w,d,h,i%5);
  }
  for(let i=0;i<17;i++){
    const z=70+i*65,x=cityShore(z)-145-(i%3)*61;
    cityBuilding(x,z,30+rnd(i)*14,26,12+rnd(i+10)*19,i%5);
  }
  // Low riverside kiosks and a distinct long promenade are visible between bridge and skyline.
  for(const z of[-260,-140,185,310]){
    const x=cityShore(z)-60;box(12,4,7,x,11.8,z,'#b8b7a4');box(14,.5,9,x,14.1,z,'#66776e');
  }

  // Main prestressed concrete box girder and four-lane road.
  prismX(-468,468,[[-11.5,DECK],[11.5,DECK],[9.55,DECK-2.9],[-9.55,DECK-2.9]],concrete);
  const roadTex=texture(4096,256,(c,W,H)=>{
    c.fillStyle='#596268';c.fillRect(0,0,W,H);
    const pz=z=>(z+11.5)/23*H;
    c.fillStyle='#d0d1c3';for(const z of[-9.25,9.25])c.fillRect(0,pz(z),W,1.3);
    for(const z of[-5.375,5.375])for(let x=0;x<W;x+=56)c.fillRect(x,pz(z),27,1.5);
    c.fillStyle='#bfb87b';for(const z of[-1.56,1.56])c.fillRect(0,pz(z),W,1.45);
    c.fillStyle='#acb4ab';c.fillRect(0,0,W,pz(-9.25));c.fillRect(0,pz(9.25),W,H-pz(9.25));
    c.fillStyle='#c3c6b7';c.fillRect(0,pz(-1.5),W,3/23*H);
    for(let x=0;x<W;x+=220){c.fillStyle='rgba(36,51,51,.16)';c.fillRect(x,0,1,H);}
  });
  const roadMat=customMaterial({map:roadTex,color:'#fff'});
  const roadway=plane(936,23,0,DECK+.035,0,roadMat);roadway.rotation.x=-Math.PI/2;
  box(936,.65,2.65,0,DECK+.35,0,'#bec3b7');
  for(const z of[-9.45,9.45])box(936,.24,.18,0,DECK+.19,z,'#c7cabf');

  // Continuous approaches connect the bridge to both banks and leave the frame naturally.
  const approachSurface=material('#646d70');
  for(const side of[-1,1]){
    const segments=[[468,670,DECK,22],[670,920,22,16],[920,1450,16,11]];
    for(const [a,b,ha,hb]of segments){
      const girder=box(b-a,2.6,23,side*(a+b)/2,(ha+hb)/2-1.3,0,concrete);girder.rotation.z=side*Math.atan2(hb-ha,b-a);
      const slab=box(b-a,.12,22,side*(a+b)/2,(ha+hb)/2+.13,0,approachSurface);slab.rotation.z=side*Math.atan2(hb-ha,b-a);
      for(let x=a+35;x<b;x+=65){const y=ha+(hb-ha)*(x-a)/(b-a);box(5.6,y-8,9,side*x,8+(y-8)/2,0,'#a9b4ab');box(10,1.5,19,side*x,y-1.5,0,'#bac0b5');}
    }
  }

  // Three inverted-Y towers. The legs straddle the road and converge into the
  // slender upper shaft; tower heights include the portion below the deck.
  const cableItems=[];
  const towerWhite=material(white,{emissive:'#e9c58a',emissiveIntensity:0});
  emissives.push({mat:towerWhite,value:.55});
  function tower(x,top,center){
    const baseW=center?24:19,baseD=center?29:25;
    box(baseW+5,2.5,baseD+5,x,.7,0,'#866b5d');box(baseW,4.5,baseD,x,3.4,0,'#c8c7b7');
    prismX(x-6.7,x+6.7,[[-10,5],[10,5],[7.5,DECK-2],[-7.5,DECK-2]],'#b9c0b6');
    box(15,2.2,27,x,DECK-1.3,0,'#c7c9bc');
    const join=DECK+(top-DECK)*.51;
    for(const side of[-1,1]){
      beam([x,DECK-1.2,side*10.1],[x,join,side*1.9],4.7,3.3,towerWhite);
      // Narrow, subdued blue side inset documented in the riverbank photographs.
      for(const face of[-1,1])beam([x+face*2.37,DECK+.7,side*9.9],[x+face*2.37,join-1.1,side*1.9],.065,1.0,'#7295a1');
    }
    box(5.3,top-join+1.0,5.15,x,(top+join)/2,0,towerWhite);
    for(const face of[-1,1])box(.065,top-join-2,1.15,x+face*2.68,(top+join)/2,0,'#7999a2');
    box(5.55,.85,5.45,x,top+.2,0,towerWhite);cyl(.14,.14,2.4,x,top+1.7,0,steel,6);
    const gold=emitting('#dfb978',1.8);
    for(const face of[-1,1])for(const edge of[-1,1]){
      const strip=box(.14,top-join-1,.24,x+face*2.73,(top+join)/2,edge*2.45,gold,group,false);strip.visible=false;nightVisible.push(strip);noInk.push(strip);glow.push(strip);
      const leg=beam([x+face*2.42,DECK+1,edge*10.0],[x+face*2.42,join-1,edge*1.9],.11,.2,gold,group,false);leg.visible=false;nightVisible.push(leg);noInk.push(leg);glow.push(leg);
    }
    const minAnchor=join+3,maxAnchor=top-4.0;
    const fans=x===0?[[-1,174,20],[1,174,20]]:x<0?[[-1,120,19],[1,174,20]]:[[-1,174,20],[1,120,19]];
    for(const [dir,reach,count]of fans)for(let k=1;k<=count;k++){
      const u=k/count,ax=x+dir*(12+(reach-12)*u),ay=minAnchor+(maxAnchor-minAnchor)*u;
      for(const pair of[-1,1]){
        const a=new THREE.Vector3(x,ay,pair*.34),b=new THREE.Vector3(ax,DECK+.7,pair*.34),delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
        cableItems.push({pos:mid.toArray(),scale:[1,delta.length(),1],quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize())});
        // Concrete anchor shoes stay in the central median, never along deck edges.
        box(.65,.5,.55,ax,DECK+.94,pair*.4,'#bdc4b8');
      }
    }
  }
  tower(-348,106.5,false);tower(0,126,true);tower(348,106.5,false);
  const cables=instance(new THREE.CylinderGeometry(.21,.21,1,5),emitting('#d0d1c5',.2),cableItems);cables.name='236根中央成对斜拉索';

  // Red is confined to the railing rails and the central divider, as photographed.
  const railMat=emitting(red,.12),railPosts=[];
  for(const z of[-11.25,-1.4,1.4,11.25]){
    box(936,.16,.16,0,DECK+1.3,z,railMat);box(936,.115,.12,0,DECK+.74,z,'#a6b0a5');
    for(let x=-466;x<=466;x+=4.5)railPosts.push({pos:[x,DECK+.75,z],scale:[.11,1.35,.11]});
  }
  instance(new THREE.BoxGeometry(1,1,1),material('#acb5a9'),railPosts);
  const lampPosts=[],lampHeads=[];
  for(let x=-450;x<=450;x+=38)for(const side of[-1,1]){
    lampPosts.push({pos:[x,DECK+4.1,side*10.5],scale:[.18,8.2,.18]});
    box(1.9,.12,.16,x+.8,DECK+8,side*10.5,steel);
    lampHeads.push({pos:[x+1.55,DECK+7.94,side*10.5],scale:[1.2,.2,.45]});
  }
  instance(new THREE.BoxGeometry(1,1,1),material(steel),lampPosts);
  const lampGlow=instance(new THREE.BoxGeometry(1,1,1),emitting('#e2d9bb',1.4),lampHeads);glow.push(lampGlow);

  // Bridgehead walls: red-brown piers and pale stone bridge-name panels.
  const nameTex=texture(2048,384,(c,W,H)=>{
    c.fillStyle='#d8dcd0';c.fillRect(0,0,W,H);c.strokeStyle='#aeb8ac';c.lineWidth=3;c.strokeRect(9,9,W-18,H-18);
    c.fillStyle='#847451';c.textAlign='center';c.textBaseline='middle';c.font=font(178,500);c.fillText('夷陵长江大桥',W/2,H*.42,W*.94);
    c.font=font(42,500);c.fillText('YILING YANGTZE BRIDGE',W/2,H*.79,W*.85);
  });
  const nameMat=customMaterial({map:nameTex,color:'#fff'});
  for(const end of[-1,1])for(const side of[-1,1]){
    const x=end*487,z=side*18.5;
    box(2.8,8.8,18,x,DECK+2.5,z,'#855d57');box(3,11.8,3,x,DECK+3.6,z-side*8.2,'#915d59');
    const panel=plane(15.6,4.5,x+end*1.45,DECK+5.1,z,nameMat,end<0?-Math.PI/2:Math.PI/2);
    panel.renderOrder=1;
  }

  // Traffic remains at the same physical scale as the 23 m road, with gradual
  // local movement so a loop does not teleport vehicles through the hero view.
  function vehicle(x,z,seed){
    const g=new THREE.Group();g.position.set(x,DECK+.2,z);group.add(g);const bus=seed%9===0,w=bus?2.45:1.86,len=bus?10.5:4.7,h=bus?2.8:1.25;
    const col=['#d5d7cc','#9bafb2','#777f7e','#b8a68d'][seed%4];
    box(len,h,w,0,h/2+.35,0,col,g,false);box(bus?len-.8:2.6,bus?1.0:.7,w-.24,0,h+.3,0,'#40545a',g,false);
    box(bus?len-.5:2.8,.12,w-.16,0,h+(bus?.84:.71),0,col,g,false);
    for(const xx of[-len*.31,len*.31])for(const side of[-1,1]){const wheel=cyl(.34,.34,.2,xx,.42,side*w/2,'#334442',8,g,false);wheel.rotation.x=Math.PI/2;}
    box(.1,.25,w*.7,len/2+.07,.65,0,'#e4ddba',g,false);box(.1,.22,w*.7,-len/2-.07,.65,0,'#9c5651',g,false);
    for(const side of[-1,1]){const lamp=box(.11,.23,.34,len/2+.13,.85,side*w*.3,emitting('#f0dcad',1.7),g,false);lamp.userData.noMerge=true;glow.push(lamp);noInk.push(lamp);}
    animated.push({kind:'vehicle',obj:g,x,z,seed});
  }
  for(let i=0;i<15;i++)vehicle(-420+i*59, i%2?3.7:-6.7,i);

  function boat(x,z,length,width,seed){
    const g=new THREE.Group();g.position.set(x,.4,z);group.add(g);
    const shape=new THREE.Shape();shape.moveTo(-width*.5,-length*.4);shape.lineTo(-width*.5,length*.25);shape.lineTo(0,length*.5);shape.lineTo(width*.5,length*.25);shape.lineTo(width*.5,-length*.4);shape.closePath();
    const hull=new THREE.ExtrudeGeometry(shape,{depth:2.5,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.5,bevelThickness:.5});hull.rotateX(-Math.PI/2);
    mesh(hull,seed?'#4d6666':'#677b72',0,0,0,g,false);
    box(width*.86,.6,length*.74,0,2.9,0,'#b7c1b1',g,false);
    box(width*.72,3.3,length*.18,0,4.8,-length*.24,'#e0dfca',g,false);
    box(width*.76,1.05,length*.16,0,5.8,-length*.24,'#426571',g,false);
    box(width*.8,.35,length*.2,0,6.55,-length*.24,'#b8c3b4',g,false);
    if(seed){box(width*.66,1.2,length*.32,0,3.8,length*.06,'#536966',g,false);}
    else{for(let i=0;i<4;i++)box(width*.66,2.1,length*.11,0,4.1,-length*.04+i*length*.12,i%2?'#8c8e75':'#a69a74',g,false);}
    cyl(.12,.12,5.2,0,8.3,-length*.24,steel,6,g,false);
    for(const side of[-1,1]){const lamp=box(.38,.38,.45,side*width*.35,5.9,-length*.14,emitting(side<0?'#b0d5ad':'#e7e0bd',1.5),g,false);lamp.userData.noMerge=true;glow.push(lamp);noInk.push(lamp);}
    animated.push({kind:'boat',obj:g,x,z,seed});
    return g;
  }
  boat(92,195,58,10,0);boat(-167,-265,38,8,1);

  // Boat wakes sit over the water; tower reflections come from the renderer.
  const wakeTex=texture(256,512,(c,W,H)=>{
    c.clearRect(0,0,W,H);c.strokeStyle='rgba(204,224,207,.32)';c.lineWidth=7;
    for(let i=0;i<7;i++){c.beginPath();c.moveTo(W*.5,H*.1+i*18);c.lineTo(W*(.18-i*.015),H*(.6+i*.05));c.moveTo(W*.5,H*.1+i*18);c.lineTo(W*(.82+i*.015),H*(.6+i*.05));c.stroke();}
  });
  const wakeMat=customMaterial({map:wakeTex,transparent:true,opacity:.24,depthWrite:false,color:'#d3e1ce'});
  for(const item of animated.filter(a=>a.kind==='boat')){
    const w=plane(17,48,item.x,.03,item.z-33,wakeMat,0,group,false);w.rotation.x=-Math.PI/2;noInk.push(w);item.wake=w;
  }

  function tree(x,z,scale=1,y=9.7){
    if(Math.abs(x)>440&&Math.abs(z)<48)return;
    trunks.push({pos:[x,y+4.0*scale,z],scale:[.72*scale,8*scale,.72*scale]});
    const colors=['#405f45','#49674a','#385941','#536e4e'];
    foliage.push({pos:[x,y+8.2*scale,z],scale:[4.4*scale,3.9*scale,4.2*scale],color:colors[Math.floor(rnd(x+z)*4)]});
    foliage.push({pos:[x+2.5*scale,y+7.6*scale,z+1.2],scale:[3.2*scale,3.0*scale,3.4*scale],color:colors[Math.floor(rnd(x-z)*4)]});
  }
  instance(new THREE.CylinderGeometry(.48,.62,1,6),material('#665f50'),trunks);
  instance(new THREE.IcosahedronGeometry(1,1),material('#ffffff'),foliage);

  // Rigid vehicles and boats share vertex-colour batches within their moving group.
  const moverMat=customMaterial({color:'#fff',vertexColors:true});
  for(const item of animated){
    const meshes=item.obj.children.filter(o=>o.isMesh&&!o.material.map&&!o.userData.noMerge),geos=[];
    for(const o of meshes){
      o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);
      for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);
      if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
      const cols=new Float32Array(g.attributes.position.count*3);for(let i=0;i<cols.length;i+=3){cols[i]=o.material.color.r;cols[i+1]=o.material.color.g;cols[i+2]=o.material.color.b;}
      g.setAttribute('color',new THREE.BufferAttribute(cols,3));geos.push(g);
    }
    if(geos.length){const merged=mergeGeometries(geos,false);if(merged){geometries.add(merged);const o=new THREE.Mesh(merged,moverMat);o.castShadow=true;o.receiveShadow=true;item.obj.add(o);meshes.forEach(m=>m.removeFromParent());}geos.forEach(g=>g.dispose());}
  }

  // Merge static geometry by material while transforms are still in true metres.
  group.updateMatrixWorld(true);const batches=new Map();
  for(const o of staticMeshes){
    if(o.isInstancedMesh||glow.includes(o)||noInk.includes(o)||Array.isArray(o.material))continue;
    const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,geos:[],objects:[]});const b=batches.get(key);
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);
    if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
    b.geos.push(g);b.objects.push(o);
  }
  for(const {mat,geos,objects}of batches.values()){
    if(geos.length>1){const merged=mergeGeometries(geos,false);if(merged){geometries.add(merged);const o=new THREE.Mesh(merged,mat);o.castShadow=true;o.receiveShadow=true;group.add(o);objects.forEach(m=>m.removeFromParent());}}
    geos.forEach(g=>g.dispose());
  }
  group.scale.setScalar(SCALE);
  group.updateMatrixWorld(true);

  function setNight(value){
    night=Boolean(value);for(const {mat,value}of emissives)mat.emissiveIntensity=night?value:0;
    for(const x of nightObjects)x.mat.opacity=night?x.night:x.day;
    waterMat.color.set(night?'#29385b':'#5c7c80');nightVisible.forEach(o=>o.visible=night);
    lights.forEach(l=>l.intensity=night?15:0);
  }
  function animate(ms){
    const t=((ms%LOOP)+LOOP)%LOOP/LOOP;
    waterTex.offset.y=t;
    for(const item of animated){
      if(item.kind==='vehicle')item.obj.position.x=item.x+Math.sin(t*TAU+item.seed*.61)*9;
      else{
        item.obj.position.z=item.z+Math.sin(t*TAU+item.seed)*19;item.obj.position.y=.4+Math.sin(t*TAU*2+item.seed)*.16;
        if(item.wake)item.wake.position.z=item.obj.position.z-33;
      }
    }

  }
  function dispose(){
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());
    materialCache.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    for(const l of lights)l.shadow?.map?.dispose();
    group.clear();
  }
  const scaled=(min,max)=>({min:min.map(v=>v*SCALE),max:max.map(v=>v*SCALE)});
  const focus={kind:'bridge',x:0,y:25,zf:0,W:420,
    heroBounds:[scaled([-470,20.5,-12],[470,34,12]),scaled([-356,0,-16],[-340,110,16]),scaled([-12,0,-18],[12,129.3,18]),scaled([340,0,-16],[356,110,16])],
    target:{left:.075,right:.925,top:.14,bottom:.79}};
  return {group,glow,noInk,focus,animate,setNight,dispose,water:[water],waterMesh:water,visual:{kind:'river',scale:SCALE,hazeNear:350,hazeFar:1000,waterLevel:0}};
}
