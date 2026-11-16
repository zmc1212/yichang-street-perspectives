/*
 * Perspective camera and monotone timeline adapted from Simcraft.
 * Copyright (c) 2026 Simran Sachdeva. MIT License.
 * https://github.com/dotslashsimran/simcraft
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
 * WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { sampleBridgeShot } from './bridge-camera.js';
import { sampleRiverShot } from './river-camera.js';

export const LOOP = 24000;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const radians = d => d * Math.PI / 180;
const degrees = r => r * 180 / Math.PI;
const cache = new Map();
const boundPoints = new WeakMap();

/* Guomao's reference clip walks the street: a high wide establishing frame
   drops to eye level, pushes continuously toward the entrance under the
   canopy, then whips up to the tower crown without a cut. Keys are authored
   as camera position, yaw, pitch, horizontal FOV and shutter smear. */
const guomaoKey = (t, x, y, z, yaw, pitch, fov, whip = 0) =>
  [t, { x, y, zf: z, W: 1, fov, H: 0, el: pitch, yaw, lay: 0, cs: whip }];
let guomaoCurve = null;
function getGuomaoCurve() {
  if (!guomaoCurve) {
    guomaoCurve = createCurve([
      guomaoKey(0, -12.5, 16.0, 24.0, -16, -24, 62),
      guomaoKey(.03, -14.5, 12.5, 22.0, -17, -18, 63),
      guomaoKey(.06, -16.5, 8.0, 19.5, -16, -11, 65),
      guomaoKey(.09, -18.2, 4.2, 17.0, -14, -4, 68),
      guomaoKey(.12, -19.5, 2.3, 15.2, -13, 0, 71),
      guomaoKey(.16, -20.5, 1.74, 13.4, -12, 1.5, 74),
      guomaoKey(.26, -22.0, 1.70, 10.4, -10, 2, 76),
      guomaoKey(.38, -23.3, 1.70, 7.2, -8.5, 2.5, 77),
      guomaoKey(.50, -24.2, 1.72, 6.55, -7, 3, 78),
      guomaoKey(.59, -24.8, 1.74, 6.0, -6, 4, 78),
      guomaoKey(.66, -25.1, 1.76, 5.7, -5.5, 5, 78),
      guomaoKey(.72, -25.3, 1.80, 5.5, -5, 9, 79),
      // The whip up to the crown also drifts back a few metres. Held at the
      // canopy edge the podium roof would cut the crown off entirely: from
      // z 5.3 the roofline sits at 68 degrees while the crown sits at 66.
      guomaoKey(.765, -25.3, 1.84, 6.2, -5, 20, 80, .3),
      guomaoKey(.805, -25.4, 1.88, 7.6, -5, 34, 82, 1),
      // The last beat tightens the lens: seen from below, a 10.8 m crown band
      // stays 38 px tall at 82 degrees, so the sign only reads once the frame
      // narrows to about 42 degrees.
      guomaoKey(.845, -25.5, 1.92, 9.4, -5, 50, 72, .55),
      guomaoKey(.89, -25.5, 1.94, 11.6, -5, 60, 50, .05),
      guomaoKey(.95, -25.5, 1.94, 12.6, -5, 63, 42),
      guomaoKey(1, -25.5, 1.94, 13.0, -5, 63.5, 42),
    ]);
  }
  return guomaoCurve;
}

function sampleGuomaoShot(progress) {
  const p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const v = getGuomaoCurve()(p);
  return {
    free: true, cx: v.x, cy: v.y, cz: v.zf,
    yaw: v.yaw, pitch: v.el, fov: v.fov, whip: v.cs,
    view: p < .12 ? 'flat' : p < .72 ? 'deep' : 'corner',
    maxYaw: 26, progress: p, nominalW: 1,
  };
}

function createCurve(keys) {
  const times = keys.map(k => k[0]);
  const vals = keys.map(([,s]) => [s.x,s.y,s.zf,Math.log(s.W),Math.log(s.fov),s.H,s.el||0,s.yaw||0,s.lay||0,s.cs===undefined?1:s.cs]);
  const count=keys.length;
  const slopes=vals[0].map((_,j) => {
    const d=[], m=new Array(count).fill(0);
    for(let i=0;i<count-1;i++)d.push((vals[i+1][j]-vals[i][j])/(times[i+1]-times[i]));
    for(let i=1;i<count-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
    for(let i=0;i<count-1;i++){
      if(d[i]===0){m[i]=m[i+1]=0;continue;}
      const a=m[i]/d[i],b=m[i+1]/d[i],h=a*a+b*b;
      if(h>9){const t=3/Math.sqrt(h);m[i]=t*a*d[i];m[i+1]=t*b*d[i];}
    }
    m[0]=m[count-1]=0;
    return m;
  });
  return progress => {
    const t=clamp(progress,0,1);
    let k=0;while(k<count-2 && t>=times[k+1])k++;
    const h=times[k+1]-times[k],u=clamp((t-times[k])/h,0,1);
    const h00=2*u*u*u-3*u*u+1,h10=u*u*u-2*u*u+u,h01=-2*u*u*u+3*u*u,h11=u*u*u-u*u;
    const v=vals[k].map((a,j)=>h00*a+h10*h*slopes[j][k]+h01*vals[k+1][j]+h11*h*slopes[j][k+1]);
    return {x:v[0],y:v[1],zf:v[2],W:Math.exp(v[3]),fov:Math.exp(v[4]),H:v[5],el:v[6],yaw:v[7],lay:clamp(v[8],0,1),cs:v[9]};
  };
}

/** One complete, deterministic 24 second camera performance. */
export function sampleShot(progress, focus={}) {
  if(focus.kind==='bridge')return sampleBridgeShot(progress,focus);
  if(focus.kind==='river')return sampleRiverShot(progress);
  if(focus.kind==='guomao')return sampleGuomaoShot(progress);
  const x=focus.x??0,y=focus.y??12,z=focus.zf??-12,w=focus.W??78;
  const key=[x,y,z,w].join(',');
  let curve=cache.get(key);
  if(!curve){
    const flat={x,y:y+10,zf:z,W:w*1.4,fov:2,H:-.18,el:0,yaw:0,lay:0,cs:1};
    const deep={x:x+.5,y:Math.max(6,y*.52),zf:z-12,W:w*.92,fov:52,H:-.66,el:0,yaw:0,lay:0,cs:1};
    const left={x:x+2,y:Math.max(5,y*.6),zf:z-10,W:w*1.27,fov:4,H:-.22,el:7,yaw:-22,lay:0,cs:1};
    const right={x:x-3,y:Math.max(5,y*.58),zf:z-12,W:w*1.3,fov:4,H:-.25,el:9,yaw:27,lay:1,cs:1};
    const low={...deep,y:5.2,W:w*.96,fov:48,H:-.7,yaw:3,lay:1};
    curve=createCurve([
      [0,flat],
      [.09,{...flat,W:flat.W*.965}],
      [.22,deep],
      [.29,{...deep,W:deep.W*.97,x:deep.x+.4}],
      [.37,left],
      [.40,{...left,W:left.W*.98}],
      [.47,{...left,W:w*.94,fov:38}],
      [.535,flat],
      [.58,{...flat,lay:1}],
      [.615,{...flat,lay:1,W:flat.W*.97}],
      [.715,right],
      [.75,{...right,W:right.W*.975}],
      [.825,{...right,W:w*.98,fov:40}],
      [.89,low],
      [.945,{...flat,lay:1}],
      [.98,flat],
      [1,flat],
    ]);
    if(cache.size>12)cache.clear();
    cache.set(key,curve);
  }
  const p=Number.isFinite(progress)?clamp(progress,0,1):0;
  const shot=curve(p);
  shot.nominalW=shot.W;
  shot.progress=p;
  shot.heroBounds=focus.heroBounds;
  shot.target=focus.target;
  return shot;
}

/* An ordinary perspective camera with a real pitch, used by the Guomao
   street walk. The other scenes keep the level camera and shifted lens. */
function placeFreeCamera(camera, shot, aspect) {
  if (shot.river) {
    camera.aspect = aspect;
    camera.fov = clamp(shot.fov, 1, 110);
    camera.position.set(shot.cx, shot.cy, shot.cz);
    camera.lookAt(shot.tx, shot.ty, shot.tz);
    camera.near = shot.near ?? .28;
    camera.far = shot.far ?? 260;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    return 1;
  }
  const hf=radians(clamp(shot.fov,1,110)),yaw=radians(shot.yaw||0),pitch=radians(shot.pitch||0);
  camera.aspect=aspect;
  camera.fov=degrees(2*Math.atan(Math.tan(hf*.5)/aspect));
  const cp=Math.cos(pitch),sp=Math.sin(pitch);
  camera.position.set(shot.cx,shot.cy,shot.cz);
  camera.lookAt(shot.cx+Math.sin(yaw)*cp,shot.cy+sp,shot.cz-Math.cos(yaw)*cp);
  camera.near=.2;camera.far=260;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return 1;
}

/** Place a level camera with a shifted lens. W is horizontal at the focus plane. */
export function placeCamera(camera, shot, aspect) {
  if(shot.free)return placeFreeCamera(camera,shot,aspect);
  const fov=clamp(shot.fov,1,105),hf=radians(fov),yaw=radians(shot.yaw||0),el=radians(shot.el||0);
  const vt=Math.tan(hf*.5)/aspect,te=Math.tan(el);
  camera.aspect=aspect;
  camera.fov=degrees(2*Math.atan(vt));
  const place=width=>{
    const D=width*.5/Math.tan(hf*.5);
    const x=shot.x+Math.sin(yaw)*D,z=shot.zf+Math.cos(yaw)*D,y=shot.y+D*te;
    camera.position.set(x,y,z);
    camera.lookAt(x-Math.sin(yaw),y,z-Math.cos(yaw));
    /* A tight depth interval makes the kilometre-distance flat shot stable. */
    const frontPadding=Math.max(shot.clipPadding?.front??260,D*(shot.clipPadding?.frontFraction??0));
    const minNear=Math.max(shot.clipPadding?.minNear??.1,D*(shot.clipPadding?.minNearFraction??0));
    camera.near=Math.max(minNear,D-frontPadding);camera.far=D+(shot.clipPadding?.back??550);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9]=-((shot.H||0)+te/vt);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
    return D;
  };
  let W=Math.max(5,shot.W),D;
  if(shot.heroBounds?.length){
    let points=boundPoints.get(shot.heroBounds);
    if(!points){
      points=[];
      for(const box of shot.heroBounds)for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]])points.push([x,y,z]);
      boundPoints.set(shot.heroBounds,points);
    }
    const target=shot.target||{left:.08,right:.88,top:.12,bottom:.78};
    const targetWidth=(target.right-target.left)*2,targetHeight=(target.bottom-target.top)*2;
    const centerX=target.left+target.right-1,centerY=1-target.top-target.bottom;
    const measure=()=>{
      const m=camera.matrixWorldInverse.elements,p=camera.projectionMatrix.elements;
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,front=true;
      for(const [x,y,z]of points){
        const vx=m[0]*x+m[4]*y+m[8]*z+m[12],vy=m[1]*x+m[5]*y+m[9]*z+m[13],vz=m[2]*x+m[6]*y+m[10]*z+m[14];
        if(-vz<=camera.near){front=false;continue;}
        const sx=(p[0]*vx+p[8]*vz)/-vz,sy=(p[5]*vy+p[9]*vz)/-vz;
        minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
      }
      return {minX,maxX,minY,maxY,front,width:maxX-minX,height:maxY-minY};
    };
    const fits=width=>{place(width);const b=measure();return b.front&&b.width<=targetWidth&&b.height<=targetHeight;};
    /* Fit only the landmark's two architectural masses, never the distant city. */
    let lo=1,hi=W;
    for(let k=0;k<10&&!fits(hi);k++)hi*=1.5;
    for(let k=0;k<20;k++){const mid=(lo+hi)*.5;if(fits(mid))hi=mid;else lo=mid;}
    const zoom=shot.nominalW?clamp(shot.W/shot.nominalW,.7,1.5):1;
    const breath=1.015+.01*Math.sin((shot.progress||0)*Math.PI*2)**2;
    W=hi*zoom*breath;
    D=place(W);
    const bounds=measure();
    /* Optical shift, not rotation, centers the landmark without keystoning. */
    const shiftX=centerX-(bounds.minX+bounds.maxX)*.5;
    const shiftY=centerY-(bounds.minY+bounds.maxY)*.5;
    camera.projectionMatrix.elements[8]-=shiftX;
    camera.projectionMatrix.elements[9]-=shiftY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.userData.heroFrame={left:(bounds.minX+shiftX+1)*.5,right:(bounds.maxX+shiftX+1)*.5,
      top:(1-bounds.maxY-shiftY)*.5,bottom:(1-bounds.minY-shiftY)*.5,width:W};
  }else{
    D=place(W);delete camera.userData.heroFrame;
  }
  return D;
}
