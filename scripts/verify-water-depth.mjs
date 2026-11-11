/**
 * CPU numerical regression for the bridge's depth/optical camera contract.
 * Run from the repository: node scripts/verify-water-depth.mjs
 *
 * This uses the real camera functions and independent double-precision plane
 * intersections as ground truth. Float32 arithmetic approximates shader
 * precision; it does NOT certify shader compilation or a browser GPU frame.
 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sampleShot, placeCamera} from '../dist/js/camera.js';

// Captured from the bridge scene's documented metre coordinates and .35 scale.
// Keep this explicit fixture aligned when the scene's hero bounds are changed.
const scaled=(min,max)=>({min:min.map(v=>v*.35),max:max.map(v=>v*.35)});
const focus={kind:'bridge',x:0,y:25,zf:0,W:420,heroBounds:[
  scaled([-470,20.5,-12],[470,34,12]),
  scaled([-356,0,-16],[-340,110,16]),
  scaled([-12,0,-18],[12,129.3,18]),
  scaled([340,0,-16],[356,110,16]),
],target:{left:.075,right:.925,top:.14,bottom:.79}};
const times=[.03,.14,.25,.375,.435,.47,.68,.79,.821,.8215,.822,.825,.835,.94];
const viewports=[['wide',1920,864],['desktop',1920,1080],['mobile',390,844]];
const f=Math.fround,far=new THREE.Vector3(),direction=new THREE.Vector3(),point=new THREE.Vector3();
const viewPoint=new THREE.Vector3(),clipPoint=new THREE.Vector3();
const dot4=(m,a,k)=>f(f(f(f(m[k]*a[0])+f(m[k+4]*a[1]))+f(m[k+8]*a[2]))+f(m[k+12]*a[3]));

function truthOnRiver(camera,u,v){
  far.set(u*2-1,v*2-1,1).unproject(camera);
  direction.subVectors(far,camera.position);
  if(direction.y>=0)return null;
  point.copy(camera.position).addScaledVector(direction,-camera.position.y/direction.y);
  // A finite river interior, away from the banks and bridge deck.
  if(Math.abs(point.x)>105||Math.abs(point.z)>1200||Math.abs(point.z)<16)return null;
  clipPoint.copy(point).project(camera);
  if(clipPoint.z<-1||clipPoint.z>1)return null;
  return point.clone();
}
function rayPlaneFloat32(camera,u,v){
  const P=camera.projectionMatrix.elements.map(f),M=camera.matrixWorld.elements.map(f),C=camera.position.toArray().map(f);
  const nx=f(f(f(u)*2)-1),ny=f(f(f(v)*2)-1);
  const vx=f(f(nx+P[8])/P[0]),vy=f(f(ny+P[9])/P[5]);
  let ray=[0,1,2].map(k=>f(f(f(M[k]*vx)+f(M[k+4]*vy))-M[k+8]));
  const lengthSquared=f(f(f(ray[0]*ray[0])+f(ray[1]*ray[1]))+f(ray[2]*ray[2]));
  const magnitude=f(Math.sqrt(lengthSquared));
  ray=ray.map(r=>f(r/magnitude));
  const t=f(-C[1]/ray[1]);
  return ray.map((r,k)=>f(C[k]+f(r*t)));
}
function depthPlaneFloat32(camera,u,v,truth){
  const depth=truth.clone().project(camera).z*.5+.5;
  const d=f(Math.round(depth*16777215)/16777215);
  const inv=new THREE.Matrix4().copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse).elements.map(f);
  const clip=[f(f(f(u)*2)-1),f(f(f(v)*2)-1),f(f(d)*2-1),1];
  return f(dot4(inv,clip,1)/dot4(inv,clip,3));
}
function withoutNearFloor(shot){return {...shot,clipPadding:{...shot.clipPadding,minNear:.1,minNearFraction:0}};}

let configurations=0,samples=0,maxRayXZ=0,maxRayY=0,maxHardenedDepthY=0,minHeroNearMargin=Infinity;
let legacyRejected=0,legacySamples=0,newlyRejected=0,maxCompositionDelta=0;
for(const [viewport,w,h]of viewports)for(const progress of times){
  const shot=sampleShot(progress,focus),camera=new THREE.PerspectiveCamera(),legacy=new THREE.PerspectiveCamera();
  const D=placeCamera(camera,shot,w/h);placeCamera(legacy,withoutNearFloor(shot),w/h);configurations++;
  assert.ok(camera.near>=D*.0025-1e-8,'Long-range near floor regressed');
  assert.ok(camera.near>=.1&&camera.far>camera.near,'Invalid clip range');
  const positionDelta=camera.position.distanceTo(legacy.position);
  const lensDelta=Math.max(...[0,5,8,9].map(i=>Math.abs(camera.projectionMatrix.elements[i]-legacy.projectionMatrix.elements[i])));
  maxCompositionDelta=Math.max(maxCompositionDelta,positionDelta,lensDelta);
  assert.ok(positionDelta<1e-7&&lensDelta<1e-7,'Depth hardening changed composition');
  for(const box of shot.heroBounds)for(const x of[box.min[0],box.max[0]])for(const y of[box.min[1],box.max[1]])for(const z of[box.min[2],box.max[2]]){
    viewPoint.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
    const distance=-viewPoint.z;minHeroNearMargin=Math.min(minHeroNearMargin,distance-camera.near);
    assert.ok(distance>camera.near&&distance<camera.far,'Hero intersects clip planes');
  }
  // Sparse samples are enough to exercise wide, close and long-focus matrices.
  const resolution=progress===.822&&viewport==='wide'?49:17;
  for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
    const u=(i+.5)/resolution,v=(j+.5)/resolution,truth=truthOnRiver(camera,u,v);
    if(!truth)continue;
    const hit=rayPlaneFloat32(camera,u,v),xz=Math.hypot(hit[0]-truth.x,hit[2]-truth.z);
    assert.ok(hit.every(Number.isFinite),'Non-finite analytic water intersection');
    maxRayXZ=Math.max(maxRayXZ,xz);maxRayY=Math.max(maxRayY,Math.abs(hit[1]));samples++;
    const hardenedY=depthPlaneFloat32(camera,u,v,truth);maxHardenedDepthY=Math.max(maxHardenedDepthY,Math.abs(hardenedY));
    newlyRejected+=Math.abs(hardenedY)>=.12;
    if(progress===.822&&viewport==='wide'){
      const oldY=depthPlaneFloat32(legacy,u,v,truth);legacySamples++;legacyRejected+=Math.abs(oldY)>=.12;
    }
  }
}
assert.ok(samples>1000,'Insufficient in-river numerical samples');
assert.ok(legacyRejected>legacySamples*.05,'The original 19.728s precision failure was not exercised');
assert.equal(newlyRejected,0,'Near floor failed to protect ordinary depth reconstruction');
assert.ok(maxRayXZ<.003&&maxRayY<.001,'Analytic plane lost Float32 precision');

// The close mobile view can pass about .14 scene units from a visible stay.
// Keep its original .1 near plane; a global .2 minimum would truncate that stay.
const mobileShot=sampleShot(.25,focus),mobileCamera=new THREE.PerspectiveCamera();
placeCamera(mobileCamera,mobileShot,390/844);
assert.ok(mobileCamera.near<.14,'Close mobile stay is newly clipped');

console.log(JSON.stringify({method:'CPU Float32 numerical regression, not GPU visual QA',configurations,samples,
  originalFailureAtSeconds:19.728,legacySamples,legacyRejected,legacyRejectedPercent:100*legacyRejected/legacySamples,
  hardenedDepthRejected:newlyRejected,maxHardenedDepthY,maxRayXZ,maxRayY,maxCompositionDelta,minHeroNearMargin,
  mobileAxisNear:mobileCamera.near},null,2));
