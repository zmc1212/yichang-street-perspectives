/*
 * Real-time illustration pass adapted from Simcraft perspective-illusion.
 * Copyright (c) 2026 Simran Sachdeva. MIT License; full notice in camera.js.
 * Source: https://github.com/dotslashsimran/simcraft
 */
import * as THREE from 'three';
import { placeCamera } from './camera.js';
export { sampleShot, LOOP } from './camera.js';

const VERTEX=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

const FRAGMENT=`
uniform sampler2D tColor,tNormal,tDepth,tShadow,tAlbedo,tReflection;
uniform mat4 invVP,VP,reflectionVP;
uniform mat3 camRotation;
uniform vec3 cameraPositionWorld,sunDirection;
uniform vec2 resolution;
uniform float cameraNear,cameraFar,night,time,river,waterLevel,hazeNear,hazeFar;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}
float linearDepth(float d){return cameraNear*cameraFar/(cameraFar-d*(cameraFar-cameraNear));}
vec3 worldPoint(vec2 uv,float d){vec4 p=invVP*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 skyAt(vec3 direction){
  float e=direction.y;
  vec3 day=mix(vec3(.78,.72,.60),vec3(.31,.49,.60),smoothstep(-.04,.6,e));
  vec3 dark=mix(vec3(.09,.13,.24),vec3(.009,.024,.065),smoothstep(-.03,.6,e));
  day=mix(day,mix(vec3(.61,.74,.77),vec3(.19,.39,.58),smoothstep(-.04,.7,e)),river);
  dark=mix(dark,mix(vec3(.15,.065,.13),vec3(.009,.015,.056),smoothstep(-.03,.55,e)),river);
  vec3 c=mix(day,dark,night);
  vec2 q=direction.xz/(max(e,0.)+.13);
  float cloud=fbm(q*.72+vec2(3.1,7.7));
  float band=smoothstep(.005,.10,e)*(1.-smoothstep(.55,.92,e));
  float clouds=smoothstep(.50,.64,cloud)*band;
  vec3 cloudColor=mix(mix(vec3(.90,.86,.75),vec3(.085,.10,.17),night),mix(vec3(.86,.89,.87),vec3(.12,.061,.16),night),river);
  c=mix(c,cloudColor,clouds*mix(.82,.7,night));
  c+=river*night*exp(-abs(e+.014)*33.)*vec3(.08,.028,.009);
  return c;
}
float edges(vec2 uv,float radius,float colorDensity,out float colorEdge){
  vec2 px=radius/resolution;
  float dc=texture2D(tDepth,uv).r,zc=linearDepth(dc);
  vec3 nc=texture2D(tNormal,uv).xyz*2.-1.,ac=texture2D(tAlbedo,uv).rgb;
  bool sc=dc>.999999;
  float e=0.;colorEdge=0.;
  for(int k=0;k<4;k++){
    float a=float(k)*.785398;vec2 o=vec2(cos(a),sin(a))*px;
    float d1=texture2D(tDepth,uv+o).r,d2=texture2D(tDepth,uv-o).r;
    bool s1=d1>.999999,s2=d2>.999999;
    if(sc!=s1||sc!=s2){e=1.;continue;}
    if(sc)continue;
    float z1=linearDepth(d1),z2=linearDepth(d2);
    e=max(e,smoothstep(.0008,.004,abs(z1+z2-2.*zc)/max(zc,1.)));
    vec3 n1=texture2D(tNormal,uv+o).xyz*2.-1.,n2=texture2D(tNormal,uv-o).xyz*2.-1.;
    e=max(e,smoothstep(.20,.48,1.-min(dot(nc,n1),dot(nc,n2))));
    vec3 a1=texture2D(tAlbedo,uv+o).rgb,a2=texture2D(tAlbedo,uv-o).rgb;
    colorEdge=max(colorEdge,smoothstep(.12,.24,max(length(ac-a1),length(ac-a2)))*colorDensity);
  }
  return e;
}
void main(){
  float d=texture2D(tDepth,vUv).r;
  bool isSky=d>.999999;
  vec3 p=worldPoint(vUv,d);
  vec3 c=texture2D(tColor,vUv).rgb;
  vec3 normalView=texture2D(tNormal,vUv).xyz*2.-1.;
  vec3 normalWorld=normalize(camRotation*normalView);
  float footprint=length(fwidth(p));
  float colorDensity=1.-smoothstep(.09,.34,footprint);
  float colorEdge;
  float radius=clamp(resolution.x/1350.,.65,1.35);
  float edge=edges(vUv,radius,colorDensity,colorEdge);
  if(isSky){
    vec3 farPoint=worldPoint(vUv,1.);
    c=skyAt(normalize(farPoint-cameraPositionWorld));
  }else{
    float light=texture2D(tShadow,vUv).r;
    vec3 an=abs(normalWorld);
    float threshold=an.y>.7?.36:.62;
    float shade=1.-smoothstep(threshold-.055,threshold+.055,light);
    c*=mix(vec3(1.),mix(vec3(.73,.79,.84),vec3(.60,.70,.87),night),shade);
    vec2 surface=an.y>.7?p.xz:(an.x>an.z?p.zy:p.xy);
    float hatch=(surface.x+surface.y)*6.;
    float fw=fwidth(hatch);
    float line=1.-smoothstep(.0,fw*1.25+.08,abs(fract(hatch)-.5)-.26);
    float castOnly=smoothstep(.12,.24,dot(normalWorld,sunDirection));
    float hatchStrength=shade*castOnly*(1.-smoothstep(.13,.35,fw));
    c=mix(c,c*vec3(.66,.70,.77),line*hatchStrength*mix(.43,.08,river));

    /* World anchored puddles and restrained, fourteen-step screen reflections. */
    if(river<.5&&night>.01&&normalWorld.y>.92&&p.y<.3){
      vec3 view=normalize(p-cameraPositionWorld),reflection=reflect(view,vec3(0.,1.,0.));
      float puddle=smoothstep(.40,.65,fbm(p.xz*.19+7.));
      float fresnel=.22+.78*pow(1.-max(dot(-view,vec3(0.,1.,0.)),0.),3.);
      vec3 reflected=skyAt(reflection)*.65;
      vec3 q=p+reflection*.22;
      float stride=clamp(length(p-cameraPositionWorld)*.012,.6,2.);
      for(int i=0;i<14;i++){
        q+=reflection*stride;stride*=1.29;
        vec4 screen=VP*vec4(q,1.);screen/=screen.w;
        vec2 uv=screen.xy*.5+.5;
        if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.||screen.z>1.)break;
        float sampleZ=linearDepth(texture2D(tDepth,uv).r),rayZ=linearDepth(screen.z*.5+.5);
        if(rayZ>sampleZ&&rayZ-sampleZ<stride*3.){
          vec2 blur=vec2(1.5)/resolution;
          vec3 hit=(texture2D(tColor,uv+blur).rgb+texture2D(tColor,uv-blur).rgb)*.5;
          float fade=smoothstep(0.,.08,uv.x)*smoothstep(1.,.92,uv.x)*(1.-float(i)/18.);
          reflected=mix(reflected,hit,fade);break;
        }
      }
      c=mix(c*.9,reflected,(.20+puddle*.33)*fresnel*night);
      vec2 cell=floor(p.xz*.75),local=fract(p.xz*.75)-.5;
      float phase=fract(time*.8+hash(cell));
      float ring=(1.-smoothstep(0.,.025,abs(length(local)-phase*.5)))*(1.-phase);
      c+=ring*.04*night*(1.-smoothstep(.10,.30,footprint));
    }
    /* One planar reflection pass supplies the actual towers, cables and city.
       Small world-space ripples distort the image instead of painting fake towers. */
    if(river>.5&&normalWorld.y>.92&&abs(p.y-waterLevel)<.12){
      vec3 view=normalize(p-cameraPositionWorld);
      vec3 reflectedDirection=reflect(view,vec3(0.,1.,0.));
      vec4 projected=reflectionVP*vec4(p,1.);
      vec2 uv=projected.xy/projected.w*.5+.5;
      float cycle=time*6.28318530718/24.;
      float wave=sin(p.z*.31+p.x*.045+cycle*3.)*.55+sin(p.z*.67-p.x*.09-cycle*2.)*.25;
      vec2 ripple=vec2(wave*.0016,sin(p.x*.13+p.z*.18+cycle)*.00055);
      vec4 a=texture2D(tReflection,uv+ripple),b=texture2D(tReflection,uv+ripple+vec2(.0011,0.));
      vec4 reflectedImage=(a+b)*.5;
      float valid=step(.002,uv.x)*step(uv.x,.998)*step(.002,uv.y)*step(uv.y,.998)*step(0.,projected.w);
      vec3 reflection=mix(skyAt(reflectedDirection)*.70,reflectedImage.rgb,reflectedImage.a*valid);
      float fresnel=.30+.60*pow(1.-max(dot(-view,vec3(0.,1.,0.)),0.),3.);
      vec3 water=mix(vec3(.055,.17,.19),vec3(.007,.025,.065),night);
      c=mix(mix(water,c,.27),reflection,clamp(fresnel+.16*night,.32,.88));
      float crest=pow(max(0.,wave),9.);
      c+=crest*mix(vec3(.03,.06,.055),vec3(.008,.012,.022),night)*(1.-smoothstep(.7,2.5,footprint));
    }
    float haze=smoothstep(hazeNear,hazeFar,length(p.xz))*mix(.10,.24,night);
    c=mix(c,mix(mix(vec3(.61,.64,.61),vec3(.045,.07,.13),night),mix(vec3(.39,.55,.60),vec3(.023,.031,.075),night),river),haze);
  }
  float ground=normalWorld.y>.7?.25:.65;
  edge=max(smoothstep(.25,.78,edge),smoothstep(.30,.75,colorEdge)*ground);
  vec3 ink=mix(vec3(.025,.045,.05),vec3(.003,.009,.02),night);
  float inkAmount=mix(mix(.61,.66,night),.17,river);
  if(river>.5&&normalWorld.y>.92&&abs(p.y-waterLevel)<.12)inkAmount*=.14;
  c=mix(c,ink,edge*inkAmount);
  if(night>.01){
    vec3 glow=vec3(0.);
    for(int k=0;k<9;k++){
      float a=float(k)*2.39996,r=3.+float(k)*2.;
      vec3 s=texture2D(tColor,vUv+vec2(cos(a),sin(a))*r/resolution).rgb;
      glow+=max(s-mix(.85,.72,river),0.)*(1.-float(k)/13.);
    }
    c+=glow*mix(.15,.25,river)*night;
  }
  float vignette=smoothstep(.6,1.12,length((vUv-.5)*vec2(1.35,1.)));
  c*=1.-vignette*.10;
  c=mix(c,vec3(1.)-exp(-max(c,vec3(0.))*1.18),river);
  gl_FragColor=vec4(toSRGB(clamp(c,0.,1.)),1.);
}`;

export function createStage(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NoToneMapping;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.info.autoReset=false;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,5000);
  const ambient=new THREE.AmbientLight('#ecf1f4',2.1);
  const sun=new THREE.DirectionalLight('#fff0d0',1.35);
  sun.position.set(-65,105,60);
  sun.target.position.set(0,0,-35);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-135,right:135,top:130,bottom:-135,near:1,far:380});
  sun.shadow.bias=-.00025;
  sun.shadow.normalBias=.12;
  scene.add(ambient,sun,sun.target);
  const colorRT=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:2});
  const normalRT=new THREE.WebGLRenderTarget(1,1);
  normalRT.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const shadowRT=new THREE.WebGLRenderTarget(1,1);
  const albedoRT=new THREE.WebGLRenderTarget(1,1);
  const reflectionRT=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType});
  const reflectionCamera=new THREE.PerspectiveCamera();
  const mirrorNormal=new THREE.Vector3(0,1,0),mirrorOrigin=new THREE.Vector3();
  const mirrorView=new THREE.Vector3(),mirrorTarget=new THREE.Vector3(),mirrorLook=new THREE.Vector3();
  const mirrorRotation=new THREE.Matrix4(),mirrorPlane=new THREE.Plane(),clipPlane=new THREE.Vector4(),clipQ=new THREE.Vector4();
  const normalMaterial=new THREE.MeshNormalMaterial({side:THREE.DoubleSide});
  const shadowMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide});
  const uniforms={
    tColor:{value:colorRT.texture},tNormal:{value:normalRT.texture},tDepth:{value:normalRT.depthTexture},
    tShadow:{value:shadowRT.texture},tAlbedo:{value:albedoRT.texture},tReflection:{value:reflectionRT.texture},
    invVP:{value:new THREE.Matrix4()},VP:{value:new THREE.Matrix4()},reflectionVP:{value:new THREE.Matrix4()},camRotation:{value:new THREE.Matrix3()},
    cameraPositionWorld:{value:new THREE.Vector3()},sunDirection:{value:new THREE.Vector3()},
    resolution:{value:new THREE.Vector2(1,1)},cameraNear:{value:.1},cameraFar:{value:5000},night:{value:0},time:{value:0},
    river:{value:0},waterLevel:{value:0},hazeNear:{value:70},hazeFar:{value:180},
  };
  const postMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:VERTEX,fragmentShader:FRAGMENT,depthTest:false,depthWrite:false});
  const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial);quad.frustumCulled=false;postScene.add(quad);
  let world=null,night=false,width=1,height=1,dpr=1,disposed=false;
  let albedoPairs=[],flatMaterials=[],lastRealTime=0,lastShadowTime=-Infinity;
  let stats={fps:0,calls:0,drawCalls:0,triangles:0,width:1,height:1,dpr:1};

  function clearFlatMaterials(){flatMaterials.forEach(m=>m.dispose());flatMaterials=[];albedoPairs=[];}
  function prepareAlbedo(){
    clearFlatMaterials();
    if(!world)return;
    const mats=new Map();
    const make=m=>{
      if(mats.has(m))return mats.get(m);
      const basic=new THREE.MeshBasicMaterial({color:m.color||'#ffffff',map:m.map||null,alphaMap:m.alphaMap||null,
        alphaTest:m.alphaTest||0,side:m.side,transparent:m.transparent,opacity:m.opacity,vertexColors:m.vertexColors,
        depthWrite:m.depthWrite,depthTest:m.depthTest});
      mats.set(m,basic);flatMaterials.push(basic);return basic;
    };
    world.group.traverse(o=>{
      if(!o.isMesh)return;
      const original=o.material;
      albedoPairs.push({mesh:o,original,basic:Array.isArray(original)?original.map(make):make(original)});
    });
  }
  function setWorld(next){
    if(world?.group)scene.remove(world.group);
    world=next||null;
    if(world?.group)scene.add(world.group);
    const isRiver=world?.visual?.kind==='river';
    uniforms.river.value=isRiver?1:0;
    uniforms.waterLevel.value=world?.visual?.waterLevel??0;
    uniforms.hazeNear.value=world?.visual?.hazeNear??70;
    uniforms.hazeFar.value=world?.visual?.hazeFar??180;
    sun.position.set(...(isRiver?[-270,410,260]:[-65,105,60]));
    sun.target.position.set(0,0,isRiver?0:-35);
    Object.assign(sun.shadow.camera,isRiver?{left:-330,right:330,top:330,bottom:-330,near:1,far:1150}:{left:-135,right:135,top:130,bottom:-135,near:1,far:380});
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.normalBias=isRiver?.085:.12;
    world?.setNight?.(night);
    setNight(night);
    renderer.shadowMap.needsUpdate=true;lastShadowTime=-Infinity;
  }
  function setNight(value){
    night=Boolean(value);uniforms.night.value=night?1:0;
    const isRiver=uniforms.river.value>.5;
    ambient.color.set(night?(isRiver?'#8f9dc8':'#8eabe1'):'#ecf1f4');ambient.intensity=night?(isRiver?.63:.95):2.1;
    sun.color.set(night?(isRiver?'#acb9ec':'#9cbaff'):'#fff0d0');sun.intensity=night?(isRiver?.60:.72):1.35;
    world?.setNight?.(night);prepareAlbedo();renderer.shadowMap.needsUpdate=true;
  }
  function resize(w,h){
    width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));
    const mobile=width<760 || (typeof navigator!=='undefined'&&navigator.maxTouchPoints>1&&width<1100);
    const cap=mobile?1:1.5;
    dpr=Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,cap,1920/width,1250/height);
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    const pixels=new THREE.Vector2();renderer.getDrawingBufferSize(pixels);
    for(const rt of [colorRT,normalRT,shadowRT,albedoRT])rt.setSize(pixels.x,pixels.y);
    reflectionRT.setSize(Math.max(1,Math.round(pixels.x*.65)),Math.max(1,Math.round(pixels.y*.65)));
    uniforms.resolution.value.copy(pixels);camera.aspect=width/height;
    Object.assign(stats,{width,height,dpr,pixelWidth:pixels.x,pixelHeight:pixels.y});
  }
  function hidden(objects){
    const previous=new Map();
    for(const o of objects||[]){if(!o||previous.has(o))continue;previous.set(o,o.visible);o.visible=false;}
    return ()=>{for(const [o,v]of previous)o.visible=v;};
  }
  function renderRiverReflection(){
    const surfaces=world?.water||(world?.waterMesh?[world.waterMesh]:[]);
    if(uniforms.river.value<.5||!surfaces.length)return;
    mirrorOrigin.set(0,uniforms.waterLevel.value,0);
    mirrorView.subVectors(mirrorOrigin,camera.position).reflect(mirrorNormal).negate().add(mirrorOrigin);
    mirrorRotation.extractRotation(camera.matrixWorld);
    mirrorLook.set(0,0,-1).applyMatrix4(mirrorRotation).add(camera.position);
    mirrorTarget.subVectors(mirrorOrigin,mirrorLook).reflect(mirrorNormal).negate().add(mirrorOrigin);
    reflectionCamera.position.copy(mirrorView);
    reflectionCamera.up.set(0,1,0).applyMatrix4(mirrorRotation).reflect(mirrorNormal);
    reflectionCamera.lookAt(mirrorTarget);
    reflectionCamera.near=camera.near;reflectionCamera.far=camera.far;
    reflectionCamera.updateMatrixWorld();
    reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);
    uniforms.reflectionVP.value.copy(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);
    /* Oblique near-plane clipping follows Three.js r170 Reflector (MIT). */
    mirrorPlane.setFromNormalAndCoplanarPoint(mirrorNormal,mirrorOrigin).applyMatrix4(reflectionCamera.matrixWorldInverse);
    clipPlane.set(mirrorPlane.normal.x,mirrorPlane.normal.y,mirrorPlane.normal.z,mirrorPlane.constant);
    const p=reflectionCamera.projectionMatrix.elements;
    clipQ.set((Math.sign(clipPlane.x)+p[8])/p[0],(Math.sign(clipPlane.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
    clipPlane.multiplyScalar(2/clipPlane.dot(clipQ));
    p[2]=clipPlane.x;p[6]=clipPlane.y;p[10]=clipPlane.z+1-.0005;p[14]=clipPlane.w;
    reflectionCamera.projectionMatrixInverse.copy(reflectionCamera.projectionMatrix).invert();
    const restore=hidden(surfaces),shadowNeedsUpdate=renderer.shadowMap.needsUpdate;
    renderer.shadowMap.needsUpdate=false;
    renderer.setClearColor(0x000000,0);renderer.setRenderTarget(reflectionRT);renderer.clear();
    renderer.render(scene,reflectionCamera);
    renderer.shadowMap.needsUpdate=shadowNeedsUpdate;restore();
  }
  function render(shot,ms=0){
    if(disposed||!world)return;
    world.animate?.(ms,shot);
    placeCamera(camera,shot,width/height);
    renderer.info.reset();
    if(Math.abs(ms-lastShadowTime)>220){renderer.shadowMap.needsUpdate=true;lastShadowTime=ms;}
    scene.overrideMaterial=null;
    renderer.setClearColor(0x000000,1);renderer.setRenderTarget(colorRT);renderer.clear();renderer.render(scene,camera);
    renderRiverReflection();
    renderer.setClearColor(0x000000,1);
    const restoreNoInk=hidden(world.noInk);
    scene.overrideMaterial=normalMaterial;
    renderer.setRenderTarget(normalRT);renderer.clear();renderer.render(scene,camera);
    const restoreGlow=hidden(world.glow);
    scene.overrideMaterial=null;
    for(const p of albedoPairs)p.mesh.material=p.basic;
    renderer.setRenderTarget(albedoRT);renderer.clear();renderer.render(scene,camera);
    for(const p of albedoPairs)p.mesh.material=p.original;
    const lights=[];
    scene.traverse(o=>{if(o.isLight&&o!==sun){lights.push([o,o.visible]);o.visible=false;}});
    const oldIntensity=sun.intensity,oldColor=sun.color.clone();
    sun.intensity=2*Math.PI;sun.color.set('#ffffff');
    scene.overrideMaterial=shadowMaterial;
    renderer.setRenderTarget(shadowRT);renderer.clear();renderer.render(scene,camera);
    sun.intensity=oldIntensity;sun.color.copy(oldColor);
    for(const [l,v]of lights)l.visible=v;
    scene.overrideMaterial=null;restoreGlow();restoreNoInk();
    uniforms.cameraNear.value=camera.near;uniforms.cameraFar.value=camera.far;uniforms.time.value=ms/1000;
    uniforms.cameraPositionWorld.value.copy(camera.position);
    uniforms.VP.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    uniforms.invVP.value.copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse);
    uniforms.camRotation.value.setFromMatrix4(camera.matrixWorld);
    uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();
    renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
    const now=performance.now();
    if(lastRealTime&&now-lastRealTime<500){const f=1000/Math.max(1,now-lastRealTime);stats.fps=stats.fps?stats.fps*.92+f*.08:f;}
    lastRealTime=now;
    Object.assign(stats,{calls:renderer.info.render.calls,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
      textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,fov:shot.fov,night});
  }
  function snapshot(){return canvas.toDataURL('image/png');}
  function getInfo(){return {...stats,renderer:'WebGL2',passes:uniforms.river.value>.5?5:4};}
  function dispose(){
    if(disposed)return;disposed=true;
    clearFlatMaterials();
    for(const rt of [colorRT,normalRT,shadowRT,albedoRT,reflectionRT])rt.dispose();
    normalMaterial.dispose();shadowMaterial.dispose();postMaterial.dispose();quad.geometry.dispose();
    sun.shadow.map?.dispose();renderer.dispose();world=null;
  }
  resize(canvas.clientWidth||window.innerWidth,canvas.clientHeight||window.innerHeight);
  return {scene,camera,setWorld,setNight,resize,render,snapshot,getInfo,dispose};
}
