/*
 * Real-time illustration pass adapted from Simcraft perspective-illusion.
 * Copyright (c) 2026 Simran Sachdeva. MIT License; full notice in camera.js.
 * Source: https://github.com/dotslashsimran/simcraft
 */
import * as THREE from 'three';
import { placeCamera } from './camera.js';
import { createInklessNormalMaterial, depthlessOverlays } from './surface-pass.js';
export { sampleShot, LOOP } from './camera.js';

const VERTEX=`varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;

const FRAGMENT=`
uniform sampler2D tColor,tNormal,tDepth,tShadow,tAlbedo,tReflection;
uniform mat4 invVP,VP,reflectionVP;
uniform mat3 camRotation;
uniform vec4 projectionLens;
uniform vec3 cameraPositionWorld,sunDirection;
uniform vec2 resolution;
uniform float cameraNear,cameraFar,night,time,river,waterLevel,hazeNear,hazeFar,debug,rain,glowBoost,whip,reflectGain;
uniform vec3 riverHorizon;
varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}
/* Screen-space rain: fine threads instead of wide ribbons. Width is given in
   pixels, because a width in cell units would swell into a stripe when the
   column count rises. Each cell carries its own phase, length and lateral
   jitter, so the lattice never resolves into regular columns. */
float rainLayer(vec2 su,vec2 res,float t,float cols,float rows,float slant,float speed,float halfPx,float spanLo,float spanHi,float seed){
  vec2 q=su+vec2(su.y*slant,0.);
  vec2 p=q*vec2(cols,rows)+vec2(seed*3.7,t*speed);
  vec2 id=floor(p),f=fract(p);
  float h=hash(id+seed),h2=hash(id*1.37+seed+5.3),h3=hash(id*.71+seed+11.7);
  if(h>.62)return 0.;
  float x=fract(f.x+(h2-.5)*.74);
  float cell=res.y/cols;
  float w=max(halfPx/cell,.45/cell);
  float line=1.-smoothstep(w*.5,w*1.7,abs(x-.5));
  // A drop owns a random span inside its cell, with tapered ends; a fixed span
  // per row read as a repeating comb of identical dashes.
  float span=mix(spanLo,spanHi,h3);
  float yl=(f.y-.06-.42*h2)/span;
  float seg=step(0.,yl)*(1.-step(1.,yl));
  float taper=sin(clamp(yl,0.,1.)*3.14159265);
  return line*seg*(.42+.58*taper);
}
float linearDepth(float d){return cameraNear*cameraFar/(cameraFar-d*(cameraFar-cameraNear));}
vec3 worldPoint(vec2 uv,float d){vec4 p=invVP*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
vec3 worldRay(vec2 uv){
  vec2 ndc=uv*2.-1.;
  return normalize(camRotation*vec3((ndc+projectionLens.zw)/projectionLens.xy,-1.));
}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 skyAt(vec3 direction){
  float e=direction.y;
  vec3 day=mix(vec3(.82,.75,.63),vec3(.36,.53,.63),smoothstep(-.05,.62,e));
  day=mix(day,vec3(.25,.43,.59),smoothstep(.34,.98,e));
  vec3 dark=mix(vec3(.105,.135,.235),vec3(.012,.026,.070),smoothstep(-.04,.55,e));
  day=mix(day,mix(vec3(.64,.77,.79),vec3(.22,.42,.60),smoothstep(-.04,.7,e)),river);
  dark=mix(dark,mix(riverHorizon,vec3(.010,.016,.058),smoothstep(-.03,.55,e)),river);
  vec3 c=mix(day,dark,night);
  /* Warm lift toward the sun's azimuth keeps the painted sky tied to the light. */
  vec2 sunAz=normalize(sunDirection.xz+vec2(.0001));
  float az=pow(max(dot(normalize(direction.xz+vec2(.0001)),sunAz),0.),4.);
  c+=az*(1.-smoothstep(-.02,.38,e))*mix(vec3(.10,.06,.02),vec3(.05,.014,.006),night)*(1.-.7*rain);
  /* Flat painted cloud masses with a lit crown and a cooler underside. */
  vec2 q=direction.xz/(max(e,0.)+.13);
  float cloud=fbm(q*.72+vec2(3.1,7.7));
  float band=smoothstep(.004,.09,e)*(1.-smoothstep(.62,.95,e));
  float mass=smoothstep(.50,.60,cloud)*band;
  float crown=smoothstep(.58,.68,cloud)*band;
  float detail=fbm(q*5.5+vec2(11.3,5.9));
  float wisps=smoothstep(.58,.68,detail)*band*band;
  mass=max(mass,wisps*.55);crown=max(crown,smoothstep(.66,.76,detail)*band*band*.45);
  vec3 cloudLit=mix(vec3(.94,.90,.80),mix(vec3(.13,.12,.19),vec3(.085,.08,.15),river),night);
  vec3 cloudCore=mix(vec3(.84,.81,.74),mix(vec3(.06,.06,.11),vec3(.045,.042,.085),river),night);
  float veil=mass*mix(.80,.72,night)*(1.-.45*night*smoothstep(.12,.55,e))*mix(1.,.22,rain);
  c=mix(c,mix(cloudCore,cloudLit,crown),veil);
  float star=step(.9986,hash(floor(direction.xz/(e+.35)*190.)))*smoothstep(.22,.45,e)*(1.-mass);
  c+=star*night*(1.-river*.55)*(1.-rain)*vec3(.45,.5,.68);
  c+=river*night*exp(-abs(e+.014)*33.)*vec3(.08,.028,.009);
  /* Rain swallows the stars and most of the sky: a near-black blue field with
     one warm band of city light sitting on the horizon. */
  c=mix(c,c*vec3(.82,.94,1.14),rain*.65);
  c*=mix(1.,.26,rain);
  c+=rain*exp(-abs(e+.012)*24.)*vec3(.018,.010,.006)*(1.-river);
  return c;
}
float edges(vec2 uv,float radius,float colorDensity,out float colorEdge,out float inkless){
  vec2 px=radius/resolution;
  float dc=texture2D(tDepth,uv).r,zc=linearDepth(dc);
  vec4 normalSample=texture2D(tNormal,uv);
  vec3 nc=normalSample.xyz*2.-1.,ac=texture2D(tAlbedo,uv).rgb;
  bool sc=normalSample.a<.25;
  inkless=(sc||normalSample.a>=.75)?0.:1.;
  float e=0.;colorEdge=0.;
  if(sc)return 0.;
  float kz=1.+zc/140.;
  for(int k=0;k<4;k++){
    float a=float(k)*.785398;vec2 o=vec2(cos(a),sin(a))*px;
    float d1=texture2D(tDepth,uv+o).r,d2=texture2D(tDepth,uv-o).r;
    vec4 normal1=texture2D(tNormal,uv+o),normal2=texture2D(tNormal,uv-o);
    bool s1=normal1.a<.25,s2=normal2.a<.25;
    if(s1||s2){e=1.;continue;}
    /* Foliage keeps only its outline against the sky; crown-to-crown depth and
       normal breaks would read as a pile of boulders instead of a drawn hill. */
    if(inkless>.5)continue;
    float z1=linearDepth(d1),z2=linearDepth(d2);
    e=max(e,smoothstep(.0009*kz,.0045*kz,abs(z1+z2-2.*zc)/max(zc,1.)));
    vec3 n1=normal1.xyz*2.-1.,n2=normal2.xyz*2.-1.;
    e=max(e,smoothstep(.22,.50,1.-min(dot(nc,n1),dot(nc,n2))));
    vec3 a1=texture2D(tAlbedo,uv+o).rgb,a2=texture2D(tAlbedo,uv-o).rgb;
    colorEdge=max(colorEdge,smoothstep(.12,.24,max(length(ac-a1),length(ac-a2)))*colorDensity);
  }
  return e;
}
void main(){
  float d=texture2D(tDepth,vUv).r;
  vec4 normalSample=texture2D(tNormal,vUv),colorSample=texture2D(tColor,vUv);
  bool isSky=normalSample.a<.25;
  vec3 p=worldPoint(vUv,d);
  vec3 c=colorSample.rgb;
  /* Shutter smear for the Guomao crown whip: a short vertical colour trail,
     matching the reference clip's fast tilt. Other scenes keep whip at zero. */
  if(whip>.001){
    vec2 md=vec2(.05,-1.)*whip*13./resolution;
    vec3 smear=c;
    smear+=texture2D(tColor,vUv+md).rgb;
    smear+=texture2D(tColor,vUv+md*2.).rgb;
    smear+=texture2D(tColor,vUv-md).rgb;
    smear+=texture2D(tColor,vUv-md*2.).rgb;
    c=mix(c,smear*.2,whip*.8);
  }
  vec3 ray=worldRay(vUv),waterPoint=p;
  float waterCoverage=river*clamp(1.-colorSample.a,0.,1.);
  // This mask comes from visible water fragments, with the color pass's MSAA.
  // Solve the water plane analytically: depth quantization cannot change its
  // material identity or turn rows of reflections on and off during a dolly.
  if(waterCoverage>.001&&ray.y<-.000001){
    waterPoint=cameraPositionWorld+ray*((waterLevel-cameraPositionWorld.y)/ray.y);
    waterPoint.y=waterLevel;
    if(waterCoverage>.999)p=waterPoint;
  }else{waterCoverage=0.;}
  vec3 normalView=normalSample.xyz*2.-1.;
  vec3 normalWorld=normalize(camRotation*normalView);
  float footprint=length(fwidth(p));
  float colorDensity=1.-smoothstep(.09,.34,footprint);
  float colorEdge,isInkless;
  float radius=clamp(resolution.x/1250.,.7,1.6);
  float edge=edges(vUv,radius,colorDensity,colorEdge,isInkless);
  if(isSky){
    c=skyAt(ray);
  }else{
    float light=texture2D(tShadow,vUv).r;
    vec3 an=abs(normalWorld);
    float threshold=an.y>.7?.36:.62;
    float shade=1.-smoothstep(threshold-.05,threshold+.05,light);
    vec3 shadeTint=mix(mix(vec3(.72,.78,.85),vec3(.66,.73,.83),river),mix(vec3(.52,.60,.84),vec3(.44,.52,.78),river),night);
    c*=mix(vec3(1.),shadeTint,shade*(1.-waterCoverage)*(1.-.55*isInkless));
    /* Foliage stays a mid-green mass instead of black rock; coarse leaf grain
       breaks the plastic silhouettes without shimmering at distance. */
    if(isInkless>.5){
      float leaf=hash(floor(p.xz*.8)+floor(p.y*.7)*17.);
      c*=1.+(leaf-.5)*.16*(1.-smoothstep(.12,.4,footprint));
    }
    /* Paper grain on ground planes: flat asphalt and paving stop reading as vector fill. */
    float grain=hash(floor(p.xz*2.6));
    c*=1.+(grain-.5)*.06*(1.-smoothstep(.35,.9,footprint))*step(.7,an.y);
    /* Paving joints on ground planes: thin grey structure instead of empty fill. */
    if(an.y>.7&&footprint<.5){
      vec2 tile=abs(fract(p.xz/3.2)-.5);
      float jw=length(fwidth(p.xz/3.2))*1.2+.012;
      float joint=1.-smoothstep(.0,jw,.5-max(tile.x,tile.y));
      c=mix(c,c*.80,joint*.22*(1.-smoothstep(.12,.38,footprint))*(1.-waterCoverage));
    }
    vec2 surface=an.y>.7?p.xz:(an.x>an.z?p.zy:p.xy);
    float hatch=(surface.x+surface.y)*9.;
    float fw=fwidth(hatch);
    float line=1.-smoothstep(.0,fw*1.5+.09,abs(fract(hatch)-.5)-.3);
    float castOnly=smoothstep(.12,.22,dot(normalWorld,sunDirection));
    float hatchStrength=shade*castOnly*(1.-smoothstep(.14,.32,fw))*(1.-waterCoverage)*step(.75,normalSample.a);
    c=mix(c,c*vec3(.60,.64,.78),line*hatchStrength*mix(.52,.10,river));

    /* World anchored puddles and restrained screen reflections. On the Yangtze
       preset the wet stone slope is a mirror as well: the march runs further and
       each hit is smeared upward, so the pylon and the lanterns trail as one
       continuous streak instead of a puddle mosaic. */
    float wetTop=river>.5?2.2:.3;
    if(night>.01&&normalWorld.y>.92&&p.y<wetTop&&waterCoverage<.001){
      vec3 view=normalize(p-cameraPositionWorld),reflection=reflect(view,vec3(0.,1.,0.));
      float puddle=smoothstep(.40-.09*rain,.65-.07*rain,fbm(p.xz*.19+7.));
      float fresnel=.22+.78*pow(1.-max(dot(-view,vec3(0.,1.,0.)),0.),3.);
      vec3 reflected=skyAt(reflection)*mix(.65,.52,river);
      vec3 q=p+reflection*.22;
      float stride=clamp(length(p-cameraPositionWorld)*mix(.012,.020,river),.6,2.)*mix(1.,1.55,river);
      for(int i=0;i<24;i++){
        if(river<.5&&i>=14)break;
        q+=reflection*stride;stride*=1.29;
        vec4 screen=VP*vec4(q,1.);screen/=screen.w;
        vec2 uv=screen.xy*.5+.5;
        if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.||screen.z>1.)break;
        float sampleZ=linearDepth(texture2D(tDepth,uv).r),rayZ=linearDepth(screen.z*.5+.5);
        if(rayZ>sampleZ&&rayZ-sampleZ<stride*3.){
          vec2 blur=vec2(1.5)/resolution;
          vec3 hit=(texture2D(tColor,uv+blur).rgb+texture2D(tColor,uv-blur).rgb)*.5;
          if(river>.5){
            vec2 lift=vec2(0.,3.2/resolution.y);
            hit=(hit*2.+texture2D(tColor,uv+lift).rgb+texture2D(tColor,uv+lift*2.).rgb
              +texture2D(tColor,uv+blur+lift).rgb)/5.;
          }
          float fade=smoothstep(0.,.08,uv.x)*smoothstep(1.,.92,uv.x)*max(0.,1.-float(i)*mix(1./18.,1./26.,river));
          reflected=mix(reflected,hit,fade);break;
        }
      }
      float strength=mix(.20+puddle*.33+.17*rain,.30+puddle*.34+.16*rain,river);
      c=mix(c*.9,reflected,strength*fresnel*night*reflectGain);
      vec2 cell=floor(p.xz*.75),local=fract(p.xz*.75)-.5;
      float phase=fract(time*.8+hash(cell));
      float ring=(1.-smoothstep(0.,.025,abs(length(local)-phase*.5)))*(1.-phase);
      c+=ring*(.04+.05*rain)*night*(1.-smoothstep(.10,.30,footprint));
    }
    /* One planar reflection pass supplies the actual towers, cables and city.
       Small world-space ripples distort the image instead of painting fake towers. */
    if(waterCoverage>.001){
      vec3 view=normalize(waterPoint-cameraPositionWorld);
      vec3 reflectedDirection=reflect(view,vec3(0.,1.,0.));
      vec4 projected=reflectionVP*vec4(waterPoint,1.);
      vec2 uv=projected.xy/projected.w*.5+.5;
      float cycle=time*6.28318530718/24.;
      float wave=sin(waterPoint.z*.31+waterPoint.x*.045+cycle*3.)*.55+sin(waterPoint.z*.67-waterPoint.x*.09-cycle*2.)*.25;
      vec2 ripple=vec2(wave*.0016,sin(waterPoint.x*.13+waterPoint.z*.18+cycle)*.00055);
      vec4 a=texture2D(tReflection,uv+ripple),b=texture2D(tReflection,uv+ripple+vec2(.0011,0.));
      vec4 reflectedImage=(a+b)*.5;
      float valid=step(.002,uv.x)*step(uv.x,.998)*step(.002,uv.y)*step(uv.y,.998)*step(0.,projected.w);
      vec3 reflection=mix(skyAt(reflectedDirection)*.70,reflectedImage.rgb,reflectedImage.a*valid);
      float fresnel=.30+.60*pow(1.-max(dot(-view,vec3(0.,1.,0.)),0.),3.);
      vec3 water=mix(vec3(.055,.17,.19),vec3(.007,.025,.065),night);
      vec3 waterColor=mix(mix(water,c,.27),reflection,clamp(fresnel+.16*night,.32,mix(.88,.94,river)));
      float crest=pow(max(0.,wave),9.);
      waterColor+=crest*mix(vec3(.03,.06,.055),vec3(.008,.012,.022),night)*(1.-smoothstep(.7,2.5,footprint));
      c=mix(c,waterColor,waterCoverage);
    }
    float haze=smoothstep(hazeNear,hazeFar,length(p.xz))*mix(.10,.24+.18*rain,night);
    c=mix(c,mix(mix(vec3(.61,.64,.61),vec3(.045,.07,.13),night),mix(vec3(.39,.55,.60),vec3(.023,.031,.075),night),river),haze);
    /* Distant street ground falls away into the night so the plaza keeps a horizon. */
    if(river<.5&&an.y>.7) c*=1.-(.34+.10*rain)*smoothstep(hazeNear*.8,hazeFar*2.,length(p.xz));
  }
  float ground=normalWorld.y>.7?.30:.70;
  edge=max(smoothstep(.28,.72,edge)*(1.-.25*isInkless),smoothstep(.32,.74,colorEdge)*ground);
  vec3 ink=mix(vec3(.03,.05,.055),vec3(.006,.012,.026),night);
  float inkAmount=mix(mix(.66,.72,night),.50,river);
  inkAmount*=1.-waterCoverage;
  c=mix(c,ink,edge*inkAmount*(1.-.55*whip));
  if(night>.01){
    vec3 glow=vec3(0.);
    for(int k=0;k<16;k++){
      float a=float(k)*2.39996,r=(4.+float(k)*1.5)*(resolution.x/1440.);
      vec3 s=texture2D(tColor,vUv+vec2(cos(a),sin(a))*r/resolution).rgb;
      glow+=max(s-(mix(.85,.72,river)-.16*rain),0.)*(1.-float(k)/22.);
    }
    c+=glow*(mix(.13,.22,river)+.11*rain)*night*glowBoost;
  }
  /* Illustration grade: more colour and a soft S that keeps the night deep. */
  float lum=dot(c,vec3(.2126,.7152,.0722));
  c=max(mix(vec3(lum),c,mix(1.,1.16,night)+.10*rain),0.);
  /* The S-curve is only defined on 0..1: unclamped HDR highlights (lit lobby
     glass, its wet-ground reflection) would drive channels negative and the
     final clamp would leave a saturated green fringe. */
  c=min(c,vec3(1.));
  c=mix(c,c*c*(3.-2.*c),mix(0.,.18,night)+.05*rain);
  /* A rainy night pulls the shadows cool and keeps the black end of the ramp. */
  c=mix(c,c*vec3(.90,.97,1.12),rain*.5);
  c*=1.-.045*rain;
  float vignette=smoothstep(.58,1.10,length((vUv-.5)*vec2(1.35,1.)));
  c*=1.-vignette*(mix(.12,.18,night)+.05*rain);
  c=mix(c,vec3(1.)-exp(-max(c,vec3(0.))*1.14),river);
  if(rain>.001){
    float aspect=resolution.x/resolution.y;
    vec2 su=vec2(vUv.x*aspect,vUv.y);
    // Three depths: fast near threads, the main curtain, and a fine far layer
    // that only adds density. A slow mist band supplies the hazy distance.
    float r1=rainLayer(su,resolution,time,110.,22.,.14,16.,1.05,.55,.98,1.3);
    float r2=rainLayer(su,resolution,time,170.,34.,.11,9.5,.80,.45,.92,5.9);
    float r3=rainLayer(su,resolution,time,220.,55.,.09,5.2,.62,.40,.88,9.1);
    float mist=smoothstep(.40,.74,fbm(vec2(su.x*3.4,su.y*2.1-time*.03)+7.3));
    /* On the Yangtze preset the drops read only where they cross lit surfaces:
       the open night sky stays clear while lamps, facades and the pylons catch
       the threads. Every other scene keeps the old uniform curtain. */
    float lite=dot(c,vec3(.33,.5,.17));
    float lit=mix(1.,mix(.20,1.18,smoothstep(.03,.20,lite)),river);
    c+=rain*(r1*.030+r2*.020+r3*.012+mist*mix(.016,.009,river))*vec3(.74,.84,.94)*lit;
  }
  c+=(hash(vUv*resolution+13.7)-.5)/255.;
  gl_FragColor=vec4(toSRGB(clamp(c,0.,1.)),1.);
  if(debug>.5&&debug<1.5)gl_FragColor=vec4(vec3(texture2D(tShadow,vUv).r),1.);
  else if(debug>1.5&&debug<2.5)gl_FragColor=vec4(texture2D(tAlbedo,vUv).rgb,1.);
  else if(debug>2.5&&debug<3.5)gl_FragColor=vec4(vec3(edge),1.);
  else if(debug>3.5&&debug<4.5)gl_FragColor=vec4(vec3(normalSample.a),1.);
  else if(debug>4.5&&debug<5.5)gl_FragColor=vec4(toSRGB(clamp(skyAt(ray),0.,1.)),1.);
}`;

export function createStage(canvas) {
  const debugParam = Number(new URLSearchParams(location.search).get('dbg') || 0);
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
  const inklessNormalMaterial=createInklessNormalMaterial();
  const shadowMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide});
  const uniforms={
    tColor:{value:colorRT.texture},tNormal:{value:normalRT.texture},tDepth:{value:normalRT.depthTexture},
    tShadow:{value:shadowRT.texture},tAlbedo:{value:albedoRT.texture},tReflection:{value:reflectionRT.texture},
    invVP:{value:new THREE.Matrix4()},VP:{value:new THREE.Matrix4()},reflectionVP:{value:new THREE.Matrix4()},camRotation:{value:new THREE.Matrix3()},projectionLens:{value:new THREE.Vector4()},
    cameraPositionWorld:{value:new THREE.Vector3()},sunDirection:{value:new THREE.Vector3()},
    resolution:{value:new THREE.Vector2(1,1)},cameraNear:{value:.1},cameraFar:{value:5000},night:{value:0},time:{value:0},
    river:{value:0},waterLevel:{value:0},hazeNear:{value:70},hazeFar:{value:180},debug:{value:0},
    riverHorizon:{value:new THREE.Vector3(.16,.07,.14)},
    rain:{value:0},glowBoost:{value:1},whip:{value:0},reflectGain:{value:1},
  };
  const postMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:VERTEX,fragmentShader:FRAGMENT,depthTest:false,depthWrite:false});
  uniforms.debug.value = Number.isFinite(debugParam) ? debugParam : 0;
  const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),postMaterial);quad.frustumCulled=false;postScene.add(quad);
  let world=null,night=false,width=1,height=1,dpr=1,disposed=false;
  let albedoPairs=[],flatMaterials=[],lastRealTime=0,lastShadowTime=-Infinity;
  let stats={fps:0,calls:0,drawCalls:0,triangles:0,width:1,height:1,dpr:1};

  function clearFlatMaterials(){flatMaterials.forEach(m=>m.dispose());flatMaterials=[];albedoPairs=[];}
  function prepareAlbedo(){
    clearFlatMaterials();
    if(!world)return;
    const inkless=new Set([...(world.noInk||[]),...(world.glow||[]),...(world.water||[])]);
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
      const surfaceNormal=inkless.has(o)?inklessNormalMaterial:normalMaterial;
      albedoPairs.push({mesh:o,original,basic:Array.isArray(original)?original.map(make):make(original),
        normal:Array.isArray(original)?original.map(()=>surfaceNormal):surfaceNormal});
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
    uniforms.riverHorizon.value.set(...(world?.visual?.horizon??[.16,.07,.14]));
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
    const visual=world?.visual||{},isRiver=uniforms.river.value>.5;
    ambient.color.set(night?(visual.nightAmbient??(isRiver?'#8f9dc8':'#8eabe1')):'#ecf1f4');
    ambient.intensity=night?(visual.nightAmbientIntensity??(isRiver?.63:.95)):2.1;
    sun.color.set(night?(visual.nightSun??(isRiver?'#acb9ec':'#9cbaff')):'#fff0d0');
    sun.intensity=night?(visual.nightSunIntensity??(isRiver?.60:.72)):1.35;
    // Rain-night grading is a per-world opt-in; every other scene stays 0.
    uniforms.rain.value=night?(visual.rain??0):0;
    uniforms.glowBoost.value=visual.glowBoost??1;
    uniforms.reflectGain.value=night?(visual.reflectGain??1):1;
    world?.setNight?.(night);prepareAlbedo();renderer.shadowMap.needsUpdate=true;
  }
  function resize(w,h,exact=false){
    width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));
    const mobile=width<760 || (typeof navigator!=='undefined'&&navigator.maxTouchPoints>1&&width<1100);
    const cap=mobile?1:1.5;
    dpr=exact?1:Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,cap,1920/width,1250/height);
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
    placeCamera(camera,shot,width/height);
    world.animate?.(ms,shot,camera);
    renderer.info.reset();
    if(Math.abs(ms-lastShadowTime)>220){renderer.shadowMap.needsUpdate=true;lastShadowTime=ms;}
    scene.overrideMaterial=null;
    renderer.setClearColor(0x000000,1);renderer.setRenderTarget(colorRT);renderer.clear();renderer.render(scene,camera);
    renderRiverReflection();
    renderer.setClearColor(0x000000,1);
    const isRiver=uniforms.river.value>.5;
    const restoreNoInk=hidden(isRiver?depthlessOverlays([...(world.noInk||[]),...(world.glow||[])]):world.noInk);
    scene.overrideMaterial=isRiver?null:normalMaterial;
    if(isRiver)for(const p of albedoPairs)p.mesh.material=p.normal;
    // Clear alpha is sky; half alpha is visible, inkless geometry. Trees must
    // retain their depth instead of exposing the slope or river behind them.
    renderer.setClearColor(0x000000,0);
    renderer.setRenderTarget(normalRT);renderer.clear();renderer.render(scene,camera);
    if(isRiver)for(const p of albedoPairs)p.mesh.material=p.original;
    renderer.setClearColor(0x000000,1);
    const restoreGlow=hidden(isRiver?[]:world.glow);
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
    uniforms.whip.value=Math.max(0,Math.min(1,shot.whip||0));
    uniforms.cameraPositionWorld.value.copy(camera.position);
    uniforms.VP.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    uniforms.invVP.value.copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse);
    uniforms.camRotation.value.setFromMatrix4(camera.matrixWorld);
    const projection=camera.projectionMatrix.elements;
    uniforms.projectionLens.value.set(projection[0],projection[5],projection[8],projection[9]);
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
    normalMaterial.dispose();inklessNormalMaterial.dispose();shadowMaterial.dispose();postMaterial.dispose();quad.geometry.dispose();
    sun.shadow.map?.dispose();renderer.dispose();world=null;
  }
  resize(canvas.clientWidth||window.innerWidth,canvas.clientHeight||window.innerHeight);
  return {scene,camera,setWorld,setNight,resize,render,snapshot,getInfo,dispose};
}
