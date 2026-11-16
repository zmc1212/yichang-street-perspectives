import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildBridgeContext } from './bridge-context.js';
import { buildBridgeStructure } from './bridge-structure.js';
import { buildRiverBank } from './river-bank.js';
import { markWaterMaterial } from './surface-pass.js';

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

export function createBridgeWorld(options={}){
  const variant=options.variant==='river'?'river':'bridge';
  const loopMs=variant==='river'?10000:LOOP;
  const group=new THREE.Group();group.name=variant==='river'?'夷陵长江大桥 · 江北江景':'夷陵长江大桥 · 一桥连两岸';
  const glow=[],noInk=[],staticMeshes=[],materialCache=new Map(),textures=new Set(),geometries=new Set();
  const emissives=[],lights=[],animated=[],nightObjects=[],nightVisible=[];
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
    if(merge)staticMeshes.push(o);return o;
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
  // Photographic plates for the river variant. Local builds inline the same
  // paths in __LOCAL_TEXTURES__ so double-clicking index.html still works.
  const pendingTextures=[],loader=new THREE.TextureLoader();
  function imageTexture(path){
    let settle;const ready=new Promise(resolve=>{settle=resolve;});
    const source=globalThis.__LOCAL_TEXTURES__?.[path]||path;
    const t=loader.load(source,()=>settle(),undefined,()=>settle());
    t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;textures.add(t);pendingTextures.push(ready);return t;
  }
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
  const waterMat=markWaterMaterial(customMaterial({map:waterTex,color:'#5c7c80'}));
  const water=plane(24000,24000,0,0,0,waterMat,0,group,false);water.rotation.x=-Math.PI/2;water.receiveShadow=true;

  // Photograph-informed components share the same metre coordinates and batching.
  const api={group,mesh,box,cyl,plane,beam,prismX,texture,imageTexture,material,customMaterial,
    emitting,instance,glow,noInk,emissives,nightVisible,geometries,DECK,font,rnd};
  // The real crossing carries about 800 m of water; the base model was 700 m.
  // Only the upstream bank moves, so the near promenade, the revetment and the
  // camera path stay exactly where they were tuned.
  api.riverWiden=variant==='river'?100:0;
  // The 9:16 preset is filmed almost along the river axis, so the pylon is read
  // through its thin section; the presets keep the surveyed 6.5 m shaft.
  api.towerBulk=variant==='river'?1:0;
  const structure=buildBridgeStructure(api);
  api.structure=structure;
  const context=buildBridgeContext(api);
  api.context=context;
  const river=variant==='river'?buildRiverBank(api):null;

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
    night=Boolean(value);
    for(const item of emissives){
      const towerDim=1;
      item.mat.emissiveIntensity=night?item.value*towerDim:0;
    }
    for(const x of nightObjects)x.mat.opacity=night?x.night:x.day;
    waterMat.color.set(night?(variant==='river'?'#243a40':'#29385b'):'#5c7c80');nightVisible.forEach(o=>o.visible=night);
    lights.forEach(l=>l.intensity=night?15:0);
  }
  function animate(ms,shot,camera){
    const t=((ms%loopMs)+loopMs)%loopMs/loopMs;
    waterTex.offset.y=t;
    for(const item of animated){
      if(item.kind==='vehicle')item.obj.position.x=item.x+Math.sin(t*TAU+item.seed*.61)*9;
      else{
        item.obj.position.z=item.z+Math.sin(t*TAU+item.seed)*19;item.obj.position.y=.4+Math.sin(t*TAU*2+item.seed)*.16;
        if(item.wake)item.wake.position.z=item.obj.position.z-33;
      }
    }
    if(river)river.update(t,camera);
  }
  function dispose(){
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());
    materialCache.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    for(const l of lights)l.shadow?.map?.dispose();
    group.clear();
  }
  const scaled=(min,max)=>({min:min.map(v=>v*SCALE),max:max.map(v=>v*SCALE)});
  const focus=variant==='river'
    ? {kind:'river',loop:loopMs}
    : {kind:'bridge',x:0,y:25,zf:0,W:420,
      heroBounds:[scaled([-470,20.5,-12],[470,34,12]),scaled([-356,0,-16],[-340,110,16]),scaled([-12,0,-18],[12,129.3,18]),scaled([340,0,-16],[356,110,16])],
      target:{left:.075,right:.925,top:.14,bottom:.79}};
  const visual=variant==='river'
    ? {kind:'river',scale:SCALE,hazeNear:320,hazeFar:1150,waterLevel:0,rain:.55,reflectGain:1.26,glowBoost:1.15,horizon:[.062,.066,.080]}
    : {kind:'river',scale:SCALE,hazeNear:350,hazeFar:1000,waterLevel:0};
  return {group,glow,noInk,focus,context,river,loop:loopMs,ready:Promise.all(pendingTextures),
    animate,setNight,dispose,water:[water],waterMesh:water,visual};
}
