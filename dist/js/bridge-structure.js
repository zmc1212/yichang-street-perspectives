import * as THREE from 'three';

/**
 * Photograph-informed Yiling bridge structure. Span and lane geometry follow
 * the published bridge layout; tower profiles and pier dimensions are visual
 * estimates from the 2022 aerial and 2024 reopening photographs, not drawings.
 * Coordinates are metres; the owner scales the complete river scene uniformly.
 */
export function buildBridgeStructure(api) {
  const {group,mesh,box,cyl,plane,beam,prismX,texture,material,customMaterial,
    emitting,instance,glow,noInk,emissives,nightVisible,DECK,font,rnd}=api;
  const concrete=material('#c5c9c3');
  const concreteLight=material('#e0e1d7');
  const concreteJoint=material('#9ca49f');
  const steel=material('#9eaaa9');
  const whiteMark=material('#e7e5d5');
  const yellowMark=material('#c9b36f');
  const dark=material('#4d595b');
  const red=emitting('#af3542',.16);
  const top=DECK+.04;
  const up=new THREE.Vector3(0,1,0);
  const cableItems=[],sleeveItems=[],collarItems=[],anchorPorts=[],anchorRings=[];
  const thinPosts=[],majorPosts=[],roadPosts=[],lampShafts=[],lampHeads=[],lanterns=[],lanternCaps=[];

  // Millimetric aggregate, with markings modelled separately so the long bridge
  // and the close approach have the same surface scale and sharp lane edges.
  const asphaltTex=texture(1024,1024,(c,W,H)=>{
    c.fillStyle='#363d40';c.fillRect(0,0,W,H);
    for(let i=0;i<29000;i++){
      const k=rnd(i*7+4),a=.035+k*.075;
      c.fillStyle=i%3?`rgba(196,200,193,${a})`:`rgba(0,10,16,${a})`;
      const s=.65+rnd(i*7+5)*1.65;c.fillRect(rnd(i*7)*W,rnd(i*7+1)*H,s,s);
    }
    c.strokeStyle='rgba(18,26,30,.10)';c.lineWidth=1.5;
    for(let i=0;i<14;i++){
      c.beginPath();c.moveTo(rnd(i+17)*W,rnd(i+71)*H);
      c.lineTo(rnd(i+27)*W,rnd(i+81)*H);c.stroke();
    }
  });
  asphaltTex.wrapS=asphaltTex.wrapT=THREE.RepeatWrapping;
  const asphalt=customMaterial({color:'#ffffff',map:asphaltTex});
  const pavingTex=texture(512,512,(c,W,H)=>{
    c.fillStyle='#b6bbb6';c.fillRect(0,0,W,H);c.strokeStyle='#8e9792';c.lineWidth=2;
    for(let y=0;y<H;y+=64)for(let x=(y%128?0:-64);x<W;x+=128){
      c.fillStyle=`rgba(226,225,208,${.05+rnd(x+y)*.14})`;c.fillRect(x+2,y+2,124,60);c.strokeRect(x,y,128,64);
    }
  });pavingTex.wrapS=pavingTex.wrapT=THREE.RepeatWrapping;
  const paving=customMaterial({color:'#ffffff',map:pavingTex});

  function deckHeightAt(x){
    const a=Math.abs(x);
    if(a<=468)return DECK;
    if(a<=650)return THREE.MathUtils.lerp(DECK,23,(a-468)/182);
    if(a<=900)return THREE.MathUtils.lerp(23,17,(a-650)/250);
    return THREE.MathUtils.lerp(17,11,Math.min(1,(a-900)/220));
  }
  function roadQuad(x0,x1,z0,z1,offset,mat,tile=8){
    const y0=deckHeightAt(x0)+offset,y1=deckHeightAt(x1)+offset;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([x0,y0,z0,x1,y1,z0,x1,y1,z1,x0,y0,z1],3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute([x0/tile,z0/tile,x1/tile,z0/tile,x1/tile,z1/tile,x0/tile,z1/tile],2));
    g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();return mesh(g,mat);
  }
  function cylinderItem(a,b,radius){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
    return {pos:A.add(B).multiplyScalar(.5).toArray(),scale:[radius,delta.length(),radius],
      quaternion:new THREE.Quaternion().setFromUnitVectors(up,delta.normalize())};
  }
  function railTube(x0,x1,z,height,radius,mat){
    const a=[x0,deckHeightAt(x0)+height,z],b=[x1,deckHeightAt(x1)+height,z];
    const item=cylinderItem(a,b,radius);
    const o=mesh(new THREE.CylinderGeometry(1,1,1,7),mat,...item.pos);
    o.scale.set(...item.scale);o.quaternion.copy(item.quaternion);return o;
  }
  function octagonalLoft(x,z,rings,mat){
    const pos=[],uv=[],idx=[];
    for(const [y,w,d,cut]of rings){
      const ring=[[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],
        [w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]];
      for(const [xx,zz]of ring){pos.push(xx+x,y,zz+z);uv.push((xx+w/2)/w,(zz+d/2)/d);}
    }
    for(let r=0;r<rings.length-1;r++)for(let k=0;k<8;k++){
      const a=r*8+k,b=r*8+(k+1)%8,c=(r+1)*8+k,d=(r+1)*8+(k+1)%8;
      idx.push(a,c,b,b,c,d);
    }
    for(let k=1;k<7;k++){idx.push(0,k,k+1);const t=(rings.length-1)*8;idx.push(t,t+k+1,t+k);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    return mesh(g,mat);
  }

  // The two sidewalks, four lanes and central cable strip remain continuous
  // across the main bridge and the sloping approach spans.
  const breaks=[-1120,-900,-650,-468,468,650,900,1120];
  for(let k=0;k<breaks.length-1;k++){
    const a=breaks[k],b=breaks[k+1],ya=deckHeightAt(a),yb=deckHeightAt(b);
    const girder=prismX(a,b,[[-11.5,ya],[11.5,ya],[10.55,ya-1.05],[8.9,ya-2.65],[-8.9,ya-2.65],[-10.55,ya-1.05]],concrete);
    const p=girder.geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+p.getX(i)/(b-a)*(yb-ya));
    p.needsUpdate=true;girder.geometry.computeVertexNormals();
    roadQuad(a,b,-9.25,9.25,.04,asphalt);
    roadQuad(a,b,-1.38,1.38,.10,paving,2);
    for(const side of[-1,1]){
      roadQuad(a,b,side>0?9.32:-11.45,side>0?11.45:-9.32,.22,paving,2);
      roadQuad(a,b,side>0?9.22:-9.4,side>0?9.4:-9.22,.27,concreteLight);
      roadQuad(a,b,side>0?11.3:-11.5,side>0?11.5:-11.3,.27,concreteLight);
      roadQuad(a,b,side>0?1.30:-1.5,side>0?1.5:-1.30,.30,concreteLight);
      roadQuad(a,b,side>0?1.57:-1.69,side>0?1.69:-1.57,.052,yellowMark);
      roadQuad(a,b,side>0?9.01:-9.12,side>0?9.12:-9.01,.052,whiteMark);
      // Red vehicular protection is inside the sidewalk, as in the road photographs.
      for(const z of[side*9.29,side*1.42]){
        railTube(a,b,z,1.18,.095,red);railTube(a,b,z,.57,.071,red);
      }
      // Silver-grey pedestrian balustrade on the outer edge.
      railTube(a,b,side*11.33,1.55,.058,steel);railTube(a,b,side*11.33,.42,.035,steel);
      railTube(a,b,side*11.33,1.22,.035,steel);
    }
  }
  for(let x=-1116;x<1116;x+=15)for(const z of[-5.375,5.375])roadQuad(x,x+6,z-.075,z+.075,.055,whiteMark);
  for(let x=-1120;x<=1120;x+=2.8)for(const side of[-1,1]){
    const y=deckHeightAt(x);
    majorPosts.push({pos:[x,y+.91,side*11.33],scale:[.105,1.38,.105]});
    for(const z of[side*9.29,side*1.42])roadPosts.push({pos:[x,y+.75,z],scale:[.12,1.25,.12]});
  }
  for(let x=-1119;x<1119;){
    const y=deckHeightAt(x),step=Math.abs(x)<475?.42:.78;
    for(const side of[-1,1])thinPosts.push({pos:[x,y+.96,side*11.33],scale:[.036,1.04,.036]});
    x+=step;
  }
  instance(new THREE.BoxGeometry(1,1,1),steel,thinPosts).name='外沿密竖杆人行护栏';
  instance(new THREE.BoxGeometry(1,1,1),steel,majorPosts);
  instance(new THREE.BoxGeometry(1,1,1),material('#929b99'),roadPosts);
  for(const x of[-900,-650,-468,468,650,900])roadQuad(x-.09,x+.09,-11.45,11.45,.057,material('#444d4c'));

  // Direction arrows and the diagonally hatched bridgehead median are visible
  // when the camera moves close to the roadway, not baked into a stretched map.
  function roadArrow(x,z,dir){
    const shape=new THREE.Shape(),pts=[[-3,-.18],[.5,-.18],[.5,-.68],[3,0],[.5,.68],[.5,.18],[-3,.18]];
    pts.forEach(([xx,zz],i)=>i?shape.lineTo(xx*dir,zz):shape.moveTo(xx*dir,zz));shape.closePath();
    const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const xx=p.getX(i)+x,zz=p.getZ(i)+z;p.setXYZ(i,xx,deckHeightAt(xx)+.062,zz);}
    g.computeVertexNormals();mesh(g,whiteMark);
  }
  for(const x of[-985,-805,-590,-442,442,590,805,985])for(const side of[-1,1]){
    roadArrow(x,side*3.45,side);roadArrow(x,side*7.2,side);
  }
  for(const end of[-1,1])for(let a=473;a<535;a+=2.7){
    const x=end*a,dx=.068,dz=-.041;
    const points=[[x-.75-dx,-1.24-dz],[x+.75-dx,1.24-dz],[x+.75+dx,1.24+dz],[x-.75+dx,-1.24+dz]];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(([xx,zz])=>[xx,deckHeightAt(xx)+.065,zz]),3));
    g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();mesh(g,yellowMark);
  }

  // Side-span auxiliary piers occur at 43.5 m and 82 m from each bank tower.
  // Main-span split: 120 + 348 + 348 + 120; the auxiliary piers were absent
  // from the first model and are very visible from the river.
  for(const side of[-1,1])for(const distance of[391.5,430,510,570,630,705,780,855,935,1010]){
    const x=side*distance,h=deckHeightAt(x),base=Math.abs(x)<468?3.5:7.8;
    octagonalLoft(x,0,[[base,6.5,10,1.3],[base+1,6.5,10,1.3]],concreteJoint);
    octagonalLoft(x,0,[[base+.8,4.6,7.2,.75],[h-3.5,3.5,6.4,.6]],concrete);
    octagonalLoft(x,0,[[h-4.2,3.5,7,.55],[h-2.65,8.4,13.6,1.1]],concreteLight);
  }

  const towerWhite=material('#e5e6df',{emissive:'#e9c58a',emissiveIntensity:0});
  emissives.push({mat:towerWhite,value:.50});
  const inset=material('#6f9ead'),insetShadow=material('#497e91');
  const gold=emitting('#e6c58d',1.65);
  // Along-bridge thickness of the pylon shaft. `towerBulk` is set by the 9:16
  // preset only: seen from the north bank at eye level the camera looks almost
  // down the river axis, so the shaft is read through its thin dimension and the
  // Y limbs (which splay across the bridge) collapse to a plate. Making the
  // section deeper is the one lever that widens it without moving the legs off
  // the pier or touching the deck width, the tower height or the cable layout.
  const towerBulk = api.towerBulk || 0;
  const depthBase = THREE.MathUtils.lerp(6.5, 9.2, towerBulk);
  const depthTop = THREE.MathUtils.lerp(4.8, 6.8, towerBulk);
  function towerDepth(y,topY){return THREE.MathUtils.lerp(depthBase,depthTop,THREE.MathUtils.clamp((y-DECK)/(topY-DECK),0,1));}
  const shapeDepth = THREE.MathUtils.lerp(6.5, 9.2, towerBulk);

  function tower(x,topY,isMiddle){
    const H=topY-DECK,capW=isMiddle?23.6:19.6,capD=isMiddle?34:30;
    octagonalLoft(x,0,[[-.6,capW+2,capD+2,4.0],[.65,capW+2,capD+2,4.0]],material('#765a4c'));
    octagonalLoft(x,0,[[.6,capW,capD,3.7],[2.45,capW,capD,3.7]],material('#a36150'));
    octagonalLoft(x,0,[[2.45,capW-1.0,capD-1.0,3.6],[3.1,capW-1.0,capD-1.0,3.6]],concreteLight);
    octagonalLoft(x,0,[[3.1,capW-4.4,capD-5.4,3.5],[DECK-5.4,capW-6.1,capD-8.8,3.1]],concreteLight);
    octagonalLoft(x,0,[[DECK-5.4,capW-6.1,capD-8.8,3.1],[DECK-2.5,14.8,30,2.0]],concrete);
    // Horizontal panel joints give the tall white pier its concrete scale.
    for(const y of[6.4,10.2,14,17.8])if(y<DECK-5.5){
      const f=(y-3.1)/(DECK-8.5),w=THREE.MathUtils.lerp(capW-4.4,capW-6.1,f),d=THREE.MathUtils.lerp(capD-5.4,capD-8.8,f);
      octagonalLoft(x,0,[[y,w+.015,d+.015,3.35],[y+.045,w+.015,d+.015,3.35]],concreteJoint);
    }

    // One continuous Y silhouette: long lower limbs, rounded shoulders and a
    // relatively short upper stem. The profile is symmetric across the bridge.
    const s=new THREE.Shape();
    s.moveTo(-14.2,DECK-1.25);s.lineTo(-5.3,DECK+H*.48);
    s.bezierCurveTo(-3.4,DECK+H*.58,-2.64,DECK+H*.65,-2.58,DECK+H*.73);
    s.lineTo(-2.42,topY-.1);s.lineTo(-1.66,topY-.1);s.lineTo(-1.61,topY-.77);
    s.quadraticCurveTo(0,topY-1.15,1.61,topY-.77);s.lineTo(1.66,topY-.1);s.lineTo(2.42,topY-.1);
    s.lineTo(2.58,DECK+H*.73);s.bezierCurveTo(2.64,DECK+H*.65,3.4,DECK+H*.58,5.3,DECK+H*.48);
    s.lineTo(14.2,DECK-1.25);s.lineTo(9.72,DECK-1.25);s.lineTo(1.18,DECK+H*.558);
    s.quadraticCurveTo(.72,DECK+H*.599,0,DECK+H*.608);
    s.quadraticCurveTo(-.72,DECK+H*.599,-1.18,DECK+H*.558);s.lineTo(-9.72,DECK-1.25);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:shapeDepth,steps:1,bevelEnabled:true,bevelThickness:.095,bevelSize:.11,bevelSegments:2,curveSegments:14});
    g.translate(0,0,-shapeDepth/2);g.rotateY(Math.PI/2);
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)*towerDepth(p.getY(i),topY)/shapeDepth);
    p.needsUpdate=true;g.computeVertexNormals();const pylon=mesh(g,towerWhite,x,0,0);pylon.name=isMiddle?'夷陵大桥中央曲肩Y塔':'夷陵大桥岸塔曲肩Y轮廓';

    // Recessed blue-grey channels have raised white lips. A continuous ribbon
    // follows each limb into the shaft, instead of a disconnected painted box.
    for(const face of[-1,1])for(const side of[-1,1]){
      const points=[];
      for(let i=0;i<=24;i++){
        const t=i/24,y=DECK+.4+H*.98*t;
        let z;
        if(t<.58)z=THREE.MathUtils.lerp(11.8,1.83,t/.58);
        else if(t<.73){const q=(t-.58)/.15;z=THREE.MathUtils.lerp(1.83,.78,q*q*(3-2*q));}
        else z=.78;
        points.push([y,side*z]);
      }
      const pos=[],idx=[];
      points.forEach(([y,z],i)=>{
        const width=i<13?1.35:.58,xx=x+face*(towerDepth(y,topY)/2+.13);
        pos.push(xx,y,z-width/2,xx,y,z+width/2);
        if(i<points.length-1){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
      });
      const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));pg.setIndex(idx);pg.computeVertexNormals();
      const panel=mesh(pg,inset);panel.material.side=THREE.DoubleSide;
      // The slight shadow line beside the channel makes its depth legible.
      for(let i=0;i<points.length-1;i++){
        const [ya,za]=points[i],[yb,zb]=points[i+1],w=i<13?.76:.35;
        beam([x+face*(towerDepth(ya,topY)/2+.21),ya,za+side*w],[x+face*(towerDepth(yb,topY)/2+.21),yb,zb+side*w],.11,.11,concreteLight);
      }
    }

    // Gold lighting follows the actual outer limbs at night.
    for(const face of[-1,1])for(const side of[-1,1]){
      const pts=[[DECK+.6,13.9],[DECK+H*.48,5.22],[DECK+H*.65,2.86],[topY-1.3,2.42]]
        .map(([y,z])=>new THREE.Vector3(x+face*(towerDepth(y,topY)/2+.19),y,side*z));
      const tube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),30,.078,5,false);
      const light=mesh(tube,gold,0,0,0,group,false);light.visible=false;nightVisible.push(light);noInk.push(light);glow.push(light);
    }
    cyl(.12,.16,2.5,x,topY+.8,0,steel,8);box(.65,.45,.65,x,topY-.7,0,concreteLight);

    const minAnchor=DECK+H*.65,maxAnchor=topY-4.7;
    const fans=x===0?[[-1,174,20],[1,174,20]]:x<0?[[-1,120,19],[1,174,20]]:[[-1,174,20],[1,120,19]];
    for(const [dir,reach,count]of fans)for(let k=1;k<=count;k++){
      const u=(k-1)/(count-1),ay=THREE.MathUtils.lerp(minAnchor,maxAnchor,u),ax=x+dir*(15+(reach-15)*(k/count));
      for(const pair of[-1,1]){
        const a=new THREE.Vector3(x+dir*(towerDepth(ay,topY)/2+.21),ay,pair*.62),b=new THREE.Vector3(ax,DECK+.95,pair*.62);
        const delta=a.clone().sub(b),direction=delta.clone().normalize();
        cableItems.push(cylinderItem(a.toArray(),b.toArray(),.145));
        const sleeveEnd=b.clone().addScaledVector(direction,5.4);
        sleeveItems.push(cylinderItem(b.toArray(),sleeveEnd.toArray(),.235));
        collarItems.push(cylinderItem(b.clone().addScaledVector(direction,.55).toArray(),b.clone().addScaledVector(direction,.88).toArray(),.295));
        anchorPorts.push({pos:[x+dir*(towerDepth(ay,topY)/2+.13),ay,pair*.62],scale:[.30,.08,.30],quaternion:new THREE.Quaternion().setFromUnitVectors(up,new THREE.Vector3(dir,0,0))});
        anchorRings.push({pos:a.toArray(),scale:[.31,.16,.31],quaternion:new THREE.Quaternion().setFromUnitVectors(up,direction)});
        const shoe=box(1.55,.65,.67,ax,DECK+.46,pair*.62,concreteLight);shoe.rotation.z=-dir*.09;
        box(.38,.18,.66,ax-dir*.55,DECK+.88,pair*.62,material('#8d9998'));
      }
    }
  }
  tower(-348,106.5,false);tower(0,126,true);tower(348,106.5,false);
  const cables=instance(new THREE.CylinderGeometry(1,1,1,6),emitting('#d9dcd5',.15),cableItems);cables.name='236根成对中央斜拉索';
  instance(new THREE.CylinderGeometry(1,1,1,7),material('#dce0d9'),sleeveItems).name='斜拉索桥面白色护套';
  instance(new THREE.CylinderGeometry(1,1,1,8),steel,collarItems);
  instance(new THREE.CylinderGeometry(1,1,1,9),insetShadow,anchorPorts);
  instance(new THREE.CylinderGeometry(1,1,1,9),material('#b9c0b9'),anchorRings);

  // Narrow tapered columns and curved double-sided arms match the reopening
  // photograph. The red hanging lanterns are confined to the main-bridge lamps.
  for(let x=-1060;x<=1060;x+=38)for(const side of[-1,1]){
    const y=deckHeightAt(x),z=side*10.63;
    lampShafts.push({pos:[x,y+4.95,z],scale:[.17,9.4,.17]});
    cyl(.36,.42,.35,x,y+.43,z,steel,8);
    const armPts=[new THREE.Vector3(x,y+8.45,z),new THREE.Vector3(x+side*.12,y+9.12,z-side*.28),
      new THREE.Vector3(x+side*.28,y+9.4,z-side*1.25),new THREE.Vector3(x+side*.4,y+9.52,z-side*2.45)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(armPts),8,.065,5,false),steel);
    lampHeads.push({pos:[x+side*.4,y+9.5,z-side*2.58],scale:[.52,.16,1.0],rotation:[0,0,side*.05]});
    if(Math.abs(x)<480&&Math.abs(x)%76<38){
      beam([x,y+8.3,z],[x,y+8.3,z+side*1.15],.06,.06,steel);
      for(let k=0;k<3;k++){
        lanterns.push({pos:[x,y+7.92-k*.52,z+side*1.08],scale:[.25,.32,.25]});
        lanternCaps.push({pos:[x,y+8.18-k*.52,z+side*1.08],scale:[.15,.10,.15]});
      }
    }
  }
  instance(new THREE.CylinderGeometry(.6,1,1,7),steel,lampShafts);
  const lampGlow=instance(new THREE.BoxGeometry(1,1,1),emitting('#ede2bf',1.45),lampHeads);glow.push(lampGlow);
  instance(new THREE.SphereGeometry(1,7,5),emitting('#b52b35',.23),lanterns);
  instance(new THREE.CylinderGeometry(1,1,1,6),material('#cba95d'),lanternCaps);

  // Modest bridgehead panels: a red-brown base and inner pier, pale stone with
  // restrained bronze lettering. The first model made these into tall gates.
  const nameTex=texture(2048,512,(c,W,H)=>{
    c.fillStyle='#dbe0dc';c.fillRect(0,0,W,H);
    for(let i=0;i<9000;i++){c.fillStyle=`rgba(114,130,127,${rnd(i)*.06})`;c.fillRect(rnd(i*3)*W,rnd(i*3+1)*H,1+rnd(i)*3,1);}
    c.strokeStyle='#9eaaa6';c.lineWidth=3;
    for(const y of[H*.08,H*.72]){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    for(const x of[W*.25,W*.5,W*.75]){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
    c.fillStyle='#8b774d';c.textAlign='center';c.textBaseline='middle';c.font=font(205,500);c.fillText('夷陵长江大桥',W/2,H*.42,W*.91);
    c.font=font(49,500);c.fillText('YILING YANGTZE BRIDGE',W/2,H*.85,W*.70);
  });
  const nameMat=customMaterial({map:nameTex,color:'#ffffff'}),headRed=material('#8c4447');
  for(const end of[-1,1])for(const side of[-1,1]){
    const x=end*487,z=side*20.2,y=deckHeightAt(x)+.22;
    box(1.25,4.8,16.2,x,y+2.4,z,headRed);
    box(1.43,.18,16.5,x,y+4.87,z,concreteLight);
    box(1.48,6.25,1.5,x,y+3.125,z-side*7.45,headRed);
    const panel=plane(14.3,2.65,x+end*.643,y+3.33,z+side*.45,nameMat,end<0?-Math.PI/2:Math.PI/2);
    panel.renderOrder=1;
    for(const zz of[-5,-1,3,6]){
      const fixture=box(.22,.12,.4,x+end*.71,y+1.7,z+zz,material('#424d4d'));fixture.rotation.z=end*.18;
    }
  }

  return {deckHeightAt,mainSpan:936,deckWidth:23,cableCount:cableItems.length,
    towerLocations:[-348,0,348],approachEnds:[-1120,1120],towerMaterial:towerWhite,
    cableMaterial:cables.material,insetMaterial:inset,goldMaterial:gold};
}
