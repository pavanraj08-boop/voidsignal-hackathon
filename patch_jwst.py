"""
patch_jwst.py
Replaces the JWST section (lines 449–1140) in main.js with a new,
high-quality implementation including:
  - Parker Solar Probe with accurate 0.04 AU perihelion
  - Clear L1-L5 labels (color-coded sprites)
  - Proper Sun → Mercury → Venus → Earth + Moon scene
  - Cinematic lighting + 5000 coloured stars
  - No duplicate IIFE / no narration
"""

import re

SRC = 'main.js'

NEW_JWST = r'''/* ════════════════════════════════════════════════════════════════
   JWST OBSERVATORY — Sun · Mercury · Venus · Earth+Moon · L1-L5 · JWST · Parker
   Cinematic quality · No narration · Three.js r128
════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

/* ── State ─────────────────────────────────────────────────── */
var jwScene, jwCamera, jwRenderer;
var jwDragging=false, jwLastX=0, jwLastY=0;
var jwTheta=0.5, jwPhi=1.05, jwRadius=320;
var jwBuilt=false, jwAnimId;
var jwT=0;
var jwstMesh=null;
var jwCameraMode='system'; // 'system' | 'jwst' | 'top'

var AU=110; // 1 AU = 110 scene units

/* ── Planet data ────────────────────────────────────────────── */
var JW_PLANETS=[
  {name:'Mercury',r:0.387*AU,size:1.6,color:0x9A8878,emissive:0x1A0800,period:0.2408},
  {name:'Venus',  r:0.723*AU,size:3.2,color:0xE0C060,emissive:0x180800,period:0.6152,atm:0xFFCC55},
  {name:'Earth',  r:1.000*AU,size:4.2,color:0x2266CC,emissive:0x001133,period:1.0000,atm:0x44AAFF,isEarth:true},
];

/* ── Lagrange data ──────────────────────────────────────────── */
var JW_LAGRANGE=[
  {id:'L1',label:'L1 · SOHO, DSCOVR · 1.5M km sunward',  color:0x00FF9F,hex:'#00FF9F',mode:'along', frac:0.85},
  {id:'L2',label:'L2 · JWST, Euclid · 1.5M km anti-sun', color:0x8B5CF6,hex:'#8B5CF6',mode:'anti',  frac:1.15},
  {id:'L3',label:'L3 · Opposite Sun · Unstable',          color:0xFF6B35,hex:'#FF6B35',mode:'l3'},
  {id:'L4',label:'L4 · 60° Ahead · Trojan Asteroids',     color:0xFFC857,hex:'#FFC857',mode:'angular',angOff: Math.PI/3},
  {id:'L5',label:'L5 · 60° Behind · Trojan Asteroids',    color:0xFFC857,hex:'#FFC857',mode:'angular',angOff:-Math.PI/3},
];

var jwPlanetMeshes={};
var jwMoonMesh=null, jwMoonAngle=0;
var jwLGroups={};
var jwParkerGroup=null;
var jwParkerProbe=null;

/* ── Earth texture ──────────────────────────────────────────── */
function jwMakeEarthTex(){
  var c=document.createElement('canvas'); c.width=512; c.height=256;
  var x=c.getContext('2d');
  var g=x.createRadialGradient(256,128,20,256,128,256);
  g.addColorStop(0,'#1040A0'); g.addColorStop(1,'#050E22');
  x.fillStyle=g; x.fillRect(0,0,512,256);
  x.fillStyle='#1E5228';
  [[105,48,52,33],[118,62,38,26],[124,43,34,20],
   [238,86,27,38],[244,88,22,27],[128,53,40,34],
   [240,118,30,43],[288,46,52,36],[306,52,46,30],
   [338,38,43,29],[362,88,21,14],[256,243,256,10]].forEach(function(a){
     x.beginPath(); x.ellipse(a[0],a[1],a[2],a[3],0,0,Math.PI*2); x.fill();
   });
  x.fillStyle='rgba(200,230,255,.5)';
  x.fillRect(0,0,512,11); x.fillRect(0,245,512,11);
  x.fillStyle='rgba(255,255,255,.06)';
  for(var i=0;i<50;i++){
    x.beginPath(); x.ellipse(Math.random()*512,Math.random()*256,15+Math.random()*40,3+Math.random()*8,Math.random()*Math.PI,0,Math.PI*2); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ── Sun ────────────────────────────────────────────────────── */
function jwBuildSun(){
  var g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(13,48,24),
    new THREE.MeshPhongMaterial({color:0xFFEE00,emissive:0xFF8800,emissiveIntensity:1.8,shininess:0})));
  [[20,0.22],[28,0.12],[40,0.06]].forEach(function(a){
    g.add(new THREE.Mesh(new THREE.SphereGeometry(a[0],24,12),
      new THREE.MeshPhongMaterial({color:0xFF7700,emissive:0xFF5500,emissiveIntensity:0.5,
        transparent:true,opacity:a[1],side:THREE.BackSide,depthWrite:false})));
  });
  var sun_pt=new THREE.PointLight(0xFFDDAA,4.0,0,1.4);
  g.add(sun_pt);
  return g;
}

/* ── Earth ──────────────────────────────────────────────────── */
function jwBuildEarth(){
  var g=new THREE.Group();
  var tex=jwMakeEarthTex();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(4.2,48,24),
    new THREE.MeshPhongMaterial({map:tex,specular:0x224466,shininess:28})));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(4.7,24,12),
    new THREE.MeshPhongMaterial({color:0x3399FF,transparent:true,opacity:.14,side:THREE.BackSide,depthWrite:false})));
  return g;
}

/* ── Generic planet ─────────────────────────────────────────── */
function jwBuildPlanet(p){
  var g=new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(p.size,32,16),
    new THREE.MeshPhongMaterial({color:p.color,emissive:p.emissive||0,emissiveIntensity:0.2,shininess:18})));
  if(p.atm){
    g.add(new THREE.Mesh(new THREE.SphereGeometry(p.size*1.18,16,8),
      new THREE.MeshPhongMaterial({color:p.atm,transparent:true,opacity:.12,side:THREE.BackSide,depthWrite:false})));
  }
  return g;
}

/* ── Moon ───────────────────────────────────────────────────── */
function jwBuildMoon(){
  return new THREE.Mesh(new THREE.SphereGeometry(1.1,16,8),
    new THREE.MeshPhongMaterial({color:0xAAAAAA,emissive:0x111111,shininess:4}));
}

/* ── JWST spacecraft ────────────────────────────────────────── */
function jwBuildJWST(){
  var g=new THREE.Group();
  var d=1.05, hh=d*Math.sqrt(3)/2;
  var HEX18=[[d,0],[d/2,hh],[-d/2,hh],[-d,0],[-d/2,-hh],[d/2,-hh],
    [2*d,0],[1.5*d,hh],[d,2*hh],[0,2*hh],[-d,2*hh],[-1.5*d,hh],
    [-2*d,0],[-1.5*d,-hh],[-d,-2*hh],[0,-2*hh],[d,-2*hh],[1.5*d,-hh]];
  var goldMat=new THREE.MeshPhongMaterial({color:0xFFD700,emissive:0x442200,emissiveIntensity:0.8,shininess:120,flatShading:true});
  var hexGeo=new THREE.CylinderGeometry(0.52,0.52,0.06,6);
  HEX18.forEach(function(a){
    var m=new THREE.Mesh(hexGeo,goldMat);
    m.position.set(a[0],a[1],0.04); m.rotation.x=Math.PI/2; g.add(m);
  });
  var sm=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.08,12),goldMat);
  sm.rotation.x=Math.PI/2; sm.position.set(0,0,2.4); g.add(sm);
  [[0,1.35,0],[1.17,-0.67,0],[-1.17,-0.67,0]].forEach(function(b){
    var bg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(b[0],b[1],0),new THREE.Vector3(0,0,2.4)]);
    g.add(new THREE.Line(bg,new THREE.LineBasicMaterial({color:0x888888})));
  });
  var shMat=new THREE.MeshPhongMaterial({color:0xCCCCDD,specular:0x8888FF,shininess:80,side:THREE.DoubleSide,transparent:true,opacity:.9});
  for(var i=0;i<5;i++){
    var sw=8.8-i*.32, sh=5.2-i*.18;
    var shape=new THREE.Shape();
    shape.moveTo(0,sh/2); shape.lineTo(sw/2,0); shape.lineTo(0,-sh/2); shape.lineTo(-sw/2,0); shape.closePath();
    var m2=new THREE.Mesh(new THREE.ShapeGeometry(shape),shMat);
    m2.rotation.x=Math.PI/2; m2.position.set(0,-0.55-i*.17,0); g.add(m2);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4,1.4,1.9),
    new THREE.MeshPhongMaterial({color:0x404060,shininess:18})));
  g.position.set(0,-1.7,0);
  var solMat=new THREE.MeshPhongMaterial({color:0x112255,emissive:0x001133,shininess:40,side:THREE.DoubleSide});
  [-3,3].forEach(function(sx){
    var w=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.04,1.3),solMat);
    w.position.set(sx,-1.7,0); g.add(w);
  });
  return g;
}

/* ── Lagrange marker (torus + glow + label) ─────────────────── */
function jwBuildLMarker(lp){
  var g=new THREE.Group();
  g.userData.lpId=lp.id;

  var tmat=new THREE.MeshPhongMaterial({color:lp.color,emissive:lp.color,
    emissiveIntensity:1.0,transparent:true,opacity:0.7});
  var torus=new THREE.Mesh(new THREE.TorusGeometry(5,0.9,8,40),tmat);
  torus.rotation.x=Math.PI/2; torus.name='torus'; g.add(torus);

  g.add(new THREE.Mesh(new THREE.SphereGeometry(2,12,6),
    new THREE.MeshPhongMaterial({color:lp.color,emissive:lp.color,emissiveIntensity:3,transparent:true,opacity:0.6})));

  var breath=new THREE.Mesh(new THREE.SphereGeometry(10,12,6),
    new THREE.MeshPhongMaterial({color:lp.color,transparent:true,opacity:0.05,side:THREE.BackSide,depthWrite:false}));
  breath.name='breath'; g.add(breath);

  /* Canvas text label */
  var tc=document.createElement('canvas'); tc.width=560; tc.height=76;
  var tx=tc.getContext('2d');
  tx.fillStyle=lp.hex+'28'; tx.strokeStyle=lp.hex+'AA'; tx.lineWidth=2;
  tx.beginPath();
  tx.roundRect(2,2,556,72,10);
  tx.fill(); tx.stroke();
  tx.fillStyle='#FFFFFF'; tx.font='bold 30px monospace'; tx.textBaseline='middle';
  tx.fillText(lp.id, 14, 38);
  tx.fillStyle=lp.hex; tx.font='16px monospace';
  tx.fillText(lp.label.replace(lp.id+' · ',''), 72, 38);
  var tex=new THREE.CanvasTexture(tc);
  var sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.95,depthTest:false}));
  sprite.scale.set(46,6.5,1); sprite.position.set(14,8,0); g.add(sprite);

  return g;
}

/* ── Parker Solar Probe ─────────────────────────────────────── */
function jwBuildParker(){
  var g=new THREE.Group();

  /* Orbit ellipse — e ≈ 0.921, perihelion 0.046 AU */
  var peri=0.046*AU, aph=1.02*AU;
  var a=(peri+aph)/2, eccen=(aph-peri)/(aph+peri), b=a*Math.sqrt(1-eccen*eccen), fc=a*eccen;
  g.userData={peri:peri,aph:aph,a:a,e:eccen,b:b,fc:fc};

  var pts=[];
  for(var i=0;i<=360;i++){
    var ang=(i/360)*Math.PI*2;
    var ox=a*Math.cos(ang)-fc, oz=b*Math.sin(ang);
    var oy=Math.sin(3.4*Math.PI/180)*oz*0.3;
    pts.push(new THREE.Vector3(ox,oy,oz));
  }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0xFF4400,transparent:true,opacity:0.65})));

  /* Probe body */
  var probe=new THREE.Group(); probe.name='parker-probe';
  probe.add(new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,0.3,16),
    new THREE.MeshPhongMaterial({color:0xFF6600,emissive:0xFF3300,emissiveIntensity:0.8})));
  probe.add(new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,2.5,8),
    new THREE.MeshPhongMaterial({color:0x888888,shininess:30})));
  [-1,1].forEach(function(side){
    var wing=new THREE.Mesh(new THREE.BoxGeometry(0.05,2.5,1.0),
      new THREE.MeshPhongMaterial({color:0x0044AA,emissive:0x001133,shininess:60,side:THREE.DoubleSide}));
    wing.position.set(side*2.2,0,0); wing.rotation.z=side*0.25; probe.add(wing);
  });
  probe.scale.setScalar(0.5); g.add(probe);

  /* Heat glow light */
  var gl2=new THREE.PointLight(0xFF4400,2.5,15);
  gl2.name='parker-glow'; g.add(gl2);

  /* Label */
  var lc=document.createElement('canvas'); lc.width=500; lc.height=64;
  var lx=lc.getContext('2d');
  lx.fillStyle='rgba(255,68,0,0.18)'; lx.strokeStyle='#FF4400'; lx.lineWidth=1.5;
  lx.fillRect(0,0,500,64); lx.strokeRect(1,1,498,62);
  lx.fillStyle='#FF8844'; lx.font='bold 21px monospace'; lx.textBaseline='middle';
  lx.fillText('PARKER SOLAR PROBE  /  0.04 AU PERIHELION  /  e=0.921', 10, 32);
  var ltex=new THREE.CanvasTexture(lc);
  var lspr=new THREE.Sprite(new THREE.SpriteMaterial({map:ltex,transparent:true,opacity:.92,depthTest:false}));
  lspr.scale.set(42,5.3,1); lspr.position.set(0,5,0); g.add(lspr);

  return g;
}

/* Kepler mean anomaly → probe world position */
function jwParkerPos(g,t){
  var ud=g.userData;
  var M=(t*0.9)%(Math.PI*2); var E=M;
  for(var i=0;i<12;i++) E=E-(E-ud.e*Math.sin(E)-M)/(1-ud.e*Math.cos(E));
  var ox=ud.a*Math.cos(E)-ud.fc, oz=ud.b*Math.sin(E);
  var oy=Math.sin(3.4*Math.PI/180)*oz*0.3;
  return new THREE.Vector3(ox,oy,oz);
}

/* ── Camera helper ──────────────────────────────────────────── */
function jwUpdateCam(){
  if(jwCameraMode==='top'){
    jwCamera.position.set(0,jwRadius*1.4,0.001);
    jwCamera.lookAt(0,0,0); jwCamera.up.set(0,0,-1);
  } else if(jwCameraMode==='jwst' && jwLGroups['L2']){
    var wp=new THREE.Vector3(); jwLGroups['L2'].getWorldPosition(wp);
    jwCamera.position.set(wp.x+28,wp.y+14,wp.z+28);
    jwCamera.lookAt(wp); jwCamera.up.set(0,1,0);
  } else {
    jwCamera.position.set(
      jwRadius*Math.sin(jwPhi)*Math.cos(jwTheta),
      jwRadius*Math.cos(jwPhi),
      jwRadius*Math.sin(jwPhi)*Math.sin(jwTheta));
    jwCamera.lookAt(0,0,0); jwCamera.up.set(0,1,0);
  }
}

/* ── Main Build ─────────────────────────────────────────────── */
function jwBuildScene(){
  if(jwBuilt) return; jwBuilt=true;

  var cv=document.getElementById('jwst-cv'); if(!cv) return;
  var parent=cv.parentElement;
  var W=parent.offsetWidth||1200, H=Math.max(680,Math.round(W*0.56));
  cv.width=W; cv.height=H;

  jwScene=new THREE.Scene();
  jwCamera=new THREE.PerspectiveCamera(44,W/H,0.5,10000);
  jwRenderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  jwRenderer.setSize(W,H); jwRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  jwRenderer.setClearColor(0x010208);

  /* Lighting */
  jwScene.add(new THREE.AmbientLight(0x0D1525,0.7));
  var sunPt=new THREE.PointLight(0xFFEECC,5,0,1.6); jwScene.add(sunPt);
  var fillL=new THREE.DirectionalLight(0x1122AA,0.3); fillL.position.set(-1,1,-1); jwScene.add(fillL);

  /* 5000 coloured stars */
  var sp=new Float32Array(5000*3), sc=new Float32Array(5000*3);
  for(var i=0;i<5000;i++){
    var th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=2500+Math.random()*1500;
    sp[i*3]=r*Math.sin(ph)*Math.cos(th); sp[i*3+1]=r*Math.cos(ph); sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    var t=Math.random();
    if(t<.05){sc[i*3]=1;sc[i*3+1]=.65;sc[i*3+2]=.25;}
    else if(t<.11){sc[i*3]=.75;sc[i*3+1]=.85;sc[i*3+2]=1;}
    else{sc[i*3]=.96;sc[i*3+1]=.96;sc[i*3+2]=.98;}
  }
  var sg=new THREE.BufferGeometry();
  sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  jwScene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:1.1,vertexColors:true,sizeAttenuation:true})));

  /* Sun */
  var sunG=jwBuildSun(); jwScene.add(sunG); jwPlanetMeshes['Sun']=sunG;

  /* Orbital rings */
  [0.387,0.723,1.0].forEach(function(rAU){
    var pts2=[];
    for(var j=0;j<=256;j++){var a=(j/256)*Math.PI*2; pts2.push(new THREE.Vector3(Math.cos(a)*rAU*AU,0,Math.sin(a)*rAU*AU));}
    jwScene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2),
      new THREE.LineBasicMaterial({color:0x1A2A3A,transparent:true,opacity:.38})));
  });

  /* Planets */
  JW_PLANETS.forEach(function(p){
    var mesh=p.isEarth ? jwBuildEarth() : jwBuildPlanet(p);
    var ang=Math.random()*Math.PI*2;
    mesh.position.set(Math.cos(ang)*p.r,0,Math.sin(ang)*p.r);
    mesh.userData.startAngle=ang;
    jwPlanetMeshes[p.name]=mesh; jwScene.add(mesh);
  });

  /* Moon */
  jwMoonMesh=jwBuildMoon(); jwScene.add(jwMoonMesh);

  /* Lagrange markers */
  JW_LAGRANGE.forEach(function(lp){
    var marker=jwBuildLMarker(lp);
    jwLGroups[lp.id]=marker; jwScene.add(marker);
  });

  /* Triangle lines L4/L5 */
  var triMat=new THREE.LineBasicMaterial({color:0xFFC857,transparent:true,opacity:0.15});
  var triLines=[new THREE.Line(new THREE.BufferGeometry(),triMat),
                new THREE.Line(new THREE.BufferGeometry(),triMat)];
  triLines.forEach(function(l){jwScene.add(l);});

  /* JWST at L2 on Lissajous */
  jwstMesh=jwBuildJWST(); jwstMesh.scale.setScalar(1.9);
  jwLGroups['L2'].add(jwstMesh); jwstMesh.position.set(4,2,4);
  var haloPts=[];
  for(var j=0;j<=240;j++){var at=(j/240)*Math.PI*2; haloPts.push(new THREE.Vector3(Math.sin(at*2)*9,Math.sin(at)*16,Math.cos(at)*20));}
  jwLGroups['L2'].add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(haloPts),
    new THREE.LineBasicMaterial({color:0x8B5CF6,transparent:true,opacity:.5})));

  /* Parker Solar Probe */
  jwParkerGroup=jwBuildParker(); jwScene.add(jwParkerGroup);
  jwParkerProbe=jwParkerGroup.getObjectByName('parker-probe');

  /* Controls */
  cv.addEventListener('mousedown',function(e){jwDragging=true;jwLastX=e.clientX;jwLastY=e.clientY;});
  window.addEventListener('mouseup',function(){jwDragging=false;});
  cv.addEventListener('mousemove',function(e){
    if(!jwDragging)return;
    jwTheta-=(e.clientX-jwLastX)*0.005;
    jwPhi=Math.max(0.05,Math.min(Math.PI-0.05,jwPhi-(e.clientY-jwLastY)*0.005));
    jwLastX=e.clientX;jwLastY=e.clientY;jwUpdateCam();
  });
  cv.addEventListener('wheel',function(e){
    jwRadius=Math.max(30,Math.min(700,jwRadius*(1+e.deltaY*.001)));
    jwUpdateCam();e.preventDefault();
  },{passive:false});
  cv.addEventListener('touchstart',function(e){var t=e.touches[0];jwDragging=true;jwLastX=t.clientX;jwLastY=t.clientY;},{passive:true});
  cv.addEventListener('touchmove',function(e){
    if(!jwDragging)return;var t=e.touches[0];
    jwTheta-=(t.clientX-jwLastX)*.005;jwPhi=Math.max(.05,Math.min(Math.PI-.05,jwPhi-(t.clientY-jwLastY)*.005));
    jwLastX=t.clientX;jwLastY=t.clientY;jwUpdateCam();
  },{passive:true});

  /* Cam buttons */
  document.getElementById('jwst-cam-system')&&document.getElementById('jwst-cam-system').addEventListener('click',function(){
    jwCameraMode='system';jwRadius=320;jwPhi=1.05;jwTheta=0.5;jwUpdateCam();});
  document.getElementById('jwst-cam-follow')&&document.getElementById('jwst-cam-follow').addEventListener('click',function(){
    jwCameraMode='jwst';jwUpdateCam();});
  document.getElementById('jwst-cam-overview')&&document.getElementById('jwst-cam-overview').addEventListener('click',function(){
    jwCameraMode='top';jwRadius=380;jwUpdateCam();});

  /* Resize */
  window.addEventListener('resize',function(){
    var W2=parent.offsetWidth||1200,H2=Math.max(680,Math.round(W2*.56));
    cv.width=W2;cv.height=H2;jwRenderer.setSize(W2,H2);
    jwCamera.aspect=W2/H2;jwCamera.updateProjectionMatrix();
  });

  jwUpdateCam();

  /* Animation loop */
  function loop(){
    jwT+=0.004;
    if(jwPlanetMeshes['Sun']) jwPlanetMeshes['Sun'].rotation.y+=0.0015;

    JW_PLANETS.forEach(function(p){
      var mesh=jwPlanetMeshes[p.name]; if(!mesh)return;
      var ang=(jwT*0.18/p.period)+(mesh.userData.startAngle||0);
      mesh.position.set(Math.cos(ang)*p.r,0,Math.sin(ang)*p.r);
      mesh.rotation.y+=0.004;
    });

    if(jwMoonMesh&&jwPlanetMeshes['Earth']){
      jwMoonAngle+=0.022;
      var ep2=jwPlanetMeshes['Earth'].position;
      jwMoonMesh.position.set(ep2.x+Math.cos(jwMoonAngle)*9.5,ep2.y+Math.sin(jwMoonAngle*0.27)*0.8,ep2.z+Math.sin(jwMoonAngle)*9.5);
    }

    var ep=jwPlanetMeshes['Earth']?jwPlanetMeshes['Earth'].position:new THREE.Vector3(AU,0,0);
    var ea=Math.atan2(ep.z,ep.x);

    JW_LAGRANGE.forEach(function(lp){
      var lg=jwLGroups[lp.id]; if(!lg)return;
      var nx=0,nz=0;
      if(lp.mode==='along'){nx=Math.cos(ea)*lp.frac*AU;nz=Math.sin(ea)*lp.frac*AU;}
      else if(lp.mode==='anti'){nx=Math.cos(ea+Math.PI)*lp.frac*AU;nz=Math.sin(ea+Math.PI)*lp.frac*AU;}
      else if(lp.mode==='l3'){nx=Math.cos(ea+Math.PI)*AU;nz=Math.sin(ea+Math.PI)*AU;}
      else if(lp.mode==='angular'){var aa=ea+lp.angOff;nx=Math.cos(aa)*AU;nz=Math.sin(aa)*AU;}
      lg.position.set(nx,0,nz);
      var torus=lg.children.filter(function(c){return c.name==='torus';})[0];
      if(torus){torus.rotation.z+=0.008;torus.material.opacity=.5+Math.sin(jwT*2)*.2;}
      var breath=lg.children.filter(function(c){return c.name==='breath';})[0];
      if(breath){var s=1+Math.sin(jwT*1.4)*.28;breath.scale.setScalar(s);}
    });

    /* Triangle guides */
    if(jwLGroups['L4']&&jwLGroups['L5']){
      var sv=new THREE.Vector3(0,0,0), ev=new THREE.Vector3(ep.x,0,ep.z);
      var l4v=jwLGroups['L4'].position.clone();l4v.y=0;
      var l5v=jwLGroups['L5'].position.clone();l5v.y=0;
      if(triLines[0].geometry.setFromPoints){triLines[0].geometry.setFromPoints([sv,ev,l4v,sv]);}
      if(triLines[1].geometry.setFromPoints){triLines[1].geometry.setFromPoints([sv,ev,l5v,sv]);}
    }

    /* JWST Lissajous */
    if(jwstMesh){
      jwstMesh.position.set(Math.sin(jwT*1.7)*9,Math.sin(jwT)*16,Math.cos(jwT)*20);
      var l2wp=new THREE.Vector3(); jwLGroups['L2'].getWorldPosition(l2wp);
      var sunDir2=new THREE.Vector3(0,0,0).sub(l2wp).normalize();
      jwstMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),sunDir2);
    }

    /* Parker position */
    if(jwParkerGroup&&jwParkerProbe){
      var ppos=jwParkerPos(jwParkerGroup,jwT);
      jwParkerProbe.position.copy(ppos);
      jwParkerProbe.lookAt(0,0,0);
      var glowLight=jwParkerGroup.children.filter(function(c){return c.isLight;})[0];
      if(glowLight){
        glowLight.position.copy(ppos);
        glowLight.intensity=Math.max(0.5,8*(1-ppos.length()/(1.02*AU)));
      }
    }

    if(jwCameraMode==='jwst')jwUpdateCam();
    jwRenderer.render(jwScene,jwCamera);
    jwAnimId=requestAnimationFrame(loop);
  }
  loop();
}

/* ── Lazy load ──────────────────────────────────────────────── */
(function(){
  var el=document.getElementById('jwst-s'); if(!el)return;
  new IntersectionObserver(function(entries){
    if(entries[0].isIntersecting&&!jwBuilt){
      if(typeof THREE!=='undefined')jwBuildScene();
      else{var ti=setInterval(function(){if(typeof THREE!=='undefined'){clearInterval(ti);jwBuildScene();}},150);}
    }
  },{threshold:0.05}).observe(el);
})();

})(); // end JWST Observatory IIFE
'''

# ── Read file ───────────────────────────────────────────────────────
with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines(keepends=True)
total = len(lines)
print(f'Total lines: {total}')

# ── Find start marker (new JWST IIFE comment at line ~449) ──────────
start_marker = '/* ════════════════════════════════════════════════════════════════\r\n   JWST OBSERVATORY — Full Solar System'
# Try both \r\n and \n
start_idx = content.find('/* ════════════════════════════════════════════════════════════════\r\n   JWST OBSERVATORY')
if start_idx == -1:
    start_idx = content.find('/* ════════════════════════════════════════════════════════════════\n   JWST OBSERVATORY')

print(f'JWST start byte index: {start_idx}')

# ── Find end marker: the line after 'end JWST IIFE' ─────────────────
end_marker = '})(); // end JWST IIFE'
end_idx = content.find(end_marker, start_idx if start_idx != -1 else 0)
print(f'JWST end marker byte index: {end_idx}')

if start_idx == -1 or end_idx == -1:
    # fallback: use line numbers 449-1140
    print('Markers not found, using line-number fallback (lines 449-1140)')
    before = ''.join(lines[:448])          # lines 1-448 (0-indexed 0-447)
    after  = ''.join(lines[1140:])         # lines 1141+ (0-indexed 1140+)
    new_content = before + NEW_JWST + '\n' + after
else:
    end_pos = end_idx + len(end_marker)
    before = content[:start_idx]
    after  = content[end_pos:]
    new_content = before + NEW_JWST + '\n' + after

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(new_content)

new_lines = new_content.count('\n')
print(f'Done! New line count: {new_lines}')
print('JWST module replaced successfully.')
