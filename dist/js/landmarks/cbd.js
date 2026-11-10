/*
 * CBD shopping-centre elevation reconstructed from exterior photographs.
 * Primary visual reference: the tenant's 2019 anniversary photographs,
 * https://www.sohu.com/a/335644860_100016441
 * Also compared with the street photographs published by yichangly.com.
 * Dimensions below are proportional modelling estimates, not survey data.
 * Shop names are limited to signs actually legible in those photographs.
 */

export function buildCbd(kit) {
  const {THREE,group,material,customMaterial,addMesh,box,cyl,plane,canvasTexture,font,
    emissives,glow,noInk}=kit;
  const C={brown:'#796456',brownLight:'#967d69',brownDark:'#4c4039',beige:'#c8b392',
    cornice:'#d6c9ae',joint:'#53473e',metal:'#7d817e',fin:'#afb6af',glass:'#8fb2b5',
    mullion:'#405858',interior:'#d4c7a8',orange:'#e64e24'};
  const front=0;

  function tiles(w,h,base=C.brown,{cols=12,rows=6}={}){
    const map=canvasTexture(1024,512,(c,W,H)=>{
      c.fillStyle=base;c.fillRect(0,0,W,H);
      const cw=W/cols,ch=H/rows;
      for(let r=0;r<rows;r++)for(let i=0;i<cols;i++){
        c.fillStyle=(i+r)%4===0?'rgba(255,240,209,.055)':'rgba(15,22,22,.025)';
        c.fillRect(i*cw+1,r*ch+1,cw-2,ch-2);
      }
      c.strokeStyle='rgba(26,25,23,.40)';c.lineWidth=2;
      for(let i=1;i<cols;i++){c.beginPath();c.moveTo(i*cw,0);c.lineTo(i*cw,H);c.stroke();}
      for(let r=1;r<rows;r++){c.beginPath();c.moveTo(0,r*ch);c.lineTo(W,r*ch);c.stroke();}
      c.strokeStyle='rgba(243,227,194,.13)';c.lineWidth=1;
      for(let r=1;r<rows;r++){c.beginPath();c.moveTo(0,r*ch+2);c.lineTo(W,r*ch+2);c.stroke();}
    });
    return customMaterial({map,color:'#ffffff'});
  }

  function litMaterial(color,value=1,map=null,extra={}){
    const m=customMaterial({color:map?'#ffffff':color,map,emissive:color,emissiveMap:map,
      emissiveIntensity:0,...extra});
    emissives.push({mat:m,value});return m;
  }

  function letters(text,x,y,z,w,h,{color='#ed602b',fontSize=170,weight=700,latin=false,night=.85}={}){
    const tex=canvasTexture(1024,256,(c,W,H)=>{
      c.clearRect(0,0,W,H);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
      c.font=latin?`${weight} ${fontSize}px Georgia,"Times New Roman",serif`:font(fontSize,weight);
      c.fillText(text,W*.5,H*.53,W*.97);
    });
    const m=litMaterial('#ffffff',night,tex,{transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide});
    const p=plane(w,h,x,y,z,m);p.castShadow=false;p.receiveShadow=false;glow.push(p);noInk.push(p);
    return p;
  }

  function fascia(text,x,y,z,w,h,bg,fg='#efe9ce',{sub='',size=125,night=.65}={}){
    const tex=canvasTexture(1024,256,(c,W,H)=>{
      c.fillStyle=bg;c.fillRect(0,0,W,H);c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;
      c.font=font(size,700);c.fillText(text,W*.5,sub?H*.40:H*.53,W*.94);
      if(sub){c.font=font(40,500);c.fillText(sub,W*.5,H*.80,W*.92);}
      c.fillStyle='rgba(255,255,255,.13)';c.fillRect(0,0,W,5);
    });
    box(w+.14,h+.14,.22,x,y,z-.13,C.brownDark);
    const m=litMaterial('#ffffff',night,tex,{side:THREE.DoubleSide});
    const p=plane(w,h,x,y,z+.01,m);p.castShadow=false;glow.push(p);
    return p;
  }

  function shopWindow(x,z,w,h=3.1,{tone='#b6c5be',display='retail'}={}){
    const tex=canvasTexture(1024,512,(c,W,H)=>{
      const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#b8c4b9');bg.addColorStop(.55,tone);bg.addColorStop(1,'#5d665d');
      c.fillStyle=bg;c.fillRect(0,0,W,H);
      c.fillStyle='#e7e3cd';c.fillRect(0,20,W,35);
      c.fillStyle='#6e776d';c.fillRect(0,H*.76,W,H*.24);
      const n=display==='jewelry'?4:7;
      for(let i=0;i<n;i++){
        const xx=(i+.3)*W/n;
        c.fillStyle=display==='jewelry'?'#e8d5a0':['#c5d0b9','#b9b78e','#dfdcca'][i%3];
        c.fillRect(xx,H*.37,W/n*.48,H*.25);
        c.fillStyle='#6b786d';c.fillRect(xx,H*.67,W/n*.56,H*.08);
      }
      c.fillStyle='rgba(221,241,230,.15)';c.beginPath();c.moveTo(W*.63,0);c.lineTo(W*.88,0);c.lineTo(W*.50,H);c.lineTo(W*.25,H);c.closePath();c.fill();
    });
    const m=litMaterial('#fff8dd',.20,tex);
    plane(w,h,x,.45+h*.5,z,m);
    box(w+.14,.15,.18,x,.37,z+.09,C.brownDark);box(w+.14,.12,.18,x,.48+h,z+.09,C.brownDark);
    const bays=Math.max(2,Math.round(w/1.65));
    for(let i=0;i<=bays;i++)box(.055,h,.16,x-w/2+i*w/bays,.45+h*.5,z+.11,C.mullion);
  }

  function arcTube(x,z,y,rx,rz,r=.045){
    const points=[];for(let i=0;i<=22;i++){const a=-Math.PI/2+i/22*Math.PI;points.push(new THREE.Vector3(x+Math.sin(a)*rx,y,z+Math.cos(a)*rz));}
    addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,r,5,false),material(C.mullion));
  }

  function stairDrum(x,z,rx,rz,height,{base=.35}={}){
    // Enclosed curved curtain wall; stairs and landing edges remain behind it.
    box(rx*2+.35,height,1.5,x,base+height/2,z-1.8,C.beige);
    const inner=material('#c6d4cc'),landing=material('#c3d0c8');
    for(let level=0;level<5;level++){
      const y=base+1+level*(height-1.5)/5;
      box(rx*1.65,.16,rz*1.25,x,y,z-.18,landing);
      const flight=box(rx*1.6,.14,.77,x,y+1.65,z+.08,inner);flight.rotation.z=(level%2===0?1:-1)*.51;
      const hand=box(rx*1.63,.055,.05,x,y+2.25,z+.52,C.mullion);hand.rotation.z=flight.rotation.z;
    }
    const glassMap=canvasTexture(512,1024,(c,W,H)=>{
      const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'#71999d');g.addColorStop(.3,'#c7dfda');g.addColorStop(.6,'#86b2b5');g.addColorStop(1,'#bdd2ca');
      c.fillStyle=g;c.fillRect(0,0,W,H);
      c.fillStyle='rgba(235,255,248,.18)';c.fillRect(W*.38,0,W*.11,H);
    });
    const glass=litMaterial('#b6ddd8',.16,glassMap,{transparent:true,opacity:.49,depthWrite:false,side:THREE.DoubleSide});
    const geo=new THREE.CylinderGeometry(1,1,height,28,1,true,-Math.PI/2,Math.PI).scale(rx,1,rz);
    const shell=addMesh(geo,glass,x,base+height/2,z);shell.castShadow=false;shell.receiveShadow=false;
    for(let i=0;i<=14;i++){
      const a=-Math.PI/2+i/14*Math.PI;
      cyl(.035,.035,height+.05,x+Math.sin(a)*rx,base+height/2,z+Math.cos(a)*rz,C.mullion,5);
    }
    for(let y=base;y<=height+base;y+=1.8)arcTube(x,z,y,rx+.025,rz+.025,.038);
    arcTube(x,z,base+height,rx+.05,rz+.05,.085);
    box(rx*2+.45,.34,1.3,x,base+height+.14,z-.5,C.cornice);
    return shell;
  }

  // The commercial body is long and low. The front entrance and stair drums
  // are genuine recesses, not painted on an uninterrupted solid box.
  box(77,21.7,28,-50.5,10.85,-24,C.brown);
  box(21.2,21.7,10,-70.6,10.85,-5,C.brown);
  box(26,13.1,10,-47,15.25,-5,C.brown);
  box(3.5,21.1,10,-32.25,10.55,-5,C.brownLight);
  box(13.1,20.9,10,-18.55,10.45,-5,C.brown);
  box(.55,21.9,10,-88.72,10.95,-5,C.brownDark);

  // Warm metal/stone-clad wings, with panel joints instead of office windows.
  plane(11.1,17.0,-75.65,13.15,.08,tiles(11.1,17,C.brownLight,{cols:5,rows:8}));
  plane(13.0,16.6,-18.55,12.75,.08,tiles(13,16.6,C.brown,{cols:6,rows:7}));
  const sideMat=tiles(38,21.7,'#8b7766',{cols:16,rows:9});
  plane(38,21.7,-89.03,10.85,-19,sideMat,-Math.PI/2);
  plane(38,20.9,-11.97,10.45,-19,sideMat,Math.PI/2);
  // Low rooflines and projecting cornices are central to the actual silhouette.
  box(77.5,.43,28.5,-50.5,21.93,-24,C.cornice);
  box(21.5,.46,10.4,-70.6,22.00,-5,C.cornice);
  box(13.8,.52,10.6,-18.65,21.20,-5,C.cornice);
  box(77.4,.28,.30,-50.5,21.64,-.02,'#b79a6e');
  box(13.8,.15,.36,-18.65,20.88,.16,'#d5bd7f');
  const roofGlow=material('#b99d6f',{emissive:'#f4d69c',emissiveIntensity:0});emissives.push({mat:roofGlow,value:.9});
  box(11.4,.075,.20,-75.65,21.72,.3,roofGlow);box(13.5,.075,.20,-18.55,20.95,.3,roofGlow);

  // The dominant silver-grey folded panel extends above the ordinary roofline.
  const panelX=-52,panelY=15.8,panelW=36,panelH=14.4;
  box(panelW+.35,panelH+.3,.68,panelX,panelY,.40,C.brownDark);
  plane(panelW,panelH,panelX,panelY,.76,tiles(panelW,panelH,C.metal,{cols:30,rows:7}));
  const lightMat=material('#c1cec6',{emissive:'#c7e4da',emissiveIntensity:0});emissives.push({mat:lightMat,value:1.15});
  const lights=new THREE.InstancedMesh(new THREE.BoxGeometry(.045,panelH+.34,.055),lightMat,31);
  const matrix=new THREE.Matrix4();
  for(let i=0;i<31;i++){
    const x=panelX-panelW/2+i*panelW/30;
    box(.16,panelH+.24,.48,x,panelY,.96,C.fin);
    box(.05,panelH+.24,.58,x+.08,panelY,.98,'#575e5a');
    matrix.makeTranslation(x-.048,panelY,1.235);lights.setMatrixAt(i,matrix);
  }
  lights.instanceMatrix.needsUpdate=true;lights.castShadow=false;lights.receiveShadow=false;
  group.add(lights);glow.push(lights);noInk.push(lights);

  // Raised orange-red letters have a transparent background. The metal ribs
  // remain visible behind the lettering, as in both reference photographs.
  const heroTex=canvasTexture(2048,512,(c,W,H)=>{
    c.clearRect(0,0,W,H);c.fillStyle=C.orange;c.textAlign='left';c.textBaseline='middle';
    c.font='700 390px Georgia,"Times New Roman",serif';c.fillText('CBD',16,275,790);
    c.beginPath();c.arc(866,278,16,0,Math.PI*2);c.fill();
    c.font=font(222,800);c.fillText('购物中心',932,294,1092);
  });
  const heroMat=litMaterial('#ffffff',.95,heroTex,{transparent:true,alphaTest:.08,depthWrite:false,side:THREE.DoubleSide});
  const hero=plane(32.5,6.2,-52,16.05,1.39,heroMat);hero.castShadow=false;hero.receiveShadow=false;glow.push(hero);noInk.push(hero);

  // A generous two-storey entrance, with a recessed balcony, warm soffit and
  // the legible Walmart banner. It must remain open below the large panel.
  box(26.3,.20,8.0,-47,.25,-3.8,'#bdb9a7');
  box(26.3,.17,6.5,-47,8.38,-3.2,C.interior);
  box(26.1,.24,5.8,-47,4.55,-5.4,C.cornice);
  for(const x of [-60.2,-33.8])box(.9,8.25,1.15,x,4.35,-.38,C.beige);
  box(1.0,8.3,.9,-46.5,4.35,-7.9,C.beige);
  const upper=customMaterial({color:'#5e7b75'});
  plane(24.3,3.35,-47,6.5,-7.8,upper);
  for(let i=0;i<=12;i++)box(.065,3.35,.10,-59.1+i*2.02,6.5,-7.66,'#b4c5b7');
  for(let i=0;i<7;i++)shopWindow(-57.8+i*3.6,-7.6,3.35,3.35,{tone:'#d2d0b5'});
  box(25,.08,.20,-47,5.15,-2.40,'#bac8bd');
  for(let i=0;i<=22;i++)box(.035,.66,.06,-59.5+i*25/22,4.86,-2.38,C.mullion);
  const downlight=material('#f4ead0',{emissive:'#fff3d7',emissiveIntensity:0});emissives.push({mat:downlight,value:1.0});
  for(let row=0;row<3;row++)for(let k=0;k<9;k++){
    const l=cyl(.095,.095,.035,-58+k*2.75,8.26,-1.4-row*2.2,downlight,8);l.castShadow=false;glow.push(l);noInk.push(l);
  }
  fascia('Walmart  沃尔玛',-47,3.80,-2.22,24.4,1.18,'#187ea4','#f5f6e5',{size:147,night:.9});
  fascia('超市入口',-47,7.70,-3.4,24.4,.56,'#b6ac45','#466555',{size:118,night:.35});
  for(let i=0;i<3;i++)box(27.1,.12,1.02,-47,.06+i*.12,2.65-i*1.0,'#c2beac');

  // Distinct storefronts in their photographed positions, not interchangeable
  // brightly coloured awnings or a row of invented commercial brands.
  shopWindow(-75.65,.21,10.7,3.05,{tone:'#c1d1ba'});
  fascia('watsons',-75.65,3.70,.42,11.0,.83,'#207b83','#f0f5e9',{size:163,night:.85});
  shopWindow(-65.15,.21,9.55,3.13,{tone:'#d7c5a1',display:'jewelry'});
  fascia('珠 宝',-65.15,3.86,.42,9.8,.98,'#50402a','#e2c991',{size:148,night:.65});
  const leftAd=canvasTexture(1024,512,(c,W,H)=>{
    c.fillStyle='#d1d7c7';c.fillRect(0,0,W,H);c.fillStyle='#729c86';c.fillRect(W*.43,0,W*.57,H);
    c.fillStyle='#ecebd8';c.font=font(94,600);c.textAlign='center';c.fillText('品质生活',W*.7,H*.46);
    c.fillStyle='#86a794';c.fillRect(W*.08,H*.16,W*.22,H*.65);c.fillStyle='#eee3be';c.fillRect(W*.11,H*.20,W*.16,H*.45);
  });
  const leftAdMat=litMaterial('#ffffff',.45,leftAd);
  const ad=plane(9.4,3.5,-65.1,6.2,.28,leftAdMat);ad.castShadow=false;glow.push(ad);

  // Transparent curved stair towers on either side of the principal entrance.
  stairDrum(-85.1,-1.15,3.65,1.95,21.9);
  stairDrum(-27.8,-1.10,2.65,1.70,19.5);
  fascia('绝味鸭脖',-85.1,2.45,1.13,7.0,.90,'#d65023','#fff1ce',{size:151,night:.7});
  fascia('入口',-27.8,2.65,.98,4.8,.68,'#267d76','#eaf3d8',{size:145,night:.7});
  box(7.5,.30,3.7,-85.1,.16,.2,'#c2b69d');
  box(5.5,.30,3.4,-27.8,.16,.1,'#c2b69d');

  // The right retail wing has broad opaque sign fields rather than a grid of
  // residential windows. Both anchor names are legible in the source photos.
  box(11.5,6.3,.35,-18.65,13.5,.34,'#383b38');
  letters('Walmart',-18.65,14.45,.59,10.7,2.1,{color:'#f4f0dc',fontSize:185,weight:700,night:.7});
  letters('沃尔玛',-18.65,11.93,.59,9.9,1.85,{color:'#f4f0dc',fontSize:183,weight:700,night:.7});
  fascia('工贸家电',-18.65,6.8,.38,12.2,2.1,'#673e30','#ed6b30',{size:173,night:.85});
  shopWindow(-18.65,.2,12.4,3.2,{tone:'#bbbca7'});
  fascia('工贸家电',-18.65,3.92,.43,12.5,.85,'#66533b','#ead7a0',{size:140,night:.5});
  for(const x of [-25.1,-12.2])box(.44,20.7,.72,x,10.4,.12,C.beige);

  // Restrained, recessed roof detail; no imaginary office-storey stack or
  // repeating rooftop machinery is placed above this low commercial block.
  box(76,.32,26.8,-50.5,22.10,-24.1,'#998b74');
  box(76,.48,.30,-50.5,22.50,-37.6,C.cornice);
  box(.32,.48,27.1,-88.3,22.50,-24.1,C.cornice);
  box(.32,.48,27.1,-12.7,22.50,-24.1,C.cornice);
  const skylight=customMaterial({color:'#789895'});
  box(13,.45,17,-52,22.62,-24.5,skylight);
  for(let i=0;i<=6;i++)box(.08,.04,17,-58.5+i*13/6,22.87,-24.5,'#b7b9a6');
  for(let i=0;i<=5;i++)box(13,.04,.08,-52,22.87,-33+i*17/5,'#b7b9a6');

  return {focus:{
    x:-48,y:11.5,zf:-9,W:105,
    heroBounds:[{min:[-89.3,0,-38.4],max:[-11.7,23.8,1.6]},
      {min:[-89.0,0,-3.5],max:[-81.2,22.6,2.3]}],
    target:{left:.08,right:.88,top:.12,bottom:.78}
  }};
}
