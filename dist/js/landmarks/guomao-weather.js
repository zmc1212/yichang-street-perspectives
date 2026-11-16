/*
 * Rain-night dressing for the Guomao frontage.
 *
 * The reference scene (rainy-night-store) reads as a dark, wet diorama: almost
 * black air, saturated shopfront light, long mirror streaks running from every
 * light source toward the viewer, soft lamp cones, ripples and drifting spray.
 * The building itself is untouched here; this module only adds the light the
 * wet night throws back at the camera.
 *
 * Every object is additive and registered as `noInk`, so it exists only in the
 * colour pass and never draws an ink line of its own.
 */
export function buildGuomaoWeather({THREE,canvasTexture,noInk,seeded}){
  const root=new THREE.Group();root.name='国贸 · 雨夜灯光';
  root.visible=false;
  const materials=[],streaks=[],billboards=[],ripples=[];
  const WALK_Y=.215,ROAD_Y=.035;

  // --- Textures -----------------------------------------------------------
  // A streak is bright where it leaves the light and dissolves into the wet
  // paving. Ripple bands are punched out of the alpha so it reads as water.
  const streakTex=canvasTexture(128,512,(c,W,H)=>{
    c.clearRect(0,0,W,H);
    const g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(255,255,255,.98)');
    g.addColorStop(.12,'rgba(255,255,255,.66)');
    g.addColorStop(.42,'rgba(255,255,255,.24)');
    g.addColorStop(.74,'rgba(255,255,255,.08)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,W,H);
    c.globalCompositeOperation='destination-out';
    for(let i=0;i<30;i++){
      const y=seeded(i*3.1)*H;
      c.fillStyle=`rgba(0,0,0,${.05+seeded(i*7.7)*.24})`;
      c.fillRect(0,y,W,1.5+seeded(i*5.3)*5);
    }
    const edge=c.createLinearGradient(0,0,W,0);
    edge.addColorStop(0,'rgba(0,0,0,1)');
    edge.addColorStop(.14,'rgba(0,0,0,0)');
    edge.addColorStop(.86,'rgba(0,0,0,0)');
    edge.addColorStop(1,'rgba(0,0,0,1)');
    c.fillStyle=edge;c.fillRect(0,0,W,H);
    c.globalCompositeOperation='source-over';
  });
  const radialTex=canvasTexture(256,256,(c,W,H)=>{
    c.clearRect(0,0,W,H);
    const g=c.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);
    g.addColorStop(0,'rgba(255,255,255,.92)');
    g.addColorStop(.22,'rgba(255,255,255,.52)');
    g.addColorStop(.52,'rgba(255,255,255,.16)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,W,H);
  });
  const ringTex=canvasTexture(128,128,(c,W,H)=>{
    c.clearRect(0,0,W,H);
    const g=c.createRadialGradient(W/2,H/2,W*.28,W/2,H/2,W*.48);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.55,'rgba(255,255,255,.55)');
    g.addColorStop(.82,'rgba(255,255,255,.22)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(W/2,H/2,W/2,0,Math.PI*2);c.fill();
  });
  const coneTex=canvasTexture(256,512,(c,W,H)=>{
    c.clearRect(0,0,W,H);
    const g=c.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(255,255,255,.34)');
    g.addColorStop(.45,'rgba(255,255,255,.18)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;
    c.beginPath();
    c.moveTo(W*.42,0);c.lineTo(W*.58,0);
    c.lineTo(W*.98,H*.66);c.quadraticCurveTo(W*.5,H*.90,W*.02,H*.66);
    c.closePath();c.fill();
    const edge=c.createLinearGradient(0,0,W,0);
    edge.addColorStop(0,'rgba(0,0,0,1)');
    edge.addColorStop(.26,'rgba(0,0,0,0)');
    edge.addColorStop(.74,'rgba(0,0,0,0)');
    edge.addColorStop(1,'rgba(0,0,0,1)');
    c.globalCompositeOperation='destination-out';
    c.fillStyle=edge;c.fillRect(0,0,W,H);
    c.globalCompositeOperation='source-over';
  });
  const dotTex=canvasTexture(64,64,(c,W,H)=>{
    c.clearRect(0,0,W,H);
    const g=c.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.4,'rgba(255,255,255,.55)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,W,H);
  });

  function additive(map,color,opacity){
    const m=new THREE.MeshBasicMaterial({map,color,transparent:true,opacity,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    materials.push(m);return m;
  }
  function register(mesh){
    mesh.renderOrder=2;mesh.frustumCulled=false;root.add(mesh);noInk.push(mesh);return mesh;
  }

  // --- Wet light streaks --------------------------------------------------
  // Geometry starts at the light and runs one unit along +z; per frame it is
  // turned toward the camera, exactly like a real reflection under a sky.
  const streakGeo=new THREE.PlaneGeometry(1,1);
  streakGeo.rotateX(-Math.PI/2);streakGeo.translate(0,0,.5);
  function streak(x,z,width,length,color,opacity,y){
    const mesh=register(new THREE.Mesh(streakGeo,additive(streakTex,color,opacity)));
    mesh.position.set(x,y,z);mesh.scale.set(width,1,length);
    streaks.push(mesh);return mesh;
  }
  function pool(x,z,radius,color,opacity,y){
    const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);
    const mesh=register(new THREE.Mesh(geo,additive(radialTex,color,opacity)));
    mesh.position.set(x,y,z);mesh.scale.set(radius*2,1,radius*2);
    return mesh;
  }
  function halo(x,y,z,w,h,color,opacity,map=radialTex){
    const mesh=register(new THREE.Mesh(new THREE.PlaneGeometry(1,1),additive(map,color,opacity)));
    mesh.position.set(x,y,z);mesh.scale.set(w,h,1);billboards.push(mesh);return mesh;
  }

  const WARM='#ffb877',WARM2='#ffd3a0',PINK='#ff5f9e',COOL='#a9cfe2';

  // Ground-floor glazing: a warm sheet of light over the wet paving. The
  // streaks run well past the kerb so the long-lens frame still reads wet.
  for(let i=0;i<9;i++){
    const x=-67.4+i*6.1;
    streak(x,-4.02,3.6+seeded(i*5.1)*1.4,30+seeded(i*3.7)*10,
      i%3===0?WARM2:WARM,.27+seeded(i*9.3)*.11,WALK_Y);
  }
  // Main entrance is the brightest anchor of the frontage, but the additive
  // sheet plus bloom clipped to a flat yellow band, so it stays muted.
  streak(-25.2,-3.5,8,38,WARM2,.36,WALK_Y);
  pool(-25.2,-.4,7.5,WARM2,.15,WALK_Y);
  // The magenta screen throws a long, soft coloured stain across the plaza.
  streak(-59.2,-4.06,15,40,PINK,.28,WALK_Y);
  pool(-59.2,1.4,11,PINK,.18,WALK_Y);
  // Street lamps: amber pools on the carriageway and a streak at each cone.
  for(const x of [-92,-16,25]){
    pool(x,12.6,7,WARM,.17,ROAD_Y);
    streak(x,12.2,4.6,22,WARM2,.23,ROAD_Y);
  }
  // Narrow side street to the east of the podium.
  pool(-7.6,-25,5.2,WARM,.13,ROAD_Y);
  streak(-7.6,-24.6,3.6,15,WARM,.18,ROAD_Y);
  // A cool sky reflection keeps the asphalt from going flat black.
  pool(4,24,20,COOL,.07,ROAD_Y);
  // A continuous warm band along the kerb ties the individual streaks together.
  pool(-43,13,26,WARM,.055,ROAD_Y);

  // Light bleeding into the humid air: soft cards that always face the camera.
  halo(-45,2.6,.6,80,10,WARM,.12);
  halo(-59.2,12.2,-1.4,26,13,PINK,.10);
  halo(-40,6.2,5.5,90,18,COOL,.045);
  // Lamp cones, the strongest single light gesture in the reference.
  for(const x of [-92,-16,25]) halo(x,5.2,12.1,6.4,9,WARM2,.22,coneTex);

  // --- Rain rings ---------------------------------------------------------
  const ringGeo=new THREE.PlaneGeometry(1,1);ringGeo.rotateX(-Math.PI/2);
  for(let i=0;i<38;i++){
    const onRoad=i>23;
    const x=onRoad?-92+seeded(i*2.3)*124:-70+seeded(i*2.3)*58;
    const z=onRoad?8+seeded(i*7.1)*26:-2.6+seeded(i*7.1)*10.5;
    const mat=additive(ringTex,'#cfe6ec',.30);
    const mesh=register(new THREE.Mesh(ringGeo,mat));
    mesh.position.set(x,(onRoad?ROAD_Y:WALK_Y)+.012,z);
    ripples.push({mesh,offset:seeded(i*11.7),base:.55+seeded(i*4.9)*.5,opacity:.22+seeded(i*6.3)*.14});
  }

  // --- Spray caught by the shopfront light --------------------------------
  const sparkCount=260,sparkPos=new Float32Array(sparkCount*3);
  for(let i=0;i<sparkCount;i++){
    sparkPos[i*3]=-71+seeded(i*3.3)*59;
    sparkPos[i*3+1]=.35+seeded(i*7.9)*1.9;
    sparkPos[i*3+2]=-3.8+seeded(i*5.7)*9.4;
  }
  const sparkGeo=new THREE.BufferGeometry();
  sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPos,3));
  const sparkMat=new THREE.PointsMaterial({map:dotTex,color:'#ffe3bc',size:.62,sizeAttenuation:true,
    transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
  materials.push(sparkMat);
  const sparkles=new THREE.Points(sparkGeo,sparkMat);
  sparkles.frustumCulled=false;sparkles.renderOrder=2;root.add(sparkles);noInk.push(sparkles);

  function update(ms,camera){
    const t=ms/1000;
    for(const mesh of streaks){
      if(!camera)continue;
      mesh.rotation.y=Math.atan2(camera.position.x-mesh.position.x,camera.position.z-mesh.position.z);
    }
    if(camera)for(const mesh of billboards)mesh.quaternion.copy(camera.quaternion);
    for(const r of ripples){
      const phase=(t*.6+r.offset)%1;
      const scale=r.base*(.4+phase*2.2);
      r.mesh.scale.set(scale,scale,1);
      r.mesh.material.opacity=r.opacity*(1-phase)*(1-phase);
    }
    sparkMat.opacity=.42+.18*Math.sin(t*7.3);
  }
  function setNight(value){root.visible=Boolean(value);}
  function dispose(){
    streakGeo.dispose();ringGeo.dispose();
    materials.forEach(m=>m.dispose());
    root.traverse(o=>{if(o.geometry&&o.geometry!==streakGeo&&o.geometry!==ringGeo)o.geometry.dispose();});
  }
  return {group:root,update,setNight,dispose};
}
