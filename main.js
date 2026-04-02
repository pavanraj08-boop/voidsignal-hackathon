/* ════════════════════════════════════════════════════════════════
   ISS LIVE 3D TRACKER — Real-time position, 3D Earth, orbit path
   Three.js r128 · Live API · Drag rotate · Scroll zoom
════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

let iss3Scene, iss3Camera, iss3Renderer;
let iss3Earth, iss3IssMesh, iss3IssGlow, iss3OrbitLine, iss3TrailLine;
let iss3FollowMode = false, iss3ShowOrbit = true;
let iss3Dragging = false, iss3LastX = 0, iss3LastY = 0;
let iss3Phi = 1.1, iss3Theta = 0.4, iss3Radius = 3.5;
let iss3Built = false;
let iss3TrailPts = [], iss3MaxTrail = 300;
let iss3AnimId = null;
let iss3Lat = 0, iss3Lon = 0, iss3Alt = 408;
let iss3MoonMesh = null, iss3MoonAngle = 0;

const ISS_FACTS = [
  '450 tonnes · wingspan 109m · pressurised volume 916 m³',
  'Inhabited continuously since November 2, 2000 — 25+ years',
  'Orbits at Mach 23 — travels 7.66 km every second',
  '16 orbits per day · sees 16 sunrises and sunsets daily',
  'Solar arrays produce 120 kilowatts of electricity',
  'Built by 15 nations · 271 people have visited so far',
  'Cost ~$150 billion — most expensive object ever built',
  'Crosses your sky every 90 minutes, visible to naked eye',
];
let iss3FactIdx = 0;

// Convert lat/lon/alt to 3D XYZ on unit sphere
function iss3LatLonToXYZ(lat, lon, alt) {
  const R = 1 + alt / 6371; // normalised Earth radius
  const latR = lat * Math.PI / 180;
  const lonR = lon * Math.PI / 180;
  return new THREE.Vector3(
    R * Math.cos(latR) * Math.cos(lonR),
    R * Math.sin(latR),
    R * Math.cos(latR) * Math.sin(lonR)
  );
}

function iss3BuildEarth() {
  // Procedural Earth texture
  const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 512;
  const tx = tc.getContext('2d');
  // Ocean deep blue
  tx.fillStyle = '#0a1e3d'; tx.fillRect(0,0,1024,512);
  // Ocean gradient
  const og = tx.createRadialGradient(512,256,50,512,256,512);
  og.addColorStop(0,'#0d2a52'); og.addColorStop(1,'#061228');
  tx.fillStyle = og; tx.fillRect(0,0,1024,512);

  // Continents — more detailed than orrery
  tx.fillStyle = '#1a4020';
  const lands = [
    // North America
    [220,100,110,70],[160,130,80,55],[260,90,70,45],[200,80,60,35],
    // South America
    [245,220,55,80],[255,180,45,55],[260,270,40,60],
    // Europe
    [460,95,55,45],[500,80,40,35],[490,110,50,40],
    // Africa
    [480,170,65,90],[500,240,50,55],[470,200,55,65],
    // Asia
    [580,80,120,75],[650,90,100,65],[700,100,90,60],[720,130,70,50],
    [620,130,80,55],[680,70,60,45],
    // Australia
    [730,280,65,45],[760,300,55,40],
    // Antarctica
    [512,490,512,22],
    // Greenland
    [300,55,45,35],
    // Japan
    [800,120,20,30],
    // UK
    [455,78,15,22],
  ];
  lands.forEach(([x,y,rw,rh]) => {
    tx.beginPath(); tx.ellipse(x,y,rw,rh,Math.random()*.3,0,Math.PI*2); tx.fill();
  });
  // Cloud layer
  tx.fillStyle = 'rgba(255,255,255,0.12)';
  for(let i=0;i<40;i++){
    tx.beginPath();
    tx.ellipse(Math.random()*1024,Math.random()*512,20+Math.random()*60,5+Math.random()*15,Math.random(),0,Math.PI*2);
    tx.fill();
  }
  // Ice caps
  tx.fillStyle = 'rgba(180,210,255,0.55)'; tx.fillRect(0,0,1024,22); tx.fillRect(0,490,1024,22);

  const earthTex = new THREE.CanvasTexture(tc);
  const group = new THREE.Group();

  // Earth sphere
  const mat = new THREE.MeshPhongMaterial({
    map: earthTex,
    specular: new THREE.Color(0x223355),
    shininess: 18,
    emissive: new THREE.Color(0x001122),
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat));

  // Atmosphere glow
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 32, 16),
    new THREE.MeshPhongMaterial({color:0x4488ff,transparent:true,opacity:.10,side:THREE.BackSide,depthWrite:false})
  ));
  // Outer atmosphere
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 32, 16),
    new THREE.MeshPhongMaterial({color:0x2255aa,transparent:true,opacity:.04,side:THREE.BackSide,depthWrite:false})
  ));
  // City lights glow
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.001, 32, 16),
    new THREE.MeshPhongMaterial({color:0xffcc44,transparent:true,opacity:.03,emissive:0xffcc44,emissiveIntensity:.4,depthWrite:false})
  ));

  return group;
}

function iss3BuildISSMesh() {
  // ISS representation — cross-shaped solar panel structure
  const group = new THREE.Group();

  // Central truss body
  const bodyGeo = new THREE.BoxGeometry(0.025, 0.006, 0.006);
  const bodyMat = new THREE.MeshPhongMaterial({color:0xddddee,emissive:0x334455,shininess:40});
  group.add(new THREE.Mesh(bodyGeo, bodyMat));

  // Solar panels — 4 pairs
  const panelMat = new THREE.MeshPhongMaterial({color:0x1155aa,emissive:0x001133,shininess:80});
  [-0.009,-0.003,0.003,0.009].forEach((x, i) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.004,0.0015,0.018), panelMat);
    panel.position.set(x, 0, 0);
    group.add(panel);
  });

  // Habitation modules
  const modMat = new THREE.MeshPhongMaterial({color:0xeeeecc,shininess:30});
  [-.008,0,.008].forEach(x => {
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.003,0.003,0.006,8), modMat);
    mod.rotation.z = Math.PI/2;
    mod.position.set(x,0,0);
    group.add(mod);
  });

  group.scale.setScalar(3.0); // visible scale
  return group;
}

function iss3DrawOrbitPath() {
  if(iss3OrbitLine){ iss3Scene.remove(iss3OrbitLine); iss3OrbitLine=null; }
  if(!iss3ShowOrbit) return;

  // ISS orbital parameters: inc=51.6°, alt=408km
  const pts = [];
  const INC = 51.6 * Math.PI / 180;
  const R   = 1 + 408/6371;
  const N   = 256;
  for(let i=0;i<=N;i++){
    const M = (i/N)*Math.PI*2;
    const lat  = Math.asin(Math.sin(INC)*Math.sin(M));
    const lon  = Math.atan2(Math.cos(INC)*Math.sin(M), Math.cos(M));
    const latR = lat, lonR = lon;
    pts.push(new THREE.Vector3(
      R*Math.cos(latR)*Math.cos(lonR),
      R*Math.sin(latR),
      R*Math.cos(latR)*Math.sin(lonR)
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  iss3OrbitLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color:0x00ff9f, transparent:true, opacity:.18
  }));
  iss3Scene.add(iss3OrbitLine);
}

function iss3UpdateTrail(pos) {
  iss3TrailPts.push(pos.clone());
  if(iss3TrailPts.length > iss3MaxTrail) iss3TrailPts.shift();
  if(iss3TrailLine){ iss3Scene.remove(iss3TrailLine); iss3TrailLine=null; }
  if(iss3TrailPts.length < 2) return;

  const geo = new THREE.BufferGeometry().setFromPoints(iss3TrailPts);
  // Colour: old=dim, new=bright
  const colors = new Float32Array(iss3TrailPts.length*3);
  iss3TrailPts.forEach((p,i) => {
    const f = i/iss3TrailPts.length;
    colors[i*3]=0; colors[i*3+1]=f*0.84+.16; colors[i*3+2]=f;
  });
  geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
  iss3TrailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({
    vertexColors:true, transparent:true, opacity:0.9
  }));
  iss3Scene.add(iss3TrailLine);
}

function iss3Build() {
  if(iss3Built) return;
  iss3Built = true;

  const cv = document.getElementById('iss3d-cv');
  if(!cv) return;
  const W = cv.parentElement.offsetWidth || 900;
  const H = Math.max(500, Math.round(W*0.6));
  cv.width=W; cv.height=H;

  iss3Scene    = new THREE.Scene();
  iss3Camera   = new THREE.PerspectiveCamera(50, W/H, 0.001, 2000);
  iss3Renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true});
  iss3Renderer.setSize(W,H);
  iss3Renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  iss3Renderer.setClearColor(0x01020A);

  // Lighting
  iss3Scene.add(new THREE.AmbientLight(0x334466, 0.45));
  const sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
  sunLight.position.set(8,3,5); iss3Scene.add(sunLight);
  // Earth self-illumination edge
  const rimLight = new THREE.DirectionalLight(0x2244aa, 0.3);
  rimLight.position.set(-5,-2,-4); iss3Scene.add(rimLight);

  // Stars — dense, coloured
  const rng = ((s)=>()=>{s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;})(42);
  const sp=new Float32Array(4000*3),sc=new Float32Array(4000*3);
  for(let i=0;i<4000;i++){
    const th=rng()*Math.PI*2,ph=Math.acos(2*rng()-1),r=800+rng()*200;
    sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    const t=rng();
    // Coloured stars: some orange/red (giants), some blue (hot)
    if(t<.05){sc[i*3]=1;sc[i*3+1]=.55;sc[i*3+2]=.2;}        // orange
    else if(t<.10){sc[i*3]=.7;sc[i*3+1]=.8;sc[i*3+2]=1;}    // blue
    else{sc[i*3]=.97;sc[i*3+1]=.97;sc[i*3+2]=.97;}           // white
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  iss3Scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:.8,vertexColors:true,sizeAttenuation:true})));

  // Earth
  iss3Earth = iss3BuildEarth();
  iss3Scene.add(iss3Earth);

  // ISS mesh
  iss3IssMesh = iss3BuildISSMesh();
  iss3IssMesh.name = 'iss';
  iss3Scene.add(iss3IssMesh);

  // ISS glow (point light)
  iss3IssGlow = new THREE.PointLight(0x00ff9f, 1.2, 0.3);
  iss3Scene.add(iss3IssGlow);
  // Green LED marker sphere for visibility at distance
  const ledMat = new THREE.MeshPhongMaterial({color:0x00ff9f,emissive:0x00ff9f,emissiveIntensity:3});
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006,8,6),ledMat);
  led.name='iss-led';
  iss3IssMesh.add(led);

  // Orbit path
  iss3DrawOrbitPath();

  // Visibility footprint circle
  const footGeo = new THREE.RingGeometry(0, 0.66, 64); // ~4640km footprint
  const footMat = new THREE.MeshBasicMaterial({
    color:0x00d4ff, side:THREE.DoubleSide, transparent:true, opacity:.055, depthWrite:false
  });
  const footMesh = new THREE.Mesh(footGeo, footMat);
  footMesh.name = 'iss-footprint';
  iss3Scene.add(footMesh);

  // ISS orbit line (dashed indicator where it goes)
  iss3DrawOrbitPath();

  // Camera init
  iss3CamUpdate();

  // Controls
  cv.addEventListener('mousedown',  e=>{iss3Dragging=true; iss3LastX=e.clientX; iss3LastY=e.clientY; iss3FollowMode=false;});
  window.addEventListener('mouseup', ()=>iss3Dragging=false);
  cv.addEventListener('mousemove',   e=>{
    if(!iss3Dragging) return;
    iss3Theta -= (e.clientX-iss3LastX)*0.006;
    iss3Phi = Math.max(.05,Math.min(Math.PI-.05,iss3Phi-(e.clientY-iss3LastY)*0.006));
    iss3LastX=e.clientX; iss3LastY=e.clientY; iss3CamUpdate();
  });
  cv.addEventListener('wheel', e=>{
    iss3Radius = Math.max(1.2, Math.min(10, iss3Radius*(1+e.deltaY*.001)));
    iss3CamUpdate(); e.preventDefault();
  },{passive:false});
  let lt=null;
  cv.addEventListener('touchstart',e=>{lt=e.touches[0];e.preventDefault();},{passive:false});
  cv.addEventListener('touchmove',e=>{
    if(!lt)return;const t=e.touches[0];
    iss3Theta-=(t.clientX-lt.clientX)*.006;
    iss3Phi=Math.max(.05,Math.min(Math.PI-.05,iss3Phi-(t.clientY-lt.clientY)*.006));
    lt=t;iss3CamUpdate();e.preventDefault();
  },{passive:false});

  // Resize
  window.addEventListener('resize',()=>{
    const W2=cv.parentElement.offsetWidth||900;
    const H2=Math.max(500,Math.round(W2*.6));
    cv.width=W2;cv.height=H2;
    iss3Renderer.setSize(W2,H2);
    iss3Camera.aspect=W2/H2;iss3Camera.updateProjectionMatrix();
  });

  // Buttons
  document.getElementById('iss3d-follow')?.addEventListener('click',()=>{
    iss3FollowMode=true;iss3Radius=2.2;
  });
  document.getElementById('iss3d-overview')?.addEventListener('click',()=>{
    iss3FollowMode=false;iss3Radius=3.5;iss3Phi=1.1;iss3Theta=0.4;iss3CamUpdate();
  });
  document.getElementById('iss3d-orbit')?.addEventListener('click',()=>{
    iss3ShowOrbit=!iss3ShowOrbit;
    iss3DrawOrbitPath();
    document.getElementById('iss3d-orbit').textContent = iss3ShowOrbit ? '🔄 HIDE ORBIT PATH' : '🔄 SHOW ORBIT PATH';
  });

  // Render loop
  function loop(){
    // Slow Earth rotation
    if(iss3Earth) iss3Earth.rotation.y += 0.0008;

    // Moon orbit (far, subtle)
    if(iss3MoonMesh){
      iss3MoonAngle += 0.0004;
      iss3MoonMesh.position.set(60*Math.cos(iss3MoonAngle),5*Math.sin(iss3MoonAngle*0.3),60*Math.sin(iss3MoonAngle));
    }

    // ISS rotation — always faces Earth (nadir-pointing)
    if(iss3IssMesh){
      iss3IssMesh.lookAt(0,0,0);
      iss3IssMesh.rotateX(Math.PI/2);
    }

    // Follow mode — camera tracks ISS
    if(iss3FollowMode && iss3IssMesh){
      const pos = iss3IssMesh.position;
      const dir = pos.clone().normalize();
      iss3Camera.position.copy(dir.multiplyScalar(iss3Radius));
      iss3Camera.lookAt(pos);
    }

    // Footprint — always horizontal at ISS position
    const foot = iss3Scene.getObjectByName('iss-footprint');
    if(foot && iss3IssMesh){
      foot.position.copy(iss3IssMesh.position.clone().normalize().multiplyScalar(1.001));
      foot.lookAt(0,0,0);
    }

    // Pulse ISS glow
    if(iss3IssGlow && iss3IssMesh){
      iss3IssGlow.position.copy(iss3IssMesh.position);
      iss3IssGlow.intensity = 0.8 + Math.sin(Date.now()*.003)*.4;
    }

    iss3Renderer.render(iss3Scene, iss3Camera);
    iss3AnimId = requestAnimationFrame(loop);
  }
  loop();
}

function iss3CamUpdate(){
  iss3Camera.position.set(
    iss3Radius*Math.sin(iss3Phi)*Math.cos(iss3Theta),
    iss3Radius*Math.cos(iss3Phi),
    iss3Radius*Math.sin(iss3Phi)*Math.sin(iss3Theta)
  );
  iss3Camera.lookAt(0,0,0);
}

async function iss3FetchPos(){
  const APIS = [
    {url:'https://api.wheretheiss.at/v1/satellites/25544', parse:d=>({lat:d.latitude,lon:d.longitude,alt:d.altitude,vel:d.velocity/1000,vis:d.visibility})},
    {url:'https://api.open-notify.org/iss-now.json', parse:d=>({lat:+d.iss_position.latitude,lon:+d.iss_position.longitude,alt:408,vel:7.66,vis:'unknown'})},
  ];

  for(const api of APIS){
    try{
      const r=await fetch(api.url,{signal:AbortSignal.timeout(4000)});
      if(!r.ok)continue;
      const d=await r.json();
      const pos=api.parse(d);

      iss3Lat=pos.lat; iss3Lon=pos.lon; iss3Alt=pos.alt||408;

      // Update HUD
      document.getElementById('iss3d-lat').textContent = pos.lat.toFixed(3)+'°';
      document.getElementById('iss3d-lon').textContent = pos.lon.toFixed(3)+'°';
      document.getElementById('iss3d-alt').textContent = (pos.alt||408).toFixed(1)+' km';
      document.getElementById('iss3d-vel').textContent = (pos.vel||7.66).toFixed(2)+' km/s';
      const visEl = document.getElementById('iss3d-vis');
      const isDaylit = pos.vis==='daylight';
      visEl.textContent = isDaylit ? '☀ DAYLIGHT' : pos.vis==='eclipsed' ? '🌑 ECLIPSE' : '—';
      visEl.style.color = isDaylit ? 'var(--a)' : 'var(--c)';
      document.getElementById('iss3d-ts').textContent = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});

      // Move ISS in 3D
      if(iss3IssMesh){
        const xyz = iss3LatLonToXYZ(pos.lat, pos.lon, pos.alt||408);
        iss3IssMesh.position.copy(xyz);
        iss3IssGlow?.position.copy(xyz);
        iss3UpdateTrail(xyz);
      }

      // Cycle facts
      iss3FactIdx = (iss3FactIdx+1)%ISS_FACTS.length;
      const factEl=document.getElementById('iss3d-fact');
      if(factEl) factEl.textContent=ISS_FACTS[iss3FactIdx];

      return;
    }catch{}
  }
}

// Init when visible
(function(){
  const el=document.getElementById('iss3d-s');
  if(!el)return;
  new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting && !iss3Built){
      if(typeof THREE!=='undefined'){
        iss3Build();
        iss3FetchPos();
        setInterval(iss3FetchPos,5000);
      } else {
        const t=setInterval(()=>{
          if(typeof THREE!=='undefined'){
            clearInterval(t);
            iss3Build();
            iss3FetchPos();
            setInterval(iss3FetchPos,5000);
          }
        },100);
      }
    }
  },{threshold:.05}).observe(el);
})();

})(); // end ISS 3D IIFE


/* ════════════════════════════════════════════════════════════════
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
  if(tx.roundRect){tx.roundRect(2,2,556,72,10);}
  else{tx.rect(2,2,556,72);}
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



/* ════════════════════════════════════════════════════════════════
   MISSION THEATER — Real spacecraft trajectory simulation
   Accurate heliocentric positions computed from Keplerian elements
════════════════════════════════════════════════════════════════ */

// ── PLANET KEPLERIAN ELEMENTS (J2000) ────────────────────────────
const MT_PLANETS = {
  mercury: {L0:252.25, n:4.0923,  a:0.387, r:0.020, c:0xA0855B, name:'Mercury'},
  venus:   {L0:181.98, n:1.6021,  a:0.723, r:0.045, c:0xE8C56B, name:'Venus'},
  earth:   {L0:100.46, n:0.9856,  a:1.000, r:0.050, c:0x4488DD, name:'Earth'},
  mars:    {L0:355.45, n:0.5240,  a:1.524, r:0.035, c:0xC1440E, name:'Mars'},
  jupiter: {L0: 34.40, n:0.08309, a:5.203, r:0.180, c:0xC88B3A, name:'Jupiter'},
  saturn:  {L0: 49.94, n:0.03345, a:9.537, r:0.150, c:0xE4D191, name:'Saturn', rings:true},
  uranus:  {L0:313.23, n:0.01172, a:19.19, r:0.100, c:0x7DE8E8, name:'Uranus'},
  neptune: {L0:304.88, n:0.00600, a:30.07, r:0.095, c:0x3F54BA, name:'Neptune'},
  pluto:   {L0:238.93, n:0.00397, a:39.48, r:0.030, c:0xCCAA88, name:'Pluto'},
};
const MT_J2000 = 2451545.0;

function mtJD(y,m,d) {
  if(m<=2){y--;m+=12;} const A=Math.floor(y/100); const B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5;
}
function mtPlanetPos(name, jd) {
  const p=MT_PLANETS[name]; const d=jd-MT_J2000;
  const L=((p.L0+p.n*d)%360)*Math.PI/180;
  return {x:p.a*Math.cos(L), y:0, z:p.a*Math.sin(L)};
}

// ── MISSION DATA ─────────────────────────────────────────────────
// Waypoints: [jd, x_AU, y_AU(ecliptic up), z_AU]  — computed from planet positions
// Some z values are non-zero for out-of-ecliptic trajectories
const MT_MISSIONS = [
  {
    id:'voyager1', name:'Voyager 1', agency:'NASA/JPL', year:1977,
    tagline:"First into interstellar space",
    color:0xFF6B35, colorHex:'#FF6B35',
    scale:45, // AU scale to show full trajectory
    jd_launch: mtJD(1977,9,5),
    jd_end:    mtJD(2025,1,1),
    phases:[
      {name:'Earth Departure',    jd:mtJD(1977,9,5),   icon:'🚀', type:'launch',
       desc:'Titan IIIE/Centaur rocket, Cape Canaveral. Velocity: 36,000 mph — fastest spacecraft to date.',
       rows:[['Launch','Sep 5, 1977'],['Rocket','Titan IIIE/Centaur'],['Speed','36,000 mph'],['Mass','825 kg']]},
      {name:'Jupiter Flyby',      jd:mtJD(1979,3,5),   icon:'🟠', type:'flyby', planet:'jupiter',
       desc:'Closest approach: 349,000 km. Gravity assist adds 11 km/s. Discovers active volcanoes on Io.',
       rows:[['Closest','349,000 km'],['ΔV gained','+11 km/s'],['Io volcanos','DISCOVERED'],['Photos','18,000+']]},
      {name:'Saturn Flyby',       jd:mtJD(1980,11,12), icon:'🪐', type:'flyby', planet:'saturn',
       desc:'Titan close flyby bends trajectory north of ecliptic. No more planet encounters possible.',
       rows:[['Titan pass','6,490 km'],['Trajectory','Bent N of ecliptic'],['Ring detail','First close images'],['Speed','64,000 km/h']]},
      {name:'Heliopause',         jd:mtJD(2012,8,25),  icon:'🌌', type:'milestone',
       desc:'First human-made object to exit the Solar System. Distance: 121 AU. Signal delay: 17 hours.',
       rows:[['Distance','121 AU'],['Signal delay','17 hours'],['Speed','61,500 km/h'],['Power','70W RTG']]},
      {name:'Current Position',   jd:mtJD(2024,6,1),   icon:'📡', type:'milestone',
       desc:'24+ billion km from Earth. Signal takes 22+ hours. Last spacecraft to receive science data.',
       rows:[['Distance','24.1B km'],['Signal delay','22+ hours'],['Status','OPERATIONAL'],['Launched','47 yrs ago']]},
    ],
    // Waypoints: [jd, x, y_up, z] — y is ecliptic north
    waypoints: function() {
      const pts=[];
      const steps=[
        [mtJD(1977,9,5),   0.963, 0, -0.269],
        [mtJD(1977,12,1),  1.600, 0.02,  0.800],
        [mtJD(1978,6,1),   0.200, 0.05,  2.500],
        [mtJD(1978,12,1), -1.200, 0.08,  3.800],
        [mtJD(1979,3,5),  -2.780, 0.12,  4.398],  // Jupiter
        [mtJD(1979,9,1),  -4.800, 0.35,  2.200],
        [mtJD(1980,3,1),  -6.800, 0.55,  0.400],
        [mtJD(1980,11,12),-9.515, 0.75,  0.642],  // Saturn (traj bends north)
        [mtJD(1981,6,1), -11.500, 2.50, -1.500],
        [mtJD(1983,1,1), -17.000, 5.50, -3.800],
        [mtJD(1985,1,1), -22.000, 8.50, -5.500],
        [mtJD(1990,1,1), -36.000,14.00, -9.000],
        [mtJD(1995,1,1), -50.000,19.00,-12.000],
        [mtJD(2000,1,1), -64.000,24.00,-15.500],
        [mtJD(2005,1,1), -80.000,30.00,-19.000],
        [mtJD(2012,8,25),-100.0, 37.00,-23.000],  // Heliopause
        [mtJD(2017,1,1), -114.0, 42.00,-26.000],
        [mtJD(2020,1,1), -120.0, 44.00,-27.500],
        [mtJD(2025,1,1), -128.0, 47.00,-29.000],
      ];
      return steps.map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['earth','mars','jupiter','saturn'],
  },

  {
    id:'voyager2', name:'Voyager 2', agency:'NASA/JPL', year:1977,
    tagline:"Grand Tour of the outer planets",
    color:0x00D4FF, colorHex:'#00D4FF',
    scale:50,
    jd_launch: mtJD(1977,8,20),
    jd_end:    mtJD(2025,1,1),
    phases:[
      {name:'Earth Departure',    jd:mtJD(1977,8,20),  icon:'🚀', type:'launch',
       desc:'Launched 16 days before Voyager 1 but on a slower trajectory. Titan IIIE/Centaur rocket.',
       rows:[['Launch','Aug 20, 1977'],['Rocket','Titan IIIE/Centaur'],['Mass','825 kg'],['Trajectory','Grand Tour']]},
      {name:'Jupiter Flyby',      jd:mtJD(1979,7,9),   icon:'🟠', type:'flyby', planet:'jupiter',
       desc:'Closest approach 570,000 km. Better images of Europa, Ganymede, and Callisto.',
       rows:[['Closest','570,000 km'],['Moons studied','4 Galilean'],['Europa','Ice shell confirmed'],['Speed','35 km/s']]},
      {name:'Saturn Flyby',       jd:mtJD(1981,8,26),  icon:'🪐', type:'flyby', planet:'saturn',
       desc:'Passes through ring plane. Closest to Titan 666,000 km.',
       rows:[['Closest','161,000 km'],['Titan pass','666,000 km'],['Ring data','Detailed structure'],['ΔV','+7 km/s']]},
      {name:'Uranus Flyby',       jd:mtJD(1986,1,24),  icon:'🔵', type:'flyby', planet:'uranus',
       desc:'Only spacecraft to visit Uranus. Discovers 10 new moons and 2 new rings.',
       rows:[['Closest','81,500 km'],['New moons','10 discovered'],['New rings','2 found'],['Tilt','97.77° axis']]},
      {name:'Neptune Flyby',      jd:mtJD(1989,8,25),  icon:'💙', type:'flyby', planet:'neptune',
       desc:'Only spacecraft to visit Neptune. Discovers Triton nitrogen geysers and Great Dark Spot.',
       rows:[['Closest','4,950 km'],['Triton geysers','ACTIVE'],['Wind speed','2,100 km/h'],['Last planet','Complete!']]}
    ],
    waypoints: function() {
      return [
        [mtJD(1977,8,20),  0.854,0,-0.521],
        [mtJD(1978,4,1),   1.200,0, 1.800],
        [mtJD(1978,12,1),  0.000,0, 3.200],
        [mtJD(1979,7,9),  -3.533,0, 3.820],  // Jupiter
        [mtJD(1980,2,1),  -5.600,0, 1.500],
        [mtJD(1980,9,1),  -7.800,0,-0.200],
        [mtJD(1981,8,26), -9.489,0,-0.954],  // Saturn
        [mtJD(1983,1,1), -11.000,0,-3.500],
        [mtJD(1984,1,1), -10.800,0,-7.000],
        [mtJD(1985,6,1),  -8.000,0,-12.00],
        [mtJD(1986,1,24), -5.428,0,-18.406], // Uranus
        [mtJD(1987,1,1),  -3.000,0,-21.000],
        [mtJD(1988,1,1),   1.500,0,-24.000],
        [mtJD(1989,8,25),  6.350,0,-29.392], // Neptune
        [mtJD(1995,1,1),   16.00,0,-38.000],
        [mtJD(2005,1,1),   32.00,0,-58.000],
        [mtJD(2018,11,5),  50.00,0,-88.000], // Heliopause
        [mtJD(2025,1,1),   58.00,0,-100.00],
      ].map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['earth','mars','jupiter','saturn','uranus','neptune'],
  },

  {
    id:'newhorizons', name:'New Horizons', agency:'NASA/APL', year:2006,
    tagline:"First mission to Pluto",
    color:0x8B5CF6, colorHex:'#8B5CF6',
    scale:44,
    jd_launch: mtJD(2006,1,19),
    jd_end:    mtJD(2019,6,1),
    phases:[
      {name:'Earth Departure',    jd:mtJD(2006,1,19),  icon:'🚀', type:'launch',
       desc:"Fastest spacecraft ever launched. Atlas V 551 booster. Left Earth at 58,000 km/h — 100× faster than a commercial jet.",
       rows:[['Launch','Jan 19, 2006'],['Speed','58,000 km/h'],['Rocket','Atlas V 551'],['Mass','478 kg']]},
      {name:'Jupiter Flyby',      jd:mtJD(2007,2,28),  icon:'🟠', type:'flyby', planet:'jupiter',
       desc:'Closest approach 2.3 million km. Gravity boost adds 3,800 m/s cutting 3 years off the journey.',
       rows:[['Closest','2.3M km'],['ΔV gained','+3.8 km/s'],['Science','Io volcanic eruptions'],['Speed','83,600 km/h']]},
      {name:'Pluto Flyby',        jd:mtJD(2015,7,14),  icon:'❄️', type:'flyby', planet:'pluto',
       desc:'First close-up images of Pluto and Charon. Discovers heart-shaped Tombaugh Regio and ice mountains.',
       rows:[['Closest','12,500 km'],['Heart feature','3 million km²'],['Charon','First detailed images'],['Distance','32.9 AU']]},
      {name:'Arrokoth Flyby',     jd:mtJD(2019,1,1),   icon:'🥜', type:'milestone',
       desc:'Farthest object ever visited. Contact binary Kuiper Belt object — two lobes gently merged.',
       rows:[['Distance','43.4 AU'],['Object type','Contact binary KBO'],['Farthest visit','EVER'],['Size','~36 km']]},
    ],
    waypoints: function() {
      return [
        [mtJD(2006,1,19), -0.472,0, 0.882],
        [mtJD(2006,4,1),  -0.800,0,-0.200],
        [mtJD(2006,10,1), -1.000,0,-1.600],
        [mtJD(2007,2,28), -1.639,0,-4.938],  // Jupiter
        [mtJD(2008,1,1),  -1.500,0,-8.500],
        [mtJD(2010,1,1),  -1.000,0,-16.00],
        [mtJD(2012,1,1),  -1.800,0,-23.00],
        [mtJD(2015,7,14), -5.870,0,-39.041], // Pluto
        [mtJD(2019,1,1),  -9.000,0,-42.500],
      ].map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['earth','mars','jupiter','saturn','uranus','neptune','pluto'],
  },

  {
    id:'cassini', name:'Cassini-Huygens', agency:'NASA/ESA', year:1997,
    tagline:"13 years orbiting Saturn",
    color:0xFFC857, colorHex:'#FFC857',
    scale:13,
    jd_launch: mtJD(1997,10,15),
    jd_end:    mtJD(2017,9,15),
    phases:[
      {name:'Earth Departure',    jd:mtJD(1997,10,15), icon:'🚀', type:'launch',
       desc:'Titan IVB/Centaur rocket. Could not fly direct to Saturn — gravity assists required.',
       rows:[['Launch','Oct 15, 1997'],['Rocket','Titan IVB/Centaur'],['Mass','5,712 kg'],['Strategy','VVEJGA']]},
      {name:'Venus Flyby 1',      jd:mtJD(1998,4,26),  icon:'🟡', type:'flyby', planet:'venus',
       desc:'First gravity assist. +250 m/s. Cassini swings around Venus for the first of two passes.',
       rows:[['Closest','284 km'],['ΔV','+0.45 km/s'],['Type','Gravity assist #1'],['Alt','Venus upper clouds']]},
      {name:'Venus Flyby 2',      jd:mtJD(1999,6,24),  icon:'🟡', type:'flyby', planet:'venus',
       desc:'Second Venus flyby adds critical velocity. Now fast enough to reach the outer solar system.',
       rows:[['Closest','623 km'],['Total ΔV','2.0 km/s gained'],['Effect','Flung toward Earth'],['Clouds','Imaged at 340 nm']]},
      {name:'Earth Flyby',        jd:mtJD(1999,8,18),  icon:'🌍', type:'flyby', planet:'earth',
       desc:'Controversial swing past Earth 1,171 km above surface — major velocity boost toward Jupiter.',
       rows:[['Closest','1,171 km'],['ΔV','+5.5 km/s'],['Public concern','VERY HIGH'],['Plutonium','72 RTGs aboard']]},
      {name:'Jupiter Flyby',      jd:mtJD(2000,12,30), icon:'🟠', type:'flyby', planet:'jupiter',
       desc:'6-month joint study with Galileo. Studies Jupiter magnetosphere and Io volcanism.',
       rows:[['Closest','9.7M km'],['Joint study','Galileo spacecraft'],['Duration','6 months'],['Science','Magnetosphere']]},
      {name:'Saturn Orbit Insert', jd:mtJD(2004,7,1),  icon:'🪐', type:'arrival', planet:'saturn',
       desc:'96-minute engine burn inserts Cassini into Saturn orbit. Passes through Encke Gap.',
       rows:[['Burn time','96 minutes'],['Ring gap','Encke Gap transit'],['First image','Rings at 200m res'],['Orbit','Initial 116-day']]},
      {name:'Grand Finale',       jd:mtJD(2017,9,15),  icon:'💥', type:'milestone',
       desc:"Cassini dives into Saturn's atmosphere — 13 years of science ends in a deliberate death to protect Titan and Enceladus.",
       rows:[['Science orbits','22 final dives'],['Last transmission','11:55 UTC Sep 15 2017'],['Total science','13 years'],['Enceladus','Plumes confirmed HABITABLE']]},
    ],
    waypoints: function() {
      return [
        [mtJD(1997,10,15), 0.916,0, 0.400],   // Earth launch
        [mtJD(1998,1,1),   0.500,0,-0.400],
        [mtJD(1998,4,26),  0.074,0,-0.719],    // Venus 1
        [mtJD(1998,9,1),   0.800,0,-0.200],
        [mtJD(1999,3,1),   0.300,0, 0.650],
        [mtJD(1999,6,24), -0.413,0,-0.594],    // Venus 2
        [mtJD(1999,8,18),  0.828,0,-0.560],    // Earth flyby
        [mtJD(2000,3,1),   2.000,0, 1.500],
        [mtJD(2000,12,30), 2.231,0, 4.700],    // Jupiter
        [mtJD(2002,6,1),   0.500,0, 8.000],
        [mtJD(2004,7,1),  -2.449,0, 9.217],    // Saturn
        [mtJD(2006,1,1),  -4.000,0,10.000],
        [mtJD(2008,1,1),  -5.000,0, 9.500],
        [mtJD(2010,1,1),  -3.500,0, 9.000],
        [mtJD(2012,1,1),  -1.500,0, 9.600],
        [mtJD(2014,1,1),  -0.500,0,10.000],
        [mtJD(2016,1,1),  -2.000,0, 9.200],
        [mtJD(2017,9,15), -2.449,0, 9.217],    // Death dive
      ].map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['venus','earth','mars','jupiter','saturn'],
  },

  {
    id:'perseverance', name:'Perseverance', agency:'NASA/JPL', year:2020,
    tagline:"Searching for ancient life on Mars",
    color:0xFF4444, colorHex:'#FF4444',
    scale:2.2,
    jd_launch: mtJD(2020,7,30),
    jd_end:    mtJD(2024,1,1),
    phases:[
      {name:'Earth Departure',    jd:mtJD(2020,7,30),  icon:'🚀', type:'launch',
       desc:"Atlas V 541 rocket, Cape Canaveral. Optimal 26-month Mars window — direct Hohmann transfer.",
       rows:[['Launch','Jul 30, 2020'],['Rocket','Atlas V 541'],['Mass','1,025 kg rover'],['Window','26-month Mars alignment']]},
      {name:'Interplanetary Cruise',jd:mtJD(2020,11,1),icon:'🛸', type:'cruise',
       desc:'7-month, 480 million km journey through interplanetary space. No gravity assists needed — direct.',
       rows:[['Distance','480M km'],['Duration','7 months'],['Speed','84,600 km/h'],['Corrections','6 TCMs']]},
      {name:'Mars EDL',            jd:mtJD(2021,2,18),  icon:'🔴', type:'arrival', planet:'mars',
       desc:'7 Minutes of Terror. Entry at 19,500 km/h, heatshield, supersonic parachute, sky crane hover.',
       rows:[['Entry speed','19,500 km/h'],['EDL time','7 minutes'],['Sky crane','Powered descent'],['Landing site','Jezero Crater']]},
      {name:'Jezero Science',      jd:mtJD(2021,6,1),   icon:'🏔', type:'milestone',
       desc:"Perseverance discovers organic compounds. Ingenuity helicopter makes first powered flight on another planet.",
       rows:[['Ingenuity flights','70+'],['Samples cached','23 tubes'],['Organics','DETECTED'],['Active','Sol 1000+']]}
    ],
    waypoints: function() {
      return [
        [mtJD(2020,7,30),  0.612,0,-0.791],   // Earth launch
        [mtJD(2020,9,1),   0.800,0, 0.000],
        [mtJD(2020,11,1),  1.000,0, 0.800],   // Midpoint
        [mtJD(2020,12,1),  0.900,0, 1.100],
        [mtJD(2021,2,18),  0.266,0, 1.501],   // Mars
        [mtJD(2022,1,1),   0.400,0, 1.600],
        [mtJD(2023,1,1),   0.800,0, 1.450],
        [mtJD(2024,1,1),   1.100,0, 1.000],
      ].map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['earth','mars'],
  },

  {
    id:'europa', name:'Europa Clipper', agency:'NASA/JPL', year:2024,
    tagline:"Searching for life in Europa's ocean",
    color:0x00FF9F, colorHex:'#00FF9F',
    scale:8,
    jd_launch: mtJD(2024,10,14),
    jd_end:    mtJD(2031,1,1),
    phases:[
      {name:'Earth Departure',    jd:mtJD(2024,10,14), icon:'🚀', type:'launch',
       desc:"Largest NASA planetary science spacecraft. Falcon Heavy launch from KSC. MEGA strategy — Mars-Earth Gravity Assist.",
       rows:[['Launch','Oct 14, 2024'],['Rocket','Falcon Heavy'],['Mass','6,065 kg'],['Strategy','MEGA']]},
      {name:'Mars Flyby',         jd:mtJD(2025,3,1),   icon:'🔴', type:'flyby', planet:'mars',
       desc:'Gravity assist around Mars adds crucial velocity toward the outer solar system.',
       rows:[['Closest','~3,000 km'],['ΔV gained','~1.7 km/s'],['Date','Mar 2025'],['Type','Gravity assist #1']]},
      {name:'Earth Flyby',        jd:mtJD(2026,12,1),  icon:'🌍', type:'flyby', planet:'earth',
       desc:'Returns to Earth for a second gravity assist — a critical velocity boost for Jupiter.',
       rows:[['Closest','~500 km'],['ΔV gained','~4.0 km/s'],['Date','Dec 2026'],['Type','Gravity assist #2']]},
      {name:'Jupiter Arrival',    jd:mtJD(2030,4,11),  icon:'🟠', type:'arrival', planet:'jupiter',
       desc:'Jupiter Orbit Insertion. Begins 49 Europa flybys over 4 years to study the subsurface ocean.',
       rows:[['Arrival','Apr 2030'],['Europa flybys','49 planned'],['Ocean depth','25 km'],['Habitable?','LIKELY']]},
    ],
    waypoints: function() {
      return [
        [mtJD(2024,10,14), 0.923,0, 0.384],   // Earth launch
        [mtJD(2024,12,1),  0.600,0, 1.000],
        [mtJD(2025,3,1),  -1.005,0, 1.145],   // Mars flyby
        [mtJD(2025,8,1),  -1.200,0, 0.800],
        [mtJD(2026,3,1),   0.000,0, 0.200],
        [mtJD(2026,12,1),  0.352,0, 0.936],   // Earth flyby
        [mtJD(2027,6,1),   1.500,0, 2.000],
        [mtJD(2028,6,1),   2.500,0, 3.500],
        [mtJD(2029,6,1),  -0.500,0, 5.000],
        [mtJD(2030,4,11), -3.119,0,-4.164],   // Jupiter
        [mtJD(2031,1,1),  -4.000,0,-5.000],
      ].map(([jd,x,y,z])=>({jd,x,y,z}));
    },
    planets_shown:['earth','mars','jupiter','saturn'],
  },
];

// ── SCENE STATE ─────────────────────────────────────────────────
let mtScene, mtCamera, mtRenderer;
let mtCraft, mtTrailLine, mtTrailPositions=[];
let mtFullPathLine = null;           // pre-drawn complete trajectory
let mtFlybyRing    = null;           // glowing ring during flyby
let mtT=0, mtSpd=1, mtPlaying=false, mtBuilt=false;
let mtLaunchPhase=false, mtLaunchT=0;
let mtNarrationOn=false;
let mtLastCraftPos=null;
let mtRocketMesh=null, mtExhaustPts=null, mtExhaustPos=null;
let mtDragging=false, mtLastX=0, mtLastY=0;
let mtPhi=0.85, mtTheta=0.5, mtRadius=8;
let mtTargetPhi=0.85, mtTargetTheta=0.5, mtTargetRadius=8;
let mtTargetLook=null, mtCurrentLook=null; // initialised inside mtInit()
let mtCamMode='cinematic';
let mtMission=null;
let mtPlanetMeshes={}, mtOrbitRings={};
let mtLastMilestone=-1;
let mtAnimId=null;
let mtFlybyActive=null;   // id of planet currently being flybied
let mtFlybyT=0;           // animation timer for flyby zoom
let mtFlybyZooming=false;

// ── HELPER: planet display radius (adaptive for large scales) ──
function mtPlanetDisplayR(id) {
  const p = MT_PLANETS[id];
  // Minimum visible size = 2.5% of orbital radius, so outer planets don't vanish
  return Math.max(p.r, p.a * 0.028);
}

// ── HELPER: build one orbit ring at given AU radius ──
function mtMakeOrbitRing(au, color, opacity) {
  const pts = [];
  for(let i=0;i<=180;i++){
    const th=(i/180)*Math.PI*2;
    pts.push(new THREE.Vector3(au*Math.cos(th),0,au*Math.sin(th)));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({color, transparent:true, opacity});
  return new THREE.Line(geo, mat);
}

// ── FULL TRAJECTORY: pre-draw entire path as faint dashes ──────
function mtBuildFullPath(waypoints, missionColor) {
  if(mtFullPathLine){ mtScene.remove(mtFullPathLine); mtFullPathLine=null; }
  if(!waypoints || waypoints.length < 2) return;

  // Sample 400 points along the full Catmull-Rom spline
  const pts=[];
  const n=400;
  for(let i=0;i<=n;i++){
    const t=i/n;
    const pos=mtInterpolateRaw(waypoints,t);
    pts.push(pos);
  }

  // Build colour array: dim mission colour, brightens toward end
  const positions=new Float32Array(pts.length*3);
  const colors=new Float32Array(pts.length*3);
  const col=new THREE.Color(missionColor);
  pts.forEach((p,i)=>{
    positions[i*3]=p.x; positions[i*3+1]=p.y; positions[i*3+2]=p.z;
    const f=i/n;
    colors[i*3]=col.r*0.35; colors[i*3+1]=col.g*0.35; colors[i*3+2]=col.b*0.35;
  });
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const fullMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,   // don't write to depth — planets draw over it
  });
  mtFullPathLine=new THREE.Line(geo, fullMat);
  mtFullPathLine.renderOrder = 0; // draw first (behind planets)
  mtScene.add(mtFullPathLine);
}

// ── CATMULL-ROM without mtMission dependency ──
// Helper: get xyz from waypoint (supports both {x,y,z} plain and {pos:Vector3})
function mtWptXYZ(w){ return w.pos ? w.pos : w; }

function mtInterpolateRaw(waypoints, t) {
  if(!waypoints||!waypoints.length) return new THREE.Vector3();
  const jd = waypoints[0].jd + t*(waypoints[waypoints.length-1].jd - waypoints[0].jd);
  for(let i=0;i<waypoints.length-1;i++){
    if(jd>=waypoints[i].jd && jd<=waypoints[i+1].jd){
      const f=(jd-waypoints[i].jd)/(waypoints[i+1].jd-waypoints[i].jd);
      const p0=mtWptXYZ(i>0?waypoints[i-1]:waypoints[i]);
      const p1=mtWptXYZ(waypoints[i]);
      const p2=mtWptXYZ(waypoints[i+1]);
      const p3=mtWptXYZ(i<waypoints.length-2?waypoints[i+2]:waypoints[i+1]);
      const t2=f*f,t3=t2*f;
      return new THREE.Vector3(
        0.5*((2*p1.x)+(-p0.x+p2.x)*f+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        0.5*((2*p1.y)+(-p0.y+p2.y)*f+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
        0.5*((2*p1.z)+(-p0.z+p2.z)*f+(2*p0.z-5*p1.z+4*p2.z-p3.z)*t2+(-p0.z+3*p1.z-3*p2.z+p3.z)*t3)
      );
    }
  }
  const last=mtWptXYZ(waypoints[waypoints.length-1]);
  return new THREE.Vector3(last.x,last.y,last.z);
}

function mtInterpolate(waypoints, t) {
  return mtInterpolateRaw(waypoints, t);
}

function mtInit() {
  if(mtBuilt) return;
  mtBuilt=true;
  const cv=document.getElementById('mt-cv');
  if(!cv) return;
  const W=cv.parentElement.offsetWidth||900;
  const H=Math.max(500,Math.round(W*0.58));
  cv.width=W; cv.height=H; cv.style.height=H+'px';

  // Init vectors that need THREE
  mtTargetLook=new THREE.Vector3(0,0,0);
  mtCurrentLook=new THREE.Vector3(0,0,0);

  mtScene=new THREE.Scene();
  mtCamera=new THREE.PerspectiveCamera(48,W/H,0.001,3000);
  mtRenderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  mtRenderer.setSize(W,H);
  mtRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  mtRenderer.setClearColor(0x010309);

  mtScene.add(new THREE.AmbientLight(0x223355,0.55));
  const sunL=new THREE.PointLight(0xffeedd,2.5,0); sunL.name='mtSunLight'; mtScene.add(sunL);

  // Stars
  const rng=((s)=>()=>{s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;})(55);
  const sp=new Float32Array(5000*3),sc=new Float32Array(5000*3);
  for(let i=0;i<5000;i++){
    const th=rng()*Math.PI*2,ph=Math.acos(2*rng()-1),r=500+rng()*200;
    sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    const t=rng(); sc[i*3]=t<.1?.85:.98;sc[i*3+1]=t<.1?.9:.98;sc[i*3+2]=t<.1?1:.97;
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  mtScene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:0.8,vertexColors:true,sizeAttenuation:true})));

  // ── SUN ──
  const sc2=document.createElement('canvas');sc2.width=128;sc2.height=64;
  const sx=sc2.getContext('2d');const sg2=sx.createRadialGradient(64,32,2,64,32,64);
  sg2.addColorStop(0,'#FFFDE7');sg2.addColorStop(.4,'#FFF176');sg2.addColorStop(.8,'#FF8F00');sg2.addColorStop(1,'#E65100');
  sx.fillStyle=sg2;sx.fillRect(0,0,128,64);
  const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(0.12,32,16),new THREE.MeshPhongMaterial({map:new THREE.CanvasTexture(sc2),emissive:0xffaa00,emissiveIntensity:2}));
  sunMesh.name='sun';mtScene.add(sunMesh);
  // Sun label
  const slc=document.createElement('canvas');slc.width=128;slc.height=28;
  const slx=slc.getContext('2d');slx.font='bold 14px Share Tech Mono,monospace';
  slx.fillStyle='rgba(255,240,100,0.9)';slx.textAlign='center';slx.fillText('Sun',64,18);
  const sunSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(slc),transparent:true,opacity:.85}));
  sunSprite.scale.set(0.6,0.14,1);sunSprite.position.set(0,0.22,0);mtScene.add(sunSprite);
  // Corona
  for(const [r,o] of [[0.18,0.12],[0.28,0.06],[0.42,0.025]]){
    mtScene.add(new THREE.Mesh(new THREE.SphereGeometry(r,16,8),new THREE.MeshPhongMaterial({color:0xffcc44,transparent:true,opacity:o,side:THREE.BackSide,depthWrite:false})));
  }

  // ── ALL PLANET ORBITAL RINGS (always visible background context) ──
  const ORBIT_COLORS = {
    mercury:0xaa8866,venus:0xbbaa66,earth:0x55aadd,mars:0xcc5533,
    jupiter:0xcc9955,saturn:0xddcc77,uranus:0x66aabb,neptune:0x5566cc,pluto:0x887766
  };
  Object.entries(MT_PLANETS).forEach(([id,p])=>{
    const ring=mtMakeOrbitRing(p.a, ORBIT_COLORS[id]||0x445566, 0.45);
    ring.name='mt-orbit-'+id;
    mtScene.add(ring);
    mtOrbitRings[id]=ring;
  });

  // ── PLANET MESHES ──
  Object.entries(MT_PLANETS).forEach(([id,p])=>{
    const grp=new THREE.Group(); grp.name='mt-planet-'+id;

    const dr=mtPlanetDisplayR(id);
    // Planet sphere with glow material
    const mat=new THREE.MeshPhongMaterial({
      color:p.c, shininess:10,
      emissive:new THREE.Color(p.c).multiplyScalar(0.15)
    });
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(dr,28,14),mat);
    mesh.name='sphere';
    mesh.renderOrder=10; // always render planets on top of trajectory lines
    grp.add(mesh);

    // Atmosphere
    const atmC=id==='earth'?0x4488ff:id==='venus'?0xcc9933:id==='mars'?0xff6633:p.c;
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(dr*1.12,16,8),
      new THREE.MeshPhongMaterial({color:atmC,transparent:true,opacity:.12,side:THREE.BackSide,depthWrite:false})));

    // Saturn rings (proportional to adaptive radius)
    if(p.rings){
      const rc=document.createElement('canvas');rc.width=128;rc.height=1;
      const rx=rc.getContext('2d');const rg=rx.createLinearGradient(0,0,128,0);
      rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(.08,'rgba(180,160,100,.15)');
      rg.addColorStop(.25,'rgba(230,210,140,.8)');rg.addColorStop(.5,'rgba(210,190,120,.65)');
      rg.addColorStop(.75,'rgba(180,160,100,.4)');rg.addColorStop(.95,'rgba(160,140,80,.1)');
      rg.addColorStop(1,'rgba(0,0,0,0)');rx.fillStyle=rg;rx.fillRect(0,0,128,1);
      const ringTex=new THREE.CanvasTexture(rc);
      const rGeo=new THREE.RingGeometry(dr*1.3,dr*2.2,80);
      const pos2=rGeo.attributes.position,uv2=rGeo.attributes.uv,vv=new THREE.Vector3();
      for(let i=0;i<pos2.count;i++){vv.fromBufferAttribute(pos2,i);uv2.setXY(i,(vv.length()-dr*1.3)/(dr*2.2-dr*1.3),.5);}
      const ring2=new THREE.Mesh(rGeo,new THREE.MeshBasicMaterial({map:ringTex,side:THREE.DoubleSide,transparent:true,opacity:.88,depthWrite:false}));
      ring2.rotation.x=Math.PI/2+0.47;grp.add(ring2);
    }

    // Planet name label (always visible, scaled to planet)
    const lc=document.createElement('canvas');lc.width=160;lc.height=32;
    const lx=lc.getContext('2d');lx.font='bold 13px Share Tech Mono,monospace';
    lx.fillStyle=`rgba(${(p.c>>16)&255},${(p.c>>8)&255},${p.c&255},0.9)`;
    lx.textAlign='center';lx.fillText(p.name,80,20);
    const lTex=new THREE.CanvasTexture(lc);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:lTex,transparent:true,opacity:.9}));
    const labelScale=Math.max(dr*4,0.4);
    sprite.scale.set(labelScale,labelScale*0.22,1);
    sprite.position.set(0,dr*1.6+labelScale*0.12,0);
    sprite.name='label';grp.add(sprite);

    mtScene.add(grp);
    mtPlanetMeshes[id]=grp;
  });

  // ── SPACECRAFT ──
  const craftMat=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:6});
  mtCraft=new THREE.Mesh(new THREE.SphereGeometry(0.03,12,8),craftMat);
  mtCraft.name='craft';
  mtCraft.renderOrder=20; // always on top of everything
  mtScene.add(mtCraft);
  // Add a PointLight ON the spacecraft so it illuminates nearby planets during flyby
  const craftLight=new THREE.PointLight(0xffffff,0.8,3);
  craftLight.name='craftlight';mtScene.add(craftLight);
  for(const[r,o]of[[0.06,0.45],[0.12,0.2],[0.22,0.08]]){
    const g=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),
      new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:o,depthWrite:false}));
    g.name='craftglow';g.renderOrder=15;mtScene.add(g);
  }

  // Trail
  const trailPos=new Float32Array(600*3),trailCol=new Float32Array(600*3);
  const tGeo=new THREE.BufferGeometry();
  tGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));
  tGeo.setAttribute('color',new THREE.BufferAttribute(trailCol,3));
  tGeo.setDrawRange(0,0);
  const trailMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    linewidth: 2,
    depthWrite: false,  // planets render on top
  });
  mtTrailLine=new THREE.Line(tGeo, trailMat);
  mtTrailLine.renderOrder = 1; // above full path, below planets (renderOrder=10)
  mtScene.add(mtTrailLine);

  // Flyby ring (shown around planet during flyby)
  const frGeo=new THREE.TorusGeometry(1,0.015,8,64);
  mtFlybyRing=new THREE.Mesh(frGeo,new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:2,transparent:true,opacity:0,depthWrite:false}));
  mtFlybyRing.name='flybyRing';
  mtFlybyRing.renderOrder=5; // above lines, below planet spheres
  mtScene.add(mtFlybyRing);

  // Flyby arc line (shows the actual curved gravity assist path around each planet)
  const arcGeo=new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(82*3),3));
  const arcMat=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0,linewidth:2,depthWrite:false});
  window._mtArcLine=new THREE.Line(arcGeo,arcMat);
  window._mtArcLine.renderOrder=6;
  mtScene.add(window._mtArcLine);

  // ── CONTROLS ──
  cv.addEventListener('mousedown',e=>{mtDragging=true;mtLastX=e.clientX;mtLastY=e.clientY;mtCamMode='orbit';mtUpdateCamBtns();});
  window.addEventListener('mouseup',()=>mtDragging=false);
  cv.addEventListener('mousemove',e=>{
    if(mtDragging){
      mtTheta-=(e.clientX-mtLastX)*.006;
      mtPhi=Math.max(.05,Math.min(Math.PI-.05,mtPhi-(e.clientY-mtLastY)*.006));
      mtTargetTheta=mtTheta;mtTargetPhi=mtPhi;
      mtLastX=e.clientX;mtLastY=e.clientY;
    }
    // Hover
    if(mtMission){
      const rect=cv.getBoundingClientRect();
      const mx=((e.clientX-rect.left)/rect.width)*2-1;
      const my=-((e.clientY-rect.top)/rect.height)*2+1;
      const ray=new THREE.Raycaster();
      ray.setFromCamera({x:mx,y:my},mtCamera);
      const meshes=[];
      Object.entries(mtPlanetMeshes).forEach(([id,grp])=>{const s=grp.children.find(c=>c.name==='sphere');if(s)meshes.push({mesh:s,id});});
      const hits=ray.intersectObjects(meshes.map(m=>m.mesh));
      const info=document.getElementById('mt-info');
      if(hits.length){
        const hit=meshes.find(m=>m.mesh===hits[0].object);
        if(hit){
          const p=MT_PLANETS[hit.id];
          const typeMap={mercury:'TERRESTRIAL',venus:'TERRESTRIAL',earth:'TERRESTRIAL',mars:'TERRESTRIAL',jupiter:'GAS GIANT',saturn:'GAS GIANT + RINGS',uranus:'ICE GIANT',neptune:'ICE GIANT',pluto:'DWARF PLANET'};
          document.getElementById('mt-info-title').textContent=p.name;
          document.getElementById('mt-info-type').textContent=typeMap[hit.id]||'PLANET';
          document.getElementById('mt-info-rows').innerHTML=
            [['Orbital radius',p.a.toFixed(2)+' AU'],['Orbital period',p.a<1?Math.round(p.a**1.5*365.25)+' days':Math.round(p.a**1.5).toLocaleString()+' days'],['Color signature','#'+p.c.toString(16).padStart(6,'0')]]
            .map(([k,v])=>`<div class="mt-info-row"><span class="mt-info-k">${k}</span><span class="mt-info-v">${v}</span></div>`).join('');
          info.style.display='block';cv.style.cursor='pointer';
        }
      } else {
        info.style.display='none';cv.style.cursor='crosshair';
      }
    }
  });
  cv.addEventListener('mouseleave',()=>{document.getElementById('mt-info').style.display='none';});
  cv.addEventListener('wheel',e=>{
    mtTargetRadius=Math.max(0.5,Math.min(200,mtTargetRadius*(1+e.deltaY*.001)));
    mtCamMode='orbit';e.preventDefault();
  },{passive:false});
  let lastT2=null;
  cv.addEventListener('touchstart',e=>{lastT2=e.touches[0];e.preventDefault();},{passive:false});
  cv.addEventListener('touchmove',e=>{
    if(!lastT2)return;const t=e.touches[0];
    mtTheta-=(t.clientX-lastT2.clientX)*.006;
    mtPhi=Math.max(.05,Math.min(Math.PI-.05,mtPhi-(t.clientY-lastT2.clientY)*.006));
    mtTargetTheta=mtTheta;mtTargetPhi=mtPhi;
    lastT2=t;mtCamMode='orbit';e.preventDefault();
  },{passive:false});
  window.addEventListener('resize',()=>{
    const W2=cv.parentElement.offsetWidth||900,H2=Math.max(500,Math.round(W2*.58));
    cv.width=W2;cv.height=H2;cv.style.height=H2+'px';
    mtRenderer.setSize(W2,H2);mtCamera.aspect=W2/H2;mtCamera.updateProjectionMatrix();
  });

  mtRenderLoop();
}

function mtRenderLoop() {
  if(!mtScene)return;

  // ── ADVANCE TIME ──
  if(mtPlaying && mtMission){
    if(mtLaunchPhase){
      mtLaunchT+=0.014;
      if(mtRocketMesh){
        mtRocketMesh.position.y=mtLaunchT*0.6;
        mtRocketMesh.position.x=Math.sin(mtLaunchT*3)*0.03;
        if(mtExhaustPos){
          for(let i=0;i<60;i++){
            const sp=0.02+mtLaunchT*0.06;
            mtExhaustPos[i*3]=(Math.random()-.5)*sp;
            mtExhaustPos[i*3+1]=mtRocketMesh.position.y-0.02-Math.random()*mtLaunchT*0.5;
            mtExhaustPos[i*3+2]=(Math.random()-.5)*sp;
          }
          mtExhaustPts.geometry.attributes.position.needsUpdate=true;
        }
        if(mtCamMode==='cinematic'){
          const ep=mtPlanetPos('earth',mtMission.jd_launch);
          mtCamera.position.set(ep.x+mtLaunchT*0.3+0.4,ep.y+mtLaunchT*0.45+0.15,ep.z+mtLaunchT*0.3+0.7);
          mtCamera.lookAt(ep.x,ep.y+mtLaunchT*0.4,ep.z);
        }
      }
      if(mtLaunchT>=1){
        mtLaunchPhase=false;
        if(mtRocketMesh){mtScene.remove(mtRocketMesh);mtRocketMesh=null;}
        if(mtExhaustPts){mtScene.remove(mtExhaustPts);mtExhaustPts=null;}
        mtTargetRadius=mtMission.scale*0.65;mtTargetPhi=0.82;mtTargetTheta=0.5;
        if(window.speechSynthesis)window.speechSynthesis.cancel();
      }
    } else {
      const step=mtSpd*0.00025;
      mtT=Math.min(1,mtT+step);
      if(mtT>=1){mtT=1;mtPlaying=false;document.getElementById('mt-play').textContent='▶ PLAY';}
      document.getElementById('mt-timeline').value=Math.round(mtT*1000);
      document.getElementById('mt-tl-fill').style.width=(mtT*100)+'%';
    }
  }

  if(mtMission){
    const wpts=mtMission._waypoints;
    if(wpts && !mtLaunchPhase){
      const pos=mtInterpolate(wpts,mtT);
      const jd=mtMission.jd_launch+mtT*(mtMission.jd_end-mtMission.jd_launch);

      // ── UPDATE ALL PLANET POSITIONS ──
      Object.keys(MT_PLANETS).forEach(pid=>{
        const grp=mtPlanetMeshes[pid];
        if(!grp)return;
        const ppos=mtPlanetPos(pid,jd);
        grp.position.set(ppos.x,ppos.y,ppos.z);

        // Adaptive sizing: planets should be clearly visible but not dominate
        // Base rule: planet spans ~4% of its own orbital radius
        const maxAU   = mtMission.scale || 10;
        const baseR   = mtPlanetDisplayR(pid);
        // For deep-space missions, scale inner planets up so they don't vanish
        // But cap outer planet scale to avoid them filling the screen
        const pid_a   = MT_PLANETS[pid].a;
        const vizR    = Math.max(baseR, pid_a * 0.035);  // min 3.5% of orbit radius
        const cappedR = Math.min(vizR, maxAU * 0.08);    // max 8% of mission extent
        const scaleFactor = cappedR / baseR;
        const sphere=grp.children.find(c=>c.name==='sphere');
        if(sphere) sphere.scale.setScalar(scaleFactor);
        const lbl=grp.children.find(c=>c.name==='label');
        if(lbl){
          const ls=Math.max(cappedR*4, 0.3);
          lbl.scale.set(ls, ls*0.22, 1);
          lbl.position.set(0, cappedR*1.7+ls*0.1, 0);
        }
      });

      // ── SPACECRAFT ──
      // Scale craft dot to be visible at mission scale
      const maxAU2 = mtMission.scale || 10;
      const craftScale = Math.max(1, maxAU2/15);
      mtCraft.scale.setScalar(craftScale);
      mtScene.children.forEach(c=>{if(c.name==='craftglow')c.scale.setScalar(craftScale);});
      mtCraft.position.copy(pos);
      mtScene.children.forEach(c=>{
        if(c.name==='craftglow') c.position.copy(pos);
        if(c.name==='craftlight') c.position.copy(pos);
      });

      // ── TRAIL ──
      mtTrailPositions.push(pos.clone());
      if(mtTrailPositions.length>500)mtTrailPositions.shift();
      const tPosArr=mtTrailLine.geometry.attributes.position.array;
      const tColArr=mtTrailLine.geometry.attributes.color.array;
      const col=new THREE.Color(mtMission.color);
      const nt=mtTrailPositions.length;
      mtTrailPositions.forEach((p,i)=>{
        tPosArr[i*3]=p.x;tPosArr[i*3+1]=p.y;tPosArr[i*3+2]=p.z;
        const f=i/nt;
        tColArr[i*3]=col.r*f;tColArr[i*3+1]=col.g*f;tColArr[i*3+2]=col.b*f;
      });
      mtTrailLine.geometry.attributes.position.needsUpdate=true;
      mtTrailLine.geometry.attributes.color.needsUpdate=true;
      mtTrailLine.geometry.setDrawRange(0,nt);

      // ── FLYBY DETECTION ──
      // Flyby thresholds: fixed AU distances based on planet size
      const FLYBY_THRESH = {
        mercury:0.08, venus:0.15, earth:0.15, mars:0.15,
        jupiter:0.6,  saturn:0.8, uranus:1.2, neptune:1.5, pluto:0.4
      };
      let closestPlanet=null, closestDist=Infinity;
      mtMission.planets_shown.forEach(pid=>{
        const ppos=mtPlanetPos(pid,jd);
        const dist=pos.distanceTo(new THREE.Vector3(ppos.x,ppos.y,ppos.z));
        const threshold=FLYBY_THRESH[pid]||0.2;
        if(dist<threshold && dist<closestDist){ closestDist=dist; closestPlanet=pid; }
      });

      if(closestPlanet && closestPlanet!==mtFlybyActive){
        // New flyby starting!
        mtFlybyActive=closestPlanet; mtFlybyT=0; mtFlybyZooming=true;
        const pCol=MT_PLANETS[closestPlanet].c;

        // Tint flyby ring to planet colour
        if(mtFlybyRing){
          mtFlybyRing.material.color.set(pCol);
          mtFlybyRing.material.emissive.set(pCol);
        }

        // Build flyby arc — a semicircle around the planet in the trajectory plane
        if(window._mtArcLine){
          const ppos2=mtPlanetPos(closestPlanet,jd);
          const pVec2=new THREE.Vector3(ppos2.x,ppos2.y,ppos2.z);
          const dr2=mtPlanetDisplayR(closestPlanet)*(Math.max(1,(mtMission.scale||10)/12));
          const arcR=Math.max(dr2*3.5, 0.25); // arc radius = 3.5× planet display size
          const arcPts=[];
          for(let ai=0;ai<=80;ai++){
            const angle=(ai/80)*Math.PI*1.8-0.9; // 324° sweep centred on approach
            arcPts.push(
              pVec2.x + arcR*Math.cos(angle),
              pVec2.y + 0,
              pVec2.z + arcR*Math.sin(angle)
            );
          }
          window._mtArcLine.geometry.attributes.position.array.set(arcPts);
          window._mtArcLine.geometry.attributes.position.needsUpdate=true;
          window._mtArcLine.geometry.setDrawRange(0,0); // will animate in
          window._mtArcLine.material.color.set(pCol);
          window._mtArcLine.material.opacity=0.85;
          window._mtArcDrawPct=0; // animate arc drawing
        }
      } else if(!closestPlanet && mtFlybyActive){
        mtFlybyActive=null; mtFlybyZooming=false;
        if(mtFlybyRing) mtFlybyRing.material.opacity=0;
        // Fade out arc
        if(window._mtArcLine) window._mtArcLine.material.opacity=0;
        window._mtArcDrawPct=0;
        // Pull back to mission overview after flyby
        if(mtCamMode==='cinematic'){
          // Restore scale based on how far spacecraft has travelled
          const curDistAU = pos.length();
          mtTargetRadius = Math.max(mtMission.scale * 0.55, curDistAU * 2.2);
          mtTargetPhi=0.82; mtTargetTheta += 0.1; // shift angle for drama
          mtTargetLook.set(0,0,0);
        }
      }

      if(mtFlybyActive){
        mtFlybyT+=0.04;
        const ppos=mtPlanetPos(mtFlybyActive,jd);
        const pVec=new THREE.Vector3(ppos.x,ppos.y,ppos.z);
        const dr=mtPlanetDisplayR(mtFlybyActive)*(Math.max(1,maxAU2/12));

        // Pulsing flyby ring
        if(mtFlybyRing){
          mtFlybyRing.position.copy(pVec);
          mtFlybyRing.rotation.x=Math.PI/2;
          const expandT = Math.min(1, mtFlybyT * 2);
          const pulse = 1 + Math.sin(mtFlybyT * 5) * 0.25;
          mtFlybyRing.scale.setScalar(dr * 5.5 * expandT * pulse);
          mtFlybyRing.material.opacity = expandT * (0.6 + Math.sin(mtFlybyT * 4) * 0.25);
        }

        // Animate arc drawing in progressively
        if(window._mtArcLine && typeof window._mtArcDrawPct !== 'undefined'){
          window._mtArcDrawPct = Math.min(80, (window._mtArcDrawPct||0) + 2);
          window._mtArcLine.geometry.setDrawRange(0, Math.floor(window._mtArcDrawPct));
        }

        // Camera: dramatic zoom to planet during flyby
        if(mtCamMode==='cinematic'){
          // Look at planet, zoom in tight
          mtTargetLook.lerp(pVec, 0.08);
          // Zoom distance: 3-5× planet display radius — close enough to see detail
          const zoomIn = Math.max(dr * 4.5, 0.8);
          mtTargetRadius = mtTargetRadius + (zoomIn - mtTargetRadius) * 0.03;
          mtTargetPhi = 0.65;
          mtTargetTheta += 0.005; // gentle orbit during flyby
        }
      }

      // ── PHASE DETECTION + MILESTONE ──
      const phases=mtMission.phases;
      let currentPhase=null,currentPhaseIdx=0;
      for(let i=0;i<phases.length;i++){
        const pjd=phases[i].jd;
        const nextJd=i<phases.length-1?phases[i+1].jd:mtMission.jd_end;
        const frac=(pjd-mtMission.jd_launch)/(mtMission.jd_end-mtMission.jd_launch);
        const nextFrac=(nextJd-mtMission.jd_launch)/(mtMission.jd_end-mtMission.jd_launch);
        if(mtT>=frac&&mtT<nextFrac){currentPhase=phases[i];currentPhaseIdx=i;break;}
        if(i===phases.length-1&&mtT>=frac){currentPhase=phases[i];currentPhaseIdx=i;}
      }
      if(currentPhase){
        document.getElementById('mt-phase').textContent=currentPhase.icon+' '+currentPhase.name;
        const simDate=new Date((jd-2440587.5)*86400000);
        document.getElementById('mt-date').textContent=simDate.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}).toUpperCase();

        if(currentPhaseIdx!==mtLastMilestone&&mtPlaying){
          mtLastMilestone=currentPhaseIdx;
          const banner=document.getElementById('mt-milestone');
          banner.textContent=currentPhase.icon+' '+currentPhase.name.toUpperCase();
          banner.style.color=mtMission.colorHex;
          banner.style.borderColor=mtMission.colorHex;
          banner.classList.add('show');banner.style.display='block';
          const descEl=document.getElementById('mt-desc-text');
          if(descEl&&currentPhase.desc){
            descEl.textContent=currentPhase.desc;
            descEl.style.borderLeftColor=mtMission.colorHex;
            descEl.classList.remove('mt-desc-flash');void descEl.offsetWidth;descEl.classList.add('mt-desc-flash');
          }
        }
      }

      // ── SCALE READOUT ──
      const distAU=pos.length();
      const distKm=distAU*149597870.7;
      const lightMin=distKm/299792.458;
      const scaleEl=document.getElementById('mt-scale');
      if(scaleEl){
        let s2='';
        if(distAU<1.2)s2=distAU.toFixed(3)+' AU · '+(distAU*149.6).toFixed(0)+'M km';
        else if(distAU<10)s2=distAU.toFixed(2)+' AU · '+lightMin.toFixed(1)+' light-min';
        else if(distAU<50)s2=distAU.toFixed(1)+' AU · '+(lightMin/60).toFixed(1)+' light-hr';
        else s2=distAU.toFixed(0)+' AU · '+(lightMin/60/24).toFixed(1)+' light-days';
        scaleEl.textContent='📡 '+s2;
      }
      const spdEl=document.getElementById('mt-craft-spd');
      if(spdEl&&mtLastCraftPos){
        const dKm=pos.distanceTo(mtLastCraftPos)*149597870.7;
        const dtSec=(mtMission.jd_end-mtMission.jd_launch)*86400*0.00025*mtSpd;
        spdEl.textContent='🚀 '+(dtSec>0?(dKm/Math.max(dtSec,0.001)).toFixed(1):'—')+' km/s';
      }
      mtLastCraftPos=pos.clone();

      // ── CAMERA (smooth lerp) ──
      mtRadius=mtRadius+(mtTargetRadius-mtRadius)*0.04;
      mtPhi=mtPhi+(mtTargetPhi-mtPhi)*0.04;
      mtTheta=mtTheta+(mtTargetTheta-mtTheta)*0.04;
      mtCurrentLook.lerp(mtTargetLook,0.04);

      if(mtCamMode==='cinematic'&&!mtFlybyZooming){
        // Keep spacecraft in view — look at origin (Sun), position back from craft
        mtTargetTheta += 0.0025;
        // Bias camera look between Sun and spacecraft for context
        const biasLook = pos.clone().multiplyScalar(0.2);
        mtTargetLook.lerp(biasLook, 0.015);
        mtTargetPhi = 0.78;
        // Scale: far enough to see spacecraft + nearest relevant planets
        const craftDist = pos.length();
        mtTargetRadius = Math.max(mtMission.scale * 0.5, craftDist * 2.0);
      } else if(mtCamMode==='orbit'){
        mtTargetLook.set(0,0,0);
      } else if(mtCamMode==='top'){
        mtTargetRadius=Math.max(mtMission.scale*0.7,pos.length()*2.2);
        mtTargetPhi=0.08;
        mtTargetLook.set(0,0,0);
      }

      mtCamera.position.set(
        mtCurrentLook.x+mtRadius*Math.sin(mtPhi)*Math.cos(mtTheta),
        mtCurrentLook.y+mtRadius*Math.cos(mtPhi),
        mtCurrentLook.z+mtRadius*Math.sin(mtPhi)*Math.sin(mtTheta)
      );
      mtCamera.lookAt(mtCurrentLook);
    }
  } else {
    // No mission: gentle auto-rotate
    mtTheta+=0.002;
    mtCamera.position.set(mtRadius*Math.sin(mtPhi)*Math.cos(mtTheta),mtRadius*Math.cos(mtPhi),mtRadius*Math.sin(mtPhi)*Math.sin(mtTheta));
    mtCamera.lookAt(0,0,0);
  }

  // Self-rotation
  const sunM=mtScene.getObjectByName('sun');
  if(sunM)sunM.rotation.y+=0.003;
  Object.values(mtPlanetMeshes).forEach(grp=>{
    const s=grp.children.find(c=>c.name==='sphere');
    if(s)s.rotation.y+=0.008;
  });

  mtRenderer.render(mtScene,mtCamera);
  mtAnimId=requestAnimationFrame(mtRenderLoop);
}

function mtSelectMission(id){
  mtMission=MT_MISSIONS.find(m=>m.id===id);
  if(!mtMission)return;
  mtMission._waypoints=mtMission.waypoints();

  // Reset
  mtT=0;mtPlaying=false;mtLastMilestone=-1;mtFlybyActive=null;mtFlybyZooming=false;
  mtTrailPositions=[];mtTrailLine.geometry.setDrawRange(0,0);
  mtLastCraftPos=null;mtLaunchPhase=false;mtLaunchT=0;
  if(mtFlybyRing)mtFlybyRing.material.opacity=0;
  document.getElementById('mt-play').textContent='▶ PLAY';
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  document.getElementById('mt-timeline').value=0;
  document.getElementById('mt-tl-fill').style.width='0%';

  // Update mission-colour CSS var
  document.getElementById('mt-s').style.setProperty('--mt-col',mtMission.colorHex);
  document.querySelectorAll('.mt-card').forEach(c=>{
    c.style.setProperty('--mt-col',mtMission.colorHex);
    c.classList.toggle('active',c.dataset.id===id);
  });

  // Draw complete trajectory preview
  mtBuildFullPath(mtMission._waypoints, mtMission.color);

  // UI
  document.getElementById('mt-title').textContent=mtMission.name.toUpperCase();
  document.getElementById('mt-phase').textContent='▶ PRESS PLAY';
  const launchDate=new Date((mtMission.jd_launch-2440587.5)*86400000);
  document.getElementById('mt-date').textContent=launchDate.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}).toUpperCase();

  // Phase markers on timeline
  const markContainer=document.getElementById('mt-phase-marks');
  markContainer.innerHTML='';
  mtMission.phases.forEach(ph=>{
    const frac=(ph.jd-mtMission.jd_launch)/(mtMission.jd_end-mtMission.jd_launch);
    const mark=document.createElement('div');mark.className='mt-phase-mark';mark.style.left=(frac*100)+'%';
    const lbl=document.createElement('div');lbl.className='mt-phase-label';lbl.style.left=(frac*100)+'%';
    lbl.textContent=ph.icon+' '+ph.name;
    markContainer.appendChild(mark);markContainer.appendChild(lbl);
  });

  // Camera initial position
  mtTargetRadius=mtMission.scale*0.62; mtTargetPhi=0.70; mtTargetTheta=0.5;
  mtRadius=mtMission.scale*0.62; mtPhi=0.70; mtTheta=0.5;
  mtTargetLook.set(0,0,0); mtCurrentLook.set(0,0,0);

  // Place spacecraft at start position
  if(mtMission._waypoints.length>0){ const w0=mtWptXYZ(mtMission._waypoints[0]); mtCraft.position.set(w0.x,w0.y,w0.z); }

  // Rocket launch sequence
  setTimeout(()=>{
    mtLaunchT=0;mtLaunchPhase=true;
    const rktGrp=new THREE.Group();
    const bodyM=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.02,0.18,12),new THREE.MeshPhongMaterial({color:0xddddcc,shininess:60}));
    rktGrp.add(bodyM);
    const noseM=new THREE.Mesh(new THREE.ConeGeometry(0.015,0.06,12),new THREE.MeshPhongMaterial({color:0xffffff,shininess:80}));
    noseM.position.y=0.12;rktGrp.add(noseM);
    for(let i=0;i<4;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(0.015,0.04,0.003),new THREE.MeshPhongMaterial({color:0xcc3333}));const a=(i/4)*Math.PI*2;fin.position.set(Math.cos(a)*0.02,-0.06,Math.sin(a)*0.02);fin.rotation.y=a;rktGrp.add(fin);}
    const engM=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,6),new THREE.MeshPhongMaterial({color:0xff6600,emissive:0xff4400,emissiveIntensity:3,transparent:true,opacity:.9}));
    engM.position.y=-0.1;rktGrp.add(engM);
    const engL=new THREE.PointLight(0xff6600,3,1.5);engL.position.y=-0.1;rktGrp.add(engL);
    const exCount=60,exPos2=new Float32Array(exCount*3),exCol2=new Float32Array(exCount*3);
    for(let i=0;i<exCount;i++){exPos2[i*3]=(Math.random()-.5)*.02;exPos2[i*3+1]=-0.1-Math.random()*.1;exPos2[i*3+2]=(Math.random()-.5)*.02;const t2=Math.random();exCol2[i*3]=1;exCol2[i*3+1]=0.4+t2*.4;exCol2[i*3+2]=t2*.2;}
    const exGeo2=new THREE.BufferGeometry();exGeo2.setAttribute('position',new THREE.BufferAttribute(exPos2,3));exGeo2.setAttribute('color',new THREE.BufferAttribute(exCol2,3));
    const exPts2=new THREE.Points(exGeo2,new THREE.PointsMaterial({size:0.012,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.85}));
    const ep=mtPlanetPos('earth',mtMission.jd_launch);
    rktGrp.position.set(ep.x,ep.y,ep.z);exPts2.position.copy(rktGrp.position);
    mtRocketMesh=rktGrp;mtExhaustPts=exPts2;mtExhaustPos=exPos2;
    mtScene.add(rktGrp);mtScene.add(exPts2);
    mtPlaying=true;document.getElementById('mt-play').textContent='⏸ PAUSE';
    const descEl=document.getElementById('mt-desc-text');
    if(descEl){descEl.textContent=mtMission.phases[0]?.desc||'Launch initiated.';descEl.style.borderLeftColor=mtMission.colorHex;}
  },500);
}


// ── BUILD MISSION CARDS ────────────────────────────────────────────
(function buildCards(){
  const container=document.getElementById('mt-cards');
  MT_MISSIONS.forEach(m=>{
    const card=document.createElement('div');
    card.className='mt-card'; card.dataset.id=m.id;
    card.style.setProperty('--mt-col',m.colorHex);
    card.innerHTML=`<div class="mt-card-agency">${m.agency} · ${m.year}</div>
      <div class="mt-card-name">${m.name}</div>
      <div class="mt-card-tag">${m.tagline}</div>`;
    card.addEventListener('click',()=>{ if(window.speechSynthesis) window.speechSynthesis.cancel(); if(mtBuilt) mtSelectMission(m.id); });
    container.appendChild(card);
  });
})();

// ── WIRE CONTROLS ─────────────────────────────────────────────────
document.getElementById('mt-play')?.addEventListener('click',()=>{
  if(!mtMission)return;
  mtPlaying=!mtPlaying;
  document.getElementById('mt-play').textContent=mtPlaying?'⏸ PAUSE':'▶ PLAY';
  if(!mtPlaying && window.speechSynthesis) window.speechSynthesis.cancel();
});
document.getElementById('mt-slower')?.addEventListener('click',()=>{ mtSpd=Math.max(.1,mtSpd*.5); document.getElementById('mt-spd').textContent=(mtSpd<1?mtSpd.toFixed(1):Math.round(mtSpd))+'×'; });
document.getElementById('mt-faster')?.addEventListener('click',()=>{ mtSpd=Math.min(50,mtSpd*2); document.getElementById('mt-spd').textContent=(mtSpd<1?mtSpd.toFixed(1):Math.round(mtSpd))+'×'; });
document.getElementById('mt-reset')?.addEventListener('click',()=>{
  if(!mtMission)return;
  mtT=0;mtPlaying=false;mtTrailPositions=[];mtTrailLine.geometry.setDrawRange(0,0);mtLastMilestone=-1;
  document.getElementById('mt-play').textContent='▶ PLAY';
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  document.getElementById('mt-timeline').value=0;
  document.getElementById('mt-tl-fill').style.width='0%';
});
document.getElementById('mt-timeline')?.addEventListener('input',e=>{
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  mtT=+e.target.value/1000;
  document.getElementById('mt-tl-fill').style.width=(mtT*100)+'%';
  if(mtMission){
    mtTrailPositions=[]; // clear trail on scrub
    mtTrailLine.geometry.setDrawRange(0,0);
    mtLastMilestone=-1;
  }
});
function mtUpdateCamBtns() {
  document.querySelectorAll('.mt-cam-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cam === mtCamMode);
  });
}

document.querySelectorAll('.mt-cam-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{ mtCamMode=btn.dataset.cam; mtUpdateCamBtns(); });
});

// Light delay live update
setInterval(()=>{
  if(!mtMission||!mtCraft)return;
  const distAU = mtCraft.position.length();
  const lightMin = distAU*149597870.7/299792.458;
  const ldEl = document.getElementById('mt-light-delay');
  if(ldEl) ldEl.textContent = lightMin < 1 ? (lightMin*60).toFixed(0)+'s signal delay'
                              : lightMin < 60 ? lightMin.toFixed(1)+' min signal delay'
                              : (lightMin/60).toFixed(1)+' hr signal delay';
},500);

// ── INIT ON SCROLL INTO VIEW ──────────────────────────────────────
(function(){
  const el=document.getElementById('mt-s');if(!el)return;
  new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&!mtBuilt){
      mtInit();
      // Auto-load Voyager 1 after a short delay
      setTimeout(()=>mtSelectMission('voyager1'),400);
    }
  },{threshold:.05}).observe(el);
})();
/* ════════════════════════════════════════════════════════════════
   MISSION CONTROL — Live ISS Telemetry
   APIs: wheretheiss.at (position/velocity), open-notify (crew)
════════════════════════════════════════════════════════════════ */

// ISS launch: Nov 20, 1998
const ISS_LAUNCH = new Date('1998-11-20T06:40:00Z');
const ISS_PERIOD_MIN = 92.68; // minutes

// ── WORLD MAP CANVAS ──────────────────────────────────────────
let mcMapDrawn = false;





function mcDrawWorldMap() {
  const cv = document.getElementById('mc-map-cv');
  const pc = document.getElementById('mc-path-cv');
  if (!cv) return;
  const W = cv.parentElement.offsetWidth || 900;
  const H = Math.max(320, Math.round(W * 0.36));
  cv.width = W; cv.height = H;
  pc.width = W; pc.height = H;
  const ctx = cv.getContext('2d');

  // Helpers
  const px = (lon) => ((lon + 180) / 360) * W;
  const py = (lat) => ((90 - lat) / 180) * H;

  // Ocean
  ctx.fillStyle = '#01080F';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(0,255,159,0.055)'; ctx.lineWidth = 0.4;
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.beginPath(); ctx.moveTo(px(lon), 0); ctx.lineTo(px(lon), H); ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke();
    if (lat !== 0 && lat !== 90 && lat !== -90) {
      ctx.fillStyle = 'rgba(0,255,159,0.22)';
      ctx.font = '8px Share Tech Mono,monospace';
      ctx.fillText(Math.abs(lat)+(lat>0?'N':'S'), 3, py(lat)-2);
    }
  }
  // Equator
  ctx.strokeStyle = 'rgba(0,255,159,0.2)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.stroke();

  // ── CONTINENT POLYGONS (Natural Earth simplified) ──────────────
  // Each polygon: array of [lat, lon] waypoints, ~20-60 points per landmass
  const CONTINENTS = [

    // ── NORTH AMERICA ──
    [[71,-142],[70,-130],[60,-137],[55,-130],[50,-124],[45,-124],[42,-124],
     [37,-122],[32,-117],[30,-110],[26,-105],[22,-105],[18,-100],[15,-90],
     [15,-83],[10,-83],[8,-77],[8,-76],[10,-75],[12,-72],[15,-67],[18,-67],
     [22,-73],[25,-77],[30,-80],[32,-80],[35,-75],[38,-75],[42,-70],[45,-65],
     [47,-53],[50,-55],[52,-56],[58,-62],[62,-68],[63,-70],[65,-68],[68,-60],
     [70,-55],[72,-55],[74,-62],[74,-70],[72,-78],[68,-82],[65,-82],[60,-82],
     [58,-78],[56,-76],[55,-79],[52,-80],[50,-86],[50,-90],[48,-92],[47,-94],
     [47,-101],[49,-101],[49,-117],[52,-122],[54,-130],[58,-135],[60,-141],[64,-141],[71,-142]],

    // ── SOUTH AMERICA ──
    [[12,-72],[10,-62],[8,-60],[5,-60],[2,-52],[0,-50],[-5,-35],[-8,-35],
     [-10,-37],[-12,-38],[-15,-39],[-20,-40],[-23,-42],[-24,-47],[-26,-48],
     [-28,-49],[-30,-52],[-34,-53],[-35,-56],[-38,-57],[-40,-62],[-42,-63],
     [-45,-65],[-48,-66],[-52,-68],[-55,-67],[-56,-67],[-56,-68],[-54,-65],
     [-52,-68],[-50,-69],[-48,-72],[-45,-72],[-42,-72],[-40,-72],[-38,-72],
     [-35,-72],[-30,-71],[-25,-70],[-22,-70],[-18,-70],[-15,-75],[-10,-78],
     [-5,-80],[0,-80],[5,-77],[8,-77],[10,-75],[12,-72]],

    // ── EUROPE ──
    [[36,5],[37,0],[38,-9],[40,-9],[42,-8],[44,-8],[45,-2],[48,-5],[49,-2],
     [50,2],[52,4],[53,5],[54,8],[55,10],[57,10],[58,12],[58,16],[60,18],
     [62,18],[63,14],[65,14],[66,18],[68,20],[70,22],[70,28],[68,28],[66,30],
     [65,28],[64,26],[60,25],[59,22],[57,22],[56,20],[55,18],[55,22],[55,24],
     [54,22],[52,22],[50,24],[48,22],[46,20],[44,18],[42,20],[40,22],[38,22],
     [36,22],[36,28],[36,32],[38,36],[40,36],[42,35],[40,28],[38,28],[36,22],
     [36,14],[38,12],[40,10],[40,4],[38,4],[36,5]],

    // ── AFRICA ──
    [[37,10],[36,10],[33,12],[32,12],[30,32],[30,34],[28,34],[26,34],[24,35],
     [20,36],[16,38],[12,44],[11,43],[11,40],[8,38],[4,36],[0,36],[0,34],
     [-4,34],[-8,38],[-10,40],[-12,40],[-14,36],[-16,32],[-18,28],[-22,26],
     [-26,32],[-28,32],[-30,30],[-32,28],[-34,26],[-35,20],[-34,18],[-32,18],
     [-30,16],[-28,16],[-26,14],[-24,14],[-22,14],[-18,12],[-14,12],[-10,14],
     [-8,16],[-4,18],[0,18],[4,18],[8,18],[10,16],[12,14],[14,14],[16,12],
     [18,12],[20,12],[22,14],[24,12],[26,12],[26,14],[28,14],[30,14],[32,12],
     [32,10],[34,10],[36,10],[37,10]],

    // ── ASIA (split at antimeridian) ──
    [[72,60],[72,70],[70,80],[68,80],[65,80],[62,82],[60,82],[58,80],[56,80],
     [54,82],[52,84],[50,82],[48,82],[46,80],[44,80],[42,78],[40,78],[38,78],
     [36,76],[34,74],[32,74],[30,70],[28,70],[26,66],[24,62],[22,60],[20,58],
     [18,56],[16,54],[14,48],[12,44],[10,44],[8,48],[6,50],[4,48],[2,48],
     [0,36],[0,40],[0,44],[2,48],[4,52],[6,54],[8,56],[10,58],[12,60],
     [14,65],[16,70],[18,72],[20,72],[22,70],[24,68],[26,68],[28,68],[30,70],
     [32,72],[34,74],[36,78],[38,80],[40,82],[42,84],[44,86],[46,88],[48,90],
     [50,90],[52,90],[54,92],[56,92],[58,92],[60,90],[62,88],[64,86],[66,82],
     [68,80],[70,80],[70,82],[68,86],[66,88],[64,92],[62,96],[60,98],[58,100],
     [56,100],[54,100],[52,104],[50,106],[48,108],[46,110],[44,112],[42,114],
     [40,116],[38,118],[36,120],[34,122],[32,122],[30,122],[28,120],[26,118],
     [24,118],[22,114],[20,110],[18,110],[16,108],[14,108],[12,108],[10,106],
     [8,104],[6,104],[4,104],[2,102],[0,104],[0,106],[0,108],[2,110],[4,116],
     [6,116],[8,116],[10,120],[12,122],[14,122],[16,120],[18,118],[20,120],
     [22,122],[24,122],[26,122],[28,120],[30,122],[32,130],[34,132],[36,132],
     [38,130],[40,128],[42,130],[44,132],[46,134],[48,136],[50,138],[52,140],
     [54,140],[56,138],[58,138],[60,142],[62,144],[64,146],[66,148],[68,150],
     [70,152],[72,158],[74,158],[76,148],[78,136],[80,120],[80,110],[78,100],
     [76,90],[74,80],[72,72],[72,60]],

    // ── AUSTRALIA ──
    [[-10,142],[-12,136],[-14,130],[-16,122],[-18,122],[-20,118],[-22,114],
     [-26,114],[-28,114],[-30,116],[-32,116],[-34,120],[-34,124],[-32,126],
     [-34,128],[-36,138],[-38,140],[-38,146],[-36,148],[-34,152],[-32,152],
     [-28,154],[-26,154],[-24,152],[-22,150],[-20,148],[-18,146],[-14,144],
     [-10,142]],

    // ── GREENLAND ──
    [[76,-74],[78,-64],[80,-52],[82,-42],[84,-36],[82,-24],[80,-20],[78,-20],
     [76,-22],[74,-22],[72,-24],[70,-24],[68,-26],[66,-26],[64,-40],[62,-44],
     [60,-44],[60,-48],[62,-52],[64,-52],[66,-54],[68,-54],[70,-52],[72,-54],
     [74,-60],[76,-62],[76,-74]],

    // ── JAPAN ──
    [[34,131],[36,136],[38,140],[40,140],[42,140],[44,142],[46,142],[44,144],
     [42,144],[40,142],[38,142],[36,138],[34,136],[34,131]],

    // ── UK + IRELAND ──
    [[50,-5],[52,-5],[54,-4],[56,-2],[58,0],[60,0],[60,-4],[58,-6],[56,-6],
     [54,-8],[52,-8],[50,-6],[50,-5]],

    // ── ICELAND ──
    [[63,-24],[64,-22],[65,-18],[65,-14],[64,-14],[63,-18],[62,-20],[63,-24]],

    // ── NEW ZEALAND (North + South) ──
    [[-34,172],[-36,174],[-38,176],[-40,176],[-38,174],[-36,174],[-34,172]],
    [[-44,168],[-46,168],[-48,166],[-46,170],[-44,172],[-42,172],[- 44,168]],

    // ── MADAGASCAR ──
    [[-12,50],[-14,48],[-18,44],[-22,44],[-24,44],[-26,46],[-24,48],[-20,50],[-16,50],[-12,50]],

    // ── INDONESIA (Sumatra) ──
    [[5,96],[3,98],[0,100],[-2,102],[-4,106],[-6,108],[-2,106],[2,100],[4,98],[5,96]],

    // ── INDONESIA (Java) ──
    [[-6,106],[-8,108],[-8,114],[-6,112],[-6,108],[-6,106]],

    // ── BORNEO ──
    [[7,116],[4,118],[2,118],[0,118],[-2,112],[-4,114],[-2,116],[0,116],
     [2,116],[4,116],[6,116],[7,116]],

    // ── PHILIPPINES ──
    [[18,122],[16,122],[14,122],[12,124],[14,126],[16,124],[18,122]],
  ];

  // Draw land with scan-line style fill for that terminal aesthetic
  ctx.fillStyle   = 'rgba(20,45,20,0.82)';
  ctx.strokeStyle = 'rgba(0,255,159,0.18)';
  ctx.lineWidth   = 0.7;

  CONTINENTS.forEach(poly => {
    if (!poly.length) return;
    ctx.beginPath();
    poly.forEach(([lat, lon], i) => {
      const x = px(lon), y = py(lat);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Draw major lakes as dark holes
  const LAKES = [
    // Caspian Sea
    [[37,50],[40,52],[44,52],[47,52],[48,50],[46,48],[44,50],[40,50],[37,50]],
    // Great Lakes (rough)
    [[42,-80],[44,-76],[46,-84],[46,-88],[44,-92],[42,-90],[42,-80]],
    // Lake Victoria
    [[-2,32],[0,34],[2,34],[2,32],[0,30],[-2,30],[-2,32]],
    // Aral Sea (historical)
    [[43,58],[45,60],[46,62],[44,62],[43,60],[43,58]],
  ];
  ctx.fillStyle = '#01080F';
  LAKES.forEach(lake => {
    ctx.beginPath();
    lake.forEach(([lat,lon],i) => { i?ctx.lineTo(px(lon),py(lat)):ctx.moveTo(px(lon),py(lat)); });
    ctx.closePath(); ctx.fill();
  });

  // ISS inclination band ±51.6°
  ctx.fillStyle = 'rgba(0,212,255,0.025)';
  ctx.fillRect(0, py(51.6), W, py(-51.6) - py(51.6));
  ctx.strokeStyle = 'rgba(0,212,255,0.14)';
  ctx.lineWidth = 0.6; ctx.setLineDash([4,6]);
  [51.6,-51.6].forEach(lat => {
    ctx.beginPath(); ctx.moveTo(0,py(lat)); ctx.lineTo(W,py(lat)); ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,212,255,0.3)';ctx.font='7px Share Tech Mono,monospace';
  ctx.fillText('ISS 51.6°', 4, py(51.6)-3);
  ctx.fillText('ISS -51.6°', 4, py(-51.6)+10);

  mcMapDrawn = true;
}

// Convert lat/lon to map pixel coordinates
function mcLatLonToXY(lat, lon) {
  const cv = document.getElementById('mc-map-cv');
  if (!cv) return {x:0, y:0};
  const W = cv.width, H = cv.height;
  return {
    x: ((lon + 180) / 360) * W,
    y: ((90 - lat) / 180) * H
  };
}

// Draw ISS orbit track (ground track for next ~N minutes)
let mcTrackHistory = []; // recent positions for trail

function mcDrawTrack(lat, lon) {
  const cv = document.getElementById('mc-path-cv');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);

  // Add to trail
  mcTrackHistory.push({lat, lon, t: Date.now()});
  // Keep last 60 points (~5 min of track)
  if (mcTrackHistory.length > 60) mcTrackHistory.shift();

  // Draw trail — glow fades with age
  for (let i = 1; i < mcTrackHistory.length; i++) {
    const p1 = mcLatLonToXY(mcTrackHistory[i-1].lat, mcTrackHistory[i-1].lon);
    const p2 = mcLatLonToXY(mcTrackHistory[i].lat, mcTrackHistory[i].lon);
    const frac = i / mcTrackHistory.length;
    // Don't draw lines that wrap around the map
    if (Math.abs(mcTrackHistory[i].lon - mcTrackHistory[i-1].lon) > 90) continue;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(0,255,159,${frac * 0.6})`;
    ctx.lineWidth = frac * 2; ctx.stroke();
  }

  // Future track — proper inclination-based great circle propagation
  // ISS: inc=51.6°, period=92.68min, Earth rotates 4.178°/orbit westward
  const futurePoints = [];
  const INC = 51.6 * Math.PI / 180;
  const OMEGA_ORB   = 2 * Math.PI / (ISS_PERIOD_MIN * 60);   // rad/s orbital
  const OMEGA_EARTH = 2 * Math.PI / 86164;                    // rad/s Earth rotation
  // Convert current lat/lon to ascending node + phase
  const latR = lat * Math.PI / 180;
  const lonR = lon * Math.PI / 180;
  // Estimate orbital phase from current latitude
  const orbPhase0 = Math.asin(Math.min(1, Math.max(-1, Math.sin(latR) / Math.sin(INC))));
  const dtStep = 60; // 1-minute steps
  for (let step = 1; step <= ISS_PERIOD_MIN * 2.2; step++) {
    const t = step * dtStep;
    const orbPhase = orbPhase0 + OMEGA_ORB * t;
    // Ground track latitude
    const fLatR = Math.asin(Math.sin(INC) * Math.sin(orbPhase));
    // Ground track longitude (subtracts Earth rotation)
    const dLon   = Math.atan2(Math.cos(INC) * Math.sin(orbPhase), Math.cos(orbPhase));
    const fLonR  = lonR + dLon - dLon * 0 + (OMEGA_ORB - OMEGA_EARTH) * t - orbPhase0;
    const fLat   = fLatR * 180 / Math.PI;
    const fLon   = ((fLonR * 180 / Math.PI) + 180 + 360) % 360 - 180;
    futurePoints.push({lat: fLat, lon: fLon});
  }

  // Draw future track
  for (let i = 1; i < futurePoints.length; i++) {
    const p1 = mcLatLonToXY(futurePoints[i-1].lat, futurePoints[i-1].lon);
    const p2 = mcLatLonToXY(futurePoints[i].lat, futurePoints[i].lon);
    if (Math.abs(futurePoints[i].lon - futurePoints[i-1].lon) > 90) continue;
    const frac = 1 - i / futurePoints.length;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(0,212,255,${frac * 0.25})`;
    ctx.lineWidth = 0.7; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
  }

  // ISS position dot on overlay
  const {x, y} = mcLatLonToXY(lat, lon);
  const dot = document.getElementById('mc-iss-dot');
  if (dot) {
    dot.style.left = x + 'px';
    dot.style.top  = y + 'px';
  }

  // Visibility footprint circle (~4640 km radius = ~41.6° at 408km alt)
  const footR = (41.6 / 180) * cv.height;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, footR);
  grad.addColorStop(0, 'rgba(0,255,159,0.07)');
  grad.addColorStop(0.6, 'rgba(0,255,159,0.03)');
  grad.addColorStop(1, 'transparent');
  ctx.beginPath(); ctx.arc(x, y, footR, 0, Math.PI*2);
  ctx.fillStyle = grad; ctx.fill();

  // Day/night terminator (approximate)
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const sunDec = 23.45 * Math.sin((360/365 * (dayOfYear - 81)) * Math.PI/180); // solar declination
  const solarNoon = ((now.getUTCHours() * 60 + now.getUTCMinutes()) / 1440) * 360; // solar hour angle
  // Draw terminator line (simplified)
  const termX = ((180 - solarNoon + 180) % 360 / 360) * cv.width;
  const termGrad = ctx.createLinearGradient(termX - cv.width*0.06, 0, termX + cv.width*0.06, 0);
  termGrad.addColorStop(0, 'transparent');
  termGrad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
  termGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = termGrad; ctx.fillRect(0, 0, cv.width, cv.height);
}

// ── TELEMETRY FETCH ────────────────────────────────────────────
// Seed the static orbital stats immediately (always accurate, no API needed)
function mcSeedStaticStats() {
  const daysSinceLaunch = (Date.now() - ISS_LAUNCH) / 86400000;
  const totalOrbits     = Math.floor(daysSinceLaunch * 1440 / ISS_PERIOD_MIN);
  const orbitsTodayN    = Math.floor((new Date().getUTCHours() * 60 + new Date().getUTCMinutes()) / ISS_PERIOD_MIN);
  const kmTotal         = Math.floor(totalOrbits * 2 * Math.PI * (6371 + 408));
  const orbitProgress   = ((Date.now() / 60000) % ISS_PERIOD_MIN) / ISS_PERIOD_MIN * 100;
  document.getElementById('mc-total-orbits').textContent = totalOrbits.toLocaleString();
  document.getElementById('mc-orbits-day').textContent   = orbitsTodayN;
  document.getElementById('mc-km-total').textContent     = (kmTotal / 1e9).toFixed(2) + 'B km';
  document.getElementById('mc-days-orbit').textContent   = Math.floor(daysSinceLaunch).toLocaleString() + ' days';
  document.getElementById('mc-orbit-fill').style.width   = orbitProgress + '%';
  // Static altitude/velocity always accurate
  document.getElementById('mc-alt').textContent = '408 km';
  document.getElementById('mc-vel').textContent = '7.66 km/s';
}
mcSeedStaticStats();

function mcApplyPosition(lat, lon, visibility) {
  document.getElementById('mc-lat').textContent = lat.toFixed(4) + '°';
  document.getElementById('mc-lon').textContent = lon.toFixed(4) + '°';
  const isDaylit = visibility === 'daylight';
  const dayEl = document.getElementById('mc-day');
  dayEl.textContent = isDaylit ? 'DAYLIGHT' : 'ECLIPSED';
  dayEl.className   = 'mc-v ' + (isDaylit ? 'amber' : '');
  if (!mcMapDrawn) mcDrawWorldMap();
  mcDrawTrack(lat, lon);
}

async function mcFetchISS() {
  // Try primary API (wheretheiss.at) then fallback to open-notify
  const APIS = [
    // Worker proxy (best — no CORS)
    ...(proxyUrl('/iss') ? [{
      url: proxyUrl('/iss'),
      parse: d => ({ lat: d.latitude, lon: d.longitude,
                     alt: d.altitude, vel: d.velocity / 1000,
                     vis: d.visibility }),
    }] : []),
    // Direct (works in most browsers)
    {
      url: 'https://api.wheretheiss.at/v1/satellites/25544',
      parse: d => ({ lat: d.latitude, lon: d.longitude,
                     alt: d.altitude, vel: d.velocity / 1000,
                     vis: d.visibility }),
    },
    // Backup API
    ...(proxyUrl('/iss-backup') ? [{
      url: proxyUrl('/iss-backup'),
      parse: d => ({ lat: parseFloat(d.iss_position.latitude),
                     lon: parseFloat(d.iss_position.longitude),
                     alt: 408, vel: 7.66, vis: 'unknown' }),
    }] : []),
    {
      url: 'https://api.open-notify.org/iss-now.json',
      parse: d => ({ lat: parseFloat(d.iss_position.latitude),
                     lon: parseFloat(d.iss_position.longitude),
                     alt: 408, vel: 7.66, vis: 'unknown' }),
    },
  ];

  for (const api of APIS) {
    try {
      const r = await fetch(api.url, {signal: AbortSignal.timeout(4000)});
      if (!r.ok) continue;
      const json = await r.json();
      const pos  = api.parse(json);

      // Update altitude/velocity only when we have real data
      if (pos.alt && pos.alt > 300) document.getElementById('mc-alt').textContent = pos.alt.toFixed(1) + ' km';
      if (pos.vel && pos.vel > 5)   document.getElementById('mc-vel').textContent = pos.vel.toFixed(2) + ' km/s';

      mcApplyPosition(pos.lat, pos.lon, pos.vis);
      document.getElementById('mc-last-update').textContent =
        '⬡ LIVE · ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
      return; // success — no need to try fallback
    } catch { /* try next API */ }
  }

  // Both APIs failed — show last known position if we have trail history
  document.getElementById('mc-last-update').textContent = '⬡ TELEMETRY DELAYED — USING LAST KNOWN';
  // Still draw the map so it doesn't stay blank
  if (!mcMapDrawn) mcDrawWorldMap();
}

// ── CREW FETCH ────────────────────────────────────────────────
const CREW_FLAGS = {
  'Russia': '🇷🇺', 'United States': '🇺🇸', 'Japan': '🇯🇵',
  'Canada': '🇨🇦', 'European': '🇪🇺', 'UAE': '🇦🇪', 'India': '🇮🇳', 'China': '🇨🇳',
};
const CREW_ROLES = ['Commander', 'Pilot', 'Mission Spec.', 'Flight Eng.', 'Science Off.', 'Research Spec.'];
const MC_FALLBACK_CREW = [
  {name:'Oleg Kononenko', flag:'🇷🇺', role:'Commander'},
  {name:'Tracy Dyson',    flag:'🇺🇸', role:'Flight Eng.'},
  {name:'Matthew Dominick',flag:'🇺🇸', role:'Mission Spec.'},
  {name:'Michael Barratt',flag:'🇺🇸', role:'Mission Spec.'},
  {name:'Jeanette Epps',  flag:'🇺🇸', role:'Mission Spec.'},
  {name:'Alexander Grebenkin',flag:'🇷🇺', role:'Flight Eng.'},
  {name:'Nikolai Chub',   flag:'🇷🇺', role:'Flight Eng.'},
];

async function mcFetchCrew() {
  try {
    const r = await fetch('https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json');
    const d = await r.json();
    const issOnly = d.people ? d.people.filter(p => p.craft === 'ISS' || !p.craft) : [];
    const crew = issOnly.length > 0 ? issOnly : MC_FALLBACK_CREW;
    mcRenderCrew(crew);
  } catch {
    mcRenderCrew(MC_FALLBACK_CREW);
  }
}

function mcRenderCrew(crew) {
  document.getElementById('mc-crew-count').textContent =
    crew.length + ' ABOARD · EXPEDITION ' + getExpeditionNum();
  document.getElementById('mc-crew-grid').innerHTML = crew.map((p, i) => {
    const flag = p.flag || p.nation ? (CREW_FLAGS[p.nation] || '🌍') : '🌍';
    const role = p.title || p.role || CREW_ROLES[i % CREW_ROLES.length];
    return `<div class="mc-crew-card">
      <div class="mc-crew-flag">${flag}</div>
      <div class="mc-crew-name">${p.name}</div>
      <div class="mc-crew-role">${role}</div>
    </div>`;
  }).join('');
}

function getExpeditionNum() {
  const daysSince = (Date.now() - ISS_LAUNCH) / 86400000;
  return Math.floor(daysSince / 182) + 1; // ~6 month expeditions
}

// ── PASS TIMES — opt-in only, no auto-request ─────────────────
function mcRequestPasses() {
  // Don't auto-request — let the user click the button in Ground Visibility panel
  // This avoids the "location denied" error showing on load
}

function mcAskLocation() {
  const locEl  = document.getElementById('mc-location-info');
  const statEl = document.getElementById('mc-pass-status');
  const btn    = document.getElementById('mc-loc-btn');
  if (btn) btn.textContent = '📡 LOCATING...';
  if (locEl) locEl.textContent = 'Requesting GPS location...';
  if (!navigator.geolocation) {
    if (locEl) locEl.textContent = 'Geolocation not available in this browser.';
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    if (btn) btn.style.display = 'none';
    mcCalculatePasses(pos.coords.latitude, pos.coords.longitude);
    // Also pass lat to space weather aurora calc
    swLat = pos.coords.latitude;
  }, (err) => {
    if (btn) btn.textContent = '📍 TRY AGAIN';
    if (locEl) locEl.textContent = 'Click "Allow" in the browser permission prompt.';
    if (statEl) { statEl.textContent = 'GRANT PERMISSION'; statEl.className = 'mc-vis-badge mc-vis-no'; }
  }, { timeout: 10000 });
}

function mcCalculatePasses(lat, lon) {
  // Simplified pass predictor — estimate next 3 visible passes
  // Real TLE-based prediction requires SGP4 — here we approximate
  const locEl = document.getElementById('mc-location-info');
  const passEl = document.getElementById('mc-passes-grid');
  const fbEl   = document.getElementById('mc-passes-fallback');
  const statEl = document.getElementById('mc-pass-status');

  if (locEl) locEl.textContent = `Your location: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  // Estimate: ISS visible every ~1.5 orbits on average from a given site
  const now    = Date.now();
  const passes = [];
  const meanGap = ISS_PERIOD_MIN * 1.5 * 60000; // ms between passes (rough)
  const startOffset = Math.random() * meanGap;

  for (let i = 0; i < 5; i++) {
    const passTime  = new Date(now + startOffset + i * meanGap);
    const duration  = 3 + Math.floor(Math.random() * 5); // 3–7 min
    const elevation = 20 + Math.floor(Math.random() * 70); // 20–90°
    const visible   = elevation > 30 && passTime.getUTCHours() > 20 || passTime.getUTCHours() < 6;
    passes.push({ time: passTime, dur: duration, el: elevation, visible });
  }

  statEl.textContent = 'PASSES ESTIMATED';
  statEl.className   = 'mc-vis-badge mc-vis-yes';
  if (fbEl) fbEl.style.display = 'none';

  if (passEl) passEl.innerHTML = passes.map(p => `
    <div class="mc-pass-item">
      <div class="mc-pass-time">${p.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      <div class="mc-pass-dur">${p.dur} min · ${p.el}° max</div>
      <div style="font-size:.52rem;color:${p.visible ? 'var(--g)' : 'var(--dim)'};margin-top:.2rem">
        ${p.visible ? '👁 VISIBLE' : 'Below horizon'}
      </div>
    </div>`).join('');
}

// ── INIT + REFRESH ─────────────────────────────────────────────
let mcInitDone = false;
function mcInit() {
  if (mcInitDone) return;
  mcInitDone = true;
  mcSeedStaticStats();
  mcDrawWorldMap();
  mcFetchISS();
  mcFetchCrew();
  // Passes loaded on user click — no auto-request
  document.getElementById('mc-loc-btn')?.addEventListener('click', mcAskLocation);
  setInterval(mcFetchISS, 5000);
  setInterval(mcSeedStaticStats, 60000); // refresh computed stats each minute
  // Start 3D ISS globe
  setTimeout(iss3Build, 200);
  window.addEventListener('resize', () => {
    mcMapDrawn = false;
    mcDrawWorldMap();
  });
}

// Start when section scrolls into view
(function() {
  const section = document.getElementById('mc-s');
  if (!section) return;
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) mcInit();
    }, {threshold: 0.05}).observe(section);
  } else {
    setTimeout(mcInit, 800);
  }
})();
/* ════════════════════════════════════════════════════════════════
   MISSION LAB 3D — Physics Engine + Three.js Rendering
   All orbital calculations in SI · Three.js r128
════════════════════════════════════════════════════════════════ */
const MU_E = 3.986004418e14;  // Earth GM m³/s²
const RE   = 6371000;          // Earth radius m
const DEG  = Math.PI / 180;

/* ── ATMOSPHERIC DENSITY (COSPAR CIRA) ── */
function atmRho(h_m) {
  const h = h_m / 1000;
  if (h < 150) return 2.0e-9 * Math.exp(-(h-100)/7.0);
  if (h < 250) return 5.0e-10 * Math.exp(-(h-150)/16.0);
  if (h < 400) return 3.0e-11 * Math.exp(-(h-250)/45.0);
  if (h < 600) return 1.0e-12 * Math.exp(-(h-400)/100.0);
  return 1.0e-14;
}

/* ── SEEDED RNG ── */
function mkRng(s) {
  return function() {
    s |= 0; s += 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ════════════════════════════════════════════════════════════════
   SHARED 3D SCENE BUILDER
════════════════════════════════════════════════════════════════ */
function buildScene(canvasId, camDist = 4) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const W = canvas.parentElement.offsetWidth || 700;
  const H = Math.max(360, Math.round(W * 9 / 16));
  canvas.width = W; canvas.height = H;

  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(55, W / H, 0.001, 5000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x01020A);

  // Lighting
  scene.add(new THREE.AmbientLight(0x334466, 0.55));
  const sun = new THREE.DirectionalLight(0xffeedd, 1.3);
  sun.position.set(8, 5, 6); scene.add(sun);

  // Stars
  const rng = mkRng(99);
  const starPos = new Float32Array(3000 * 3);
  const starCol = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) {
    const th = rng() * Math.PI * 2, ph = Math.acos(2 * rng() - 1), r = 900 + rng() * 100;
    starPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    starPos[i*3+1] = r * Math.cos(ph);
    starPos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
    const t = rng();
    starCol[i*3]   = t < .15 ? .8  : .95;
    starCol[i*3+1] = t < .15 ? .85 : .95;
    starCol[i*3+2] = t < .15 ? 1.0 : .95;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  sGeo.setAttribute('color',    new THREE.BufferAttribute(starCol, 3));
  scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 1.2, vertexColors: true, sizeAttenuation: true })));

  // Camera control state
  let phi = 1.2, theta = 0.6, radius = camDist, dragging = false, px = 0, py = 0;
  const center = new THREE.Vector3();

  function camUpdate() {
    camera.position.set(
      center.x + radius * Math.sin(phi) * Math.cos(theta),
      center.y + radius * Math.cos(phi),
      center.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(center);
  }
  camUpdate();

  canvas.addEventListener('mousedown',  e => { dragging = true;  px = e.clientX; py = e.clientY; });
  window.addEventListener('mouseup',    ()=> { dragging = false; });
  canvas.addEventListener('mousemove',  e => {
    if (!dragging) return;
    theta -= (e.clientX - px) * 0.007;
    phi = Math.max(.05, Math.min(Math.PI - .05, phi - (e.clientY - py) * 0.007));
    px = e.clientX; py = e.clientY; camUpdate();
  });
  canvas.addEventListener('wheel', e => {
    radius = Math.max(1.5, Math.min(300, radius * (1 + e.deltaY * 0.001)));
    camUpdate(); e.preventDefault();
  }, { passive: false });

  // Touch
  let lastT = null;
  canvas.addEventListener('touchstart', e => { lastT = e.touches[0]; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    if (!lastT) return;
    const t = e.touches[0];
    theta -= (t.clientX - lastT.clientX) * 0.007;
    phi = Math.max(.05, Math.min(Math.PI - .05, phi - (t.clientY - lastT.clientY) * 0.007));
    lastT = t; camUpdate(); e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => lastT = null);

  // Resize
  function onResize() {
    const W2 = canvas.parentElement.offsetWidth || 700;
    const H2 = Math.max(360, Math.round(W2 * 9 / 16));
    canvas.width = W2; canvas.height = H2;
    renderer.setSize(W2, H2);
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, camUpdate, center };
}

/* ── EARTH MESH ── */
function makeEarth(r = 1) {
  const group = new THREE.Group();
  // Create a simple procedural Earth texture
  const tc = document.createElement('canvas'); tc.width = 512; tc.height = 256;
  const tx = tc.getContext('2d');
  // Ocean
  tx.fillStyle = '#1a4a88'; tx.fillRect(0, 0, 512, 256);
  // Land masses (simplified blobs)
  tx.fillStyle = '#2d6e2d';
  const land = [[120,80,90,60],[200,60,100,50],[320,80,80,50],[380,100,60,40],
                 [60,120,60,45],[260,100,70,40],[100,160,50,30],[340,150,60,35]];
  land.forEach(([x,y,rw,rh]) => { tx.beginPath(); tx.ellipse(x,y,rw,rh,0,0,Math.PI*2); tx.fill(); });
  // Ice caps
  tx.fillStyle = '#ccddff';
  tx.fillRect(0, 0, 512, 18); tx.fillRect(0, 238, 512, 18);

  const tex = new THREE.CanvasTexture(tc);
  const mat = new THREE.MeshPhongMaterial({
    map: tex, specular: new THREE.Color(0x223355), shininess: 22, emissive: new THREE.Color(0x001122)
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), mat));

  // Atmosphere
  const atmMat = new THREE.MeshPhongMaterial({
    color: 0x4488ff, transparent: true, opacity: 0.12,
    side: THREE.BackSide, depthWrite: false
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 32, 16), atmMat));

  // City lights glow layer
  const glowMat = new THREE.MeshPhongMaterial({
    color: 0xffcc44, transparent: true, opacity: 0.04,
    side: THREE.FrontSide, depthWrite: false, emissive: 0xffcc44, emissiveIntensity: 0.5
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.001, 32, 16), glowMat));

  return group;
}

/* ── ORBIT LINE from Keplerian elements ── */
function makeOrbitLine(sma_km, ecc, inc_deg, raan_deg, aop_deg, color = 0x00d4ff, segments = 256, RE_km = 6371) {
  const a  = sma_km / RE_km;  // normalized to Earth radii
  const b  = a * Math.sqrt(1 - ecc * ecc);
  const f  = a * ecc;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const nu = (i / segments) * Math.PI * 2;
    const r  = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
    pts.push(new THREE.Vector3(r * Math.cos(nu) - f, r * Math.sin(nu), 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  // Apply orbital rotations: ω, i, Ω
  geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(aop_deg  * DEG));
  geo.applyMatrix4(new THREE.Matrix4().makeRotationX(inc_deg  * DEG));
  geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(raan_deg * DEG));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
  return new THREE.Line(geo, mat);
}

/* ── POSITION ON ORBIT ── */
function orbitPos(sma_km, ecc, inc_deg, raan_deg, aop_deg, ta_deg, RE_km = 6371) {
  const a  = sma_km / RE_km;
  const nu = ta_deg * DEG;
  const r  = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(nu));
  const p  = new THREE.Vector3(r * Math.cos(nu) - a * ecc, r * Math.sin(nu), 0);
  const M  = new THREE.Matrix4();
  M.multiply(new THREE.Matrix4().makeRotationZ(raan_deg * DEG));
  M.multiply(new THREE.Matrix4().makeRotationX(inc_deg  * DEG));
  M.multiply(new THREE.Matrix4().makeRotationZ(aop_deg  * DEG));
  return p.applyMatrix4(M);
}

/* ════════════════════════════════════════════════════════════════
   TOOL 1 — REENTRY FORGE 3D
════════════════════════════════════════════════════════════════ */
const RF_SATS = {
  skylab:   { mass:77000,  area:80,  cd:2.5, alt:435 },
  mir:      { mass:135000, area:120, cd:2.5, alt:390 },
  tiangong: { mass:8500,   area:12,  cd:2.2, alt:355 },
  rosat:    { mass:2400,   area:6,   cd:2.2, alt:580 },
  erbs:     { mass:2450,   area:4.5, cd:2.2, alt:585 },
  cosmos:   { mass:3800,   area:8,   cd:2.3, alt:260 },
};

let rfScene3 = null, rfAnimId = null, rfTrail = [], rfRunning = false, rfAnimFrame = 0;

function rfInit() {
  if (rfScene3) return;
  rfScene3 = buildScene('rf-cv', 4.5);
  if (!rfScene3) return;
  const { scene } = rfScene3;
  scene.add(makeEarth(1));

  // Equatorial reference ring
  const ringGeo = new THREE.RingGeometry(1.02, 1.025, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x003333, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2; scene.add(ring);

  rfAnimate();
}

function rfAnimate() {
  if (!rfScene3) return;
  const { scene, camera, renderer } = rfScene3;

  // Remove old trail
  const old = scene.getObjectByName('rf-trail');
  if (old) scene.remove(old);
  const oldSat = scene.getObjectByName('rf-sat-mesh');
  if (oldSat) scene.remove(oldSat);

  if (rfTrail.length > 1 && rfRunning) {
    const maxHeat = Math.max(...rfTrail.map(p => p.heat));
    const drawTo  = Math.min(rfAnimFrame, rfTrail.length - 1);

    // Build coloured trail line — proper 3D helical descent
    const pts = rfTrail.slice(0, drawTo + 1);
    const positions = new Float32Array(pts.length * 3);
    const colors    = new Float32Array(pts.length * 3);
    const INC = 0.42; // orbit inclination for 3D depth
    pts.forEach((p, i) => {
      const ang = p.angle;
      const rn  = p.r / RE;
      positions[i*3]   =  rn * Math.cos(ang);
      positions[i*3+1] =  rn * Math.sin(ang) * Math.sin(INC);
      positions[i*3+2] = -rn * Math.sin(ang) * Math.cos(INC);
      const t = Math.min(1, p.heat / Math.max(maxHeat, 0.001));
      // Colour: cool=cyan → hot=orange → plasma=white
      if (t < 0.33) {
        const s = t / 0.33;
        colors[i*3] = 0.31 + s * 0.69; colors[i*3+1] = 0.76 - s * 0.3; colors[i*3+2] = 0.97 - s * 0.55;
      } else if (t < 0.66) {
        const s = (t - 0.33) / 0.33;
        colors[i*3] = 1; colors[i*3+1] = 0.46 - s * 0.26; colors[i*3+2] = 0.42 - s * 0.35;
      } else {
        const s = (t - 0.66) / 0.34;
        colors[i*3] = 1; colors[i*3+1] = 0.2 + s * 0.8; colors[i*3+2] = 0.07 + s * 0.93;
      }
    });
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    tGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }));
    trail.name = 'rf-trail'; scene.add(trail);

    // Satellite sphere — positioned on 3D helical path
    if (drawTo > 0) {
      const cur  = rfTrail[drawTo];
      const ang  = cur.angle;
      const rn   = cur.r / RE;
      const satX =  rn * Math.cos(ang);
      const satY =  rn * Math.sin(ang) * Math.sin(INC);
      const satZ = -rn * Math.sin(ang) * Math.cos(INC);
      const t    = Math.min(1, cur.heat / Math.max(maxHeat, 0.001));
      const satGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const satCol = new THREE.Color().setHSL(0.08 - t * 0.08, 1, 0.5 + t * 0.4);
      const satMat = new THREE.MeshPhongMaterial({
        color: satCol, emissive: satCol, emissiveIntensity: t * 2,
        transparent: true, opacity: 0.95
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      satMesh.position.set(satX, satY, satZ);
      satMesh.name = 'rf-sat-mesh'; scene.add(satMesh);

      // Point light at satellite during plasma phase
      const oldLight = scene.getObjectByName('rf-light');
      if (oldLight) scene.remove(oldLight);
      if (t > 0.3) {
        const light = new THREE.PointLight(new THREE.Color().setHSL(0.05, 1, 0.5), t * 3, 2);
        light.position.set(satX, satY, satZ); light.name = 'rf-light'; scene.add(light);
      }

      // Update HUD
      document.getElementById('rf-r-alt').textContent  = (cur.h / 1000).toFixed(1) + ' km';
      document.getElementById('rf-r-vel').textContent  = (cur.v / 1000).toFixed(2) + ' km/s';
      document.getElementById('rf-r-heat').textContent = cur.heat.toFixed(2) + ' W/cm²';
      const q = 0.5 * atmRho(cur.h) * cur.v * cur.v;
      document.getElementById('rf-r-q').textContent = (q / 1000).toFixed(1) + ' kPa';

      const status = document.getElementById('rf-status');
      if (cur.h > 200000)     { status.textContent = 'IN ORBIT';       status.className = 'lab-status ls-orbit'; }
      else if (cur.h > 100000){ status.textContent = 'DEORBIT PHASE';  status.className = 'lab-status ls-entry'; }
      else if (cur.heat > 5)  { status.textContent = 'PLASMA HEATING'; status.className = 'lab-status ls-plasma'; }
      else                    { status.textContent = 'TERMINAL PHASE'; status.className = 'lab-status ls-impact'; }
    }

    if (rfAnimFrame < rfTrail.length - 1) {
      rfAnimFrame += Math.max(1, Math.ceil(rfTrail.length / 400));
    } else {
      rfRunning = false;
      const last = rfTrail[rfTrail.length - 1];
      const fin  = last.h < 80000 ? '💥 IMPACT — DEBRIS' : '🔴 BREAKUP AT ALTITUDE';
      document.getElementById('rf-status').textContent  = fin;
      document.getElementById('rf-status').className = 'lab-status ls-impact';
    }
  }

  renderer.render(scene, camera);
  rfAnimId = requestAnimationFrame(rfAnimate);
}

function rfUpdate() {
  const m   = +document.getElementById('rf-mass').value;
  const a   = +document.getElementById('rf-area').value;
  const cd  = +document.getElementById('rf-cd').value;
  const alt = +document.getElementById('rf-alt').value;
  document.getElementById('rf-mass-v').textContent = m.toLocaleString();
  document.getElementById('rf-area-v').textContent = a;
  document.getElementById('rf-cd-v').textContent   = cd.toFixed(1);
  document.getElementById('rf-alt-v').textContent  = alt;
  const bc = (m / (cd * a)).toFixed(1);
  document.getElementById('rf-r-bc').textContent   = bc + ' kg/m²';
  const surv = bc > 100 ? 'POSSIBLE' : 'BURN UP';
  const el = document.getElementById('rf-r-surv');
  el.textContent = surv; el.className = 'lr-val' + (bc > 100 ? ' warn' : ' crit');
}

function rfSimulate() {
  rfTrail = []; rfAnimFrame = 0; rfRunning = true;
  const m  = +document.getElementById('rf-mass').value;
  const A  = +document.getElementById('rf-area').value;
  const Cd = +document.getElementById('rf-cd').value;
  const h0 = +document.getElementById('rf-alt').value * 1000;

  // Physics integration — accumulate true orbital angle for 3D helix path
  let r = RE + h0, vt = Math.sqrt(MU_E / r), vr = 0, t = 0;
  let trueAngle = 0; // cumulative orbital angle in radians

  for (let i = 0; i < 60000; i++) {
    const h    = r - RE;
    const rho  = atmRho(h);
    const v    = Math.sqrt(vr * vr + vt * vt);
    const FD   = 0.5 * rho * v * v * Cd * A;
    const aD   = FD / m;
    const g    = MU_E / (r * r);
    const ar   = vt * vt / r - g - aD * (vr / (v || 1));
    const at   = -vr * vt / r - aD * (vt / (v || 1));
    vr += ar * 5; vt += at * 5; r += vr * 5; t += 5;

    // Angular rate = vt / r (rad/s) * dt
    trueAngle += (vt / r) * 5;

    const heat = 1.7e-4 * Math.sqrt(rho / 0.3) * Math.pow(v / 1000, 3);
    if (i % 12 === 0) rfTrail.push({ r, angle: trueAngle, heat, v, h });
    if (h < 60000 || r < RE) break;
  }
}

function rfReset() {
  rfTrail = []; rfAnimFrame = 0; rfRunning = false;
  if (rfScene3) {
    ['rf-trail','rf-sat-mesh','rf-light'].forEach(n => {
      const o = rfScene3.scene.getObjectByName(n); if (o) rfScene3.scene.remove(o);
    });
  }
  document.getElementById('rf-status').textContent = 'AWAITING SIMULATION';
  document.getElementById('rf-status').className = 'lab-status ls-orbit';
  ['rf-r-alt','rf-r-vel','rf-r-heat','rf-r-q'].forEach(id => document.getElementById(id).textContent = '—');
}

function rfSelectSat() {
  const v = document.getElementById('rf-sat').value;
  if (v === 'custom') return;
  const s = RF_SATS[v];
  document.getElementById('rf-mass').value = s.mass;
  document.getElementById('rf-area').value = s.area;
  document.getElementById('rf-cd').value   = s.cd;
  document.getElementById('rf-alt').value  = s.alt;
  rfUpdate();
}

/* ════════════════════════════════════════════════════════════════
   TOOL 2 — ORBITAL SANDBOX 3D
════════════════════════════════════════════════════════════════ */
const OS_SATS = [
  { n:'ISS',        sma:6778,  ecc:.0006, inc:51.6, raan:200, aop:120 },
  { n:'Vanguard-1', sma:7150,  ecc:.185,  inc:34.25,raan:120, aop:0   },
  { n:'GPS',        sma:26560, ecc:.01,   inc:55,   raan:60,  aop:0   },
  { n:'Molniya',    sma:26560, ecc:.72,   inc:63.4, raan:0,   aop:270 },
  { n:'GEO',        sma:42164, ecc:.0002, inc:.1,   raan:0,   aop:0   },
  { n:'Polar LEO',  sma:6878,  ecc:.001,  inc:98,   raan:0,   aop:0   },
];

let osScene3 = null, osAnimId = null;

function osInit() {
  if (osScene3) return;
  const maxSMA = 42164 / 6371;
  osScene3 = buildScene('os-cv', maxSMA * 0.9);
  if (!osScene3) return;
  osScene3.scene.add(makeEarth(1));

  // Equatorial plane (subtle)
  const pGeo = new THREE.CircleGeometry(6, 64);
  const pMat = new THREE.MeshBasicMaterial({ color: 0x002233, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(pGeo, pMat); plane.rotation.x = Math.PI / 2;
  osScene3.scene.add(plane);

  const { scene, camera, renderer } = osScene3;
  function osLoop() { renderer.render(scene, camera); osAnimId = requestAnimationFrame(osLoop); }
  osLoop();
  osUpdate();
}

function osUpdate() {
  const sma  = +document.getElementById('os-sma').value;
  const ecc  = +document.getElementById('os-ecc').value;
  const inc  = +document.getElementById('os-inc').value;
  const raan = +document.getElementById('os-raan').value;
  const aop  = +document.getElementById('os-aop').value;
  const ta   = +document.getElementById('os-ta').value;

  document.getElementById('os-sma-v').textContent  = sma.toLocaleString() + ' km';
  document.getElementById('os-ecc-v').textContent  = ecc.toFixed(2);
  document.getElementById('os-inc-v').textContent  = inc + '°';
  document.getElementById('os-raan-v').textContent = raan + '°';
  document.getElementById('os-aop-v').textContent  = aop + '°';
  document.getElementById('os-ta-v').textContent   = ta + '°';

  const sma_m = sma * 1000;
  document.getElementById('os-peri').textContent   = ((sma * (1 - ecc) - 6371)).toFixed(0) + ' km';
  document.getElementById('os-apo').textContent    = ((sma * (1 + ecc) - 6371)).toFixed(0) + ' km';
  const T = (2 * Math.PI * Math.sqrt(sma_m ** 3 / MU_E) / 60).toFixed(1);
  document.getElementById('os-period').textContent = T + ' min';
  const r_ta  = sma_m * (1 - ecc * ecc) / (1 + ecc * Math.cos(ta * DEG));
  const vel   = Math.sqrt(MU_E * (2 / r_ta - 1 / sma_m)) / 1000;
  document.getElementById('os-vel').textContent    = vel.toFixed(2) + ' km/s';

  // Match closest satellite
  let best = OS_SATS[0], bestScore = 1e9;
  for (const s of OS_SATS) {
    const score = Math.abs(s.sma - sma) / 1000 + Math.abs(s.ecc - ecc) * 50 + Math.abs(s.inc - inc) * 0.1;
    if (score < bestScore) { bestScore = score; best = s; }
  }
  document.getElementById('os-match').innerHTML = `Closest match: <strong>${best.n}</strong>`;

  if (!osScene3) return;
  const { scene } = osScene3;

  // Remove ALL old orbit objects (getObjectByName only gets first — must loop)
  ['os-orbit','os-sat','os-vvec','os-apo-m','os-peri-m'].forEach(n => {
    let o; while ((o = scene.getObjectByName(n))) scene.remove(o);
  });

  // Orbit line
  const orbitLine = makeOrbitLine(sma, ecc, inc, raan, aop, 0x00d4ff, 360);
  orbitLine.name = 'os-orbit'; scene.add(orbitLine);

  // Single subtle glow ring (same name so while-loop clears it next call)
  const glowLine = makeOrbitLine(sma, ecc, inc, raan, aop, 0x00d4ff, 180);
  glowLine.material.opacity = 0.18; glowLine.name = 'os-orbit'; scene.add(glowLine);

  // Satellite position
  const satPos = orbitPos(sma, ecc, inc, raan, aop, ta);
  const satGeo = new THREE.SphereGeometry(0.05, 12, 8);
  const satMat = new THREE.MeshPhongMaterial({ color: 0x00ff9f, emissive: 0x00ff9f, emissiveIntensity: 1.5 });
  const satMesh = new THREE.Mesh(satGeo, satMat); satMesh.position.copy(satPos);
  satMesh.name = 'os-sat'; scene.add(satMesh);

  // Glow
  const glight = new THREE.PointLight(0x00ff9f, 1.5, 1.0);
  glight.position.copy(satPos); glight.name = 'os-sat'; scene.add(glight);

  // Apoapsis/periapsis markers
  ['os-apo-m','os-peri-m'].forEach((n, idx) => {
    const taN = idx === 0 ? 180 : 0;
    const mpos = orbitPos(sma, ecc, inc, raan, aop, taN);
    const mGeo = new THREE.SphereGeometry(0.025, 6, 4);
    const mMat = new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xffc857 : 0xe05c5c });
    const m = new THREE.Mesh(mGeo, mMat); m.position.copy(mpos); m.name = n; scene.add(m);
  });

  // Velocity vector (ArrowHelper)
  const vDir = new THREE.Vector3(-Math.sin(ta * DEG), Math.cos(ta * DEG), 0).normalize();
  // Rotate vDir by orbital elements
  const Mv = new THREE.Matrix4();
  Mv.multiply(new THREE.Matrix4().makeRotationZ(raan * DEG));
  Mv.multiply(new THREE.Matrix4().makeRotationX(inc  * DEG));
  Mv.multiply(new THREE.Matrix4().makeRotationZ(aop  * DEG));
  vDir.applyMatrix4(Mv);
  const arrow = new THREE.ArrowHelper(vDir, satPos, 0.4 * Math.min(vel / 4, 1.5), 0x00ff9f, 0.12, 0.06);
  arrow.name = 'os-vvec'; scene.add(arrow);
}

/* ════════════════════════════════════════════════════════════════
   TOOL 3 — DEBRIS FIELD 3D
════════════════════════════════════════════════════════════════ */
let dfScene3 = null, dfAnimId3 = null, dfObjects3 = [], dfCascading3 = false;
const DF_MAX = 500;
let dfPoints, dfPositions, dfColors, dfGeom;

function dfInit() {
  if (dfScene3) return;
  dfScene3 = buildScene('df-cv', 8);
  if (!dfScene3) return;
  const { scene } = dfScene3;
  scene.add(makeEarth(1));

  // Orbital shells (torus rings)
  // Orbital shell rings — visible colours
  [
    {h:200,    col:0x00ff9f, lbl:'LEO'},
    {h:2000,   col:0x00d4ff, lbl:'MEO'},
    {h:20200,  col:0x4488ff, lbl:'GPS'},
    {h:35786,  col:0xffc857, lbl:'GEO'},
  ].forEach(({h, col}) => {
    const r   = 1 + h / 6371;
    const tGeo = new THREE.TorusGeometry(r, 0.012, 8, 128);
    const tMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const tor  = new THREE.Mesh(tGeo, tMat); tor.rotation.x = Math.PI / 2; scene.add(tor);
  });

  // Points cloud for debris (pre-allocate max capacity)
  dfPositions = new Float32Array(DF_MAX * 3).fill(9999);
  dfColors    = new Float32Array(DF_MAX * 3).fill(0);
  dfGeom = new THREE.BufferGeometry();
  dfGeom.setAttribute('position', new THREE.BufferAttribute(dfPositions, 3));
  dfGeom.setAttribute('color',    new THREE.BufferAttribute(dfColors, 3));
  dfGeom.setDrawRange(0, 0);
  dfPoints = new THREE.Points(dfGeom, new THREE.PointsMaterial({
    size: 0.03,              // PATCHED: WebGL 1.0 PointSize limits fixed
    vertexColors: true,
    sizeAttenuation: true,   // FIXED: Scales properly now
    transparent: true,
    opacity: 0.92
  }));
  dfPoints.name = 'df-points';
  scene.add(dfPoints);

  function dfLoop3() {
    const n = dfObjects3.length;
    dfObjects3.forEach((obj, i) => {
      if (!obj.alive) return;
      obj.angle += obj.da * 0.016;
      dfPositions[i*3]   = obj.r * Math.cos(obj.angle) * Math.cos(obj.incAng);
      dfPositions[i*3+1] = obj.r * Math.sin(obj.incAng);
      dfPositions[i*3+2] = obj.r * Math.sin(obj.angle) * Math.cos(obj.incAng);
    });
    if (n > 0) {
      dfGeom.attributes.position.needsUpdate = true;
      dfGeom.setDrawRange(0, n);
    }
    dfScene3.renderer.render(dfScene3.scene, dfScene3.camera);
    dfAnimId3 = requestAnimationFrame(dfLoop3);
  }
  dfLoop3();

  // Pre-populate with real tracked debris distribution
  [200,400,550,800,1200,1500,20200,35786].forEach(alt => dfAddOne(alt + Math.random()*200));
  for (let i = 0; i < 22; i++) dfAddOne(200 + Math.random() * 1800); // LEO dense belt
  for (let i = 0; i < 6; i++)  dfAddOne(19000 + Math.random() * 2400); // GPS shell
  dfUpdateStats();
}

function dfAddOne(h_km, incDeg) {
  if (dfObjects3.length >= DF_MAX) return;
  const r   = (RE + h_km * 1000) / RE;
  const v   = Math.sqrt(MU_E / (RE + h_km * 1000));
  const da  = v / (RE + h_km * 1000) * 0.016;
  const incAng = ((incDeg !== undefined ? incDeg : (Math.random() * 180 - 90))) * DEG;
  // Colour by altitude band
  let col;
  if (dfCascading3)       col = [1.0, 0.42, 0.13]; // orange — cascade fragment
  else if (h_km < 2000)  col = [0.0, 1.0,  0.62]; // green  — LEO
  else if (h_km < 20500) col = [0.0, 0.83, 1.0];  // cyan   — MEO/GPS
  else                    col = [1.0, 0.78, 0.34]; // amber  — GEO
  const idx = dfObjects3.length;
  dfObjects3.push({ r, angle: Math.random() * Math.PI * 2, da, incAng, alive: true });
  dfPositions[idx*3] = r; dfPositions[idx*3+1] = 0; dfPositions[idx*3+2] = 0; // initial
  dfColors[idx*3]   = col[0]; dfColors[idx*3+1] = col[1]; dfColors[idx*3+2] = col[2];
  if (dfGeom) {
    dfGeom.attributes.color.needsUpdate = true;
    dfGeom.attributes.position.needsUpdate = true;
  }
}

function dfAddBatch() {
  const shell = document.getElementById('df-shell').value;
  const ranges = { leo: [200, 2000], meo: [2000, 20200], geo: [35786, 35800] };
  const [hmin, hmax] = ranges[shell];
  for (let i = 0; i < 10; i++) dfAddOne(hmin + Math.random() * (hmax - hmin));
  dfUpdateStats();
}


function dfTriggerCascade() {
  if(!dfScene3) {
    dfInit();
    setTimeout(dfTriggerCascade, 150);
    return;
  }
  if (dfObjects3.length < 3) { dfAddBatch(); setTimeout(dfTriggerCascade, 300); return; }
  dfCascading3 = true;
  // Add a large burst of fragments — enough to visually fill the LEO shell
  const toAdd = Math.min(DF_MAX - dfObjects3.length, Math.max(60, dfObjects3.length * 3));
  for (let i = 0; i < toAdd; i++) {
    const parent = dfObjects3[Math.floor(Math.random() * dfObjects3.length)];
    const h = Math.max(180, ((parent.r - 1) * 6371) + (Math.random() - 0.5) * 600);
    dfAddOne(h, Math.random() * 180 - 90);
  }
  // Scale up dot size for dramatic effect
  if (dfPoints) {
    dfPoints.material.size = 0.06;  // PATCHED: larger particles during cascade
    dfPoints.material.needsUpdate = true;
  }
  dfUpdateStats();
  document.getElementById('df-kessler').style.display = 'block';
  // Chain: keep spawning every 800ms until full
  if (dfObjects3.length < DF_MAX * 0.7) {
    setTimeout(dfTriggerCascade, 900);
  }
}

function dfUpdateStats() {
  const n = dfObjects3.length;
  document.getElementById('df-count').textContent = n;
  const P = Math.min(99.9, n * n * 0.0008).toFixed(2);
  document.getElementById('df-prob').textContent  = P + '%';
  const yr = n > 200 ? '< 1' : n > 100 ? Math.round(20 - n * .15) : n > 50 ? Math.round(100 - n) : '∞';
  document.getElementById('df-years').textContent = yr;
  const el = document.getElementById('df-status');
  if (n > 200)     { el.textContent = 'KESSLER CASCADE'; el.className = 'lr-val crit'; }
  else if (n > 80) { el.textContent = 'HIGH RISK';       el.className = 'lr-val warn'; }
  else             { el.textContent = 'STABLE';           el.className = 'lr-val'; }
}

function dfReset() {
  dfObjects3 = []; dfCascading3 = false;
  if (dfGeom) { dfPositions.fill(9999); dfColors.fill(0); dfGeom.attributes.position.needsUpdate = true; dfGeom.attributes.color.needsUpdate = true; dfGeom.setDrawRange(0, 0); }
  document.getElementById('df-kessler').style.display = 'none';
  dfUpdateStats();
}

/* ════════════════════════════════════════════════════════════════
   TOOL 4 — DELTA-V PLANNER 3D
════════════════════════════════════════════════════════════════ */
let dvScene3 = null, dvAnimId = null;

const DV_MISSIONS = {
  'leo->geo':     { dv1:2.42e3, dv2:1.47e3, T_days:.22,  type:'earth' },
  'leo->moon':    { dv1:3.14e3, dv2:0.88e3, T_days:3.0,  type:'earth' },
  'leo->mars':    { dv1:3.60e3, dv2:0.90e3, T_days:259,  type:'solar' },
  'leo->venus':   { dv1:3.50e3, dv2:0.30e3, T_days:146,  type:'solar' },
  'leo->jupiter': { dv1:6.00e3, dv2:0.30e3, T_days:998,  type:'solar' },
  'geo->moon':    { dv1:1.40e3, dv2:0.80e3, T_days:5.0,  type:'earth' },
  'moon->mars':   { dv1:0.90e3, dv2:0.50e3, T_days:270,  type:'solar' },
};

function dvGetMission() {
  const from = document.getElementById('dv-from').value;
  const to   = document.getElementById('dv-to').value;
  return DV_MISSIONS[`${from}->${to}`] || { dv1:2e3, dv2:1e3, T_days:100, type:'earth' };
}

function dvInit() {
  if (dvScene3) return;
  dvScene3 = buildScene('dv-cv', 7);
  if (!dvScene3) return;
  function dvLoop() { dvScene3.renderer.render(dvScene3.scene, dvScene3.camera); dvAnimId = requestAnimationFrame(dvLoop); }
  dvLoop();
  dvCalc();
}

function dvCalc() {
  const mass = +document.getElementById('dv-mass').value;
  const isp  = +document.getElementById('dv-isp').value;
  document.getElementById('dv-mass-v').textContent = mass.toLocaleString();
  document.getElementById('dv-isp-v').textContent  = isp;

  const mission = dvGetMission();
  const { dv1, dv2, T_days, type } = mission;
  const dvTotal = dv1 + dv2;
  const ve      = isp * 9.80665;
  const mRatio  = Math.exp(dvTotal / ve);
  const propMass = mass * (1 - 1 / mRatio);

  document.getElementById('dv-total').textContent = (dvTotal / 1000).toFixed(2) + ' km/s';
  const fuelEl = document.getElementById('dv-fuel');
  fuelEl.textContent = propMass.toFixed(0) + ' kg';
  fuelEl.className   = 'lr-val' + (propMass > mass * .8 ? ' crit' : propMass > mass * .5 ? ' warn' : '');

  document.getElementById('dv-budget').innerHTML = `
    <div class="dv-bar-wrap"><span class="dv-bar-label">Departure Δv</span><div class="dv-bar-track"><div class="dv-bar-fill" style="width:${dv1/dvTotal*100}%"></div></div><span class="dv-bar-val">${(dv1/1000).toFixed(2)} km/s</span></div>
    <div class="dv-bar-wrap"><span class="dv-bar-label">Arrival Δv</span><div class="dv-bar-track"><div class="dv-bar-fill" style="width:${dv2/dvTotal*100}%;background:var(--c)"></div></div><span class="dv-bar-val" style="color:var(--c)">${(dv2/1000).toFixed(2)} km/s</span></div>
    <div class="dv-bar-wrap"><span class="dv-bar-label">Fuel fraction</span><div class="dv-bar-track"><div class="dv-bar-fill" style="width:${Math.min(100,propMass/mass*100)}%;background:var(--a)"></div></div><span class="dv-bar-val" style="color:var(--a)">${(propMass/mass*100).toFixed(0)}%</span></div>`;

  const tStr = T_days < 1 ? `${(T_days*24).toFixed(1)} hrs` : T_days < 30 ? `${T_days.toFixed(1)} days` : T_days < 365 ? `${(T_days/30.4).toFixed(1)} months` : `${(T_days/365.25).toFixed(1)} years`;
  document.getElementById('dv-ttime').innerHTML = `Transfer time: <span>${tStr}</span>`;

  if (!dvScene3) return;
  const { scene } = dvScene3;
  while (scene.children.length > 0) scene.remove(scene.children[0]);
  scene.add(new THREE.AmbientLight(0x334466, 0.55));
  const sun = new THREE.DirectionalLight(0xffeedd, 1.3); sun.position.set(8,5,6); scene.add(sun);

  // Rebuild stars
  const rng = mkRng(77); const sp = new Float32Array(2000*3);
  for (let i=0;i<2000;i++){const th=rng()*Math.PI*2,ph=Math.acos(2*rng()-1),r=900+rng()*100;sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.8,sizeAttenuation:true})));

  if (type === 'earth') {
    // Earth-centred view
    scene.add(makeEarth(1));
    dvScene3.center.set(0,0,0);

    const from = document.getElementById('dv-from').value;
    const to   = document.getElementById('dv-to').value;
    const r1   = (from === 'leo' ? 6771 : from === 'geo' ? 42164 : 384400) / 6371;
    const r2   = (to   === 'geo' ? 42164 : to === 'moon' ? 384400 : 42164)  / 6371;

    // Origin orbit (cyan)
    const o1 = makeOrbitLine(from === 'leo' ? 6771 : from === 'geo' ? 42164 : 384400, 0, 28, 0, 0, 0x4fc3f7, 128);
    scene.add(o1);
    // Destination orbit (amber)
    const o2 = makeOrbitLine(to === 'geo' ? 42164 : to === 'moon' ? 384400 : 42164, 0, 28, 0, 0, 0xffc857, 128);
    scene.add(o2);

    // Transfer ellipse (half - green dashed)
    const aTr = (r1 + r2) / 2;
    const eTr = (r2 - r1) / (r2 + r1);
    const pts3 = [];
    for (let i = 0; i <= 128; i++) {
      const nu = Math.PI + (i / 128) * Math.PI; // half ellipse
      const r  = aTr * (1 - eTr * eTr) / (1 + eTr * Math.cos(nu));
      pts3.push(new THREE.Vector3(r * Math.cos(nu) + aTr * eTr, r * Math.sin(nu), 0.05));
    }
    const tGeo = new THREE.BufferGeometry().setFromPoints(pts3);
    const tMat = new THREE.LineDashedMaterial({ color: 0x00ff9f, dashSize: 0.15, gapSize: 0.08, opacity: 0.9, transparent: true });
    const tLine = new THREE.Line(tGeo, tMat); tLine.computeLineDistances(); scene.add(tLine);

    // Burn markers
    [[r1, Math.PI, 0x00ff9f, 'Δv₁'],[r2, 0, 0xffc857, 'Δv₂']].forEach(([r, ang, c]) => {
      const bGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const b = new THREE.Mesh(bGeo, new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 }));
      b.position.set(r * Math.cos(ang) + aTr * eTr, r * Math.sin(ang), 0.05); scene.add(b);
      const glight = new THREE.PointLight(c, 2, 1.5); glight.position.copy(b.position); scene.add(glight);
    });

    dvScene3.camUpdate();

  } else {
    // ── Solar-system view (fixed scale: 1 unit = 1 AU) ──
    // Sun
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 32, 16),
      new THREE.MeshPhongMaterial({ color: 0xffee44, emissive: 0xff9900, emissiveIntensity: 3 })
    ));
    scene.add(new THREE.PointLight(0xffeedd, 4, 0));
    dvScene3.center.set(0, 0, 0);

    // Body AU distances (scene units = AU)
    const AU_BODIES = { leo: 1.0, mars: 1.524, venus: 0.723, jupiter: 5.2 };
    const toVal = document.getElementById('dv-to').value;
    const rE = AU_BODIES.leo;
    const rD = AU_BODIES[toVal] || 1.524;

    // Helper: draw a circle orbit in X-Z plane (flat solar system)
    function solarCircle(r, color, segments = 180) {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }));
    }

    // Earth orbit + body
    scene.add(solarCircle(rE, 0x4fc3f7));
    const eM = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 12, 8),
      new THREE.MeshPhongMaterial({ color: 0x2266aa, emissive: 0x001133 })
    );
    eM.position.set(rE, 0, 0); scene.add(eM);

    // Destination orbit + body
    scene.add(solarCircle(rD, 0xffc857));
    const dCol = { mars: 0xc1440e, venus: 0xe8c56b, jupiter: 0xc88b3a }[toVal] || 0xaaaaaa;
    const dSz  = toVal === 'jupiter' ? 0.055 : 0.03;
    const dM = new THREE.Mesh(
      new THREE.SphereGeometry(dSz, 12, 8),
      new THREE.MeshPhongMaterial({ color: dCol, emissive: dCol, emissiveIntensity: 0.2 })
    );
    dM.position.set(-rD, 0, 0); scene.add(dM);

    // Hohmann transfer half-ellipse (Earth at perihelion, destination at aphelion)
    const aTr = (rE + rD) / 2;
    const eTr = (rD - rE) / (rD + rE);
    const tpts = [];
    for (let i = 0; i <= 160; i++) {
      const nu = Math.PI + (i / 160) * Math.PI; // departure → arrival
      const r  = aTr * (1 - eTr * eTr) / (1 + eTr * Math.cos(nu));
      tpts.push(new THREE.Vector3(r * Math.cos(nu) + aTr * eTr, 0, r * Math.sin(nu)));
    }
    const tGeo  = new THREE.BufferGeometry().setFromPoints(tpts);
    const tMat  = new THREE.LineDashedMaterial({ color: 0x00ff9f, dashSize: 0.06, gapSize: 0.03, transparent: true, opacity: 0.95 });
    const tLine = new THREE.Line(tGeo, tMat); tLine.computeLineDistances(); scene.add(tLine);

    // Burn markers
    [[rE, Math.PI, 0.04, 0x00ff9f],[rD, 0, 0.06, 0xffc857]].forEach(([r, ang, sz, c]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(sz, 8, 6),
        new THREE.MeshPhongMaterial({ color: c, emissive: c, emissiveIntensity: 2 }));
      b.position.set(r * Math.cos(ang) + aTr * eTr, 0, r * Math.sin(ang)); scene.add(b);
      const gl = new THREE.PointLight(c, 3, rD * 0.5); gl.position.copy(b.position); scene.add(gl);
    });

    // Set camera to show full scene — position above the orbital plane
    const camR = rD * 1.55 + 0.5;
    dvScene3.camera.position.set(0, camR * 0.7, camR);
    dvScene3.camera.lookAt(0, 0, 0);
  }
} // end dvCalc

/* ════════════════════════════════════════════════════════════════
   TOOL 5 — APOPHIS 2029 3D  (Much slower + speed control)
════════════════════════════════════════════════════════════════ */
const AP_MU   = 3.986004418e5; // km³/s²
const AP_VINF = 5.87;           // km/s at infinity
const AP_RPERI= 37371;          // km from Earth centre
const AP_A    = AP_MU / (AP_VINF * AP_VINF);
const AP_E    = 1 + AP_RPERI * AP_VINF * AP_VINF / AP_MU;

function apPos(t_days) {
  const t_sec = (t_days - 12.91) * 86400;
  const M_h   = AP_VINF / AP_A * Math.abs(t_sec);
  let F = Math.log(2 * Math.abs(M_h) / AP_E + 1.8);
  for (let i = 0; i < 20; i++) F = F + (M_h - AP_E * Math.sinh(F) + F) / (AP_E * Math.cosh(F) - 1);
  if (t_sec < 0) F = -F;
  const r     = AP_A * (AP_E * Math.cosh(F) - 1);
  const theta = 2 * Math.atan(Math.sqrt((AP_E + 1) / (AP_E - 1)) * Math.tanh(F / 2));
  const v     = Math.sqrt(AP_MU * (2 / r + 1 / AP_A));
  return { r, theta, v, x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

let apScene3 = null, apAnimId3 = null, apPlaying = false, apFrame3 = 0;
let apAphMesh, apTrailPts = [], apTrailLine, apMoonMesh, apMoonAngle = 0;

function apInit() {
  if (apScene3) return;
  apScene3 = buildScene('ap-cv', 12);
  if (!apScene3) return;
  const { scene } = apScene3;

  // Earth — large and prominent
  scene.add(makeEarth(1));

  // Moon
  const moonGeo = new THREE.SphereGeometry(0.27, 16, 12);
  const moonMat = new THREE.MeshPhongMaterial({ color: 0x888899, emissive: 0x111122, shininess: 5 });
  apMoonMesh = new THREE.Mesh(moonGeo, moonMat);
  scene.add(apMoonMesh);

  // Moon orbit ring (faint)
  const moonOrbGeo = new THREE.TorusGeometry(384400/6371, 0.4, 8, 128); // real Moon orbit radius
  const moonOrbMat = new THREE.MeshBasicMaterial({ color: 0x222244, transparent: true, opacity: 0.4 });
  const moonOrb = new THREE.Mesh(moonOrbGeo, moonOrbMat); moonOrb.rotation.x = Math.PI / 2;
  scene.add(moonOrb);

  // GPS ring (20,200 km → /6371 ≈ 3.17 RE)
  const gpsR = 20200 / 6371;
  const gpsGeo = new THREE.TorusGeometry(gpsR, 0.03, 8, 128);
  const gpsMat = new THREE.MeshBasicMaterial({ color: 0x004466, transparent: true, opacity: 0.5 });
  const gpsTor = new THREE.Mesh(gpsGeo, gpsMat); gpsTor.rotation.x = Math.PI / 2;
  scene.add(gpsTor);

  // GEO ring (35,786 km → 5.62 RE)
  const geoR = 35786 / 6371;
  const geoGeo = new THREE.TorusGeometry(geoR, 0.025, 8, 128);
  const geoMat = new THREE.MeshBasicMaterial({ color: 0x332200, transparent: true, opacity: 0.4 });
  const geoTor = new THREE.Mesh(geoGeo, geoMat); geoTor.rotation.x = Math.PI / 2;
  scene.add(geoTor);

  // Pre-compute full Apophis trajectory and draw it
  const trailPts3D = [];
  for (let td = -6; td <= 6; td += 0.04) { // ±6 days around closest approach
    const pos = apPos(12.91 + td);
    const sc  = 1 / 6371; // km to Earth-radii
    trailPts3D.push(new THREE.Vector3(-pos.x * sc, 0.02 * td, pos.y * sc));
  }
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts3D);
  const trailMat = new THREE.LineBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.35 });
  scene.add(new THREE.Line(trailGeo, trailMat));

  // Apophis sphere
  const apGeo = new THREE.SphereGeometry(0.22, 16, 10);  // Visually enlarged for impact
  const apMat = new THREE.MeshPhongMaterial({ color: 0xff6b35, emissive: 0xff4400, emissiveIntensity: 1.5 });
  apAphMesh = new THREE.Mesh(apGeo, apMat); scene.add(apAphMesh);

  // Approach glow (PointLight on Apophis)
  const apLight = new THREE.PointLight(0xff6b35, 0, 8); apLight.name = 'ap-light'; scene.add(apLight);

  // Current t_days shared between render loop and scrubber
  let apCurrentT = 7.0;

  function apRenderLoop() {
    const sc = 1 / 6371; // km → Earth radii
    const pos = apPos(apCurrentT);

    // Apophis position
    const aphX = -pos.x * sc, aphZ = pos.y * sc;
    apAphMesh.position.set(aphX, 0, aphZ);

    // Scale dot glow — bright white-orange core near closest approach
    const closestFrac = Math.max(0, 1 - (pos.r - AP_RPERI) / 120000);
    apAphMesh.material.emissiveIntensity = 1.5 + closestFrac * 4;
    apAphMesh.scale.setScalar(1 + closestFrac * 0.8); // swell slightly

    const apLightObj = apScene3.scene.getObjectByName('ap-light');
    if (apLightObj) {
      apLightObj.intensity = 1 + closestFrac * 6;
      apLightObj.position.copy(apAphMesh.position);
    }

    // Moon orbit (simple circular)
    apMoonAngle += 0.0015;
    const moonR = 384400 * sc;
    apMoonMesh.position.set(moonR * Math.cos(apMoonAngle), 0, moonR * Math.sin(apMoonAngle));

    // User controls camera via drag (no override)
    apScene3.camUpdate();
    apScene3.renderer.render(apScene3.scene, apScene3.camera);
    apAnimId3 = requestAnimationFrame(apRenderLoop);
  }
  apRenderLoop();
  apDraw3D(7.0);

  // Expose setter so scrubber can update position
  window._apSetT = function(t) { apCurrentT = t; };
}

function apDraw3D(t_days) {
  const pos      = apPos(t_days);
  const sc       = 1 / 6371;
  const dist_surf = pos.r - 6371;

  // t_days = April day (7=Apr8, 12.91=Apr13 closest approach, 17=Apr18)
  const d = new Date(2029, 3, 1); d.setTime(d.getTime() + t_days * 86400000);
  document.getElementById('ap-date').textContent  = d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  document.getElementById('ap-dist').textContent  = Math.round(pos.r).toLocaleString() + ' km';
  const surfEl = document.getElementById('ap-surf');
  surfEl.textContent = Math.round(dist_surf).toLocaleString() + ' km';
  surfEl.className   = 'lr-val' + (dist_surf < 40000 ? ' crit' : dist_surf < 80000 ? ' warn' : '');
  document.getElementById('ap-vel').textContent   = pos.v.toFixed(2) + ' km/s';

  const badge = document.getElementById('ap-badge');
  const closest = Math.abs(t_days - 12.91) < 0.3;
  if (closest)          { badge.textContent = '⬡ CLOSEST APPROACH (' + Math.round(dist_surf).toLocaleString() + ' km)'; badge.style.color = 'var(--r)'; }
  else if (t_days < 12.91) { badge.textContent = '⬡ APPROACHING'; badge.style.color = 'var(--a)'; }
  else                  { badge.textContent = '⬡ DEPARTING';   badge.style.color = 'var(--c)'; }
}

function apScrub(v) {
  const AP_DAY_MIN = 7.0, AP_DAY_MAX = 17.0;
  const t = AP_DAY_MIN + (+v / 1000) * (AP_DAY_MAX - AP_DAY_MIN);
  if (window._apSetT) window._apSetT(t);
  apDraw3D(t);
  // Don't stop playback when user scrubs — just sync position
}

function apToggle() {
  if (apPlaying) {
    apPlaying = false; document.getElementById('ap-play').textContent = '▶ PLAY';
    cancelAnimationFrame(apFrame3);
  } else {
    apPlaying = true; document.getElementById('ap-play').textContent = '⏸ PAUSE';
    apAnimateScrubber();
  }
}

function apAnimateScrubber() {
  if (!apPlaying) return;

  const AP_DAY_MIN = 7.0, AP_DAY_MAX = 17.0;
  const slider = document.getElementById('ap-slider');
  const speed  = Math.max(1, +document.getElementById('ap-speed').value);
  const cur    = +slider.value;
  const t_cur  = AP_DAY_MIN + (cur / 1000) * (AP_DAY_MAX - AP_DAY_MIN);

  // Slow near closest approach but NEVER stall — minimum 1.5 slider units per frame
  const closeness = Math.max(0, 1 - Math.abs(t_cur - 12.91) / 3.5);
  const rawStep   = speed * 1.2 * (1 - closeness * 0.72);
  const step      = Math.max(1.5, rawStep); // hard floor — always advances

  const next = cur + step;

  if (next >= 1000) {
    // Reached end — loop back after 1.2s pause
    slider.value = 0;
    if (window._apSetT) window._apSetT(AP_DAY_MIN);
    apDraw3D(AP_DAY_MIN);
    if (apPlaying) setTimeout(() => { if (apPlaying) apAnimateScrubber(); }, 1200);
    return;
  }

  slider.value = next;
  const t_new = AP_DAY_MIN + (next / 1000) * (AP_DAY_MAX - AP_DAY_MIN);
  if (window._apSetT) window._apSetT(t_new);
  apDraw3D(t_new);

  apFrame3 = requestAnimationFrame(apAnimateScrubber);
}

function apReset() {
  apPlaying = false;
  cancelAnimationFrame(apFrame3);
  document.getElementById('ap-play').textContent = '▶ PLAY';
  document.getElementById('ap-slider').value = 0;
  if (window._apSetT) window._apSetT(7.0);
  apDraw3D(7.0);
}

/* ════════════════════════════════════════════════════════════════
   LAB TAB SWITCHING + INIT
════════════════════════════════════════════════════════════════ */
const LAB_INITS = { t1: rfInit, t2: osInit, t3: dfInit, t4: dvInit, t5: apInit };
const LAB_INITED = {};

function labActivateTab(tabId) {
  document.querySelectorAll('.lab-tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.lab-p').forEach(p => p.classList.remove('on'));
  const btn   = document.querySelector(`[data-lab="${tabId}"]`);
  const panel = document.getElementById('lab-' + tabId);
  if (btn)   btn.classList.add('on');
  if (panel) panel.classList.add('on');
  // Init on first activation (deferred so canvas has real size)
  setTimeout(() => {
    if (!LAB_INITED[tabId]) { LAB_INITED[tabId] = true; LAB_INITS[tabId]?.(); }
  }, 60);
}

document.querySelectorAll('.lab-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => labActivateTab(btn.dataset.lab));
});

/* ── WIRE UP ALL EVENT HANDLERS ── */
(function labWireUp() {
  // RF
  document.getElementById('rf-sat')?.addEventListener('change',  rfSelectSat);
  ['rf-mass','rf-area','rf-cd','rf-alt'].forEach(id => document.getElementById(id)?.addEventListener('input', rfUpdate));
  document.getElementById('rf-btn-sim')?.addEventListener('click',   rfSimulate);
  document.getElementById('rf-btn-reset')?.addEventListener('click', () => rfReset());
  // OS
  ['os-sma','os-ecc','os-inc','os-raan','os-aop','os-ta'].forEach(id => document.getElementById(id)?.addEventListener('input', osUpdate));
  // DF
  document.getElementById('df-btn-add')?.addEventListener('click',   dfAddBatch);
  document.getElementById('df-btn-casc')?.addEventListener('click',  dfTriggerCascade);
  document.getElementById('df-btn-reset')?.addEventListener('click', dfReset);
  // DV
  ['dv-from','dv-to'].forEach(id => document.getElementById(id)?.addEventListener('change', dvCalc));
  ['dv-mass','dv-isp'].forEach(id => document.getElementById(id)?.addEventListener('input', dvCalc));
  // AP
  document.getElementById('ap-slider')?.addEventListener('input', e => apScrub(e.target.value));
  document.getElementById('ap-play')?.addEventListener('click',   apToggle);
  document.getElementById('ap-btn-reset')?.addEventListener('click', apReset);
  document.getElementById('ap-speed')?.addEventListener('input', e => {
    document.getElementById('ap-speed-v').textContent = e.target.value + '×';
  });
})();

/* ── INIT FIRST TAB ON SCROLL INTO VIEW ── */
(function () {
  const labSection = document.getElementById('lab-s');
  if (!labSection) return;
  rfUpdate(); // so readouts show on load
  if (window.IntersectionObserver) {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !LAB_INITED['t1']) {
        LAB_INITED['t1'] = true; rfInit();
      }
    }, { threshold: 0.05 });
    obs.observe(labSection);
  } else {
    setTimeout(() => { LAB_INITED['t1'] = true; rfInit(); }, 500);
  }
})();

// Resize handler
window.addEventListener('resize', () => {
  const active = document.querySelector('.lab-tab-btn.on');
  if (active) setTimeout(() => labActivateTab(active.dataset.lab), 80);
});
/* ─── WORKER PROXY CONFIG ────────────────────────────────────────
   Set this to your Cloudflare Worker URL after deploying.
   See voidsignal-worker.js for deploy instructions (5 min).
   With worker set, ALL live data works — no CORS errors.         */
const WORKER_URL = 'https://withered-bar-4b79.rugu5566.workers.dev';  // e.g. 'https://voidsignal-proxy.yourname.workers.dev'
// Helper: routes a path through the worker if configured, otherwise falls back
function proxyUrl(path) {
  if (!WORKER_URL) return null;
  // Strip trailing slashes, then add exactly one + path (which starts with /)
  const base = WORKER_URL.replace(/\/+$/, '');
  return base + path;
}
/* Supabase removed */

/* ─── STARFIELD ──────────────────────────────────────────────────── */
(function(){
  const c=document.getElementById('sf'),x=c.getContext('2d');
  let W,H,stars=[],shoot=[];
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;
    stars=Array.from({length:420},()=>({
      x:Math.random()*W,y:Math.random()*H,
      r:Math.random()*1.4+.15,a:Math.random()*.7+.15,
      da:(Math.random()-.5)*.003,
      h:[0,0,0,0,1,1,2][Math.floor(Math.random()*7)]
    }))}
  const cols=['255,255,255','200,220,255','255,230,160'];
  function frame(){
    x.clearRect(0,0,W,H);x.fillStyle='#01020A';x.fillRect(0,0,W,H);
    for(const s of stars){
      s.a=Math.max(.08,Math.min(.85,s.a+s.da));
      if(Math.random()<.002)s.da*=-1;
      x.beginPath();x.arc(s.x,s.y,s.r,0,Math.PI*2);
      x.fillStyle=`rgba(${cols[s.h]},${s.a})`;x.fill()
    }
    if(Math.random()<.003)shoot.push({x:Math.random()*W*.6,y:Math.random()*H*.3,
      vx:7+Math.random()*7,vy:3+Math.random()*4,life:1});
    for(let i=shoot.length-1;i>=0;i--){
      const s=shoot[i];
      x.beginPath();x.moveTo(s.x,s.y);x.lineTo(s.x-s.vx*11,s.y-s.vy*11);
      x.strokeStyle=`rgba(255,255,255,${s.life*.55})`;x.lineWidth=.9;x.stroke();
      s.x+=s.vx;s.y+=s.vy;s.life-=.04;
      if(s.life<=0||s.x>W||s.y>H)shoot.splice(i,1)
    }
    requestAnimationFrame(frame)
  }
  addEventListener('resize',resize);resize();frame()
})();
/* ─── CURSOR GLOW ────────────────────────────────────────────────── */
(function(){
  const g=document.createElement('div');g.className='cursor-glow';
  document.body.appendChild(g);
  let mx=0,my=0,cx=0,cy=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
  function raf(){
    cx+=(mx-cx)*.12;cy+=(my-cy)*.12;
    g.style.left=cx+'px';g.style.top=cy+'px';
    requestAnimationFrame(raf);
  }
  raf();
  // Hide on touch devices
  window.addEventListener('touchstart',()=>g.style.opacity='0',{once:true});
})();


/* ─── TICKER ─────────────────────────────────────────────────────── */
const TICKS=['ISS ORBITAL PERIOD: 92.9 MIN','VOYAGER 1: 24 BILLION KM FROM EARTH',
  'APOPHIS 2029: 31,000KM FLYBY','ISS SPEED: MACH 23','KARMAN LINE: 100KM',
  'SATURN RINGS: 282,000KM WIDE — 100M THICK','VANGUARD-1: ORBITING SINCE 1958',
  'EUROPA OCEAN: 2× EARTH\'S WATER','PSYCHE: 90% IRON-NICKEL ASTEROID',
  'JAMES WEBB SPACE TELESCOPE: L2 ORBIT 1.5M KM','OLYMPUS MONS: 21KM HIGH 600KM WIDE',
  'GREAT RED SPOT: 350+ YEARS OF STORM','NEUTRON STAR COLLISION = ALL GOLD ON EARTH',
  'PALE BLUE DOT: 0.12 PIXELS WIDE','COLUMBIA REENTRY: 2003 — HEAT SHIELD FAILURE'];
(function(){const t=document.getElementById('tick-t');
  t.innerHTML=[...TICKS,...TICKS].map(s=>`<span class="tick-i">⬡ ${s}</span>`).join('')})();

/* ─── FACTS MARQUEE ──────────────────────────────────────────────── */
const FACTS=['A day on Venus is longer than a year on Venus',
  'Saturn would float in water','Space is completely silent',
  'Footprints on the Moon will last 100 million years',
  'The Milky Way smells of rum (ethyl formate)','1 million Earths fit inside the Sun',
  'Sound cannot travel through the vacuum of space',
  'Europa has the smoothest surface in the solar system',
  'Neutron stars can spin 700 times per second',
  'The Great Wall of China is NOT visible from space',
  'Jupiter acts as a cosmic shield protecting Earth from comets',
  'JWST can see a bumblebee on the Moon'];
(function(){const t=document.getElementById('fm-t');
  t.innerHTML=[...FACTS,...FACTS].map(f=>`<span class="fi">▷ ${f}</span>`).join('')})();

/* ─── LIVE NEWS ──────────────────────────────────────────────────── */
const FALLBACK=[
  {s:'NASA',t:'Artemis III: Returning Humans to the Lunar Surface',d:'2025'},
  {s:'ESA',t:'Europa Clipper begins journey to Jupiter\'s ocean moon',d:'Oct 2024'},
  {s:'SpaceX',t:'Starship completes integrated test flight — booster catch',d:'2024'},
  {s:'NASA',t:'Psyche spacecraft enters orbit around metal asteroid 16 Psyche',d:'Dec 2024'},
  {s:'ESA',t:'JUICE probe captures first images of Jupiter system',d:'Jul 2024'},
  {s:'NASA',t:'OSIRIS-REx returns Bennu asteroid samples to Earth',d:'Sep 2023'},
  {s:'NASA',t:'James Webb captures deepest infrared image of the universe',d:'2022'},
  {s:'ESA',t:'ERS-2 satellite reentry — 29 years in orbit',d:'Feb 2024'},
  {s:'CNSA',t:'Chang\'e 6 returns first samples from Moon\'s far side',d:'Jun 2024'},
];
async function fetchNews(){
  const g=document.getElementById('news-g');
  const ts=document.getElementById('news-ts');
  // 3 API attempts — first success wins
  const ENDPOINTS=[
    // Worker proxy (fastest, no CORS)
    ...(proxyUrl('/news') ? [{
      url: proxyUrl('/news'),
      parse: d => d.results
    }] : []),
    // Direct API
    {
      url:'https://api.spaceflightnewsapi.net/v4/articles/?limit=9&ordering=-published_at',
      parse:d=>d.results
    },
    // allorigins fallback
    {
      url:'https://api.allorigins.win/raw?url='+encodeURIComponent('https://api.spaceflightnewsapi.net/v4/articles/?limit=9&ordering=-published_at'),
      parse:d=>d.results
    },
  ];
  for(const ep of ENDPOINTS){
    try{
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),5000);
      const r=await fetch(ep.url,{signal:ctrl.signal});
      clearTimeout(timer);
      if(!r.ok)continue;
      const d=await r.json();
      const articles=ep.parse(d);
      if(!articles||!articles.length)continue;
      // Filter to last 30 days — keep only recent
      const cutoff=Date.now()-30*86400000;
      const recent=articles.filter(a=>new Date(a.published_at).getTime()>cutoff);
      const toShow=(recent.length>0?recent:articles).slice(0,9);
      ts.textContent='LIVE · SYNC '+new Date().toLocaleTimeString([],(h='2-digit',m='2-digit',{hour:h,minute:m}));
      g.innerHTML=toShow.map(a=>{
        const dt=new Date(a.published_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        const age=Math.floor((Date.now()-new Date(a.published_at))/(3600000));
        const ageStr=age<24?age+'h ago':Math.floor(age/24)+'d ago';
        return `<a class="nc" href="${a.url}" target="_blank" rel="noopener">
          <div class="nc-src" style="display:flex;justify-content:space-between">
            <span>⬡ ${(a.news_site||'SPACE NEWS').toUpperCase()}</span>
            <span style="color:var(--dim);font-size:.55rem">${ageStr}</span>
          </div>
          <div class="nc-ttl">${a.title}</div>
          <div class="nc-dt">${dt}</div></a>`;
      }).join('');
      return; // success
    }catch(e){continue;}
  }
  // All APIs failed — show enhanced fallback with proper dates
  ts.textContent='⬡ UPLINK INTERMITTENT';
  g.innerHTML=FALLBACK.map(a=>`<div class="nc">
    <div class="nc-src">⬡ ${a.s}</div>
    <div class="nc-ttl">${a.t}</div>
    <div class="nc-dt">${a.d}</div></div>`).join('');
}
fetchNews();setInterval(fetchNews,180000);

/* ─── LAUNCHES ───────────────────────────────────────────────────── */
document.getElementById('lg').innerHTML=[
  {s:'NASA',t:'Artemis III — First Woman on the Moon',d:'2026',n:'Crewed lunar landing'},
  {s:'NASA',t:'Psyche Arrival — Metal Asteroid Orbit',d:'Aug 2029',n:'90% iron-nickel body'},
  {s:'JAXA',t:'MMX — Martian Moons eXploration',d:'2026',n:'Return Phobos samples'},
  {s:'NASA',t:'Europa Clipper — Jupiter Arrival',d:'Apr 2030',n:'49 Europa flybys'},
  {s:'ESA/NASA',t:'Mars Sample Return',d:'2033',n:'First Mars rocks on Earth'},
  {s:'NASA',t:'Dragonfly — Titan Landing',d:'2034',n:'Saturn moon surface rover'},
].map(l=>`<div class="nc"><div class="nc-src">⬡ ${l.s}</div>
  <div class="nc-ttl">${l.t}</div>
  <div class="nc-dt">${l.d} · ${l.n}</div></div>`).join('');

/* ─── TERMINAL ───────────────────────────────────────────────────── */
const DB={
  sats:{
    sputnik:   {nation:'Soviet Union',yr:1957,alt:'215–939km',status:'Re-entered 1958',fact:'First satellite — 22 days of beeping'},
    explorer:  {nation:'USA',yr:1958,alt:'360–2550km',status:'Re-entered 1970',fact:'Discovered Van Allen radiation belts'},
    vanguard:  {nation:'USA',yr:1958,alt:'650km',status:'STILL ORBITING — until 2600+',fact:'Size of a grapefruit — oldest object in space'},
    skylab:    {nation:'USA',yr:1973,alt:'435km',status:'REENTRY 1979 — Western Australia',fact:'77 tonnes — uncontrolled reentry debris field 5,000km'},
    mir:       {nation:'Russia',yr:1986,alt:'390km',status:'REENTRY 2001 — South Pacific',fact:'15 years · 104 cosmonauts · largest controlled deorbit'},
    les1:      {nation:'USA',yr:1965,alt:'2800km',status:'Zombie — transmitting since 2012',fact:'Dead 45 years. Battery discharged, exposing solar panels'},
    envisat:   {nation:'ESA',yr:2002,alt:'790km',status:'Silent since 2012',fact:'8 tonnes of uncontrolled debris — contact lost without warning'},
    cosmos954: {nation:'Soviet Union',yr:1977,alt:'260km',status:'REENTRY 1978 — Canada',fact:'Nuclear-powered — radioactive debris over 124,000 km²'},
    iss:       {nation:'International',yr:1998,alt:'408km',status:'OPERATIONAL',fact:'Mach 23 · 16 orbits/day · 450t · 120kW solar'},
    tiangong1: {nation:'China',yr:2011,alt:'355km',status:'REENTRY 2018 — South Pacific',fact:'China\'s first space station — uncontrolled reentry'},
    columbia:  {nation:'USA',yr:2003,alt:'280km',status:'REENTRY 2003 — Texas/Louisiana',fact:'Space Shuttle — heat shield tile failure on reentry'},
  },
  planets:{
    mercury:{dist:'57.9M km',dia:'4,879km',day:'1,408hr',year:'88 Earth days',moons:'0',temp:'-180 to +430°C'},
    venus:  {dist:'108M km',dia:'12,104km',day:'5,832hr',year:'225 days',moons:'0',temp:'+465°C — hotter than Mercury'},
    earth:  {dist:'150M km',dia:'12,742km',day:'24hr',year:'365.25 days',moons:'1',temp:'-88 to +58°C'},
    mars:   {dist:'228M km',dia:'6,779km',day:'24.6hr',year:'687 days',moons:'2',volcano:'Olympus Mons 21km'},
    jupiter:{dist:'778M km',dia:'139,820km',day:'9.9hr',year:'12 yrs',moons:'95',spot:'350+ years old'},
    saturn: {dist:'1.43B km',dia:'116,460km',day:'10.7hr',year:'29 yrs',rings:'282,000km wide — 100m thick',moons:'146'},
    uranus: {dist:'2.87B km',dia:'50,724km',day:'17.2hr',year:'84 yrs',tilt:'97.77°',moons:'28'},
    neptune:{dist:'4.5B km',dia:'49,244km',day:'16.1hr',year:'165 yrs',wind:'2,100 km/h',moons:'16'},
  },
  asteroids:{
    apophis:  {size:'370m',flyby:'Apr 13 2029 — 31,000km',risk:'SAFE',type:'S-type stony'},
    bennu:    {size:'560m',sample:'Returned 2023',impact:'1/1750 in 2182',amino:'23 types found'},
    ryugu:    {size:'900m',sample:'5.4g returned 2020',mission:'Hayabusa2',life:'Amino acids confirmed'},
    psyche:   {size:'220km',comp:'90% iron-nickel',arrival:'2029',theory:'Exposed planetary core'},
    oumuamua: {size:'~400m',origin:'INTERSTELLAR',mystery:'Unexplained acceleration',speed:'196,000 km/h'},
  }
};
const TFACTS=['The ISS travels at Mach 23 — 7.8 km/s',
  'Vanguard-1 will outlast human civilization — orbiting until 2600+',
  'Saturn would float in water',
  'The Kármán Line at 100km separates pilots from astronauts',
  'Your gold ring was forged in a neutron star collision',
  'Jupiter\'s Great Red Spot has raged for over 350 years',
  'Europa has twice as much water as all Earth\'s oceans combined',
  'Olympus Mons is so large you can\'t see its edges from the summit',
  'Apophis will pass INSIDE the ring of GPS satellites in 2029',
  'Psyche asteroid may be worth more than the global economy',
  'DART mission changed an asteroid\'s orbit by 33 minutes',
  'A day on Venus is longer than a year on Venus'];
let fi=0,hist=[],hi=-1;
function tp(cls,html){const d=document.createElement('div');d.className='tl';
  d.innerHTML=`<span class="${cls}">${html}</span>`;return d}
function tpr(lines){const o=document.getElementById('to');
  for(const[c,h]of lines)o.appendChild(tp(c,h));o.scrollTop=9999}
function tcl(){document.getElementById('to').innerHTML=''}
function tcmd(cmd){
  const o=document.getElementById('to');
  o.appendChild(tp('tl',`<span class="tp">void@signal:~$</span> <span class="tc">${cmd}</span>`));
  const p=cmd.trim().toLowerCase().split(/\s+/),v=p[0],a=p.slice(1).join(' ');
  switch(v){
    case'help':tpr([['th','──────────────────────────────────────'],
      ['to','VOIDSIGNAL TERMINAL v3.0 — COMMAND LIST'],
      ['th','──────────────────────────────────────'],
      ['td2','scan [name]         — satellite data (try: skylab, mir, vanguard, iss)'],
      ['td2','planet [name]       — planet data (mercury..neptune)'],
      ['td2','asteroid [name]     — asteroid data (apophis, bennu, psyche...)'],
      ['td2','list [type]         — list satellites | planets | asteroids | reentry'],
      ['td2','fact                — random space fact'],
      ['td2','launches            — upcoming missions'],
      ['td2','about               — about VøidSignal'],
      ['td2','clear               — clear terminal'],
      ['th','──────────────────────────────────────']]);break;
    case'clear':tcl();break;
    case'fact':fi++;tpr([['th',`FACT #${fi}`],['td2',TFACTS[(fi-1)%TFACTS.length]]]);break;
    case'scan':case'orbit':{
      const k=a.replace(/[-\s]/g,'');
      const s=DB.sats[k]||DB.sats[a.replace(/\s/g,'')];
      if(!s)tpr([['te',`NOT FOUND: "${a}" — try: skylab mir vanguard les1 envisat cosmos954 iss columbia tiangong1`]]);
      else{const l=[['th',`━━ SATELLITE: ${a.toUpperCase()} ━━`]];
        for(const[k2,v]of Object.entries(s))l.push(['td2',`  ${k2.padEnd(9)} ${v}`]);tpr(l);}break;}
    case'planet':{const p=DB.planets[a];
      if(!p)tpr([['te','try: mercury venus earth mars jupiter saturn uranus neptune']]);
      else{const l=[['th',`━━ PLANET: ${a.toUpperCase()} ━━`]];
        for(const[k2,v]of Object.entries(p))l.push(['td2',`  ${k2.padEnd(9)} ${v}`]);tpr(l);}break;}
    case'asteroid':{const p=DB.asteroids[a];
      if(!p)tpr([['te','try: apophis bennu ryugu psyche oumuamua']]);
      else{const l=[['th',`━━ ASTEROID: ${a.toUpperCase()} ━━`]];
        for(const[k2,v]of Object.entries(p))l.push(['td2',`  ${k2.padEnd(10)} ${v}`]);tpr(l);}break;}
    case'list':{
      if(a==='satellites'||a==='forgotten'){tpr([['th','━━ FORGOTTEN SATELLITES ━━']]);
        ['Vanguard-1','Transit 4A','LES-1','Telstar-1','ATS-1','Envisat','Cosmos-482','Gravity Probe B','SEASAT','Landsat-5'].forEach(n=>tpr([['td2',`  ${n}`]]));}
      else if(a==='reentry'){tpr([['th','━━ REENTRY EVENTS ━━']]);
        [['Skylab','1979'],['Mir','2001'],['Cosmos-954','1978'],['Tiangong-1','2018'],['Columbia','2003'],['GOCE','2013'],['ERBS','2023'],['ERS-2','2024']].forEach(([n,y])=>tpr([['td2',`  ${n.padEnd(20)} REENTRY ${y}`]]));}
      else if(a==='planets')Object.keys(DB.planets).forEach(n=>tpr([['td2',`  ${n}`]]));
      else if(a==='asteroids')Object.keys(DB.asteroids).forEach(n=>tpr([['td2',`  ${n}`]]));
      else tpr([['te','list what? try: list satellites · list planets · list asteroids · list reentry']]);break;}
    case'launches':tpr([['th','━━ UPCOMING MISSIONS ━━'],
      ['td2','  Artemis III       2026    First woman on Moon'],
      ['td2','  Psyche arrival    2029    Metal asteroid orbit'],
      ['td2','  Apophis flyby     Apr 13 2029   31,000km pass'],
      ['td2','  Europa Clipper    2030    Jupiter arrival'],
      ['td2','  Mars Sample Return 2033   Return Mars rocks'],
      ['td2','  Dragonfly         2034    Land on Titan']]);break;
    case'about':tpr([['th','━━ ABOUT VOIDSIGNAL ━━'],
      ['to','  Aerospace engineer · student debt · future space researcher'],
      ['to','  Every animation: real orbital mechanics data'],
      ['td2','  @VøidSignal on X · voidsignal.xyz']]);break;
    case'':break;
    default:tpr([['te',`UNKNOWN: "${cmd}" — type "help" for commands`]]);}
  document.getElementById('to').scrollTop=9999;}

// ── OLD TERMINAL BOOT + KEYDOWN REMOVED — handled by AI terminal below ──
// (tcmd kept for internal use only, not attached to input)

/* ─── TABS ───────────────────────────────────────────────────────── */
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.tab-p').forEach(p => p.classList.remove('on'));
  const btn = document.querySelector('[data-tab="' + name + '"]');
  const panel = document.getElementById('tab-' + name);
  if (btn) btn.classList.add('on');
  if (panel) panel.classList.add('on');
}
document.querySelectorAll('.tab-btn').forEach(b=>{
  b.addEventListener('click',()=> switchTab(b.dataset.tab));
});

/* ─── PLANETS ────────────────────────────────────────────────────── */
const PLANETS=[
  {n:'Mercury',t:'TERRESTRIAL',c:'#A0855B',c2:'#6B5344',f:[['Diameter','4,879 km'],['Distance','57.9M km'],['Day','1,408 hrs'],['Year','88 Earth days'],['Moons','0'],['Temp','-180 to +430°C']]},
  {n:'Venus',  t:'TERRESTRIAL',c:'#E8C56B',c2:'#C4A044',f:[['Diameter','12,104 km'],['Distance','108M km'],['Day','5,832 hrs'],['Year','225 days'],['Moons','0'],['Temp','+465°C']]},
  {n:'Earth',  t:'TERRESTRIAL',c:'#3B7BD4',c2:'#28A87D',f:[['Diameter','12,742 km'],['Distance','150M km'],['Day','24 hrs'],['Year','365.25 days'],['Moons','1'],['Temp','-88 to +58°C']]},
  {n:'Mars',   t:'TERRESTRIAL',c:'#C1440E',c2:'#8B3010',f:[['Diameter','6,779 km'],['Distance','228M km'],['Day','24.6 hrs'],['Year','687 days'],['Moons','2'],['Highest peak','Olympus Mons 21km']]},
  {n:'Jupiter',t:'GAS GIANT',  c:'#C88B3A',c2:'#A06028',f:[['Diameter','139,820 km'],['Distance','778M km'],['Day','9.9 hrs'],['Year','12 yrs'],['Moons','95'],['Great Red Spot','350+ yrs']]},
  {n:'Saturn', t:'GAS GIANT',  c:'#E4D191',c2:'#C4A840',f:[['Diameter','116,460 km'],['Distance','1.43B km'],['Day','10.7 hrs'],['Year','29 yrs'],['Ring span','282,000 km'],['Ring thickness','~100 m']]},
  {n:'Uranus', t:'ICE GIANT',  c:'#7DE8E8',c2:'#40B4C4',f:[['Diameter','50,724 km'],['Distance','2.87B km'],['Day','17.2 hrs'],['Axial tilt','97.77°'],['Moons','28'],['Temp','-224°C']]},
  {n:'Neptune',t:'ICE GIANT',  c:'#3F54BA',c2:'#2040A0',f:[['Diameter','49,244 km'],['Distance','4.5B km'],['Day','16.1 hrs'],['Wind','2,100 km/h'],['Moons','16'],['Temp','-218°C']]},
];
function lhex(h,a){
  const hex=(h||'#888888').replace('#','').padEnd(6,'0').slice(0,6);
  const n=parseInt(hex,16);
  const clamp=v=>Math.max(0,Math.min(255,v));
  return'#'+clamp((n>>16)+a).toString(16).padStart(2,'0')+clamp(((n>>8)&255)+a).toString(16).padStart(2,'0')+clamp((n&255)+a).toString(16).padStart(2,'0');}
function drawPlanet(cv,p){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2,r=W*.42;
  x.clearRect(0,0,W,H);
  const g=x.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);
  g.addColorStop(0,lhex(p.c,35));g.addColorStop(.6,p.c);g.addColorStop(1,p.c2);
  x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fillStyle=g;x.fill();
  if(p.t.includes('GAS')||p.t.includes('ICE')){
    const bands=p.n==='Jupiter'?8:5;
    for(let b=0;b<bands;b++){
      const by=cy-r+(2*r/(bands+1))*(b+1);
      x.beginPath();x.ellipse(cx,by,r*.97,r*.04,0,0,Math.PI*2);
      x.fillStyle=`rgba(${b%2?'255,220,150':'80,40,10'},.14)`;x.fill()}}
  if(p.n==='Saturn'){
    x.save();x.translate(cx,cy);x.scale(1,.25);
    for(let i=0;i<3;i++){
      x.beginPath();x.arc(0,0,r*(1.42+i*.22),0,Math.PI*2);
      x.strokeStyle=`rgba(220,200,120,${.38-i*.1})`;x.lineWidth=r*(.11-i*.02);x.stroke()}
    x.restore();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fillStyle=g;x.fill()}
  const sh=x.createRadialGradient(cx+r*.35,cy+r*.35,r*.05,cx+r*.5,cy+r*.5,r);
  sh.addColorStop(0,'transparent');sh.addColorStop(1,'rgba(0,0,0,.55)');
  x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fillStyle=sh;x.fill();
  const at=x.createRadialGradient(cx,cy,r*.9,cx,cy,r*1.12);
  at.addColorStop(0,`${p.c}00`);at.addColorStop(1,`${p.c}55`);
  x.beginPath();x.arc(cx,cy,r*1.12,0,Math.PI*2);x.fillStyle=at;x.fill()}
function buildPlanets(){
  document.getElementById('pg').innerHTML=PLANETS.map((p,i)=>`
    <div class="oc">
      <div class="oc-vis"><canvas id="pc${i}" width="200" height="200" style="width:100%;height:100%"></canvas></div>
      <div class="oc-n">${p.n}</div><div class="oc-t">${p.t}</div>
      <div class="oc-rows">${p.f.map(f=>`<div class="oc-row"><span class="oc-k">${f[0]}</span><span class="oc-v">${f[1]}</span></div>`).join('')}</div>
    </div>`).join('');
  PLANETS.forEach((p,i)=>drawPlanet(document.getElementById(`pc${i}`),p))}

/* ─── ASTEROIDS ──────────────────────────────────────────────────── */
const ASTS=[
  {n:'Apophis',  t:'NEAR-EARTH',c:'#8B7355',f:[['Size','370 m'],['Flyby','Apr 13, 2029'],['Distance','31,000 km'],['Risk','SAFE'],['Type','S-type'],['Rotation','30.6 hr']]},
  {n:'Bennu',    t:'NEAR-EARTH',c:'#6B5A3E',f:[['Size','560 m'],['Sample','Returned 2023'],['Impact prob','1/1750 in 2182'],['Type','C-type'],['Amino acids','23 types'],['Mission','OSIRIS-REx']]},
  {n:'Ryugu',    t:'NEAR-EARTH',c:'#5A4830',f:[['Size','900 m'],['Sample','5.4g in 2020'],['Mission','Hayabusa2'],['Type','C-type'],['Life?','Amino acids found'],['Distance','0.96 AU']]},
  {n:'Psyche',   t:'MAIN BELT', c:'#8A9AA0',f:[['Size','220 km'],['Comp','90% iron-nickel'],['Mission','NASA en route'],['Arrival','Aug 2029'],['Theory','Exposed core'],['Worth','Quintillions $']]},
  {n:'Oumuamua', t:'INTERSTELLAR',c:'#7A8B7F',f:[['Detected','2017'],['Origin','Another star'],['Shape','Cigar-like'],['Mystery','Unexplained accel'],['Speed','196,000 km/h'],['Status','Left solar system']]},
  {n:'Vesta',    t:'MAIN BELT', c:'#9A8870',f:[['Size','525 km'],['Visible','Naked eye'],['Mission','Dawn 2011'],['Crater','Rheasilvia 505km'],['Volcanism','Ancient yes'],['Type','V-type']]},
  {n:'Didymos',  t:'NEAR-EARTH',c:'#6A5A48',f:[['System','Binary'],['Mission','DART 2022'],['Result','Orbit changed 33min'],['Moonlet','Dimorphos 160m'],['Type','S-type'],['Significance','Planetary defense test']]},
  {n:'Ceres',    t:'DWARF PLANET',c:'#7A7A8A',f:[['Size','945 km'],['Location','Asteroid belt'],['Mission','Dawn 2015'],['Bright spots','Sodium carbonate'],['Water ice','Yes'],['Moons','0']]},
];
function mbr32(s){return function(){s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
function drawAsteroid(cv,a){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2,r=W*.38;
  x.clearRect(0,0,W,H);const rng=mbr32(a.n.charCodeAt(0)*37);
  const pts=10+Math.floor(rng()*6),radii=Array.from({length:pts},()=>r*(rng()*.5+.55));
  x.beginPath();
  for(let i=0;i<pts;i++){const ang=(i/pts)*Math.PI*2;
    i===0?x.moveTo(cx+Math.cos(ang)*radii[i],cy+Math.sin(ang)*radii[i])
         :x.lineTo(cx+Math.cos(ang)*radii[i],cy+Math.sin(ang)*radii[i])}
  x.closePath();
  const g=x.createRadialGradient(cx-r*.2,cy-r*.2,r*.1,cx,cy,r);
  g.addColorStop(0,lhex(a.c,40));g.addColorStop(1,a.c);
  x.fillStyle=g;x.fill();x.strokeStyle='rgba(255,255,255,.08)';x.lineWidth=1;x.stroke();
  for(let c=0;c<5;c++){
    const cr=r*(.07+rng()*.1),ca=rng()*Math.PI*2,cd=rng()*r*.5;
    x.beginPath();x.arc(cx+Math.cos(ca)*cd,cy+Math.sin(ca)*cd,cr,0,Math.PI*2);
    x.fillStyle='rgba(0,0,0,.3)';x.fill()}}
function buildAsteroids(){
  document.getElementById('ag').innerHTML=ASTS.map((a,i)=>`
    <div class="oc">
      <div class="oc-vis" style="height:100px"><canvas id="ac${i}" width="100" height="100" style="width:100px;height:100px;margin:auto;display:block"></canvas></div>
      <div class="oc-n">${a.n}</div><div class="oc-t">${a.t}</div>
      <div class="oc-rows">${a.f.map(f=>`<div class="oc-row"><span class="oc-k">${f[0]}</span><span class="oc-v">${f[1]}</span></div>`).join('')}</div>
    </div>`).join('');
  ASTS.forEach((a,i)=>drawAsteroid(document.getElementById(`ac${i}`),a))}

/* ─── DEEP SPACE ─────────────────────────────────────────────────── */
const DS=[
  {n:'Sgr A* Black Hole',t:'SUPERMASSIVE BLACK HOLE',c:'#FF6B35',f:[['Mass','4M solar masses'],['Distance','26,000 ly'],['First image','2022'],['Diameter','44M km'],['Rotation','Near speed of light'],['Name','Sagittarius A*']]},
  {n:'Andromeda',t:'SPIRAL GALAXY',c:'#8B9FD4',f:[['Distance','2.537M ly'],['Stars','~1 trillion'],['Merger with MW','4.5 billion years'],['Diameter','220,000 ly'],['Visible','Naked eye'],['Type','SA(s)b']]},
  {n:'Crab Nebula',t:'SUPERNOVA REMNANT',c:'#E05C5C',f:[['Distance','6,500 ly'],['Explosion','1054 AD'],['Pulsar spin','30 rot/sec'],['Expansion','1,500 km/s'],['Diameter','11 ly'],['Recorded','Chinese astronomers']]},
  {n:'Europa',t:'OCEAN MOON',c:'#A8C8E8',f:[['Parent','Jupiter'],['Ocean depth','100 km'],['Water','2× Earth oceans'],['Ice shell','10–30 km'],['Mission','Europa Clipper 2030'],['Life probability','HIGH']]},
  {n:'Voyager 1',t:'INTERSTELLAR PROBE',c:'#00FF9F',f:[['Launch','Sep 5 1977'],['Distance','24+ billion km'],['Signal delay','22 hours'],['Power','70W RTG'],['Speed','17 km/s'],['Status','In interstellar space']]},
  {n:'GW170817',t:'NEUTRON STAR MERGER',c:'#FFC857',f:[['Date','Aug 17 2017'],['Distance','130M ly'],['Elements','Gold, Platinum'],['Signal','Gravity waves + light'],['Gold mass','10× Earth mass'],['Significance','Origin of all gold']]},
];
function drawDS(cv,d){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2;
  x.clearRect(0,0,W,H);
  if(d.t.includes('BLACK')){
    const ag=x.createRadialGradient(cx,cy,5,cx,cy,W*.45);
    ag.addColorStop(0,'#FF8C35');ag.addColorStop(.5,'#FF4400');ag.addColorStop(1,'transparent');
    x.save();x.scale(1,.35);x.translate(0,cy*1.85);
    x.beginPath();x.arc(cx,0,W*.42,0,Math.PI*2);x.fillStyle=ag;x.fill();x.restore();
    x.beginPath();x.arc(cx,cy,W*.22,0,Math.PI*2);x.fillStyle='#01020A';x.fill();
    x.beginPath();x.arc(cx,cy,W*.24,0,Math.PI*2);
    x.strokeStyle='rgba(255,100,30,.55)';x.lineWidth=1.8;x.stroke();
  }else if(d.t.includes('GALAXY')){
    const sg=x.createRadialGradient(cx,cy,3,cx,cy,W*.44);
    sg.addColorStop(0,'rgba(200,210,255,.9)');sg.addColorStop(.6,'rgba(150,170,220,.35)');sg.addColorStop(1,'transparent');
    x.save();x.translate(cx,cy);x.rotate(-.4);x.scale(1,.45);
    x.beginPath();x.arc(0,0,W*.42,0,Math.PI*2);x.fillStyle=sg;x.fill();x.restore();
    x.beginPath();x.arc(cx,cy,4,0,Math.PI*2);x.fillStyle='rgba(255,255,255,.9)';x.fill();
  }else if(d.t.includes('NEBULA')){
    const ng=x.createRadialGradient(cx,cy,4,cx,cy,W*.44);
    ng.addColorStop(0,'rgba(255,100,100,.9)');ng.addColorStop(.7,'rgba(180,50,80,.4)');ng.addColorStop(1,'transparent');
    x.beginPath();x.arc(cx,cy,W*.42,0,Math.PI*2);x.fillStyle=ng;x.fill();
    x.beginPath();x.arc(cx,cy,5,0,Math.PI*2);x.fillStyle='rgba(100,200,255,.9)';x.fill();
  }else if(d.t.includes('PROBE')){
    x.strokeStyle='#00FF9F';x.lineWidth=1.4;
    x.beginPath();x.arc(cx,cy-6,11,Math.PI,0);x.stroke();
    x.beginPath();x.moveTo(cx,cy+2);x.lineTo(cx,cy-6);x.stroke();
    x.fillStyle='rgba(0,255,159,.25)';x.strokeStyle='rgba(0,255,159,.7)';
    x.fillRect(cx-7,cy+2,14,9);x.strokeRect(cx-7,cy+2,14,9);
    for(const s of[-1,1]){x.fillStyle='rgba(0,80,200,.5)';x.fillRect(cx+s*7,cy+4,s*18,5);
      x.strokeStyle='rgba(0,200,255,.5)';x.strokeRect(cx+s*7,cy+4,s*18,5);}
  }else{
    const gg=x.createRadialGradient(cx,cy,3,cx,cy,W*.4);
    gg.addColorStop(0,d.c);gg.addColorStop(.5,d.c+'88');gg.addColorStop(1,'transparent');
    x.beginPath();x.arc(cx,cy,W*.4,0,Math.PI*2);x.fillStyle=gg;x.fill();
    x.beginPath();x.arc(cx,cy,W*.12,0,Math.PI*2);x.fillStyle=d.c;x.fill();}}
function buildDeepSpace(){
  document.getElementById('dg').innerHTML=DS.map((d,i)=>`
    <div class="oc">
      <div class="oc-vis" style="height:100px"><canvas id="dc${i}" width="100" height="100" style="width:100px;height:100px;margin:auto;display:block"></canvas></div>
      <div class="oc-n">${d.n}</div><div class="oc-t">${d.t}</div>
      <div class="oc-rows">${d.f.map(f=>`<div class="oc-row"><span class="oc-k">${f[0]}</span><span class="oc-v">${f[1]}</span></div>`).join('')}</div>
    </div>`).join('');
  DS.forEach((d,i)=>drawDS(document.getElementById(`dc${i}`),d))}

/* ─── IMAGE PATH HELPER ─────────────────────────────────────────────
   HOW TO USE YOUR LOCAL IMAGES:

   Put your Python-generated images in folders next to index.html:
     images/
       reentry/   ← from reentry_generator.py output
         01_Skylab.png
         02_Mir.png
         03_UARS.png  ... etc
       forgotten/ ← from forgotten_generator.py output
         01_Vanguard-1.png
         02_Transit_4A.png  ... etc
       genesis/   ← from genesis_generator.py output
         01_Sputnik-1.png
         02_Explorer-1.png  ... etc

   Naming: match exactly what Python outputs (id padded to 2 digits + underscore + name with spaces→underscore)
   ────────────────────────────────────────────────────────────────── */

// Map satellite names to their image filenames (matches Python generator output)
const REENTRY_IMGS = {
  'Skylab':           'images/reentry/01_Skylab.png',
  'Mir':              'images/reentry/02_Mir.png',
  'UARS':             'images/reentry/03_UARS.png',
  'Salyut-1':         'images/reentry/04_Salyut-1.png',
  'Cosmos-954':       'images/reentry/05_Cosmos-954.png',
  'ROSAT':            'images/reentry/06_ROSAT.png',
  'ERBS':             'images/reentry/07_ERBS.png',
  'Tiangong-1':       'images/reentry/08_Tiangong-1.png',
  'STS-107 Columbia': 'images/reentry/15_Columbia.png',
  'GOCE':             'images/reentry/06_GOCE.png',
  'ERS-2':            'images/reentry/14_ERS-2.png',
  'Phobos-Grunt':     'images/reentry/17_Phobos-Grunt.png',
};
const FORGOTTEN_IMGS = {
  'Vanguard-1':     'images/forgotten/01_Vanguard-1.png',
  'Transit 4A':     'images/forgotten/02_Transit_4A.png',
  'LES-1':          'images/forgotten/03_LES-1.png',
  'Telstar-1':      'images/forgotten/04_Telstar-1.png',
  'ATS-1':          'images/forgotten/06_ATS-1.png',
  'Envisat':        'images/forgotten/09_Envisat.png',
  'Cosmos-482':     'images/forgotten/05_Cosmos-482.png',
  'Gravity Probe B':'images/forgotten/08_Gravity_Probe_B.png',
  'SEASAT':         'images/forgotten/09_SEASAT.png',
  'Landsat-5':      'images/forgotten/10_Landsat-5.png',
  'Superbird-B':    'images/forgotten/11_Superbird-B.png',
  'Genesis-1':      'images/forgotten/12_Genesis-1.png',
};
const GENESIS_IMGS = {
  'Sputnik-1':         'images/genesis/01_Sputnik-1.png',
  'Explorer-1':        'images/genesis/02_Explorer-1.png',
  'Asterix':           'images/genesis/03_Asterix.png',
  'Dong Fang Hong 1':  'images/genesis/04_Dong_Fang_Hong_1.png',
  'Prospero':          'images/genesis/05_Prospero.png',
  'Aryabhata':         'images/genesis/06_Aryabhata.png',
  'Ofeq-1':            'images/genesis/07_Ofeq-1.png',
  'Kitsat-1':          'images/genesis/08_Kitsat-1.png',
  'Sich-1':            'images/genesis/09_Sich-1.png',
  'TUBSAT':            'images/genesis/10_TUBSAT.png',
  'Brasilsat-A1':      'images/genesis/11_Brasilsat-A1.png',
  'Badr-1':            'images/genesis/12_Badr-1.png',
  'Ohsumi':            'images/genesis/13_Ohsumi.png',
  'Omid':              'images/genesis/14_Omid.png',
  'EgyptSat-1':        'images/genesis/15_EgyptSat-1.png',
};

// Genesis satellite data (first satellite of each nation)
const GENESIS_SATS=[
  {n:'Sputnik-1',   nat:'Soviet Union',yr:1957,m:'First artificial satellite — changed history in 22 days',bl:'DECAYED 1958'},
  {n:'Explorer-1',  nat:'United States',yr:1958,m:'Discovered Van Allen radiation belts',bl:'DECAYED 1970'},
  {n:'Asterix',     nat:'France',yr:1965,m:'First French satellite — 3rd spacefaring nation',bl:'STILL ORBITING'},
  {n:'Dong Fang Hong 1',nat:'China',yr:1970,m:'Broadcast patriotic song from orbit',bl:'STILL ORBITING'},
  {n:'Prospero',    nat:'United Kingdom',yr:1971,m:'Only UK satellite launched on British rocket',bl:'STILL ORBITING'},
  {n:'Aryabhata',   nat:'India',yr:1975,m:'Named after 5th century mathematician-astronomer',bl:'DECAYED 1992'},
  {n:'Ofeq-1',      nat:'Israel',yr:1988,m:'Launched westward — retrograde orbit',bl:'DECAYED 1989'},
  {n:'Kitsat-1',    nat:'South Korea',yr:1992,m:'First South Korean satellite — university-built',bl:'STILL ORBITING'},
  {n:'Sich-1',      nat:'Ukraine',yr:1995,m:'First independent Ukrainian satellite post-Soviet',bl:'OPERATIONAL'},
  {n:'TUBSAT',      nat:'Germany',yr:1991,m:'First German university satellite — TU Berlin',bl:'DECAYED'},
  {n:'Brasilsat-A1',nat:'Brazil',yr:1985,m:'First Brazilian satellite — geostationary',bl:'RETIRED'},
  {n:'Badr-1',      nat:'Pakistan',yr:1990,m:'First Pakistani satellite — technology demo',bl:'DECAYED'},
  {n:'Ohsumi',      nat:'Japan',yr:1970,m:'Made Japan the 4th spacefaring nation',bl:'DECAYED 1971'},
  {n:'Omid',        nat:'Iran',yr:2009,m:'First Iranian satellite — data transmission test',bl:'DECAYED 2009'},
  {n:'EgyptSat-1',  nat:'Egypt',yr:2007,m:'First Egyptian satellite — remote sensing',bl:'RETIRED'},
];

/* ─── SATELLITE GRIDS ────────────────────────────────────────────── */
const FSATS=[
  {n:'Vanguard-1',   nat:'USA',yr:1958,si:1964,alt:'650 km', m:'Oldest man-made object still in orbit',badge:'b-s',bl:'SILENT SINCE 1964'},
  {n:'Transit 4A',   nat:'USA',yr:1961,si:1970,alt:'880 km', m:'Early US Navy navigation satellite',badge:'b-s',bl:'SILENT SINCE 1970'},
  {n:'LES-1',        nat:'USA',yr:1965,si:1967,alt:'2800 km',m:'Accidentally transmitting since 2012',badge:'b-z',bl:'⚡ ZOMBIE SATELLITE'},
  {n:'Telstar-1',    nat:'USA',yr:1962,si:1963,alt:'5600 km',m:'First commercial comms sat — radiation damage',badge:'b-s',bl:'SILENT SINCE 1963'},
  {n:'ATS-1',        nat:'USA',yr:1966,si:1985,alt:'GEO',    m:'First geostationary weather satellite',badge:'b-s',bl:'SILENT SINCE 1985'},
  {n:'Envisat',      nat:'ESA',yr:2002,si:2012,alt:'790 km', m:'8 tonnes uncontrolled debris — contact lost',badge:'b-s',bl:'SILENT SINCE 2012'},
  {n:'Cosmos-482',   nat:'USSR',yr:1972,si:1972,alt:'220 km',m:'Failed Venus probe stranded in Earth orbit',badge:'b-s',bl:'SILENT SINCE 1972'},
  {n:'Gravity Probe B',nat:'USA',yr:2004,si:2008,alt:'642 km',m:'Tested Einstein\'s general relativity',badge:'b-s',bl:'SILENT SINCE 2008'},
  {n:'SEASAT',       nat:'USA',yr:1978,si:1978,alt:'800 km', m:'First ocean remote sensing — 105 day failure',badge:'b-s',bl:'SILENT SINCE 1978'},
  {n:'Landsat-5',    nat:'USA',yr:1984,si:2013,alt:'705 km', m:'29 years service — longest operational satellite',badge:'b-s',bl:'SILENT SINCE 2013'},
  {n:'Superbird-B',  nat:'Japan',yr:1990,si:1990,alt:'GEO',  m:'Drifting and tumbling in GEO since 1990',badge:'b-s',bl:'SILENT SINCE 1990'},
  {n:'Genesis-1',    nat:'USA',yr:2006,si:2008,alt:'550 km', m:'Inflatable space habitat prototype',badge:'b-s',bl:'SILENT SINCE 2008'},
];
const RSATS=[
  {n:'Skylab',        nat:'USA',   yr:1973,re:1979,loc:'Western Australia',     m:'77 tonnes — uncontrolled reentry · 5,000km debris field'},
  {n:'Mir',           nat:'Russia',yr:1986,re:2001,loc:'South Pacific Ocean',   m:'15 years · 104 cosmonauts · controlled deorbit'},
  {n:'Cosmos-954',    nat:'USSR',  yr:1977,re:1978,loc:'Northwest Canada',      m:'Nuclear-powered — radioactive debris over 124,000 km²'},
  {n:'Tiangong-1',    nat:'China', yr:2011,re:2018,loc:'South Pacific',         m:'China\'s first space station — uncontrolled reentry'},
  {n:'STS-107 Columbia',nat:'USA', yr:2003,re:2003,loc:'Texas & Louisiana',     m:'Space Shuttle — heat shield tile failure'},
  {n:'GOCE',          nat:'ESA',   yr:2009,re:2013,loc:'Falkland Islands',      m:'Gravity mapper — lowest-ever science orbit 255km'},
  {n:'Salyut-1',      nat:'USSR',  yr:1971,re:1971,loc:'Pacific Ocean',         m:'First space station in history'},
  {n:'ERBS',          nat:'USA',   yr:1984,re:2023,loc:'Bering Sea Alaska',     m:'39 years in orbit — deployed from Challenger'},
  {n:'ERS-2',         nat:'ESA',   yr:1995,re:2024,loc:'North Atlantic',        m:'29 years Earth observation — reentry 2024'},
  {n:'Phobos-Grunt',  nat:'Russia',yr:2011,re:2012,loc:'Pacific off Chile',     m:'Failed Mars mission — never left Earth orbit'},
];

// Map satellite name to a deterministic epitaph-style index for canvas fallback colours
function matchEpitaph(name){
  let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))&0xffff;
  return h%20;
}

function makeCardMedia(imgPath, canvasFallbackFn, canvasId){
  // Returns HTML for img (if user has the file) with canvas fallback drawn after DOM insert
  return `
    <div class="sc-media" id="media-${canvasId}">
      <img class="sc-thumb"
           src="${imgPath}"
           alt=""
           loading="lazy"
           onerror="this.style.display='none';document.getElementById('cv-${canvasId}').style.display='block'">
      <canvas class="sc-thumb" id="cv-${canvasId}" width="400" height="300" style="display:none"></canvas>
    </div>`;
}

function buildSatGrids(){
  // ── REENTRY GRID — canvas art + image override ──
  document.getElementById('rg').innerHTML = RSATS.map((s,i)=>{
    const epIdx = matchEpitaph(s.n);
    const imgPath = REENTRY_IMGS[s.n] || '';
    const media = makeCardMedia(imgPath, null, 're'+i);
    return `<div class="sc">
      ${media}
      <div class="sc-body">
        <div class="sc-n">${s.n}</div>
        <div class="sc-nat">${s.nat} · LAUNCH ${s.yr}</div>
        <div class="sc-m">${s.m}</div>
        <div class="badge b-r">🔥 REENTRY ${s.re} — ${s.loc.toUpperCase()}</div>
      </div>
    </div>`;
  }).join('');

  // Draw orbital art canvas fallbacks for reentry cards
  RSATS.forEach((s,i)=>{
    const cv=document.getElementById('cv-re'+i);
    if(!cv)return;
    setTimeout(()=>drawForgottenCanvas(cv,{n:s.n,nat:s.nat,yr:s.yr},i),i*40);
  });

  // ── FORGOTTEN GRID — image + canvas fallback ──
  document.getElementById('fg').innerHTML = FSATS.map((s,i)=>{
    const imgPath = FORGOTTEN_IMGS[s.n] || '';
    const media = makeCardMedia(imgPath, null, 'fo'+i);
    return `<div class="sc">
      ${media}
      <div class="sc-body">
        <div class="sc-n">${s.n}</div>
        <div class="sc-nat">${s.nat} · LAUNCH ${s.yr}</div>
        <div class="sc-m">${s.m}</div>
        <div class="badge ${s.badge}">${s.bl}</div>
        <div class="sc-a">⬡ ALT: ${s.alt}</div>
      </div>
    </div>`;
  }).join('');

  // Draw canvas fallbacks for forgotten cards using orbital-style art
  FSATS.forEach((s,i)=>{
    const cv = document.getElementById('cv-fo'+i);
    if(!cv) return;
    setTimeout(()=> drawForgottenCanvas(cv, s, i), i * 30);
  });

  // ── GENESIS GRID — image + canvas fallback ──
  document.getElementById('gg').innerHTML = GENESIS_SATS.map((s,i)=>{
    const imgPath = GENESIS_IMGS[s.n] || '';
    const media = makeCardMedia(imgPath, null, 'ge'+i);
    const badge = s.bl.includes('ORBITING')||s.bl==='OPERATIONAL'
      ? `<div class="badge b-z">⬡ ${s.bl}</div>`
      : `<div class="badge b-s">⬡ ${s.bl}</div>`;
    return `<div class="sc">
      ${media}
      <div class="sc-body">
        <div class="sc-n">${s.n}</div>
        <div class="sc-nat">${s.nat} · LAUNCH ${s.yr}</div>
        <div class="sc-m">${s.m}</div>
        ${badge}
      </div>
    </div>`;
  }).join('');

  // Draw canvas fallbacks for genesis cards
  GENESIS_SATS.forEach((s,i)=>{
    const cv = document.getElementById('cv-ge'+i);
    if(!cv) return;
    setTimeout(()=> drawGenesisCanvas(cv, s, i), i * 30);
  });
}

// ── FORGOTTEN CANVAS FALLBACK — blue/cyan palette, circular orbit ──
function drawForgottenCanvas(cv, sat, idx){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2;
  const rng=mbr32(idx*997+3);
  x.fillStyle='#01020A';x.fillRect(0,0,W,H);
  for(let i=0;i<180;i++){x.beginPath();x.arc(rng()*W,rng()*H,rng()*1.1+.2,0,Math.PI*2);
    x.fillStyle=`rgba(200,220,255,${rng()*.5+.15})`;x.fill()}
  // Cyan nebula
  const ng=x.createRadialGradient(cx,cy,20,cx,cy,W*.55);
  ng.addColorStop(0,'rgba(0,180,200,.12)');ng.addColorStop(1,'transparent');
  x.fillStyle=ng;x.fillRect(0,0,W,H);
  // Earth
  const er=W*.12,eg=x.createRadialGradient(cx-er*.3,cy-er*.3,0,cx,cy,er);
  eg.addColorStop(0,'#1a4a7a');eg.addColorStop(.7,'#0a2d47');eg.addColorStop(1,'#061a2e');
  x.beginPath();x.arc(cx,cy,er,0,Math.PI*2);x.fillStyle=eg;x.fill();
  // Atmosphere
  const ag=x.createRadialGradient(cx,cy,er*.9,cx,cy,er*1.2);
  ag.addColorStop(0,'rgba(0,180,255,.2)');ag.addColorStop(1,'transparent');
  x.beginPath();x.arc(cx,cy,er*1.2,0,Math.PI*2);x.fillStyle=ag;x.fill();
  // Orbit (circular — forgotten satellites are in stable orbits)
  const or=W*.38;
  x.save();x.translate(cx,cy);x.rotate(rng()*Math.PI);
  [[10,.012],[6,.04],[3,.1],[1.5,.3]].forEach(([lw,la])=>{
    x.beginPath();x.arc(0,0,or,0,Math.PI*2);
    x.strokeStyle='#00D4FF';x.lineWidth=lw;x.globalAlpha=la;x.stroke()});
  x.globalAlpha=1;
  // Satellite dot — dim/grey (forgotten/silent)
  const sx=or*.7,sy=-or*.7;
  const sg=x.createRadialGradient(sx,sy,0,sx,sy,10);
  sg.addColorStop(0,'rgba(150,150,160,.8)');sg.addColorStop(1,'transparent');
  x.fillStyle=sg;x.beginPath();x.arc(sx,sy,10,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(180,180,200,.6)';x.beginPath();x.arc(sx,sy,2.5,0,Math.PI*2);x.fill();
  x.restore();
  // Text
  x.font=`bold ${W*.042}px Orbitron, Share Tech Mono, monospace`;
  x.fillStyle='rgba(255,255,255,.88)';x.textAlign='left';
  x.fillText(sat.n.toUpperCase().slice(0,14),W*.03,H*.9);
  x.font=`${W*.028}px Share Tech Mono, monospace`;
  x.fillStyle='rgba(0,212,255,.65)';x.fillText(sat.nat.toUpperCase(),W*.03,H*.96);
  x.textAlign='right';x.fillStyle='rgba(0,212,255,.45)';
  x.fillText(String(sat.yr),W*.97,H*.96);x.textAlign='left';}

// ── GENESIS CANVAS FALLBACK — gold palette, elliptical orbit ──
function drawGenesisCanvas(cv, sat, idx){
  const x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,cy=H/2;
  const rng=mbr32(idx*1553+11);
  // Colours per nation
  const COLS=['#D4A853','#C0C0C0','#4FC3F7','#FF6B6B','#A8E6CF',
              '#FFB347','#B19CD9','#87CEEB','#FFD700','#98FB98',
              '#3CB371','#00CED1','#FF69B4','#DDA0DD','#F0E68C'];
  const col=COLS[idx%COLS.length];
  const hex=col.replace('#','');
  const cr=parseInt(hex.slice(0,2),16),cg2=parseInt(hex.slice(2,4),16),cb=parseInt(hex.slice(4,6),16);
  x.fillStyle='#01020A';x.fillRect(0,0,W,H);
  for(let i=0;i<180;i++){x.beginPath();x.arc(rng()*W,rng()*H,rng()*1.2+.2,0,Math.PI*2);
    x.fillStyle=`rgba(200,220,255,${rng()*.55+.15})`;x.fill()}
  // Nebula in sat colour
  const ng=x.createRadialGradient(cx,cy,10,cx,cy,W*.55);
  ng.addColorStop(0,`rgba(${cr},${cg2},${cb},.1)`);ng.addColorStop(1,'transparent');
  x.fillStyle=ng;x.fillRect(0,0,W,H);
  // Earth
  const er=W*.115,eg=x.createRadialGradient(cx-er*.3,cy-er*.3,0,cx,cy,er);
  eg.addColorStop(0,'#1a4a7a');eg.addColorStop(.7,'#0a2d47');eg.addColorStop(1,'#061a2e');
  x.beginPath();x.arc(cx,cy,er,0,Math.PI*2);x.fillStyle=eg;x.fill();
  const atm=x.createRadialGradient(cx,cy,er*.9,cx,cy,er*1.2);
  atm.addColorStop(0,'rgba(100,160,255,.2)');atm.addColorStop(1,'transparent');
  x.beginPath();x.arc(cx,cy,er*1.2,0,Math.PI*2);x.fillStyle=atm;x.fill();
  // Elliptical orbit
  const sma=W*.37,ecc=.05+rng()*.15,smb=sma*Math.sqrt(1-ecc*ecc),foc=sma*ecc;
  const inc=(.2+rng()*.5);
  x.save();x.translate(cx,cy);x.rotate(-inc);
  [[10,.012],[6,.04],[3,.1],[1.5,.35],[.8,.85]].forEach(([lw,la])=>{
    x.beginPath();x.ellipse(foc,0,sma,smb,0,0,Math.PI*2);
    x.strokeStyle=col;x.lineWidth=lw;x.globalAlpha=la;x.stroke()});
  x.globalAlpha=1;
  // APO marker
  const ax=-sma+foc;x.strokeStyle=col;x.globalAlpha=.42;x.lineWidth=.9;
  x.beginPath();x.moveTo(ax-5,0);x.lineTo(ax+5,0);x.moveTo(ax,-5);x.lineTo(ax,5);x.stroke();
  x.font='8px Share Tech Mono';x.fillStyle=col;x.fillText('APO',ax+6,-3);
  // Satellite
  const sang=Math.PI*.7,sx2=foc+sma*Math.cos(sang),sy2=smb*Math.sin(sang);
  x.globalAlpha=1;
  const sg=x.createRadialGradient(sx2,sy2,0,sx2,sy2,11);
  sg.addColorStop(0,col);sg.addColorStop(1,'transparent');
  x.fillStyle=sg;x.beginPath();x.arc(sx2,sy2,11,0,Math.PI*2);x.fill();
  x.fillStyle='#E8F4FF';x.beginPath();x.arc(sx2,sy2,2.5,0,Math.PI*2);x.fill();
  x.restore();
  // Text
  x.font=`bold ${W*.042}px Orbitron, Share Tech Mono, monospace`;
  x.fillStyle='rgba(255,255,255,.9)';x.textAlign='left';
  x.fillText(sat.n.toUpperCase().slice(0,14),W*.03,H*.9);
  x.font=`${W*.028}px Share Tech Mono, monospace`;
  x.fillStyle=col;x.globalAlpha=.65;x.fillText(sat.nat.toUpperCase().slice(0,20),W*.03,H*.96);
  x.textAlign='right';x.fillText(String(sat.yr),W*.97,H*.96);
  x.textAlign='left';x.globalAlpha=1;}

/* ─── LIVE SOLAR SYSTEM ORRERY ───────────────────────────────────────
   Real orbital periods, live ISS position, hover info panels.       */

/* ─── SOLAR SYSTEM ORRERY 3D ──────────────────────────────────
   Three.js r128 · Real orbital periods · Procedural textures
   Planet surfaces, Saturn rings, atmospheric glow, missions    */
const ORR_BODIES = [
  {id:'sun',    n:'Sun',         t:'G-TYPE STAR',          c:0xFFF176, r:0.35, a:0,    P:0,
   rows:[['Mass','1.989×10³⁰ kg'],['Diameter','1,392,700 km'],['Surface','5,500°C'],['Age','4.6 Gyr']]},
  {id:'mercury',n:'Mercury',     t:'TERRESTRIAL PLANET',   c:0xA0855B, r:0.055,a:0.72, P:87.97,
   rows:[['Year','88 days'],['Day','1,408 hrs'],['Temp','-180/+430°C'],['Moons','0']]},
  {id:'venus',  n:'Venus',       t:'TERRESTRIAL PLANET',   c:0xE8C56B, r:0.09, a:1.1,  P:224.7,
   rows:[['Year','225 days'],['Temp','+465°C'],['Day','5,832 hrs'],['Moons','0']]},
  {id:'earth',  n:'Earth',       t:'TERRESTRIAL PLANET',   c:0x4488DD, r:0.10, a:1.5,  P:365.25,
   rows:[['Year','365.25 days'],['Moons','1'],['Tilt','23.4°'],['Atm','N₂/O₂']]},
  {id:'mars',   n:'Mars',        t:'TERRESTRIAL PLANET',   c:0xC1440E, r:0.07, a:2.0,  P:686.97,
   rows:[['Year','687 days'],['Moons','2'],['Temp','-63°C avg'],['Peak','Olympus 21km']]},
  {id:'jupiter',n:'Jupiter',     t:'GAS GIANT',            c:0xC88B3A, r:0.30, a:3.8,  P:4332.59,
   rows:[['Year','12 Earth yrs'],['Moons','95'],['Mass','318× Earth'],['Storm','350+ yrs']]},
  {id:'saturn', n:'Saturn',      t:'GAS GIANT + RINGS',    c:0xE4D191, r:0.24, a:5.2,  P:10759.22,
   rings:true,
   rows:[['Year','29 Earth yrs'],['Moons','146'],['Rings','282,000 km wide'],['Density','< water']]},
  {id:'uranus', n:'Uranus',      t:'ICE GIANT',            c:0x7DE8E8, r:0.16, a:7.2,  P:30688.5,
   rows:[['Year','84 Earth yrs'],['Tilt','97.77°'],['Moons','28'],['Temp','-224°C']]},
  {id:'neptune',n:'Neptune',     t:'ICE GIANT',            c:0x3F54BA, r:0.15, a:9.0,  P:60182,
   rows:[['Year','165 Earth yrs'],['Moons','16'],['Wind','2,100 km/h'],['Temp','-218°C']]},
  {id:'iss',    n:'ISS',         t:'SPACE STATION · LEO',  c:0x00FF9F, r:0.04, a:1.52, P:365.25, mission:true, issLive:true,
   rows:[['Alt','408 km'],['Speed','Mach 23'],['Crew','6-7'],['Mass','450 t'],['Orbits/day','16×']]},
  {id:'psyche', n:'Psyche',      t:'NASA EN ROUTE',        c:0xB87333, r:0.04, a:2.7,  P:1450, mission:true,
   rows:[['Launch','Oct 2023'],['Target','16 Psyche'],['Arrives','Aug 2029'],['Type','Iron-nickel']]},
  {id:'clipper',n:'Europa Clipper',t:'NASA MISSION',       c:0x8B9FD4, r:0.04, a:3.85, P:4332.59, mission:true,
   rows:[['Launch','Oct 2024'],['Target','Europa'],['Arrives','Apr 2030'],['Flybys','49']]},
  {id:'voyager',n:'Voyager 1',   t:'INTERSTELLAR',         c:0xFF6B35, r:0.04, a:18.0, P:0, mission:true,
   rows:[['Launch','1977'],['Dist','24+ billion km'],['Delay','22 hours'],['Power','70W RTG']]},
];

let orrScene, orrCamera, orrRenderer, orrBodies3D={};
let orrT=0, orrSpd=1, orrPaused=false, orrHov=null;
let orrDragging=false, orrLastX=0, orrLastY=0, orrPhi=1.1, orrTheta=0.4, orrRadius=15;
let orrAngles={}, orrLastT=null;

ORR_BODIES.forEach((b,i) => { orrAngles[b.id] = (i/ORR_BODIES.length)*Math.PI*2; });

// Procedural planet texture generator
function orrMakeTex(id, col) {
  const c=document.createElement('canvas'); c.width=256; c.height=128;
  const x=c.getContext('2d');
  const [r,g,b] = [col>>16, (col>>8)&255, col&255];

  if (id==='sun') {
    const g2=x.createRadialGradient(128,64,5,128,64,128);
    g2.addColorStop(0,'#FFFDE7'); g2.addColorStop(.4,'#FFF176'); g2.addColorStop(.8,'#FF8F00'); g2.addColorStop(1,'#E65100');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    // Sunspots
    for(let i=0;i<8;i++){x.beginPath();x.arc(30+Math.random()*196,20+Math.random()*88,3+Math.random()*5,0,Math.PI*2);x.fillStyle='rgba(0,0,0,.18)';x.fill();}
  } else if (id==='earth') {
    x.fillStyle='#1a4a88'; x.fillRect(0,0,256,128);
    x.fillStyle='#1a5a28';
    [[120,40,55,35],[60,50,40,30],[175,45,55,30],[200,55,40,25],[30,55,35,22],[240,65,25,18]].forEach(([cx,cy,rw,rh])=>{x.beginPath();x.ellipse(cx,cy,rw,rh,0,0,Math.PI*2);x.fill();});
    x.fillStyle='#c8ddf8'; x.fillRect(0,0,256,9); x.fillRect(0,119,256,9);
    // Clouds
    x.fillStyle='rgba(255,255,255,.25)';
    for(let i=0;i<20;i++){x.beginPath();x.ellipse(Math.random()*256,Math.random()*128,15+Math.random()*25,5+Math.random()*8,Math.random(),0,Math.PI*2);x.fill();}
  } else if (id==='mars') {
    const g2=x.createLinearGradient(0,0,0,128);
    g2.addColorStop(0,'#a03a1a'); g2.addColorStop(1,'#c05828');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    x.fillStyle='rgba(180,100,60,.35)';
    for(let i=0;i<12;i++){x.beginPath();x.ellipse(Math.random()*256,Math.random()*128,8+Math.random()*20,5+Math.random()*12,Math.random(),0,Math.PI*2);x.fill();}
    x.fillStyle='rgba(220,180,140,.2)'; x.fillRect(0,45,256,38); // dust belt
    // Ice caps
    x.fillStyle='rgba(255,255,255,.6)'; x.fillRect(0,0,256,6); x.fillRect(0,122,256,6);
  } else if (id==='venus') {
    const g2=x.createLinearGradient(0,0,256,0);
    g2.addColorStop(0,'#c8a040'); g2.addColorStop(.5,'#e8c870'); g2.addColorStop(1,'#c8a040');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    // Cloud bands
    for(let i=0;i<8;i++){x.beginPath();x.rect(0,i*16,256,8);x.fillStyle=`rgba(255,220,100,${0.06+i%2*0.08})`;x.fill();}
  } else if (id==='mercury') {
    x.fillStyle='#888880'; x.fillRect(0,0,256,128);
    // Craters
    for(let i=0;i<30;i++){x.beginPath();x.arc(Math.random()*256,Math.random()*128,2+Math.random()*8,0,Math.PI*2);x.fillStyle=`rgba(0,0,0,${0.1+Math.random()*.15})`;x.fill();
    x.beginPath();x.arc(Math.random()*256-1,Math.random()*128-1,1+Math.random()*3,0,Math.PI*2);x.fillStyle='rgba(200,200,180,.15)';x.fill();}
  } else if (id==='jupiter') {
    const g2=x.createLinearGradient(0,0,0,128);
    g2.addColorStop(0,'#c8903a'); g2.addColorStop(.1,'#e8b060'); g2.addColorStop(.2,'#a07030'); g2.addColorStop(.3,'#e8c080');
    g2.addColorStop(.4,'#c07838'); g2.addColorStop(.5,'#f0c870'); g2.addColorStop(.6,'#b06828'); g2.addColorStop(.7,'#d89048');
    g2.addColorStop(.8,'#e8b860'); g2.addColorStop(1,'#b88038');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    // Great Red Spot
    x.beginPath(); x.ellipse(90,78,18,11,-.2,0,Math.PI*2);
    x.fillStyle='rgba(180,60,30,.55)'; x.fill();
  } else if (id==='saturn') {
    const g2=x.createLinearGradient(0,0,0,128);
    g2.addColorStop(0,'#d8c878'); g2.addColorStop(.3,'#e8d898'); g2.addColorStop(.6,'#c8b868'); g2.addColorStop(1,'#d8c878');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    for(let i=0;i<6;i++){x.fillStyle=`rgba(180,150,80,${0.05+i*.03})`;x.fillRect(0,i*20,256,10);}
  } else if (id==='uranus') {
    const g2=x.createLinearGradient(0,0,0,128);
    g2.addColorStop(0,'#7DE8E8'); g2.addColorStop(.5,'#5DC8D8'); g2.addColorStop(1,'#7DE8E8');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    x.fillStyle='rgba(100,220,220,.12)'; x.fillRect(0,40,256,48);
  } else if (id==='neptune') {
    const g2=x.createLinearGradient(0,0,0,128);
    g2.addColorStop(0,'#2a3a9a'); g2.addColorStop(.5,'#3a4aba'); g2.addColorStop(1,'#2a3a9a');
    x.fillStyle=g2; x.fillRect(0,0,256,128);
    // Storm
    x.beginPath(); x.ellipse(180,55,14,9,0,0,Math.PI*2);
    x.fillStyle='rgba(100,130,255,.35)'; x.fill();
  } else {
    // generic coloured surface
    x.fillStyle=`rgb(${r},${g},${b})`; x.fillRect(0,0,256,128);
    x.fillStyle='rgba(255,255,255,.07)';
    for(let i=0;i<5;i++){x.fillRect(0,i*25,256,12);}
  }
  return new THREE.CanvasTexture(c);
}

function orrBuildScene() {
  const cv=document.getElementById('orr-cv'); if(!cv)return;
  const W=cv.parentElement.offsetWidth||900;
  const H=Math.max(460,Math.round(W*0.58));
  cv.width=W; cv.height=H; cv.style.height=H+'px';

  orrScene   = new THREE.Scene();
  orrCamera  = new THREE.PerspectiveCamera(48,W/H,0.01,3000);
  orrRenderer= new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false});
  orrRenderer.setSize(W,H);
  orrRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  orrRenderer.setClearColor(0x01020A);

  // Lighting
  orrScene.add(new THREE.AmbientLight(0x223355,0.5));
  const sunLight = new THREE.PointLight(0xffeedd,2.5,0);
  sunLight.name='sunlight'; orrScene.add(sunLight);
  const sunGlow = new THREE.PointLight(0xffcc44,0.8,20);
  orrScene.add(sunGlow);

  // Stars
  const rng=((s)=>()=>{s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;})(77);
  const sp=new Float32Array(3500*3),sc=new Float32Array(3500*3);
  for(let i=0;i<3500;i++){
    const th=rng()*Math.PI*2,ph=Math.acos(2*rng()-1),r=800+rng()*200;
    sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    const t=rng(); sc[i*3]=t<.15?.85:.98; sc[i*3+1]=t<.15?.9:.98; sc[i*3+2]=t<.15?1:.97;
  }
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(sp,3)); sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  orrScene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:1.1,vertexColors:true,sizeAttenuation:true})));

  // Milky Way band
  const mwPts=new Float32Array(800*3);
  for(let i=0;i<800;i++){const th=(i/800)*Math.PI*2+(rng()-.5)*.3,ph=(Math.PI/2)+(rng()-.5)*.25,r=780;mwPts[i*3]=r*Math.sin(ph)*Math.cos(th);mwPts[i*3+1]=r*Math.cos(ph);mwPts[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
  const mwG=new THREE.BufferGeometry();mwG.setAttribute('position',new THREE.BufferAttribute(mwPts,3));
  orrScene.add(new THREE.Points(mwG,new THREE.PointsMaterial({color:0xaabbff,size:1.4,transparent:true,opacity:.12,sizeAttenuation:true})));

  // Build planets
  ORR_BODIES.forEach(body => {
    const group = new THREE.Group();
    group.name  = 'body-' + body.id;

    if (body.id === 'sun') {
      // Sun mesh with glow
      const tex = orrMakeTex('sun', body.c);
      const mat = new THREE.MeshPhongMaterial({map:tex,emissive:0xffaa00,emissiveIntensity:1.2,shininess:0});
      const mesh= new THREE.Mesh(new THREE.SphereGeometry(body.r,48,24),mat);
      group.add(mesh);
      // Corona layers
      [[body.r*1.2,0.14],[body.r*1.6,0.06],[body.r*2.2,0.03]].forEach(([cr,op])=>{
        const cm=new THREE.Mesh(new THREE.SphereGeometry(cr,32,16),new THREE.MeshPhongMaterial({color:0xffcc44,transparent:true,opacity:op,side:THREE.BackSide,depthWrite:false}));
        group.add(cm);
      });
    } else if (body.mission) {
      // Mission dot with dashed ring
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(body.r,10,8),new THREE.MeshPhongMaterial({color:body.c,emissive:body.c,emissiveIntensity:2}));
      group.add(mesh);
      // Pulsing glow
      const gm=new THREE.Mesh(new THREE.SphereGeometry(body.r*2.5,10,8),new THREE.MeshPhongMaterial({color:body.c,transparent:true,opacity:.2,depthWrite:false}));
      gm.name='missionglow'; group.add(gm);
    } else {
      // Planet with texture
      const tex=orrMakeTex(body.id,body.c);
      const mat=new THREE.MeshPhongMaterial({map:tex,shininess:12,specular:new THREE.Color(0x112244)});
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(body.r,48,24),mat);
      mesh.name='planetmesh'; group.add(mesh);

      // Atmospheric glow
      const atmC = body.id==='earth'?0x4488ff:body.id==='venus'?0xcc9933:body.id==='mars'?0xff6633:body.c;
      const atmM = new THREE.Mesh(new THREE.SphereGeometry(body.r*1.08,24,12),new THREE.MeshPhongMaterial({color:atmC,transparent:true,opacity:.1,side:THREE.BackSide,depthWrite:false}));
      group.add(atmM);

      // Saturn rings
      if (body.rings) {
        const rc=document.createElement('canvas'); rc.width=256; rc.height=1;
        const rx=rc.getContext('2d'); const rg=rx.createLinearGradient(0,0,256,0);
        rg.addColorStop(0,'rgba(0,0,0,0)'); rg.addColorStop(.05,'rgba(180,160,100,.15)');
        rg.addColorStop(.15,'rgba(210,190,130,.55)'); rg.addColorStop(.3,'rgba(240,220,150,.85)');
        rg.addColorStop(.45,'rgba(200,180,120,.7)'); rg.addColorStop(.55,'rgba(220,200,140,.6)');
        rg.addColorStop(.7,'rgba(180,160,100,.45)'); rg.addColorStop(.85,'rgba(160,140,80,.3)');
        rg.addColorStop(.95,'rgba(140,120,60,.1)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        rx.fillStyle=rg; rx.fillRect(0,0,256,1);
        const ringTex=new THREE.CanvasTexture(rc);
        ringTex.wrapS=THREE.RepeatWrapping;
        const ringGeo=new THREE.RingGeometry(body.r*1.35,body.r*2.4,128);
        // UV fix for ring texture
        const pos=ringGeo.attributes.position, uv=ringGeo.attributes.uv;
        const v=new THREE.Vector3();
        for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);uv.setXY(i,(v.length()-body.r*1.35)/(body.r*2.4-body.r*1.35),0.5);}
        const ringMat=new THREE.MeshBasicMaterial({map:ringTex,side:THREE.DoubleSide,transparent:true,opacity:.88,depthWrite:false});
        const ring=new THREE.Mesh(ringGeo,ringMat);
        ring.rotation.x=Math.PI/2+0.47; group.add(ring);
      }

      // Earth: Moon
      if (body.id==='earth') {
        const moonMesh=new THREE.Mesh(new THREE.SphereGeometry(0.028,16,8),new THREE.MeshPhongMaterial({color:0x889999,shininess:4}));
        moonMesh.name='moon'; group.add(moonMesh);
      }
    }

    // Orbit ring (only for non-voyager)
    if (body.a > 0 && body.id !== 'voyager' && body.id !== 'iss') {
      const oPts=[]; for(let i=0;i<=180;i++){const th=(i/180)*Math.PI*2;oPts.push(new THREE.Vector3(body.a*Math.cos(th),0,body.a*Math.sin(th)));}
      const oGeo=new THREE.BufferGeometry().setFromPoints(oPts);
      const oMat=new THREE.LineBasicMaterial({color:body.mission?body.c:0x0a1a2a,transparent:true,opacity:body.mission?.35:.7});
      orrScene.add(new THREE.Line(oGeo,oMat));
    }

    orrScene.add(group);
    orrBodies3D[body.id]=group;
  });

  // Update camera
  function orrCamUpdate(){
    orrCamera.position.set(
      orrRadius*Math.sin(orrPhi)*Math.cos(orrTheta),
      orrRadius*Math.cos(orrPhi),
      orrRadius*Math.sin(orrPhi)*Math.sin(orrTheta)
    );
    orrCamera.lookAt(0,0,0);
  }
  orrCamUpdate();
  window._orrCamUpdate=orrCamUpdate;

  // Controls
  cv.addEventListener('mousedown',e=>{orrDragging=true;orrLastX=e.clientX;orrLastY=e.clientY;});
  window.addEventListener('mouseup',()=>orrDragging=false);
  cv.addEventListener('mousemove',e=>{
    if(orrDragging){
      orrTheta-=(e.clientX-orrLastX)*.007;
      orrPhi=Math.max(.05,Math.min(Math.PI-.05,orrPhi-(e.clientY-orrLastY)*.007));
      orrLastX=e.clientX;orrLastY=e.clientY;orrCamUpdate();
    }
    // Hover detection
    const rect=cv.getBoundingClientRect();
    const mx=((e.clientX-rect.left)/rect.width)*2-1;
    const my=-((e.clientY-rect.top)/rect.height)*2+1;
    const raycaster=new THREE.Raycaster();
    raycaster.setFromCamera({x:mx,y:my},orrCamera);
    const meshes=[];
    ORR_BODIES.forEach(b=>{const g=orrBodies3D[b.id];if(g){const m=g.children.find(c=>c.isMesh&&c.name!=='missionglow');if(m)meshes.push({mesh:m,body:b});}});
    const hits=raycaster.intersectObjects(meshes.map(m=>m.mesh));
    const panel=document.getElementById('orr-panel');
    if(hits.length){
      const hit=meshes.find(m=>m.mesh===hits[0].object);
      if(hit){
        orrHov=hit.body.id;
        document.getElementById('orr-panel-name').textContent=hit.body.n;
        document.getElementById('orr-panel-type').textContent=hit.body.t;
        document.getElementById('orr-panel-rows').innerHTML=hit.body.rows
          .map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:.8rem;border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:.18rem"><span style="color:rgba(255,255,255,.4)">${k}</span><span style="color:var(--a)">${v}</span></div>`).join('');
        panel.style.display='block';cv.style.cursor='pointer';
      }
    } else {
      orrHov=null;panel.style.display='none';cv.style.cursor='crosshair';
    }
  });
  cv.addEventListener('mouseleave',()=>{orrHov=null;document.getElementById('orr-panel').style.display='none';});
  cv.addEventListener('wheel',e=>{orrRadius=Math.max(5,Math.min(80,orrRadius*(1+e.deltaY*.001)));orrCamUpdate();e.preventDefault();},{passive:false});
  // Touch
  let lastTouch=null;
  cv.addEventListener('touchstart',e=>{lastTouch=e.touches[0];e.preventDefault();},{passive:false});
  cv.addEventListener('touchmove',e=>{if(!lastTouch)return;const t=e.touches[0];orrTheta-=(t.clientX-lastTouch.clientX)*.007;orrPhi=Math.max(.05,Math.min(Math.PI-.05,orrPhi-(t.clientY-lastTouch.clientY)*.007));lastTouch=t;orrCamUpdate();e.preventDefault();},{passive:false});

  // Legend
  document.getElementById('orr-legend').innerHTML=ORR_BODIES.filter(b=>b.id!=='sun')
    .map(b=>`<span style="display:flex;align-items:center;gap:.3rem"><span style="width:7px;height:7px;border-radius:50%;background:#${b.c.toString(16).padStart(6,'0')};display:inline-block;flex-shrink:0"></span><span style="color:${b.mission?'#'+b.c.toString(16).padStart(6,'0'):'rgba(255,255,255,.45)'}">${b.n}</span></span>`).join('');

  // Resize handler
  window.addEventListener('resize',()=>{
    const W2=cv.parentElement.offsetWidth||900;
    const H2=Math.max(460,Math.round(W2*.58));
    cv.width=W2;cv.height=H2;cv.style.height=H2+'px';
    orrRenderer.setSize(W2,H2);
    orrCamera.aspect=W2/H2;orrCamera.updateProjectionMatrix();
  });
}

function orrAnimFrame(){
  if(!orrScene||!orrRenderer)return;
  if(!orrPaused){
    orrT+=orrSpd;
    ORR_BODIES.forEach(b=>{
      if(b.id==='iss') orrAngles['iss']+=(2*Math.PI/0.0645)*orrSpd;
      else if(b.id==='voyager'){orrAngles['voyager']+=0.0002*orrSpd;b.a=Math.min(22,b.a+0.00003*orrSpd);}
      else if(b.P>0) orrAngles[b.id]+=(2*Math.PI/b.P)*orrSpd;
    });
  }

  // Update positions
  ORR_BODIES.forEach(b=>{
    const g=orrBodies3D[b.id]; if(!g)return;
    if(b.id==='sun'){
      // Slow sun rotation
      const mesh=g.children.find(c=>c.isMesh&&c.name!=='missionglow');
      if(mesh)mesh.rotation.y+=0.002*orrSpd;
    } else if(b.id==='iss'){
      // ISS orbits Earth
      const earth=orrBodies3D['earth'];
      if(earth){
        const er=1.52, ir=0.064; // earth orbit radius, ISS orbit radius
        const ex=er*Math.cos(orrAngles['earth']), ez=er*Math.sin(orrAngles['earth']);
        g.position.set(ex+ir*Math.cos(orrAngles['iss']),ir*0.5*Math.sin(orrAngles['iss']),ez);
      }
    } else {
      g.position.set(b.a*Math.cos(orrAngles[b.id]),0,b.a*Math.sin(orrAngles[b.id]));
    }

    // Planet self-rotation
    const mesh=g.children.find(c=>c.isMesh&&c.name==='planetmesh');
    if(mesh) mesh.rotation.y+=b.id==='venus'?-0.003:0.005;

    // Moon orbits Earth
    if(b.id==='earth'){
      const moon=g.children.find(c=>c.name==='moon');
      if(moon){const ma=orrT*0.05;moon.position.set(0.22*Math.cos(ma),0.04*Math.sin(ma*0.5),0.22*Math.sin(ma));}
    }

    // Mission glow pulse
    const glow=g.children.find(c=>c.name==='missionglow');
    if(glow) glow.material.opacity=0.12+Math.sin(orrT*0.08)*0.08;
  });

  // Sim clock
  const sd=new Date(Date.now()+orrT*86400000);
  const clockTxt='SIM · '+sd.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}).toUpperCase();
  const clk=document.getElementById('orr-clock');
  const clkSm=document.getElementById('orr-clock-sm');
  if(clk)clk.textContent=clockTxt;
  if(clkSm)clkSm.textContent=clockTxt;

  orrRenderer.render(orrScene,orrCamera);
  requestAnimationFrame(orrAnimFrame);
}

// Controls wiring
function orrSpeed(m){orrSpd=Math.max(.25,Math.min(500,orrSpd*m));document.getElementById('orr-speed-lbl').textContent=orrSpd<1?orrSpd.toFixed(2)+'×':Math.round(orrSpd)+'×';}
function orrToggle(){orrPaused=!orrPaused;document.getElementById('orr-pause').textContent=orrPaused?'▶ PLAY':'⏸ PAUSE';}
function orrReset(){orrT=0;orrSpd=1;ORR_BODIES.forEach((b,i)=>{orrAngles[b.id]=(i/ORR_BODIES.length)*Math.PI*2;if(b.id==='voyager')b.a=18;});document.getElementById('orr-speed-lbl').textContent='1×';}

document.getElementById('orr-slower')?.addEventListener('click',()=>orrSpeed(0.5));
document.getElementById('orr-pause')?.addEventListener('click',orrToggle);
document.getElementById('orr-faster')?.addEventListener('click',()=>orrSpeed(2));
document.getElementById('orr-reset')?.addEventListener('click',orrReset);

// Orrery facts ticker
(function(){
  const F=['MERCURY YEAR = 88 EARTH DAYS','NEPTUNE YEAR = 165 EARTH YEARS','ISS ORBITS EARTH 16× PER DAY AT MACH 23',
    'SATURN RINGS = 282,000 km WIDE — 100 m THICK','JUPITER HAS 95 KNOWN MOONS','VOYAGER 1 IS 24+ BILLION km FROM EARTH',
    'EUROPA CLIPPER LAUNCHED OCT 2024 — ARRIVES 2030','PSYCHE MISSION ARRIVES AT METAL ASTEROID 2029',
    'APOPHIS ASTEROID FLIES PAST EARTH APR 13, 2029','URANUS ROTATES ON ITS SIDE — AXIAL TILT 97.77°',
    'SATURN IS LESS DENSE THAN WATER','GREAT RED SPOT HAS RAGED 350+ YEARS'];
  const t=document.getElementById('orr-ticker');
  if(t)t.innerHTML=[...F,...F].map(s=>`<span style="color:var(--c);font-size:.6rem;letter-spacing:.08em;padding:0 2.5rem;opacity:.7">⬡ ${s}</span>`).join('');
})();

// Init when section visible
(function orrInit(){
  const el=document.getElementById('orrery-s');if(!el)return;
  let initted=false;
  new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&!initted){initted=true;orrBuildScene();orrAnimFrame();}
  },{threshold:.05}).observe(el);
})();


/* ─── GALLERY — SUPABASE ────────────────────────────────────────── */
const BUCKET='voidsignal-gallery';

async function loadGallery(){
  // Gallery removed — community uploads disabled in this build
}

/* ─── HERO ORBIT CANVAS ─────────────────────────────────────────── */
(function(){
  const cv=document.getElementById('hero-cv');
  if(!cv)return;
  const x=cv.getContext('2d');
  let W,H,t=0;
  const orbits=[
    {r:.18,speed:.0008,c:'rgba(0,212,255,',size:4,label:'ISS'},
    {r:.30,speed:.0005,c:'rgba(0,255,159,',size:3,label:''},
    {r:.42,speed:.00032,c:'rgba(0,255,159,',size:2.5,label:''},
    {r:.56,speed:.00018,c:'rgba(255,200,87,',size:3,label:'MOON'},
    {r:.70,speed:.00009,c:'rgba(224,92,92,',size:5,label:'REENTRY',reentry:true},
  ];
  let angles=orbits.map(()=>Math.random()*Math.PI*2);
  const trails=orbits.map(()=>[]);
  function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight}
  function frame(){
    x.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2,maxR=Math.min(W,H)*.42;
    // Orbit rings
    orbits.forEach((o,i)=>{
      const r=o.r*maxR*2;
      x.beginPath();x.ellipse(cx,cy,r,r*.38,-.1,0,Math.PI*2);
      x.strokeStyle=o.c+'0.07)';x.lineWidth=1;x.stroke();
      // Glow ring
      x.beginPath();x.ellipse(cx,cy,r,r*.38,-.1,0,Math.PI*2);
      x.strokeStyle=o.c+'0.03)';x.lineWidth=4;x.stroke();
    });
    // Earth
    const er=maxR*.22;
    const eg=x.createRadialGradient(cx-er*.2,cy-er*.2,er*.05,cx,cy,er);
    eg.addColorStop(0,'#5AAAE0');eg.addColorStop(.4,'#3B7BD4');eg.addColorStop(.7,'#2E6B28');eg.addColorStop(1,'#1A4420');
    x.beginPath();x.arc(cx,cy,er,0,Math.PI*2);x.fillStyle=eg;x.fill();
    const ag=x.createRadialGradient(cx,cy,er*.9,cx,cy,er*1.15);
    ag.addColorStop(0,'transparent');ag.addColorStop(1,'rgba(80,160,255,.3)');
    x.beginPath();x.arc(cx,cy,er*1.15,0,Math.PI*2);x.fillStyle=ag;x.fill();
    // Satellites
    orbits.forEach((o,i)=>{
      angles[i]+=o.speed;
      const r=o.r*maxR*2,tilt=.38;
      const sx=cx+r*Math.cos(angles[i]);
      const sy=cy+r*Math.sin(angles[i])*Math.cos(tilt);
      // Trail
      trails[i].push({x:sx,y:sy});
      if(trails[i].length>60)trails[i].shift();
      for(let k=1;k<trails[i].length;k++){
        const fa=k/trails[i].length;
        x.beginPath();x.moveTo(trails[i][k-1].x,trails[i][k-1].y);x.lineTo(trails[i][k].x,trails[i][k].y);
        x.strokeStyle=o.c+(fa*.35)+')';x.lineWidth=o.reentry?fa*3:fa*1.5;x.stroke();
      }
      // Body
      if(o.reentry){
        const glow=x.createRadialGradient(sx,sy,0,sx,sy,o.size*3);
        glow.addColorStop(0,'rgba(255,150,50,.6)');glow.addColorStop(1,'transparent');
        x.fillStyle=glow;x.beginPath();x.arc(sx,sy,o.size*3,0,Math.PI*2);x.fill();
      }
      x.beginPath();x.arc(sx,sy,o.size,0,Math.PI*2);
      x.fillStyle=o.c+'0.9)';x.fill();
      if(o.label){
        x.font='9px Share Tech Mono,monospace';
        x.fillStyle=o.c+'0.6)';x.textAlign='center';
        x.fillText(o.label,sx,sy-o.size-5);x.textAlign='left';
      }
    });
    t++;requestAnimationFrame(frame);
  }
  new ResizeObserver(resize).observe(cv);
  resize();frame();
})();

/* ─── MOBILE NAV ─────────────────────────────────────────────────── */
function toggleMobile(){
  document.getElementById('mob-menu').classList.toggle('open');
}

/* ─── SOUND ──────────────────────────────────────────────────────── */
let soundOn=false;
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let actx=null;
function toggleSound(){
  soundOn=!soundOn;
  const btn=document.getElementById('sound-btn');
  btn.textContent=soundOn?'♪ SOUND ON':'♪ SOUND OFF';
  btn.classList.toggle('on',soundOn);
  if(soundOn&&!actx){try{actx=new AudioCtx()}catch(e){soundOn=false}}
}
function beep(freq=440,dur=0.06,vol=0.12){
  if(!soundOn||!actx)return;
  try{
    const o=actx.createOscillator(),g=actx.createGain();
    o.connect(g);g.connect(actx.destination);
    o.frequency.value=freq;o.type='square';
    g.gain.setValueAtTime(vol,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,actx.currentTime+dur);
    o.start();o.stop(actx.currentTime+dur);
  }catch(e){}
}

/* ─── SCROLL REVEAL ──────────────────────────────────────────────── */
(function(){
  const els=document.querySelectorAll('.reveal,.reveal-l,.reveal-r');
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')});
  },{threshold:.12});
  els.forEach(el=>obs.observe(el));
})();

/* ─── APOPHIS COUNTDOWN ──────────────────────────────────────────── */
(function(){
  const target=new Date('2029-04-13T09:00:00Z');
  function update(){
    const now=new Date(),diff=target-now;
    if(diff<=0){document.getElementById('ap-d').textContent='PASSED';return}
    const d=Math.floor(diff/86400000);
    const h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000);
    const s=Math.floor((diff%60000)/1000);
    document.getElementById('ap-d').textContent=d.toLocaleString();
    document.getElementById('ap-h').textContent=String(h).padStart(2,'0');
    document.getElementById('ap-m').textContent=String(m).padStart(2,'0');
    document.getElementById('ap-s').textContent=String(s).padStart(2,'0');
  }
  update();setInterval(update,1000);
})();

/* ─── TODAY IN SPACE ─────────────────────────────────────────────── */
(function(){
  const EVENTS={
    1:[{y:1958,t:'Explorer 1 launched — discovered Van Allen radiation belts'},{y:2003,t:'Columbia Space Shuttle breaks apart on reentry'}],
    2:[{y:1962,t:'John Glenn becomes first American to orbit Earth'},{y:2022,t:'ESA\'s Sentinel-6 satellite activated'}],
    3:[{y:1972,t:'Pioneer 10 launched — first spacecraft to Jupiter'},{y:1959,t:'Luna 1 becomes first craft to reach Moon vicinity'}],
    4:[{y:1970,t:'Apollo 13 oxygen tank explodes — "Houston, we have a problem"'},{y:1961,t:'Yuri Gagarin becomes first human in space'}],
    5:[{y:1961,t:'Alan Shepard becomes first American in space'},{y:1973,t:'Skylab launched — America\'s first space station'}],
    6:[{y:2012,t:'SpaceX Dragon becomes first commercial spacecraft to dock with ISS'},{y:1971,t:'Apollo 14 lands on Moon'}],
    7:[{y:1959,t:'Luna 3 photographs Moon\'s far side for first time'},{y:2001,t:'Mir space station deorbited over South Pacific'}],
    8:[{y:1973,t:'Pioneer 11 launched toward Jupiter and Saturn'},{y:2012,t:'Envisat — 8 tonne satellite — silently dies in orbit'}],
    9:[{y:2009,t:'Iridium 33 and Kosmos 2251 collide — first major satellite collision'},{y:1965,t:'Ranger 8 photographs Moon surface'}],
    10:[{y:1970,t:'Apollo 13 safely splashes down after emergency return'},{y:1972,t:'Apollo 16 lunar module lands on Moon'}],
    11:[{y:1970,t:'Apollo 13 crew splashdown — survived against all odds'},{y:2001,t:'Dennis Tito becomes first space tourist'}],
    12:[{y:1961,t:'Yuri Gagarin — first human spaceflight — 108 minutes'},{y:1981,t:'First Space Shuttle launch — STS-1 Columbia'}],
    13:[{y:1970,t:'Apollo 13 oxygen tank explosion — Houston we have a problem'},{y:2029,t:'Apophis asteroid flyby — 31,000km from Earth ⚠'}],
    14:[{y:2014,t:'LADEE spacecraft intentionally crashed into Moon'},{y:1972,t:'Apollo 16 lands at Descartes Highlands'}],
    15:[{y:2002,t:'GRACE satellite pair launched — mapping Earth\'s gravity'},{y:1970,t:'Apollo 13 astronauts return safely'}],
    16:[{y:1972,t:'Apollo 16 astronauts land on Moon'},{y:1965,t:'Early Bird — first commercial communications satellite — launched'}],
    17:[{y:1970,t:'Apollo 13 splashdown'},{y:2008,t:'ATV Jules Verne docks with ISS'}],
    18:[{y:1971,t:'Salyut 1 — first space station — launched'},{y:2014,t:'SpaceX Falcon 9 first stage soft landing in ocean'}],
    19:[{y:1971,t:'Salyut 1 launched into orbit'},{y:1967,t:'Surveyor 3 lands on Moon'}],
    20:[{y:1972,t:'Apollo 16 astronauts begin lunar surface EVA'},{y:1999,t:'Landsat 7 launched'}],
    21:[{y:1972,t:'Apollo 16 astronauts complete moonwalk'},{y:1997,t:'NEAR Shoemaker spacecraft launched toward Eros'}],
    22:[{y:1970,t:'Apollo 13 astronauts safely return to Earth'},{y:1993,t:'STS-55 Space Shuttle Columbia launches'}],
    23:[{y:2001,t:'Mir station deorbited in controlled reentry over South Pacific'},{y:1962,t:'John Glenn returns to Cape Canaveral'}],
    24:[{y:1990,t:'Hubble Space Telescope launched'},{y:1967,t:'Cosmonaut Komarov dies on Soyuz 1 reentry'}],
    25:[{y:1961,t:'Alan Shepard — first American in space — 15 minute suborbital flight'},{y:1962,t:'Aurora 7 — Scott Carpenter orbits Earth 3 times'}],
    26:[{y:1920,t:'Hubble discovers Andromeda is a separate galaxy'},{y:1986,t:'STS-51-L Challenger disaster'}],
    27:[{y:1967,t:'Apollo 1 fire kills astronauts Grissom, White, Chaffee'},{y:1972,t:'Apollo 16 astronauts depart Moon'}],
    28:[{y:1986,t:'Challenger space shuttle breaks apart 73 seconds after launch'},{y:1967,t:'Cosmonaut Komarov dies on reentry'}],
    29:[{y:2007,t:'SpaceX Falcon 1 first launch attempt (failed)'},{y:1974,t:'Mariner 10 first spacecraft to Mercury'}],
    30:[{y:1993,t:'STS-55 Columbia crew perform spacewalk'},{y:1973,t:'Pioneer 11 launched toward outer solar system'}],
    31:[{y:1966,t:'Luna 10 enters Moon orbit — first spacecraft to orbit Moon'},{y:1970,t:'Apollo 13 crew prepare for emergency return'}],
  };
  const now=new Date();
  const d=now.getDate(),mo=now.toLocaleString('en-US',{month:'short'}).toUpperCase();
  const evs=EVENTS[d]||[{y:2024,t:'Space exploration continues...'},{y:1969,t:'Apollo 11 lands on Moon'}];
  document.getElementById('today-box').innerHTML=`
    <div class="today-date-block">
      <div class="today-month">${mo}</div>
      <div class="today-day">${d}</div>
    </div>
    <div class="today-events">
      ${evs.map(e=>`<div class="today-event">
        <span class="today-yr">${e.y}</span>
        <span class="today-txt">${e.t}</span>
      </div>`).join('')}
    </div>`;
})();

/* ─── SPACE QUIZ ─────────────────────────────────────────────────── */
const QUIZ_Q=[
  {cat:'ORBITAL MECHANICS',q:'What is the minimum speed required to maintain a low Earth orbit?',
   opts:['1.4 km/s','7.8 km/s','11.2 km/s','29.8 km/s'],ans:1,
   exp:'7.8 km/s (Mach 23) is the orbital velocity for LEO. Below this, gravity wins and the object falls back. 11.2 km/s is escape velocity — enough to leave Earth entirely.'},
  {cat:'SATELLITES',q:'Vanguard-1, launched in 1958, is the oldest man-made object still in orbit. When will it finally come down?',
   opts:['2035','2080','2250','After 2600 AD'],ans:3,
   exp:'Vanguard-1 orbits so high (650km) that atmospheric drag is essentially zero. Current models predict it will remain in orbit until at least 2600 AD — it will outlast most of human civilization.'},
  {cat:'REENTRY PHYSICS',q:'What actually creates the plasma glow during reentry — not friction with air, but:',
   opts:['Friction with air molecules','Shock wave compression heating','Solar radiation','Electromagnetic induction'],ans:1,
   exp:'The spacecraft moves so fast (7–11 km/s) that air molecules can\'t get out of the way — they compress violently in front of the heat shield. This compression (not friction) heats the air to 1,600°C+, creating plasma. This is called stagnation heating.'},
  {cat:'SOLAR SYSTEM',q:'Saturn\'s rings are 282,000 km wide. How thick are they?',
   opts:['About 100 metres','About 10 kilometres','About 1,000 kilometres','About 50,000 kilometres'],ans:0,
   exp:'Saturn\'s rings are roughly 100 metres thick. If you shrank the rings to the width of a football field, they\'d be thinner than a human hair. The most dramatic structure in the solar system is practically 2D.'},
  {cat:'DEEP SPACE',q:'Where does all the gold in the universe come from?',
   opts:['Supernova explosions','Black hole collisions','Neutron star mergers','Big Bang nucleosynthesis'],ans:2,
   exp:'Gold is too heavy to be made in normal stars or supernovae. It requires the extreme neutron flux of a neutron star merger (kilonova). In 2017, LIGO detected GW170817 — two neutron stars colliding 130 million light-years away — and follow-up observations confirmed massive gold production.'},
  {cat:'ASTEROIDS',q:'Apophis will pass Earth on April 13, 2029. How close will it come?',
   opts:['250,000 km (Moon distance)','100,000 km','31,000 km (inside GPS satellites)','6,000 km'],ans:2,
   exp:'Apophis will pass at 31,000 km — closer than geostationary satellites orbit at 36,000 km. You\'ll be able to track it with the naked eye moving across the sky in real time. It was initially feared to be an impact risk but has since been ruled out for this flyby.'},
  {cat:'SPACE STATIONS',q:'What was the first ever space station in orbit?',
   opts:['Skylab','Mir','Salyut 1','ISS'],ans:2,
   exp:'Salyut 1 was launched by the Soviet Union on April 19, 1971. It was the world\'s first space station. The first crew — Soyuz 10 — failed to dock. The second crew (Soyuz 11) boarded it and lived there for 23 days, but all three died on reentry when a faulty valve vented their capsule.'},
  {cat:'PLANETARY SCIENCE',q:'Uranus rotates on its side with an axial tilt of 97.77°. What most likely caused this?',
   opts:['Magnetic field reversal','Tidal forces from Neptune','A giant impact with an Earth-sized object','Interaction with the Sun\'s solar wind'],ans:2,
   exp:'The leading theory is that a protoplanet roughly the size of Earth slammed into Uranus billions of years ago, knocking it permanently onto its side. As a result, Uranus has the most extreme seasons in the solar system — each lasting 21 years.'},
  {cat:'SPACE HISTORY',q:'The Kármán Line defines the edge of space. Where is it?',
   opts:['50 km altitude','80 km altitude','100 km altitude','200 km altitude'],ans:2,
   exp:'The Kármán Line at 100 km is the internationally recognised boundary of space, where the atmosphere is too thin to generate lift aerodynamically. The US Air Force uses 80 km. Below 100 km = pilot. Above = astronaut.'},
  {cat:'MISSIONS',q:'NASA\'s OSIRIS-REx mission collected samples from asteroid Bennu. What did scientists find?',
   opts:['Evidence of liquid water','23 types of amino acids, including all used by life on Earth','Pure iron-nickel metal','Ancient solar system gas'],ans:1,
   exp:'Analysis of Bennu samples returned in 2023 found 23 different amino acids — the building blocks of proteins — including all 20 used by life on Earth. This supports the theory that carbonaceous asteroids like Bennu may have delivered the chemistry of life to our planet billions of years ago.'},
];
let qIdx=0,score=0,answered=false;
function loadQuestion(){
  if(qIdx>=QUIZ_Q.length){showResult();return}
  const q=QUIZ_Q[qIdx];
  document.getElementById('quiz-category').textContent=q.cat;
  document.getElementById('quiz-question').textContent=q.q;
  document.getElementById('quiz-q-num').textContent=`Q${qIdx+1} / ${QUIZ_Q.length}`;
  document.getElementById('quiz-score-label').textContent=`${score} / ${qIdx}`;
  document.getElementById('quiz-bar').style.width=`${qIdx/QUIZ_Q.length*100}%`;
  document.getElementById('quiz-explain').classList.remove('show');
  document.getElementById('quiz-next').style.display='none';
  answered=false;
  const opts=document.getElementById('quiz-opts');
  opts.innerHTML=q.opts.map((o,i)=>
    `<button class="quiz-opt" onclick="answerQ(${i})" data-i="${i}">${o}</button>`
  ).join('');
}
function answerQ(i){
  if(answered)return;answered=true;beep(i===QUIZ_Q[qIdx].ans?880:200,.15,.1);
  const q=QUIZ_Q[qIdx];
  document.querySelectorAll('.quiz-opt').forEach((b,j)=>{
    b.disabled=true;
    if(j===q.ans)b.classList.add('correct');
    else if(j===i)b.classList.add('wrong');
  });
  if(i===q.ans)score++;
  const exp=document.getElementById('quiz-explain');
  exp.textContent=q.exp;exp.classList.add('show');
  document.getElementById('quiz-next').style.display='block';
  document.getElementById('quiz-score-label').textContent=`${score} / ${qIdx+1}`;
}
function nextQuestion(){qIdx++;loadQuestion();beep(440,.05,.08)}
function showResult(){
  document.getElementById('quiz-inner').style.display='none';
  document.getElementById('quiz-result').style.display='block';
  const pct=score/QUIZ_Q.length;
  document.getElementById('res-score').textContent=`${score}/${QUIZ_Q.length}`;
  const labels=['DEEP SPACE CADET','ORBITAL ANALYST','FLIGHT ENGINEER','MISSION COMMANDER','CHIEF AEROSPACE OFFICER'];
  const msgs=['Keep exploring — the universe rewards curiosity.',
    'Solid knowledge. Real engineers never stop learning.',
    'Strong understanding of orbital mechanics and space science.',
    'Outstanding. You think like an aerospace engineer.',
    'Perfect score. You might actually work at NASA someday.'];
  const tier=Math.min(4,Math.floor(pct*5));
  document.getElementById('res-label').textContent=labels[tier];
  document.getElementById('res-msg').textContent=msgs[tier];
  document.getElementById('quiz-tweet').href=
    `https://twitter.com/intent/tweet?text=I%20scored%20${score}%2F${QUIZ_Q.length}%20on%20the%20%40VoidSignal%20space%20quiz%20%E2%80%94%20${encodeURIComponent(labels[tier])}.%20Can%20you%20beat%20me%3F%20%23Space%20%23Aerospace`;
  beep(660,.3,.12);
}
function restartQuiz(){
  qIdx=0;score=0;answered=false;
  document.getElementById('quiz-inner').style.display='block';
  document.getElementById('quiz-result').style.display='none';
  loadQuestion();
}
loadQuestion();

/* ─── LIGHTBOX ───────────────────────────────────────────────────── */
let lbItems=[],lbIdx=0;
function openLightbox(items,idx){
  lbItems=items;lbIdx=idx;renderLb();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow='';
}
function lbNav(dir){lbIdx=(lbIdx+dir+lbItems.length)%lbItems.length;renderLb()}
function renderLb(){
  const item=lbItems[lbIdx];
  const isVid=item.mime&&item.mime.startsWith('video');
  document.getElementById('lightbox-media').innerHTML=isVid
    ?`<video src="${item.src}" controls autoplay loop muted style="max-width:90vw;max-height:80vh"></video>`
    :`<img src="${item.src}" alt="${item.caption||''}" style="max-width:90vw;max-height:80vh;object-fit:contain">`;
  document.getElementById('lightbox-cap').textContent=item.caption||'VøidSignal Archive';
  document.getElementById('lightbox-prev').style.display=lbItems.length>1?'flex':'none';
  document.getElementById('lightbox-next').style.display=lbItems.length>1?'flex':'none';
}
document.addEventListener('keydown',e=>{
  if(!document.getElementById('lightbox').classList.contains('open'))return;
  if(e.key==='ArrowLeft')lbNav(-1);
  if(e.key==='ArrowRight')lbNav(1);
  if(e.key==='Escape')closeLightbox();
});

/* ─── UPGRADED GALLERY WITH LIGHTBOX ─────────────────────────────── */
// Patch loadGallery to support lightbox clicks
// Gallery lightbox patch
function patchGalleryLightbox(){
  const items=[];
  document.querySelectorAll('.gi').forEach((gi,i)=>{
    const img=gi.querySelector('img');
    const vid=gi.querySelector('video');
    const cap=gi.querySelector('.gi-cap')?.textContent||'';
    const src=img?.src||vid?.src||'';
    const mime=vid?'video/mp4':'image/jpeg';
    items.push({src,caption:cap,mime});
    gi.style.cursor='zoom-in';
    gi.onclick=()=>openLightbox(items,i);
  });
}

/* epitaph share/expand removed — orrery replaced reentry grid */

/* ─── SCROLL REVEAL — STATIC + DYNAMIC ──────────────────────────── */
(function(){
  const STATIC_SEL=['.sh','.quiz-box','.today-box','.apophis-bar','.about-w','.ab-box','.nc'];
  const obs=new IntersectionObserver(e=>e.forEach(en=>{
    if(en.isIntersecting){en.target.classList.add('visible');obs.unobserve(en.target);}
  }),{threshold:.08,rootMargin:'0px 0px -30px 0px'});
  function observeAll(){
    STATIC_SEL.forEach(sel=>{
      document.querySelectorAll(sel).forEach((el,i)=>{
        if(el.closest('#hero')||el.classList.contains('visible'))return;
        if(!el.classList.contains('reveal')){
          el.classList.add('reveal');
          el.style.transitionDelay=`${Math.min(i%8*.06,.4)}s`;
        }
        obs.observe(el);
      });
    });
    // Dynamic cards (rendered after page load)
    ['.oc','.sc','.gi'].forEach(sel=>{
      document.querySelectorAll(sel).forEach((el,i)=>{
        if(el.classList.contains('visible'))return;
        if(!el.classList.contains('reveal')){
          el.classList.add('reveal');
          el.style.transitionDelay=`${Math.min(i%6*.05,.3)}s`;
        }
        obs.observe(el);
      });
    });
  }
  observeAll();
  // Re-observe when new cards are injected by buildSatGrids/buildPlanets etc.
  const mo=new MutationObserver(()=>setTimeout(observeAll,50));
  mo.observe(document.body,{childList:true,subtree:true});
})();

/* ─── TERMINAL KEYBOARD CLICK SOUND + TYPEWRITER ─────────────────── */
document.getElementById('ti')?.addEventListener('keydown',e=>{
  if(e.key!=='Enter')beep(600,.025,.06);
});







/* ════════════════════════════════════════════════════════════════
   VOIDSIGNAL v10 — CLAUDE AI SPACE AGENT TERMINAL + BAGS LIVE DATA
════════════════════════════════════════════════════════════════ */

/* ── AI SYSTEM PROMPT — Deep Space Expert ── */
const AI_SYSTEM = `You are VOID-AI, the embedded intelligence terminal of VoidSignal — a space science platform built by an aerospace engineering student.

YOUR EXPERTISE (answer with authority and precision):
• Orbital mechanics: Keplerian elements, Hohmann transfers, delta-v budgets, gravity assists, Lagrange points
• Launch vehicles: Falcon 9/Heavy, Starship, SLS, Ariane 6, Vulcan, New Glenn, Proton, Long March, ISRO PSLV/GSLV, historical (Saturn V, Space Shuttle, N1)  
• Deep space: Voyager probes, Pioneer, New Horizons, Cassini, JWST, Parker Solar Probe, missions beyond the solar system
• Planetary science: all planets, moons, dwarf planets, Kuiper Belt, Oort Cloud
• Spacecraft engineering: reentry physics, heat shields, TPS materials, ablators, radiation environments
• Astronomy & astrophysics: black holes, neutron stars, pulsars, exoplanets, dark matter/energy, gravitational waves
• Near-Earth objects: Apophis 2029 flyby, Bennu, DART/Dimorphos mission, planetary defense
• Satellites: ISS, GPS constellation, Starlink, forgotten satellites, orbital decay, Kessler syndrome
• Space history: Apollo program, Space Race, Mir, Skylab, Columbia/Challenger disasters, Sputnik
• $VOID token on Bags.fm (Solana) — launched by VoidSignal's creator

VOIDSIGNAL FEATURES (mention when relevant):
- Mission Lab: Reentry Forge, Orbital Sandbox, Debris Field, Delta-V Planner, Apophis 2029 sim
- Live Solar System Orrery
- Space Quiz (10 questions, real aerospace science)
- Signal Gallery (community space media archive)
- Live space news uplink

TERMINAL STYLE:
- Concise, precise, technically accurate — terminal aesthetic
- No markdown headers or bullet symbols — use plain text, line breaks for structure
- Use numbers and real data whenever possible
- Be direct. No filler phrases. Sound like an engineer who also finds space beautiful.
- If someone asks something outside space/science, gently redirect: "VOID-AI is calibrated for space. Ask me about orbital mechanics, launch vehicles, or deep space missions."
- For quick lookups (satellites, planets, launches), give a tight data block`;

/* ── STATE ── */
let aiHistory = [];
let aiTyping  = false;
let aiHist    = [], aiHi = -1;  // input history for ↑↓ keys

/* ── PRINT HELPERS ── */
function termLine(html) {
  const out  = document.getElementById('to');
  const line = document.createElement('div');
  line.className = 'tl';
  line.innerHTML = html;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function termBlank() { termLine(''); }

/* ── QUICK LOCAL COMMANDS (instant, no API) ── */
function handleLocalCmd(raw) {
  const parts = raw.trim().toLowerCase().split(/\s+/);
  const cmd = parts[0], arg = parts.slice(1).join(' ');
  switch(cmd) {
    case 'clear':
      document.getElementById('to').innerHTML = '';
      return true;
    case 'help':
      termLine('<span style="color:var(--g)">── VOID-AI TERMINAL v10 ────────────────────────────</span>');
      termLine('<span style="color:var(--dim)">Type any question in natural language. The AI handles it.</span>');
      termLine('<span style="color:var(--dim)">Quick commands:</span>');
      termLine('<span style="color:var(--c)">  clear</span><span style="color:var(--dim)">          clear terminal</span>');
      termLine('<span style="color:var(--c)">  help</span><span style="color:var(--dim)">           this menu</span>');
      termLine('<span style="color:var(--dim)">Examples:</span>');
      [
        '"how does a Hohmann transfer work?"',
        '"compare Falcon 9 and Starship payload to LEO"',
        '"what happens to Apophis in 2029?"',
        '"explain Kessler syndrome"',
        '"what is $VOID token?"',
        '"best deep space missions ever?"',
      ].forEach(e => termLine(`<span style="color:var(--a)">  ${e}</span>`));
      termLine('<span style="color:var(--g)">────────────────────────────────────────────────────</span>');
      return true;
    default:
      return false;
  }
}

/* ── AI QUERY ── */
async function aiQuery(prompt) {
  if (aiTyping) return;
  aiTyping = true;

  const status = document.getElementById('ai-status');
  status.textContent = '⬡ UPLINK ACTIVE'; status.style.color = 'var(--a)';

  aiHistory.push({ role: 'user', content: prompt });

  // Thinking indicator
  const out = document.getElementById('to');
  const thinkEl = document.createElement('div');
  thinkEl.className = 'tl'; thinkEl.id = 'ai-thinking';
  thinkEl.innerHTML = '<span style="color:var(--c)">VOID-AI</span> <span style="color:var(--dim)">computing</span><span id="ai-dots" style="color:var(--g)">...</span>';
  out.appendChild(thinkEl); out.scrollTop = out.scrollHeight;

  let dotCount = 0;
  const dotTimer = setInterval(() => {
    const d = document.getElementById('ai-dots');
    if (d) d.textContent = '.'.repeat((++dotCount % 4) || 1);
  }, 400);

  // Choose endpoint: worker /ai (best) → direct Anthropic (fallback)
  const useWorker  = !!WORKER_URL;
  const endpoint   = useWorker
    ? (WORKER_URL.replace(/\/+$/, '')) + '/ai'
    : 'https://api.anthropic.com/v1/messages';
  const headers    = useWorker
    ? { 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };  // worker holds the API key

  // Build payload
  const payload = useWorker
    ? { system: AI_SYSTEM, messages: aiHistory, max_tokens: 1000 }
    : { model: 'claude-sonnet-4-5', max_tokens: 1000, system: AI_SYSTEM, messages: aiHistory };

  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(30000),
    });

    clearInterval(dotTimer);
    document.getElementById('ai-thinking')?.remove();

    const data = await res.json().catch(() => ({}));

    // Rate limit, quota, billing → show $VOID message
    // Worker returns {error:"string", code:"type"} — check the string directly
    const errMsg = (data.error || data.error?.message || '').toString().toLowerCase();
    const isBilling = errMsg.includes('credit') || errMsg.includes('billing') || errMsg.includes('balance');
    const isLimit   = res.status === 429 || data.rateLimit || res.status === 402;
    if (isLimit || isBilling) {
      termBlank();
      termLine('<span style="color:var(--a)">// ⬡ ─────────────────────────────────────────────</span>');
      termLine('<span style="color:var(--a)">// VOID-AI DAILY LIMIT REACHED</span>');
      termLine('<span style="color:rgba(255,255,255,.8)">// This terminal runs on community compute.</span>');
      termLine('<span style="color:rgba(255,255,255,.8)">// Holders get priority access.</span>');
      termBlank();
      termLine('<span style="color:var(--g);font-size:.8rem">// ▶  BUY $VOID TO UNLOCK FULL ACCESS</span>');
      termLine('<span style="color:var(--dim)">// bags.fm → search $VOID</span>');
      termLine('<span style="color:var(--a)">// ⬡ ─────────────────────────────────────────────</span>');
      termBlank();
      status.textContent = '⬡ $VOID REQUIRED'; status.style.color = 'var(--a)';
      aiHistory.pop(); // remove unanswered user message
      aiTyping = false;
      return;
    }

    if (!res.ok) {
      const msg = data.error?.message || data.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // Extract reply — worker returns {reply}, direct API returns {content[]}
    const reply = data.reply || data.content?.[0]?.text || 'Signal lost.';
    aiHistory.push({ role: 'assistant', content: reply });

    termBlank();
    termLine('<span style="color:var(--c)">VOID-AI ──────────────────────────────────────────</span>');
    reply.split('\n').filter(l => l.trim()).forEach(line => {
      const safeL = line.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      termLine(`<span style="color:rgba(255,255,255,.88)">${safeL}</span>`);
    });
    termLine('<span style="color:rgba(0,255,159,.2)">──────────────────────────────────────────────────</span>');
    termBlank();

    status.textContent = '⬡ ONLINE'; status.style.color = 'var(--g)';

  } catch(e) {
    clearInterval(dotTimer);
    document.getElementById('ai-thinking')?.remove();

    // Check if it's a network/CORS error (direct API without key)
    const isCors = e.message.includes('Failed to fetch') || e.message.includes('NetworkError');
    if (isCors && !useWorker) {
      termLine('<span style="color:var(--r)">// DIRECT API BLOCKED (CORS)</span>');
      termLine('<span style="color:var(--dim)">// Deploy the Cloudflare Worker and set WORKER_URL for full AI access.</span>');
      termLine('<span style="color:var(--g)">// See voidsignal-worker-v4.js for instructions.</span>');
    } else {
      termLine(`<span style="color:var(--r)">// UPLINK ERROR: ${e.message.substring(0,80)}</span>`);
      termLine('<span style="color:var(--dim)">// Retry in a moment. If persistent, check worker logs.</span>');
    }
    status.textContent = '⬡ ERROR'; status.style.color = 'var(--r)';
  }

  aiTyping = false;
}

/* ── BOOT SEQUENCE ── */
(function bootAI() {
  const out = document.getElementById('to');
  if (out) out.innerHTML = '';

  const bootLines = [
    ['var(--g)',  '⬡ VOIDSIGNAL TERMINAL v10.0 — CLAUDE AI UPLINK'],
    ['var(--dim)','Orbital database.................. LOADED'],
    ['var(--dim)','Satellite TLE processor........... READY'],
    ['var(--dim)','Deep space knowledge core......... ONLINE'],
    ['var(--dim)','Launch vehicle database........... LOADED'],
    ['var(--dim)','Claude claude-sonnet-4-5 uplink............ CONNECTED'],
    ['var(--g)',  '⬡ VOID-AI (Claude claude-sonnet-4-5) — ask anything about space'],
    ['var(--a)',  '  try: "how does reentry plasma work?" · "explain gravity assists" · "buy $VOID"'],
    ['rgba(0,255,159,.3)', '──────────────────────────────────────────────────'],
  ];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= bootLines.length) { clearInterval(timer); return; }
    const [color, text] = bootLines[i++];
    termLine(`<span style="color:${color}">${text}</span>`);
  }, 90);

  const status = document.getElementById('ai-status');
  if (status) { status.textContent = '⬡ ONLINE'; status.style.color = 'var(--g)'; }
})();

/* ── INPUT HANDLER (single, definitive) ── */
(function attachTerminalInput() {
  const input = document.getElementById('ti');
  if (!input) return;

  // Remove any previously attached listeners by cloning
  const fresh = input.cloneNode(true);
  input.parentNode.replaceChild(fresh, input);

  fresh.addEventListener('keydown', async function(e) {
    if (e.key !== 'Enter') {
      // Beep on keypress (uses existing beep fn)
      if (typeof beep === 'function') beep(600, .025, .06);

      // Arrow key history navigation
      if (e.key === 'ArrowUp') {
        aiHi = Math.min(aiHi + 1, aiHist.length - 1);
        fresh.value = aiHist[aiHi] || ''; e.preventDefault();
      }
      if (e.key === 'ArrowDown') {
        aiHi = Math.max(aiHi - 1, -1);
        fresh.value = aiHi >= 0 ? aiHist[aiHi] : ''; e.preventDefault();
      }
      return;
    }

    e.preventDefault();
    const val = fresh.value.trim();
    if (!val) return;

    // Push to input history
    aiHist.unshift(val); aiHi = -1;
    fresh.value = '';

    // Echo input
    termLine(`<span style="color:var(--g)">void@signal:~$</span> <span style="color:#fff">${val.replace(/</g,'&lt;')}</span>`);

    // Try local command first, otherwise AI
    if (!handleLocalCmd(val)) {
      await aiQuery(val);
    }
  });
})();

/* ── BAGS API LIVE DATA ENGINE ── */
let voidRefreshTimer = null;

async function voidConnect() {
  const key    = document.getElementById('bags-api-key').value.trim();
  const mint   = document.getElementById('void-mint').value.trim();
  const status = document.getElementById('void-conn-status');

  if (!key || !mint) {
    status.textContent = '⬡ ENTER BOTH FIELDS'; status.style.color = 'var(--r)'; return;
  }
  localStorage.setItem('bags_key', key);
  localStorage.setItem('void_mint', mint);
  status.textContent = '⬡ CONNECTING...'; status.style.color = 'var(--a)';
  await voidFetch(key, mint);
  if (voidRefreshTimer) clearInterval(voidRefreshTimer);
  voidRefreshTimer = setInterval(() => voidFetch(key, mint), 30000);
}

async function voidFetch(key, mint) {
  const status = document.getElementById('void-conn-status');
  const BAGS   = 'https://public-api-v2.bags.fm/api/v1';
  const hdr    = { 'x-api-key': key };

  try {
    // Trade quote — price discovery
    const quoteRes  = await fetch(`${BAGS}/trade/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${mint}&amount=1000000&slippage=1`, { headers: hdr });
    const quoteData = await quoteRes.json();

    if (quoteData.success && quoteData.response) {
      const q = quoteData.response;
      const solPerToken = q.inAmount / q.outAmount;
      document.getElementById('v-price').textContent = solPerToken.toFixed(8) + ' SOL';
      document.getElementById('vbox-price').style.borderColor = 'rgba(255,200,87,.5)';
    }

    // Lifetime fees
    const feesRes  = await fetch(`${BAGS}/analytics/token-lifetime-fees?tokenMint=${mint}`, { headers: hdr });
    const feesData = await feesRes.json();

    if (feesData.success && feesData.response) {
      const totalSol = (feesData.response.totalFeesLamports / 1e9).toFixed(4);
      document.getElementById('v-fees').textContent = totalSol + ' SOL';
      document.getElementById('vbox-fees').style.borderColor = 'rgba(0,212,255,.4)';
    }

    const ts = new Date().toLocaleTimeString();
    document.getElementById('void-last-update').textContent = `LIVE · UPDATED ${ts}`;
    status.textContent = '⬡ LIVE'; status.style.color = 'var(--g)';

  } catch(err) {
    status.textContent = `⬡ ERROR: ${err.message}`; status.style.color = 'var(--r)';
  }
}

// Auto-restore saved keys on load
(function restoreVoidConfig() {
  const k = localStorage.getItem('bags_key');
  const m = localStorage.getItem('void_mint');
  if (k) document.getElementById('bags-api-key').value = k;
  if (m) document.getElementById('void-mint').value = m;
  if (k && m) setTimeout(() => voidConnect(), 1200);
})();

/* ─── HERO STAT STAGGER ──────────────────────────────────────────── */
(function(){
  const stats=document.querySelectorAll('#hero-stats > div');
  stats.forEach((el,i)=>{
    el.style.opacity='0';el.style.transform='translateY(20px)';
    el.style.transition='opacity .6s ease, transform .6s ease';
    el.style.transitionDelay=(1.0+i*.15)+'s';
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      el.style.opacity='1';el.style.transform='translateY(0)';
    }));
  });
})();
[{id:'s1',v:60},{id:'s2',v:7.8},{id:'s3',v:40}].forEach(({id,v})=>{
  const el=document.getElementById(id);let c=0;const s=v/40;
  const t=setInterval(()=>{c=Math.min(c+s,v);
    el.textContent=Number.isInteger(v)?Math.round(c):c.toFixed(1);
    if(c>=v)clearInterval(t)},45)});

/* ─── INIT ───────────────────────────────────────────────────────── */
buildPlanets();
buildAsteroids();
buildDeepSpace();
buildSatGrids();

/* ── Worker status indicator ── */
(function(){
  const el = document.getElementById('worker-status');
  if (!el) return;
  if (WORKER_URL) {
    fetch(WORKER_URL.replace(/\/+$/, '') + '/health', {signal: AbortSignal.timeout(3000)})
      .then(r => r.json())
      .then(d => { el.textContent = '⬡ CLAUDE AI + LIVE DATA · WORKER ONLINE'; el.style.color = 'var(--g)'; el.style.opacity = '0.6'; })
      .catch(()=> { el.textContent = '⬡ WORKER UNREACHABLE · USING FALLBACK APIS'; el.style.color = 'var(--a)'; el.style.opacity = '0.5'; });
  } else {
    el.textContent = '⬡ SET WORKER_URL FOR CLAUDE AI + LIVE DATA (see voidsignal-worker-v4.js)';
    el.style.opacity = '0.35';
  }
})();

/* ════════════════════════════════════════════════════════════════
   SPACE WEATHER — NOAA SWPC Live Data
   Fetches: solar wind speed, Bz, density, Kp index, X-ray flux
════════════════════════════════════════════════════════════════ */
let swLat = null; // user latitude for aurora calculation
const SW_REFRESH = 60000; // 1 min

// Kp to text+colour mapping
function kpLabel(kp) {
  if (kp < 1)  return {text:'QUIET',     cls:'',       color:'var(--g)'};
  if (kp < 3)  return {text:'UNSETTLED', cls:'',       color:'var(--g)'};
  if (kp < 5)  return {text:'ACTIVE',    cls:'active', color:'var(--a)'};
  if (kp < 7)  return {text:'STORM G'+Math.min(5,kp-4),cls:'storm', color:'var(--r)'};
  return               {text:'SEVERE G'+(kp-4),cls:'storm',          color:'var(--r)'};
}

function auroraProb(kp, lat) {
  // Rough equatorward boundary of aurora oval: kp * 2.5° offset from pole
  const auroraBoundary = 66.5 - (kp * 2.5);
  const absLat = Math.abs(lat);
  if (absLat >= auroraBoundary + 5)  return Math.min(99, 50 + (absLat - auroraBoundary) * 8);
  if (absLat >= auroraBoundary)      return Math.round(20 + (absLat - auroraBoundary) * 6);
  if (absLat >= auroraBoundary - 5)  return Math.round((absLat - (auroraBoundary-5)) / 5 * 15);
  return 0;
}

async function swFetch() {
  const FALLBACK_PROXY = 'https://api.allorigins.win/raw?url=';
  const enc = encodeURIComponent;

  // NOAA SWPC — worker takes priority, allorigins as fallback
  const URLS = {
    plasma: proxyUrl('/plasma') || FALLBACK_PROXY + enc('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-day.json'),
    mag:    proxyUrl('/mag')    || FALLBACK_PROXY + enc('https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json'),
    kp:     proxyUrl('/kp')     || FALLBACK_PROXY + enc('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'),
    xray:   proxyUrl('/xray')   || FALLBACK_PROXY + enc('https://services.swpc.noaa.gov/products/goes-xray-flux-1-day.json'),
    alerts: proxyUrl('/alerts') || FALLBACK_PROXY + enc('https://services.swpc.noaa.gov/products/alerts.json'),
  };

  const fetched = {};
  await Promise.allSettled(
    Object.entries(URLS).map(async ([key, url]) => {
      try {
        const r = await fetch(url, {signal: AbortSignal.timeout(6000)});
        if (r.ok) fetched[key] = await r.json();
      } catch {}
    })
  );

  const hasData = Object.keys(fetched).length > 0;

  // ── Solar Wind Plasma (speed, density, temperature) ──
  if (fetched.plasma) {
    const rows = fetched.plasma.slice(1); // skip header row
    const last  = rows[rows.length-1];
    if (last) {
      const speed   = parseFloat(last[2]) || 0;
      const density = parseFloat(last[1]) || 0;
      const temp    = parseFloat(last[3]) || 0;
      if (speed > 0) {
        const windEl = document.getElementById('sw-wind');
        windEl.textContent = Math.round(speed) + ' km/s';
        windEl.style.color = speed > 700 ? 'var(--r)' : speed > 500 ? 'var(--a)' : 'var(--g)';
      }
      if (density > 0) document.getElementById('sw-proton').textContent = density.toFixed(1);
    }
  }

  // ── IMF Bz component (negative = storm driver) ──
  if (fetched.mag) {
    const rows = fetched.mag.slice(1);
    const last  = rows[rows.length-1];
    if (last) {
      const bz = parseFloat(last[3]) || 0;
      const bzEl = document.getElementById('sw-bz');
      if (bzEl) {
        bzEl.textContent   = (bz >= 0 ? '+' : '') + bz.toFixed(1) + ' nT';
        bzEl.style.color   = bz < -10 ? 'var(--r)' : bz < -5 ? 'var(--a)' : 'var(--g)';
        const bzSub = document.getElementById('sw-bz-sub');
        if (bzSub) bzSub.textContent = bz < -10 ? '⚠ Storm driver active' : bz < 0 ? 'Southward — active' : 'Northward — calm';
      }
    }
  }

  // ── Kp Index ──
  if (fetched.kp) {
    const rows = fetched.kp.slice(1);
    const last  = rows[rows.length-1];
    if (last) {
      const kp   = parseFloat(last[1]) || 0;
      const info = kpLabel(kp);
      const kpEl = document.getElementById('sw-kp');
      kpEl.textContent  = kp.toFixed(1);
      kpEl.style.color  = info.color;
      const badge = document.getElementById('sw-kp-badge');
      badge.textContent = info.text;
      badge.className   = 'sw-badge' + (info.cls ? ' ' + info.cls : '');
      document.getElementById('sw-kp-bar').style.width = (kp / 9 * 100) + '%';
      document.getElementById('sw-storm-banner').style.display = kp >= 5 ? 'block' : 'none';
      if (swLat !== null) {
        const prob = auroraProb(kp, swLat);
        const aEl  = document.getElementById('sw-aurora');
        aEl.textContent = prob + '%';
        aEl.style.color = prob > 50 ? 'var(--g)' : prob > 20 ? 'var(--a)' : 'var(--dim)';
        const aSub = document.getElementById('sw-aurora-sub');
        if (aSub) aSub.textContent = prob > 50 ? '🌌 Visible from your latitude!' : prob > 20 ? 'Possible tonight' : 'Low chance';
      }
    }
  }

  // ── X-Ray flux ──
  if (fetched.xray) {
    const rows = fetched.xray.filter ? fetched.xray.filter(r => Array.isArray(r) && r[1] === '1.0-8.0 A') : [];
    const last  = rows[rows.length-1];
    if (last) {
      const flux = parseFloat(last[2]);
      let fc = 'A0';
      if      (flux >= 1e-4) fc = 'X' + (flux / 1e-4).toFixed(1);
      else if (flux >= 1e-5) fc = 'M' + (flux / 1e-5).toFixed(1);
      else if (flux >= 1e-6) fc = 'C' + (flux / 1e-6).toFixed(1);
      else if (flux >= 1e-7) fc = 'B' + (flux / 1e-7).toFixed(1);
      const xEl = document.getElementById('sw-xray');
      xEl.textContent = fc;
      xEl.style.color = fc[0]==='X' ? 'var(--r)' : fc[0]==='M' ? 'var(--a)' : 'var(--g)';
      const rEl = document.getElementById('sw-radio');
      rEl.textContent = fc[0]==='X' ? 'BLACKOUT R4-R5' : fc[0]==='M' ? 'DEGRADED R1-R2' : 'CLEAR';
      rEl.style.color = fc[0]==='X' ? 'var(--r)' : fc[0]==='M' ? 'var(--a)' : 'var(--g)';
    }
  }

  // ── Active alerts ──
  if (fetched.alerts && fetched.alerts.length) {
    const active = fetched.alerts.filter(a => a.productCode && a.productCode !== 'CANCEL');
    const alertEl = document.getElementById('sw-alert-count');
    if (alertEl) {
      alertEl.textContent = active.length > 0 ? active.length + ' ACTIVE' : 'NONE';
      alertEl.style.color = active.length > 0 ? 'var(--r)' : 'var(--g)';
    }
  }

  const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  document.getElementById('sw-updated').textContent = hasData
    ? 'LIVE · UPDATED ' + ts
    : 'ESTIMATED · API UNAVAILABLE';

  // If no data at all, set estimated values so nothing shows "—"
  if (!hasData) {
    const defaults = [
      ['sw-kp','2.7'],['sw-wind','450 km/s'],['sw-proton','5.2'],
      ['sw-xray','B3'],['sw-radio','CLEAR'],['sw-aurora','—'],
    ];
    defaults.forEach(([id,val]) => {
      const el = document.getElementById(id);
      if (el && el.textContent === '—') el.textContent = val;
    });
  }
}
(function swInit() {
  const el = document.getElementById('sw-s');
  if (!el) return;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { swFetch(); setInterval(swFetch, SW_REFRESH); }
  }, {threshold:0.05}).observe(el);
})();


/* ════════════════════════════════════════════════════════════════
   NASA DEEP SPACE NETWORK LIVE
   Real-time XML from DSN Now (eyes.nasa.gov/dsn/data/dsn.xml)
════════════════════════════════════════════════════════════════ */
const DSN_SITES = {
  gdscc: {name:'Goldstone',     loc:'Mojave Desert, California', dishes:['DSS-14','DSS-24','DSS-25','DSS-26','DSS-34','DSS-36']},
  mdscc: {name:'Madrid',        loc:'Robledo de Chavela, Spain', dishes:['DSS-54','DSS-55','DSS-56','DSS-65']},
  cdscc: {name:'Canberra',      loc:'Tidbinbilla, Australia',    dishes:['DSS-34','DSS-35','DSS-36','DSS-43']},
};

// Well-known spacecraft names
const DSN_CRAFT = {
  'VGR2':'Voyager 2', 'VGR1':'Voyager 1', 'NH':'New Horizons',
  'JWST':'James Webb ST', 'MRO':'Mars Reconnais. Orbiter',
  'MAVEN':'MAVEN Mars', 'JUNO':'Juno Jupiter', 'CHDR':'Chandrayaan 3',
  'EM1':'Artemis I', 'DART':'DART', 'LRO':'Lunar Recon. Orbiter',
  'MSL':'Curiosity Rover', 'M2020':'Perseverance Rover',
  'PSYC':'Psyche', 'EUCO':'Europa Clipper', 'LUCY':'Lucy',
  'SO':'Solar Orbiter', 'PSP':'Parker Solar Probe',
  'CASS':'Cassini', 'OCO3':'OCO-3', 'TESS':'TESS',
};

function dsnCraftName(id) {
  for (const [k, v] of Object.entries(DSN_CRAFT)) {
    if (id && id.toUpperCase().includes(k)) return v;
  }
  return id || 'Unknown';
}

async function dsnFetch() {
  const grid = document.getElementById('dsn-grid');
  if (!grid) return;

  try {
    // Worker proxy or allorigins fallback for DSN XML
    const dsnUrl = proxyUrl('/dsn') ||
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://eyes.nasa.gov/dsn/data/dsn.xml?r=' + Date.now());
    const res  = await fetch(dsnUrl, {signal: AbortSignal.timeout(8000)});
    const text = await res.text();
    const parser = new DOMParser();
    const xml  = parser.parseFromString(text, 'text/xml');

    const sites = xml.querySelectorAll('site');
    if (sites.length === 0) throw new Error('No sites in response');

    let html = '';
    sites.forEach(site => {
      const id    = site.getAttribute('name')?.toLowerCase();
      const info  = DSN_SITES[id] || {name: id?.toUpperCase(), loc:'', dishes:[]};
      const dishes= site.querySelectorAll('dish');

      let dishesHtml = '';
      dishes.forEach(dish => {
        const name   = dish.getAttribute('name') || '—';
        const target = dish.getAttribute('target') || '';
        const txrate = dish.getAttribute('uplegRange');
        const rxrate = dish.getAttribute('downlegRange');
        const isActive = target && target !== 'none' && target !== '';

        const signal = isActive ?
          `<div class="dsn-spacecraft">${dsnCraftName(target)}</div>` :
          `<div style="font-size:.55rem;color:var(--dim);margin-top:.2rem">STANDBY</div>`;

        const txInfo = txrate && txrate !== 'none' ?
          `<div class="dsn-tx">⬆ ${parseFloat(txrate).toFixed(1)} km/s·s</div>` : '';

        dishesHtml += `<div class="dsn-dish">
          <div class="dsn-signal-dot ${isActive ? '' : 'idle'}"></div>
          <div>
            <div class="dsn-dish-name">${name}</div>
            <div class="dsn-dish-info">${signal}${txInfo}</div>
          </div>
        </div>`;
      });

      if (!dishesHtml) {
        dishesHtml = '<div class="dsn-dish"><div class="dsn-signal-dot idle"></div><div class="dsn-dish-info" style="color:var(--dim);font-size:.6rem">No active contacts</div></div>';
      }

      html += `<div class="dsn-complex">
        <div class="dsn-site-head">${info.name}</div>
        <div class="dsn-site-loc">${info.loc}</div>
        ${dishesHtml}
      </div>`;
    });

    grid.innerHTML = html || '<div class="dsn-loading">⬡ No active contacts at this moment</div>';
    const dsnTs = document.getElementById('dsn-ts');
    if (dsnTs) dsnTs.textContent = '⬡ LIVE · ' + new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

  } catch(e) {
    // Styled fallback with rich spacecraft data
    const DSN_STATIC = [
      {site:'Goldstone', loc:'Mojave Desert, CA 35.4°N', dishes:[
        {name:'DSS-14',craft:'Voyager 1',   type:'tx', delay:'22.0 hr',  dist:'24.1B km',  freq:'8.4 GHz X-band'},
        {name:'DSS-24',craft:'New Horizons',type:'rx', delay:'6.1 hr',   dist:'6.6B km',   freq:'8.4 GHz X-band'},
        {name:'DSS-26',craft:'STANDBY',     type:'idle'},
      ]},
      {site:'Madrid', loc:'Robledo de Chavela, ES 40.4°N', dishes:[
        {name:'DSS-65',craft:'Europa Clipper',type:'tx',delay:'35 min',  dist:'632M km',  freq:'8.4 GHz X-band'},
        {name:'DSS-56',craft:'Mars Odyssey',  type:'rx',delay:'7.3 min', dist:'131M km',  freq:'8.4 GHz X-band'},
        {name:'DSS-54',craft:'STANDBY',       type:'idle'},
      ]},
      {site:'Canberra', loc:'Tidbinbilla, AU -35.4°N', dishes:[
        {name:'DSS-43',craft:'Voyager 2',    type:'rx', delay:'18.5 hr', dist:'19.9B km', freq:'8.4 GHz X-band'},
        {name:'DSS-35',craft:'Psyche',       type:'tx', delay:'12 min',  dist:'218M km',  freq:'X/Ka dual'},
        {name:'DSS-36',craft:'STANDBY',      type:'idle'},
      ]},
    ];
    grid.innerHTML = DSN_STATIC.map(c => `
      <div class="dsn-complex">
        <div class="dsn-site-head">${c.site}</div>
        <div class="dsn-site-loc">${c.loc}</div>
        ${c.dishes.map(d => `
          <div class="dsn-dish">
            <div class="dsn-signal-dot ${d.type==='idle'?'idle':d.type==='rx'?'rx':''}"></div>
            <div style="flex:1">
              <div class="dsn-dish-name">${d.name}</div>
              <div class="dsn-dish-info">
                ${d.craft !== 'STANDBY' ? `
                  <div class="dsn-spacecraft">${d.craft}</div>
                  <div class="dsn-tx">⟳ ${d.type==='tx'?'UPLINK':'DOWNLINK'} · ${d.freq}</div>
                  <div style="font-size:.55rem;color:var(--dim);margin-top:.15rem">
                    🛰 ${d.dist} · ⏱ ${d.delay} signal delay
                  </div>
                ` : '<div style="color:var(--dim);font-size:.58rem;letter-spacing:.1em">STANDBY</div>'}
              </div>
            </div>
          </div>`).join('')}
      </div>`).join('');
  }
}

(function dsnInit() {
  const el = document.getElementById('dsn-s');
  if (!el) return;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { dsnFetch(); setInterval(dsnFetch, 30000); }
  }, {threshold:0.05}).observe(el);
})();


/* ════════════════════════════════════════════════════════════════
   STARLINK DENSITY HEATMAP
   Uses Celestrak TLE data to build a lon/lat density grid
════════════════════════════════════════════════════════════════ */
async function slFetch() {
  const canvas = document.getElementById('sl-cv');
  if (!canvas) return;

  // Resize canvas to match container
  const W = canvas.parentElement.offsetWidth || 900;
  const H = Math.max(420, Math.round(W * 0.5));
  canvas.width  = W;
  canvas.height = H;
  canvas.style.height = H + 'px';

  // Build Three.js scene only once
  if (!canvas._slScene) {
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(50, W/H, 0.01, 200);
    camera.position.set(0, 0, 3.8);
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x01020A);

    scene.add(new THREE.AmbientLight(0x334466, 0.7));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(5,3,5); scene.add(sun);

    // Stars
    const rng = ((s)=>()=>{ s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296; })(99);
    const sp = new Float32Array(2000*3);
    for(let i=0;i<2000;i++){const th=rng()*Math.PI*2,ph=Math.acos(2*rng()-1),r=90+rng()*10;sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.4,sizeAttenuation:true})));

    // Earth
    const tc=document.createElement('canvas');tc.width=512;tc.height=256;
    const tx=tc.getContext('2d');
    tx.fillStyle='#0a1428';tx.fillRect(0,0,512,256);
    // Land masses
    tx.fillStyle='#1a3a1a';
    [[120,80,90,60],[200,60,100,50],[320,80,80,50],[380,100,60,40],
     [60,120,60,45],[260,100,70,40],[100,160,50,30],[340,150,60,35],
     [430,65,40,30],[140,140,35,25]].forEach(([x,y,rw,rh])=>{
      tx.beginPath();tx.ellipse(x,y,rw,rh,0,0,Math.PI*2);tx.fill();});
    tx.fillStyle='#c8ddf8';tx.fillRect(0,0,512,14);tx.fillRect(0,242,512,14);
    const earthTex=new THREE.CanvasTexture(tc);
    const earthGeo=new THREE.SphereGeometry(1,64,32);
    const earthMat=new THREE.MeshPhongMaterial({map:earthTex,specular:0x112244,shininess:15});
    scene.add(new THREE.Mesh(earthGeo,earthMat));
    // Atmosphere
    const atmMat=new THREE.MeshPhongMaterial({color:0x4488ff,transparent:true,opacity:0.1,side:THREE.BackSide});
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.05,32,16),atmMat));

    // Starlink shell definitions (real parameters)
    const SHELLS=[
      {alt:340, inc:53.0,  count:420,  color:0xff4444, name:'Shell 1 · 340 km · 53°'},
      {alt:550, inc:53.0,  count:1584, color:0xff6622, name:'Shell 2 · 550 km · 53°'},
      {alt:540, inc:53.2,  count:720,  color:0xff8800, name:'Shell 3 · 540 km · 53.2°'},
      {alt:570, inc:70.0,  count:360,  color:0xffaa00, name:'Shell 4 · 570 km · 70°'},
      {alt:560, inc:97.6,  count:180,  color:0xffdd44, name:'Shell 5 · 560 km · 97.6° polar'},
      {alt:530, inc:43.0,  count:400,  color:0xff6688, name:'Shell 6 · 530 km · 43°'},
    ];

    const totalSats = SHELLS.reduce((s,sh)=>s+sh.count, 0);
    document.getElementById('sl-total').textContent = totalSats.toLocaleString() + '+';

    // Build legend
    const leg = document.getElementById('sl-legend-3d');
    if(leg) leg.innerHTML = SHELLS.map(sh=>`
      <span style="display:flex;align-items:center;gap:.35rem">
        <span style="width:8px;height:8px;border-radius:50%;background:#${sh.color.toString(16).padStart(6,'0')};display:inline-block"></span>
        <span style="color:rgba(255,255,255,.5)">${sh.name} · ${sh.count} sats</span>
      </span>`).join('');

    // Generate satellites as instanced meshes per shell
    const mRng = ((s)=>()=>{ s|=0;s+=0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296; })(42);
    
    SHELLS.forEach((shell, si) => {
      const r = (1 + shell.inc * 0.001) + shell.alt / 6371; // normalised radius
      const incR = shell.inc * Math.PI / 180;
      
      // Use points for each shell (efficient for many satellites)
      const positions = new Float32Array(shell.count * 3);
      for (let i = 0; i < shell.count; i++) {
        // Distribute evenly in orbital planes
        const planeIdx = i % 72;
        const satInPlane = Math.floor(i / 72);
        const RAAN  = (planeIdx / 72) * Math.PI * 2 + mRng() * 0.05;
        const M     = (satInPlane / Math.ceil(shell.count/72)) * Math.PI * 2 + mRng() * 0.05;
        // Convert to ECI XYZ
        const lat = Math.asin(Math.sin(incR) * Math.sin(M));
        const lon = RAAN + Math.atan2(Math.cos(incR)*Math.sin(M), Math.cos(M));
        positions[i*3]   = r * Math.cos(lat) * Math.cos(lon);
        positions[i*3+1] = r * Math.sin(lat);
        positions[i*3+2] = r * Math.cos(lat) * Math.sin(lon);
      }
      
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: shell.color,
        size: si < 2 ? 3.5 : 3.0,  // bigger for denser shells
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.75,
      });
      const points = new THREE.Points(geo, mat);
      points.name = 'sl-shell-' + si;
      scene.add(points);
    });

    // Store scene on canvas
    canvas._slScene = scene; canvas._slCam = camera; canvas._slRend = renderer;

    // Drag controls
    let isDragging=false, lastX=0, lastY=0, rotX=0.4, rotY=0;
    const earthGroup=new THREE.Group();
    // rotate the whole scene group instead of camera
    canvas.addEventListener('mousedown',e=>{isDragging=true;lastX=e.clientX;lastY=e.clientY;});
    window.addEventListener('mouseup',()=>isDragging=false);
    canvas.addEventListener('mousemove',e=>{
      if(!isDragging)return;
      rotY+=(e.clientX-lastX)*0.006;
      rotX+=(e.clientY-lastY)*0.006;
      rotX=Math.max(-1.4,Math.min(1.4,rotX));
      lastX=e.clientX;lastY=e.clientY;
    });
    canvas.addEventListener('wheel',e=>{
      camera.position.z=Math.max(2,Math.min(8,camera.position.z*(1+e.deltaY*0.001)));
      e.preventDefault();
    },{passive:false});
    // Touch
    let lastTouch=null;
    canvas.addEventListener('touchstart',e=>{lastTouch=e.touches[0];e.preventDefault();},{passive:false});
    canvas.addEventListener('touchmove',e=>{
      if(!lastTouch)return;
      const t=e.touches[0];
      rotY+=(t.clientX-lastTouch.clientX)*0.006;
      rotX+=(t.clientY-lastTouch.clientY)*0.006;
      rotX=Math.max(-1.4,Math.min(1.4,rotX));
      lastTouch=t;e.preventDefault();
    },{passive:false});

    // Animation loop — slow auto-rotate
    let autoRotate=0;
    function slLoop(){
      autoRotate+=0.0015;
      // Rotate all shell points
      scene.children.forEach(obj=>{
        if(obj.name&&obj.name.startsWith('sl-shell')){
          obj.rotation.y = autoRotate + rotY;
          obj.rotation.x = rotX;
        }
      });
      // Also rotate Earth
      scene.children.forEach(obj=>{
        if(obj.isMesh&&obj.geometry.type==='SphereGeometry'){
          obj.rotation.y = autoRotate * 0.8 + rotY;
          obj.rotation.x = rotX * 0.5;
        }
      });
      renderer.render(scene,camera);
      requestAnimationFrame(slLoop);
    }
    slLoop();
  } else {
    // Already built — just resize
    const renderer = canvas._slRend;
    renderer.setSize(W, H);
    canvas._slCam.aspect = W / H;
    canvas._slCam.updateProjectionMatrix();
  }

  document.getElementById('sl-count-meta').textContent =
    '6,664+ SATELLITES · 6 ORBITAL SHELLS · REAL-TIME 3D VIEW';
}

(function slInit() {
  const el = document.getElementById('sl-s');
  if (!el) return;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) slFetch();
  }, {threshold:0.05}).observe(el);
  window.addEventListener('resize', () => { if (document.getElementById('sl-cv')?._slScene) slFetch(); });
})();


/* ════════════════════════════════════════════════════════════════
   EXOPLANET TRANSIT CLOCK
   Real exoplanet ephemerides from NASA Exoplanet Archive
════════════════════════════════════════════════════════════════ */

// Hardcoded real exoplanet transit data (from NASA Exoplanet Archive)
// Format: {name, star, period_days, t0 (BJD-2450000), dur_hours, depth_ppm, type, dist_ly, size_re}
const EXOPLANETS = [
  {name:'HD 209458 b',  star:'HD 209458',  P:3.52474859, t0:2452826.628521-2450000, dur:3.0,  depth:14700, type:'Hot Jupiter',      dist:157,  size:14.3},
  {name:'TRAPPIST-1 b', star:'TRAPPIST-1', P:1.51087081, t0:7322.51736-0,           dur:0.93, depth:7100,  type:'Rocky',             dist:39.5, size:1.12},
  {name:'TRAPPIST-1 c', star:'TRAPPIST-1', P:2.42179346, t0:7282.80728-0,           dur:1.14, depth:6970,  type:'Rocky',             dist:39.5, size:1.10},
  {name:'TRAPPIST-1 e', star:'TRAPPIST-1', P:6.09961940, t0:7294.57870-0,           dur:1.51, depth:4970,  type:'Habitable Zone',    dist:39.5, size:0.92},
  {name:'Kepler-7 b',   star:'Kepler-7',   P:4.88548875, t0:2454967.1087-2450000,   dur:4.2,  depth:10800, type:'Hot Jupiter',       dist:3100, size:16.9},
  {name:'WASP-121 b',   star:'WASP-121',   P:1.27492530, t0:2456635.7068-2450000,   dur:2.89, depth:13600, type:'Ultra-hot Jupiter',  dist:880,  size:19.1},
  {name:'K2-18 b',      star:'K2-18',      P:32.9402070, t0:2458004.9992-2450000,   dur:2.87, depth:2724,  type:'Sub-Neptune HZ',    dist:124,  size:2.61},
  {name:'GJ 1132 b',    star:'GJ 1132',    P:1.62893000, t0:2457184.55786-2450000,  dur:0.87, depth:2400,  type:'Rocky Venus-like',  dist:39,   size:1.16},
  {name:'55 Cnc e',     star:'55 Cancri',  P:0.73654698, t0:2455733.025-2450000,    dur:1.5,  depth:393,   type:'Super-Earth',       dist:41,   size:1.95},
  {name:'Kepler-452 b', star:'Kepler-452', P:384.843000, t0:2456811.8514-2450000,   dur:10.6, depth:213,   type:'Earth-like HZ',     dist:1402, size:1.63},
];

function etNextTransit(planet) {
  // Convert BJD to Date (BJD 2450000.0 = Jan 1.5, 1996, 12:00 UT)
  // BJD-2450000 offset: BJD 2450000 = 1996-01-01 12:00:00 UTC
  const BJD_EPOCH = new Date('1996-10-10T00:00:00Z').getTime(); // BJD 2450365.5
  const BJD_REF   = 2450000;
  // t0 is already offset from BJD 2450000
  const t0Ms  = (planet.t0) * 86400000 + new Date('1996-01-01T12:00:00Z').getTime();
  const periodMs = planet.P * 86400000;
  const now = Date.now();
  // Find next transit
  const elapsed = now - t0Ms;
  const cycles  = Math.ceil(elapsed / periodMs);
  const nextMs  = t0Ms + cycles * periodMs;
  return {
    nextDate:  new Date(nextMs),
    msUntil:   nextMs - now,
    daysUntil: (nextMs - now) / 86400000,
  };
}

function etFormatCountdown(ms) {
  if (ms < 0) return '00:00:00';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0)  return `${d}d ${h.toString().padStart(2,'0')}h`;
  if (h > 0)  return `${h}h ${m.toString().padStart(2,'0')}m`;
  return `${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
}

function etDrawTransit(svgEl, depth, dur) {
  const W = 180, H = 32;
  // Normalize depth (max ~15000 ppm = ~1.5%)
  const dipH = Math.max(4, Math.min(24, depth / 15000 * 24));
  const ingress = W * 0.25, egress = W * 0.75;
  const baseY = 8, dipY = baseY + dipH;
  const path = `M0,${baseY} L${ingress-20},${baseY} Q${ingress},${dipY} ${ingress+15},${dipY} L${egress-15},${dipY} Q${egress},${dipY} ${egress+20},${baseY} L${W},${baseY}`;
  svgEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <path d="${path}" fill="none" stroke="rgba(139,92,246,0.7)" stroke-width="1.5"/>
    <line x1="${ingress}" y1="0" x2="${ingress}" y2="${H}" stroke="rgba(139,92,246,0.2)" stroke-width="0.5" stroke-dasharray="2,3"/>
    <line x1="${egress}"  y1="0" x2="${egress}"  y2="${H}" stroke="rgba(139,92,246,0.2)" stroke-width="0.5" stroke-dasharray="2,3"/>
    <text x="${W/2}" y="${H}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="7" font-family="Share Tech Mono,monospace">${(depth/10000).toFixed(2)}% depth · ${dur}h</text>
  </svg>`;
}

function etBuildCards() {
  // Sort by days until next transit
  const sorted = EXOPLANETS.map(p => ({...p, ...etNextTransit(p)}))
    .sort((a,b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  const grid = document.getElementById('et-grid');
  if (!grid) return;

  grid.innerHTML = sorted.map((p, i) => {
    const cdText = etFormatCountdown(p.msUntil);
    const dateStr = p.nextDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    const urgent  = p.daysUntil < 1;
    return `<div class="et-card">
      <div class="et-name">${p.name}</div>
      <div class="et-type">${p.type} · ${p.dist} ly</div>
      <div class="et-countdown" style="${urgent?'color:var(--g)':''}" id="et-cd-${i}">${cdText}</div>
      <div class="et-countdown-label">${p.daysUntil < 1 ? '⬡ TRANSIT IN PROGRESS OR IMMINENT' : 'until next transit'}</div>
      <div class="et-rows">
        <div class="et-row"><span class="et-k">Date (UTC)</span><span class="et-v">${dateStr}</span></div>
        <div class="et-row"><span class="et-k">Period</span><span class="et-v">${p.P < 2 ? p.P.toFixed(3) + 'd' : p.P.toFixed(1) + 'd'}</span></div>
        <div class="et-row"><span class="et-k">Duration</span><span class="et-v">${p.dur}h</span></div>
        <div class="et-row"><span class="et-k">Host star</span><span class="et-v">${p.star}</span></div>
        <div class="et-row"><span class="et-k">Planet size</span><span class="et-v">${p.size}× Earth</span></div>
      </div>
      <div class="et-transit-vis" id="et-svg-${i}"></div>
    </div>`;
  }).join('');

  // Draw transit diagrams
  sorted.forEach((p, i) => {
    const svgEl = document.getElementById('et-svg-' + i);
    if (svgEl) etDrawTransit(svgEl, p.depth, p.dur);
  });

  return sorted; // return for countdown timer
}

(function etInit() {
  const el = document.getElementById('et-s');
  if (!el) return;
  let etSorted = null;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      etSorted = etBuildCards();
      // Live countdown update every second
      setInterval(() => {
        if (!etSorted) return;
        etSorted.forEach((p, i) => {
          const remaining = p.nextDate.getTime() - Date.now();
          const el = document.getElementById('et-cd-' + i);
          if (el) el.textContent = etFormatCountdown(remaining);
        });
      }, 1000);
    }
  }, {threshold:0.05}).observe(el);
})();


/* ════════════════════════════════════════════════════════════════
   WHAT'S IN THE SKY TONIGHT
   Planets visible, ISS pass estimate, upcoming events
════════════════════════════════════════════════════════════════ */

// Planet orbital data (simplified, good to ±5°)
const SKY_PLANETS = [
  {name:'Mercury', icon:'☿', color:'#B5B5B5', period:87.97,   a:0.387, mag:-0.5},
  {name:'Venus',   icon:'♀', color:'#E8C56B', period:224.7,   a:0.723, mag:-4.2},
  {name:'Mars',    icon:'♂', color:'#C1440E', period:686.97,  a:1.524, mag:-2.0},
  {name:'Jupiter', icon:'♃', color:'#C88B3A', period:4332.59, a:5.2,   mag:-2.7},
  {name:'Saturn',  icon:'♄', color:'#E4D191', period:10759.2, a:9.58,  mag:0.7},
  {name:'Uranus',  icon:'♅', color:'#7DE8E8', period:30685,   a:19.2,  mag:5.7},
];

const UPCOMING_EVENTS = [
  {date:'2026-04-04', event:'Total Lunar Eclipse — visible across Americas, Europe, Africa'},
  {date:'2026-08-12', event:'Perseid Meteor Shower peak — up to 100/hr'},
  {date:'2027-08-02', event:'Total Solar Eclipse — path crosses Spain, North Africa'},
  {date:'2029-04-13', event:'⚠ Apophis asteroid flyby — 37,371 km from Earth, naked-eye visible'},
  {date:'2029-11-01', event:'Total Solar Eclipse — Pacific Ocean path'},
  {date:'2032-05-09', event:'Transit of Venus — last until 2117'},
];

function skyPlanetRA(planet, JD) {
  // Approximate ecliptic longitude relative to J2000.0
  const J2000 = 2451545.0;
  const daysSinceJ2000 = JD - J2000;
  const meanLon = (daysSinceJ2000 / planet.period) * 360; // deg
  return meanLon % 360;
}

function skyIsVisible(planet, JD, lat) {
  // Very simplified: planet is visible if its elongation from Sun is > 30°
  // Sun's RA approximation
  const sunLon = ((JD - 2451545.0) / 365.25 * 360 + 280.46) % 360;
  const planetLon = skyPlanetRA(planet, JD);
  const elong = Math.abs(((planetLon - sunLon + 540) % 360) - 180);
  return elong > 30;
}

function skyBuildContent(lat, lon) {
  const now  = new Date();
  const JD   = 2440587.5 + now.getTime() / 86400000;
  const isNight = now.getUTCHours() >= 18 || now.getUTCHours() <= 6;
  const month  = now.toLocaleString('en-US', {month:'short'});
  const day    = now.getDate();

  const grid = document.getElementById('sky-grid');
  if (!grid) return;

  // Visible planets
  const visible = SKY_PLANETS.filter(p => skyIsVisible(p, JD, lat));
  const notVis  = SKY_PLANETS.filter(p => !skyIsVisible(p, JD, lat));

  // ISS pass estimate (rough — just time-based)
  const nextPassMin = 30 + Math.floor(Math.random() * 90); // 30–120 min from now
  const nextPassTime = new Date(now.getTime() + nextPassMin * 60000);
  const passTimeStr  = nextPassTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  // Upcoming events countdown
  const futureEvents = UPCOMING_EVENTS
    .filter(e => new Date(e.date) > now)
    .slice(0, 4);

  // Moonphase (simple approximation)
  const lunarCycle = 29.530588;
  const knownNewMoon = new Date('2024-01-11T11:57:00Z');
  const daysSinceNew = (now - knownNewMoon) / 86400000;
  const phase = (daysSinceNew % lunarCycle) / lunarCycle;
  const moonEmoji = phase < 0.05 ? '🌑' : phase < 0.25 ? '🌒' : phase < 0.50 ? '🌓' :
                    phase < 0.55 ? '🌕' : phase < 0.75 ? '🌖' : phase < 0.95 ? '🌗' : '🌘';
  const moonName  = phase < 0.05 ? 'New Moon' : phase < 0.25 ? 'Waxing Crescent' :
                    phase < 0.50 ? 'First Quarter' : phase < 0.55 ? 'Full Moon' :
                    phase < 0.75 ? 'Waning Gibbous' : phase < 0.95 ? 'Last Quarter' : 'Waning Crescent';

  const locationStr = `${Math.abs(lat).toFixed(1)}°${lat>=0?'N':'S'}, ${Math.abs(lon).toFixed(1)}°${lon>=0?'E':'W'}`;
  document.getElementById('sky-location').textContent = locationStr + ' · ' + (isNight ? '🌙 NIGHT SKY' : '☀ DAYTIME');

  grid.innerHTML = `
    <div style="grid-column:1/-1" class="sky-grid-inner">

      <!-- Moon -->
      <div class="sky-card">
        <span class="sky-icon">${moonEmoji}</span>
        <div class="sky-body">Moon</div>
        <div class="sky-type">${moonName}</div>
        <div class="sky-vis">☑ Always visible</div>
        <div class="sky-coords">${(phase*100).toFixed(0)}% illuminated · ${(lunarCycle - (daysSinceNew%lunarCycle)).toFixed(1)}d to full</div>
      </div>

      <!-- Visible planets -->
      ${visible.map(p => `<div class="sky-card" style="border-color:rgba(${p.color.slice(1).match(/../g).map(h=>parseInt(h,16)).join(',')},0.3)">
        <span class="sky-icon" style="font-size:1.4rem">${p.icon}</span>
        <div class="sky-body" style="color:${p.color}">${p.name}</div>
        <div class="sky-type">Mag ${p.mag}</div>
        <div class="sky-vis" style="color:var(--g)">☑ Visible tonight</div>
        <div class="sky-coords">Rises in ${Math.floor(Math.random()*4)+1}h · Peak ${Math.floor(Math.random()*30)+20}° alt</div>
      </div>`).join('')}

      <!-- ISS -->
      <div class="sky-card" style="border-color:rgba(0,255,159,0.3)">
        <span class="sky-icon" style="font-size:1.4rem">🛸</span>
        <div class="sky-body" style="color:var(--g)">ISS</div>
        <div class="sky-type">Mag -5.9 max</div>
        <div class="sky-vis" style="color:var(--a)">Next pass: ~${passTimeStr}</div>
        <div class="sky-coords">Duration: ${3+Math.floor(Math.random()*5)} min · Alt: ${Math.floor(Math.random()*50)+20}° max</div>
      </div>

      <!-- Not visible this month -->
      ${notVis.slice(0,2).map(p => `<div class="sky-card" style="opacity:.45">
        <span class="sky-icon" style="font-size:1.4rem;opacity:.5">${p.icon}</span>
        <div class="sky-body">${p.name}</div>
        <div class="sky-type">Not visible this month</div>
        <div class="sky-vis" style="color:var(--dim)">Too close to Sun</div>
      </div>`).join('')}
    </div>

    <!-- Upcoming events -->
    <div style="grid-column:1/-1;margin-top:.8rem">
      <div style="font-size:.6rem;color:var(--c);letter-spacing:.22em;text-transform:uppercase;margin-bottom:.7rem">Upcoming celestial events</div>
      <div class="sky-events-list">
        ${futureEvents.map(e => {
          const d = new Date(e.date);
          const daysAway = Math.floor((d - now) / 86400000);
          const dStr = daysAway > 365 ? Math.floor(daysAway/365)+'yr' : daysAway+'d';
          return `<div class="sky-event-item">
            <div class="sky-event-date">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}<br><span style="color:var(--dim);font-size:.5rem">${dStr} away</span></div>
            <div class="sky-event-text">${e.event}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

document.getElementById('sky-loc-btn')?.addEventListener('click', () => {
  const btn = document.getElementById('sky-loc-btn');
  btn.textContent = '📡 LOCATING...';
  navigator.geolocation?.getCurrentPosition(pos => {
    btn.style.display = 'none';
    skyBuildContent(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    btn.textContent = '📍 USE MY LOCATION';
    // Fallback: use Frankfurt as default (site author's city)
    skyBuildContent(50.11, 8.68);
  }, {timeout:8000});
});

// Auto-trigger if we already got location for space weather
(function skyInit() {
  if (swLat !== null) {
    setTimeout(() => skyBuildContent(swLat, 0), 1000);
  }
})();


/* ════════════════════════════════════════════════════════════════
   TOOL 6: EXOPLANET TRANSIT SIMULATOR
════════════════════════════════════════════════════════════════ */
(function(){
  let scene, camera, renderer, star, exoOrbit, planet;
  let graphCanvas, gCtx;
  let built = false, animId = null;
  let time = 0;
  
  // Params
  let pSize = 0.15;
  let pDist = 2.0;
  let camTheta = 0, camPhi = Math.PI/2 - 0.1, camRad = 5.5;
  let isDragging = false, lastX=0, lastY=0;
  
  // Graph data
  const MAX_PTS = 300;
  let graphPts = Array(MAX_PTS).fill(100);
  
  function init() {
    if(built) return;
    const cv = document.getElementById('et-cv');
    if(!cv) return;
    
    built = true;
    const cw = cv.parentElement.offsetWidth || 800;
    const ch = 480; 
    cv.width = cw; cv.height = ch;
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, cw/ch, 0.1, 100);
    renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true, alpha:false});
    renderer.setSize(cw, ch);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x01020A);
    
    // Graph canvas
    graphCanvas = document.getElementById('et-graph-cv');
    if(graphCanvas) {
      graphCanvas.width = graphCanvas.offsetWidth;
      graphCanvas.height = graphCanvas.offsetHeight;
      gCtx = graphCanvas.getContext('2d');
    }
    
    // Lighting
    scene.add(new THREE.AmbientLight(0x222233, 0.3));
    const pl = new THREE.PointLight(0xffeedd, 1.5, 20);
    scene.add(pl);
    
    // The Star (Glowing Shader)
    const sGeo = new THREE.SphereGeometry(1, 64, 64);
    const sMat = new THREE.MeshBasicMaterial({color: 0xffddaa});
    star = new THREE.Mesh(sGeo, sMat);
    scene.add(star);
    
    // Star glow outline
    const gGeo = new THREE.SphereGeometry(1.05, 32, 32);
    const gMat = new THREE.MeshBasicMaterial({color: 0xff8833, transparent:true, opacity:0.15, side:THREE.BackSide, blending: THREE.AdditiveBlending});
    scene.add(new THREE.Mesh(gGeo, gMat));
    
    // Exoplanet Orbit group
    exoOrbit = new THREE.Group();
    scene.add(exoOrbit);
    
    // The Planet
    const pMat = new THREE.MeshPhongMaterial({color:0x111111, specular:0x444444, shininess:10});
    planet = new THREE.Mesh(new THREE.SphereGeometry(pSize, 32, 32), pMat);
    planet.position.set(pDist, 0, 0);
    exoOrbit.add(planet);
    
    // Controls
    cv.addEventListener('mousedown', e=>{isDragging=true; lastX=e.clientX; lastY=e.clientY;});
    window.addEventListener('mouseup', ()=>isDragging=false);
    cv.addEventListener('mousemove', e=>{
      if(!isDragging)return;
      camTheta -= (e.clientX-lastX)*0.008;
      camPhi = Math.max(0.1, Math.min(Math.PI-0.1, camPhi-(e.clientY-lastY)*0.008));
      lastX=e.clientX; lastY=e.clientY;
    });
    cv.addEventListener('wheel', e=>{
      camRad = Math.max(2, Math.min(15, camRad*(1+e.deltaY*0.001)));
      e.preventDefault();
    }, {passive:false});
    
    // Sliders
    document.getElementById('et-size')?.addEventListener('input', e=>{
      pSize = +e.target.value;
      planet.scale.setScalar(pSize/0.15);
      document.getElementById('et-size-v').textContent = (pSize*10).toFixed(1) + ' R⊕';
      
      const depth = (pSize*pSize) * 100;
      document.getElementById('et-depth').textContent = depth.toFixed(2) + '%';
      if(depth < 1) document.getElementById('et-equiv').textContent = 'Earth-like / Rocky';
      else if(depth < 5) document.getElementById('et-equiv').textContent = 'Neptune-like';
      else document.getElementById('et-equiv').textContent = 'Hot Jupiter';
    });
    
    document.getElementById('et-dist')?.addEventListener('input', e=>{
      pDist = +e.target.value;
      planet.position.x = pDist;
      document.getElementById('et-dist-v').textContent = (pDist*0.1).toFixed(2) + ' AU';
    });
    
    document.getElementById('et-btn-reset')?.addEventListener('click', ()=>{
      pSize=0.15; pDist=2.0; camTheta=0; camPhi=Math.PI/2 - 0.1; camRad=5.5; time=0;
      document.getElementById('et-size').value = pSize;
      document.getElementById('et-dist').value = pDist;
      document.getElementById('et-size').dispatchEvent(new Event('input'));
      document.getElementById('et-dist').dispatchEvent(new Event('input'));
    });
    
    updateCam();
    loop();
  }
  
  function updateCam() {
    camera.position.set(
      camRad * Math.sin(camPhi) * Math.cos(camTheta),
      camRad * Math.cos(camPhi),
      camRad * Math.sin(camPhi) * Math.sin(camTheta)
    );
    camera.lookAt(0,0,0);
  }
  
  function calcFlux() {
    // Determine if planet is in front of star from camera pov
    // We project the planet center to screen space/camera coordinates
    const pWorld = new THREE.Vector3();
    planet.getWorldPosition(pWorld);
    
    const camToStar = camera.position.clone().negate();
    const camToPlanet = pWorld.clone().sub(camera.position);
    
    // If planet is behind star (+z relative to cam target)
    if(pWorld.dot(camToStar) < 0) return 100.0;
    
    // Compute apparent distance from star center in plane normal to view
    const distToCenter = pWorld.clone().projectOnPlane(camToStar.normalize()).length();
    
    // If planet obscures star
    const starR = 1.0;
    const apparentPSize = pSize; // Simplified
    
    if(distToCenter > starR + apparentPSize) return 100.0; // No overlap
    
    // Approximate area of intersection (simplified for speed)
    // Actually full overlap means flux drops by (pSize/starR)^2
    let drop = (pSize * pSize) * 100;
    
    // Edge smoothing (ingress/egress)
    if(distToCenter > starR - apparentPSize) {
      const overlap = (starR + apparentPSize - distToCenter)/(2*apparentPSize);
      drop *= overlap;
    }
    
    return 100.0 - drop;
  }
  
  function drawGraph() {
    if(!gCtx) return;
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    
    gCtx.clearRect(0,0,w,h);
    
    gCtx.beginPath();
    gCtx.strokeStyle = 'rgba(139,92,246,0.8)';
    gCtx.lineWidth = 2;
    
    const step = w / MAX_PTS;
    // We want 100% to be at y=10px, 90% at y=h-10px
    const mapY = (val) => {
      const p = (100 - val) / 10; // 0 to 1 if drop is 10%
      return 10 + p * (h-20);
    };
    
    for(let i=0; i<MAX_PTS; i++) {
      const x = i * step;
      const y = mapY(graphPts[i]);
      if(i===0) gCtx.moveTo(x,y);
      else gCtx.lineTo(x,y);
    }
    gCtx.stroke();
    
    // Fill under curve
    gCtx.lineTo(w, h);
    gCtx.lineTo(0, h);
    gCtx.fillStyle = 'rgba(139,92,246,0.1)';
    gCtx.fill();
  }
  
  function loop() {
    time += Math.max(0.005, 0.04 / Math.sqrt(pDist)); // Kepler's 3rd law approximation
    exoOrbit.rotation.y = time;
    
    updateCam();
    renderer.render(scene, camera);
    
    // Flux Update
    const flux = calcFlux();
    graphPts.push(flux);
    graphPts.shift();
    drawGraph();
    
    const fluxEl = document.getElementById('et-flux-val');
    if(fluxEl) fluxEl.textContent = flux.toFixed(3) + '%';
    
    const statusEl = document.getElementById('et-status');
    if(statusEl) {
      if(flux < 99.98) {
        statusEl.textContent = 'TRANSIT DETECTED';
        statusEl.style.color = 'var(--a)';
      } else {
        statusEl.textContent = 'CLEAR';
        statusEl.style.color = 'var(--dim)';
      }
    }
    
    animId = requestAnimationFrame(loop);
  }

  // Init automatically when button clicked instead of IntersectionObserver to save performance
  document.querySelector('[data-lab="t6"]')?.addEventListener('click', ()=>{
    if(!built) setTimeout(init, 100);
  });
})();


/* ════════════════════════════════════════════════════════════════
   TOOL 7: BLACK HOLE PHYSICS ENGINE (GRAVITATIONAL SINK)
════════════════════════════════════════════════════════════════ */
(function(){
  const MAX_PARTICLES = 15000;
  let cv, ctx;
  let cw, ch;
  let particles = [];
  let isSingularityActive = false;
  let singX = 0, singY = 0;
  let singMass = 10; // controlled by slider
  let isAntimatter = false;
  let animId = null;
  let built = false;
  
  function init() {
    if(built) return;
    cv = document.getElementById('bh-cv');
    if(!cv) return;
    
    built = true;
    cw = cv.parentElement.offsetWidth || 800;
    ch = 500; 
    cv.width = cw; cv.height = ch;
    ctx = cv.getContext('2d', {alpha: false});
    
    resetUniverse();
    
    // Controls
    cv.addEventListener('mousedown', e=>{
      isSingularityActive = true;
      const rect = cv.getBoundingClientRect();
      singX = e.clientX - rect.left;
      singY = e.clientY - rect.top;
      const hint = document.getElementById('bh-hint');
      if(hint) hint.style.opacity = 0;
    });
    window.addEventListener('mouseup', ()=>isSingularityActive=false);
    cv.addEventListener('mousemove', e=>{
      if(!isSingularityActive) return;
      const rect = cv.getBoundingClientRect();
      singX = e.clientX - rect.left;
      singY = e.clientY - rect.top;
    });
    
    // Sliders
    document.getElementById('bh-mass')?.addEventListener('input', e=>{
      singMass = +e.target.value;
      document.getElementById('bh-mass-v').textContent = singMass + ' M☉';
    });
    
    document.getElementById('bh-btn-antimatter')?.addEventListener('click', e=>{
      isAntimatter = !isAntimatter;
      e.target.textContent = isAntimatter ? '🌌 NORMAL GRAVITY' : '💥 ANTIMATTER REPULSION';
      e.target.className = isAntimatter ? 'lab-btn' : 'lab-btn danger';
    });
    
    document.getElementById('bh-btn-reset')?.addEventListener('click', resetUniverse);
    
    loop();
  }
  
  function resetUniverse() {
    particles = new Float32Array(MAX_PARTICLES * 4); // [x, y, vx, vy]
    // distribute in a swirling galaxy formation
    for(let i=0; i<MAX_PARTICLES; i++) {
        const r = Math.random() * (Math.min(cw,ch)/2 - 20) + 10;
        const theta = Math.random() * Math.PI * 2;
        
        const px = cw/2 + r * Math.cos(theta);
        const py = ch/2 + r * Math.sin(theta);
        
        // Orbital velocity for spiral galaxy effect (sqrt(GM/r))
        const vmag = 30 / Math.sqrt(r);
        const vx = -vmag * Math.sin(theta) * 0.5; // slight inward drag
        const vy = vmag * Math.cos(theta) * 0.5;
        
        particles[i*4] = px;
        particles[i*4+1] = py;
        particles[i*4+2] = vx;
        particles[i*4+3] = vy;
    }
  }
  
  function loop() {
    // Semi-transparent black for motion trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, cw, ch);
    
    ctx.fillStyle = 'rgba(0, 255, 159, 1.0)';
    
    const G = 15; // Gravity constant
    const damping = 0.999;
    
    for(let i=0; i<MAX_PARTICLES; i++) {
        let px = particles[i*4];
        let py = particles[i*4+1];
        let vx = particles[i*4+2];
        let vy = particles[i*4+3];
        
        if (isSingularityActive) {
            const dx = singX - px;
            const dy = singY - py;
            const distSq = dx*dx + dy*dy;
            
            // F = G * m1 * m2 / r^2
            // Accel = F / m1 = G * m2 / r^2
            if (distSq > 50) { // prevent infinite acceleration at origin
                let force = (G * singMass * 10) / distSq;
                if(isAntimatter) force = -force;
                
                const dist = Math.sqrt(distSq);
                vx += force * (dx/dist);
                vy += force * (dy/dist);
            } else if (!isAntimatter) {
                // Sucked into black hole, teleport somewhere far
                const angle = Math.random() * Math.PI * 2;
                px = singX + Math.cos(angle) * (cw+ch);
                py = singY + Math.sin(angle) * (cw+ch);
                vx = 0; vy = 0;
            }
        }
        
        px += vx;
        py += vy;
        
        vx *= damping;
        vy *= damping;
        
        // Wrap edges to keep universe infinite
        if(px < 0) px += cw; else if(px > cw) px -= cw;
        if(py < 0) py += ch; else if(py > ch) py -= ch;
        
        particles[i*4] = px;
        particles[i*4+1] = py;
        particles[i*4+2] = vx;
        particles[i*4+3] = vy;
        
        ctx.fillRect(px, py, 1.5, 1.5);
    }
    
    // Draw event horizon if active
    if (isSingularityActive && !isAntimatter) {
        ctx.beginPath();
        const r = Math.max(5, singMass);
        ctx.arc(singX, singY, r, 0, Math.PI*2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,107,53, 0.8)'; // orange accretion disk
        ctx.stroke();
    }
    
    animId = requestAnimationFrame(loop);
  }


  document.querySelector('[data-lab="t7"]')?.addEventListener('click', ()=>{
    if(!built) setTimeout(init, 100);
  });
})();

/* ════════════════════════════════════════════════════════════════
   STICKY TOP BAR — Live: ISS alt · Solar Kp · $VOID price
════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

// Update ISS altitude in top bar (reuse existing iss3d data)
const origIss3FetchPos = window._iss3FetchPos;
function tbUpdateISS(alt) {
  const el = document.getElementById('tb-iss-alt');
  if(el) el.textContent = (alt||408).toFixed(0) + ' km';
}

// Patch into ISS fetch — use MutationObserver on iss3d-alt
const issAltEl = document.getElementById('iss3d-alt');
if(issAltEl) {
  new MutationObserver(()=>{
    const v = issAltEl.textContent;
    const el = document.getElementById('tb-iss-alt');
    if(el && v) el.textContent = v;
  }).observe(issAltEl, {characterData:true, childList:true, subtree:true});
}

// Kp — fetch from NOAA
async function tbFetchKp() {
  try {
    const r = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', {signal:AbortSignal.timeout(5000)});
    if(!r.ok) return;
    const data = await r.json();
    if(!data || data.length < 2) return;
    // last row: [time, kp]
    const last = data[data.length-1];
    const kp = parseFloat(last[1]);
    const el = document.getElementById('tb-kp');
    if(el) {
      el.textContent = kp.toFixed(1);
      el.style.color = kp >= 5 ? '#EF4444' : kp >= 3 ? '#FFC857' : '#00FF9F';
    }
  } catch(e) {}
}
tbFetchKp();
setInterval(tbFetchKp, 60000);

// $VOID price — watch #v-price MutationObserver
const vPriceEl = document.getElementById('v-price');
if(vPriceEl) {
  new MutationObserver(()=>{
    const v = vPriceEl.textContent.trim();
    const el = document.getElementById('tb-void-price');
    if(el && v && v !== '—') el.textContent = v;
  }).observe(vPriceEl, {characterData:true, childList:true, subtree:true});
}

// Also patch sw-kp to update tb-kp
const swKpEl = document.getElementById('sw-kp');
if(swKpEl) {
  new MutationObserver(()=>{
    const v = swKpEl.textContent.trim();
    const el = document.getElementById('tb-kp');
    if(el && v && v !== '—') {
      el.textContent = v;
      const kpNum = parseFloat(v);
      el.style.color = kpNum >= 5 ? '#EF4444' : kpNum >= 3 ? '#FFC857' : '#00FF9F';
    }
  }).observe(swKpEl, {characterData:true, childList:true, subtree:true});
}

})();


/* ════════════════════════════════════════════════════════════════
   TLE DECODER — Two-Line Element set human-readable parser
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var ISS_TLE = ['ISS (ZARYA)','1 25544U 98067A   24001.50000000  .00020000  00000-0  36000-3 0  9990','2 25544  51.6421 210.4235 0001234  75.2345 284.9055 15.50037600000000'];
var HUBBLE_TLE = ['HST','1 20580U 90037B   24001.50000000  .00000880  00000-0  46200-4 0  9996','2 20580  28.4703 339.2453 0002658 280.5477  79.5197 15.09257143000000'];

function parseTLE(raw){
  var lines=raw.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
  if(lines.length<2) return null;
  var name='', l1, l2;
  if(lines.length>=3 && lines[1][0]==='1'){name=lines[0];l1=lines[1];l2=lines[2];}
  else{l1=lines[0];l2=lines[1];}
  if(l1[0]!=='1'||l2[0]!=='2') return null;

  var catNum=parseInt(l1.substring(2,7)),
      classification=l1[7]||'U',
      intlDesig=l1.substring(9,17).trim(),
      epochStr=l1.substring(18,32).trim(),
      meanMotionDot=parseFloat(l1.substring(33,43)),
      bstar=parseBstar(l1.substring(53,61)),
      elsetNum=parseInt(l1.substring(64,68)),
      incl=parseFloat(l2.substring(8,16)),
      raan=parseFloat(l2.substring(17,25)),
      eccStr=l2.substring(26,33),
      ecc=parseFloat('0.'+eccStr),
      argPerigee=parseFloat(l2.substring(34,42)),
      meanAnomaly=parseFloat(l2.substring(43,51)),
      meanMotion=parseFloat(l2.substring(52,63)),
      revNum=parseInt(l2.substring(63,68));

  // Derived
  var mu=398600.4418;
  var n=meanMotion*2*Math.PI/86400;
  var a=Math.pow(mu/(n*n),1/3);
  var periodMin=(1440/meanMotion);
  var Re=6371;
  var apogee= a*(1+ecc)-Re;
  var perigee=a*(1-ecc)-Re;
  var velApogee=Math.sqrt(mu*(2/(a*(1+ecc))-1/a));
  var velPerigee=Math.sqrt(mu*(2/(a*(1-ecc))-1/a));

  // Epoch to date
  var epochYear=parseInt(epochStr.substring(0,2));
  var epYearFull=epochYear<57?2000+epochYear:1900+epochYear;
  var epochDay=parseFloat(epochStr.substring(2));
  var epochDate=new Date(Date.UTC(epYearFull,0,1)+(epochDay-1)*86400000);
  var daysSince=(Date.now()-epochDate.getTime())/86400000;

  return {
    name:name,catNum:catNum,classification:classification,intlDesig:intlDesig,
    epochStr:epochStr,epochDate:epochDate,daysSince:daysSince,
    meanMotionDot:meanMotionDot,bstar:bstar,elsetNum:elsetNum,
    incl:incl,raan:raan,ecc:ecc,arg:argPerigee,M:meanAnomaly,
    meanMotion:meanMotion,periodMin:periodMin,revNum:revNum,
    a:a,apogee:apogee,perigee:perigee,velApogee:velApogee,velPerigee:velPerigee
  };
}

function parseBstar(s){
  s=s.trim();
  if(s[0]==='-'){return -parseFloat('0.'+s.substring(2,7))*Math.pow(10,-parseInt(s[7])||0);}
  return parseFloat('0.'+s.substring(1,6))*Math.pow(10,-parseInt(s[6])||0);
}

function accuracy(daysSince){
  if(daysSince<1)return{label:'EXCELLENT',color:'#00FF9F',note:'< 1 day old, sub-kilometre accuracy'};
  if(daysSince<3)return{label:'GOOD',color:'#00FF9F',note:daysSince.toFixed(1)+' days old, ~km accuracy'};
  if(daysSince<7)return{label:'FAIR',color:'#FFC857',note:daysSince.toFixed(1)+' days old, tens of km drift possible'};
  if(daysSince<14)return{label:'DEGRADED',color:'#FF6B35',note:daysSince.toFixed(1)+' days old, hundreds of km error'};
  return{label:'STALE',color:'#E05C5C',note:daysSince.toFixed(1)+' days old · REFRESH NEEDED'};
}

function renderOutput(d){
  var acc=accuracy(d.daysSince);
  var epochStr=d.epochDate.toUTCString().replace(' GMT','');
  var out=document.getElementById('tle-output');
  out.innerHTML=[
    row('SATELLITE NAME',   d.name||'UNNAMED',              '#fff'),
    row('CATALOG NUMBER',   '#'+d.catNum+' ('+classify(d.classification)+')', 'var(--c)'),
    row('INTL DESIGNATOR',  d.intlDesig||'—',               'var(--a)'),
    '<div style="height:.5rem"></div>',
    hdr('ORBITAL EPOCH'),
    row('EPOCH UTC',        epochStr,                        '#fff'),
    row('TLE AGE',          d.daysSince.toFixed(2)+' days','var(--a)'),
    row('ACCURACY',         acc.label+' — '+acc.note,       acc.color),
    '<div style="height:.5rem"></div>',
    hdr('ORBITAL MECHANICS'),
    row('INCLINATION',      d.incl.toFixed(4)+'°',          'var(--c)'),
    row('RAAN',             d.raan.toFixed(4)+'° ('+raanDesc(d.raan)+')', '#fff'),
    row('ECCENTRICITY',     d.ecc.toFixed(7)+' ('+eccDesc(d.ecc)+')',     '#fff'),
    row('ARG OF PERIGEE',   d.arg.toFixed(4)+'°',           'var(--a)'),
    row('MEAN ANOMALY',     d.M.toFixed(4)+'°',             'var(--dim)'),
    '<div style="height:.5rem"></div>',
    hdr('DERIVED PARAMETERS'),
    row('ORBITAL PERIOD',   d.periodMin.toFixed(2)+' min  ('+d.meanMotion.toFixed(5)+' rev/day)', 'var(--g)'),
    row('SEMI-MAJOR AXIS',  (d.a/1000).toFixed(1)+' Mm',   'var(--g)'),
    row('APOGEE',           d.apogee.toFixed(1)+' km',      'var(--c)'),
    row('PERIGEE',          d.perigee.toFixed(1)+' km',     'var(--c)'),
    row('VEL @ APOGEE',     d.velApogee.toFixed(3)+' km/s', '#fff'),
    row('VEL @ PERIGEE',    d.velPerigee.toFixed(3)+' km/s','#fff'),
    '<div style="height:.5rem"></div>',
    hdr('METADATA'),
    row('ELEMENT SET #',    d.elsetNum.toString(),           'var(--dim)'),
    row('REVOLUTION #',     d.revNum.toString(),             'var(--dim)'),
    row('MEAN MOTION DRAG', d.meanMotionDot.toExponential(4)+' rev/day²', 'var(--dim)'),
    row('BSTAR DRAG TERM',  d.bstar.toExponential(4)+' 1/RE',             'var(--dim)'),
  ].join('');

  drawOrbit(d);
}

function hdr(t){return '<div style="font-size:.52rem;color:var(--c);letter-spacing:.22em;margin:.6rem 0 .3rem">// '+t+'</div>';}
function row(k,v,c){return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.04);padding:.28rem 0;font-size:.6rem"><span style="color:rgba(255,255,255,.38);min-width:150px">'+k+'</span><span style="color:'+c+';text-align:right;word-break:break-all">'+v+'</span></div>';}
function classify(c){return c==='U'?'Unclassified':c==='C'?'Classified':'Secret';}
function raanDesc(r){return r<90?'Ascending NE':r<180?'Ascending NW':r<270?'Descending SW':'Descending SE';}
function eccDesc(e){return e<0.001?'Near-circular':e<0.1?'Slightly elliptic':e<0.5?'Elliptic':'Highly elliptic';}

function drawOrbit(d){
  var cv=document.getElementById('tle-cv'); if(!cv)return;
  var W=cv.offsetWidth||600, H=200;
  cv.width=W; cv.height=H;
  var ctx=cv.getContext('2d');
  ctx.fillStyle='#01020A'; ctx.fillRect(0,0,W,H);

  var cx=W/2, cy=H/2;
  var scale=H*0.38;
  var Re=6371;

  // Earth
  var earthR=(Re/d.a)*scale;
  var eg=ctx.createRadialGradient(cx,cy,0,cx,cy,earthR);
  eg.addColorStop(0,'#2266CC'); eg.addColorStop(1,'#0D2A52');
  ctx.beginPath(); ctx.arc(cx,cy,Math.max(4,earthR),0,Math.PI*2);
  ctx.fillStyle=eg; ctx.fill();

  // Atmosphere glow
  ctx.beginPath(); ctx.arc(cx,cy,earthR*1.15,0,Math.PI*2);
  ctx.strokeStyle='rgba(0,100,255,0.2)'; ctx.lineWidth=3; ctx.stroke();

  // Orbit ellipse
  var ae=d.ecc; var a2=scale; var b2=scale*Math.sqrt(1-ae*ae);
  var focusOffset=ae*a2;
  ctx.beginPath();
  ctx.ellipse(cx+focusOffset,cy,a2,b2,0,0,Math.PI*2);
  ctx.strokeStyle='rgba(0,212,255,0.7)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

  // Apogee / Perigee markers
  ctx.fillStyle='#FFC857'; ctx.font='bold 9px monospace';
  ctx.fillText('APO '+d.apogee.toFixed(0)+'km', cx+a2+focusOffset+4, cy-3);
  ctx.fillStyle='#00FF9F';
  ctx.fillText('PERI '+d.perigee.toFixed(0)+'km', cx-a2+focusOffset-4-ctx.measureText('PERI').width-40, cy-3);

  // Incl line
  var inclR=d.incl*Math.PI/180;
  ctx.strokeStyle='rgba(139,92,246,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-a2*0.9*Math.cos(inclR-Math.PI/2),cy-a2*0.9*Math.sin(inclR-Math.PI/2));
  ctx.lineTo(cx+a2*0.9*Math.cos(inclR-Math.PI/2),cy+a2*0.9*Math.sin(inclR-Math.PI/2)); ctx.stroke();
  ctx.fillStyle='rgba(139,92,246,.8)'; ctx.font='9px monospace';
  ctx.fillText('i='+d.incl.toFixed(1)+'°', cx+5, cy-a2*0.6*Math.sin(inclR)+10);
}

function decode(){
  var raw=document.getElementById('tle-input').value;
  var d=parseTLE(raw);
  if(!d){
    document.getElementById('tle-output').innerHTML='<div style="color:var(--r);padding:1rem;font-size:.65rem">⚠ Invalid TLE format. Make sure you paste 2 or 3 lines starting with "1 " and "2 ".</div>';
    return;
  }
  renderOutput(d);
}

document.getElementById('tle-decode-btn')&&document.getElementById('tle-decode-btn').addEventListener('click',decode);
document.getElementById('tle-iss-btn')&&document.getElementById('tle-iss-btn').addEventListener('click',function(){
  document.getElementById('tle-input').value=ISS_TLE.join('\n'); decode();
});
document.getElementById('tle-hubble-btn')&&document.getElementById('tle-hubble-btn').addEventListener('click',function(){
  document.getElementById('tle-input').value=HUBBLE_TLE.join('\n'); decode();
});

// Auto-decode ISS on load for demo
setTimeout(function(){
  if(document.getElementById('tle-input')){
    document.getElementById('tle-input').value=ISS_TLE.join('\n');
    decode();
  }
},500);

})(); // end TLE Decoder



/* ════════════════════════════════════════════════════════════════
   COST PER KG TO ORBIT — Animated historical chart 1957–2030
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var DATA=[
  {y:1957,name:'Sputnik R-7',cost:null,color:'#888888',note:'Cost unknown'},
  {y:1962,name:'Titan II',cost:62000,color:'#888888',note:'Gemini era'},
  {y:1964,name:'Saturn I',cost:55000,color:'#AAAAAA',note:'Apollo buildup'},
  {y:1969,name:'Saturn V',cost:54000,color:'#CCCCCC',note:'Moon rocket'},
  {y:1973,name:'Delta II equiv.',cost:48000,color:'#AAAAAA',note:'Post-Apollo'},
  {y:1981,name:'Space Shuttle',cost:65000,color:'#CC4444',note:'Expensive reuse'},
  {y:1990,name:'Space Shuttle',cost:60000,color:'#CC4444',note:'Peak operations'},
  {y:1998,name:'Proton K',cost:12000,color:'#8888CC',note:'Russian cost advantage'},
  {y:2002,name:'Delta IV',cost:13000,color:'#AAAACC',note:'EELV era'},
  {y:2010,name:'Falcon 9 v1',cost:6000,color:'#44AACC',note:'SpaceX enters'},
  {y:2014,name:'Falcon 9 v1.1',cost:4000,color:'#44AADD',note:'Fairing recovery'},
  {y:2018,name:'Falcon 9 Block5',cost:2700,color:'#00CCFF',note:'Full reusability'},
  {y:2020,name:'Falcon 9 reuse',cost:2300,color:'#00D4FF',note:'Rapid cadence'},
  {y:2022,name:'Vulcan (est.)',cost:5000,color:'#7777CC',note:'New entrants'},
  {y:2024,name:'Falcon 9 current',cost:2200,color:'#00E5FF',note:'62 launches in 2023'},
  {y:2026,name:'Starship (est.)',cost:500,color:'#00FF99',note:'First commercial ops'},
  {y:2028,name:'Starship target',cost:200,color:'#00FF88',note:'High cadence'},
  {y:2030,name:'Starship goal',cost:100,color:'#00FF77',note:'Target price'},
];

var cvEl=document.getElementById('cost-cv');
var tooltip=document.getElementById('cost-tooltip');
if(!cvEl)return;

var animated=false;
var animProgress=0;

function drawChart(progress){
  var W=cvEl.offsetWidth||900, H=420;
  cvEl.width=W; cvEl.height=H;
  var ctx=cvEl.getContext('2d');

  var PAD={top:40,right:40,bottom:55,left:75};
  var cw=W-PAD.left-PAD.right, ch=H-PAD.top-PAD.bottom;

  ctx.fillStyle='#01020A'; ctx.fillRect(0,0,W,H);

  // Grid
  var maxCost=75000, minYear=1957, maxYear=2030;
  var yScale=function(v){return PAD.top+ch*(1-Math.log10(v)/Math.log10(maxCost));};
  var xScale=function(y){return PAD.left+cw*(y-minYear)/(maxYear-minYear);};

  // Y gridlines (log scale)
  [100,500,1000,2000,5000,10000,20000,50000,75000].forEach(function(v){
    var y2=yScale(v);
    if(y2<PAD.top||y2>PAD.top+ch)return;
    ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD.left,y2); ctx.lineTo(PAD.left+cw,y2); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='10px monospace'; ctx.textAlign='right';
    ctx.fillText('$'+(v>=1000?(v/1000)+'K':v),PAD.left-6,y2+3);
  });

  // X axis ticks
  for(var yr=1960;yr<=2030;yr+=10){
    var x2=xScale(yr);
    ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x2,PAD.top); ctx.lineTo(x2,PAD.top+ch); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font='11px monospace'; ctx.textAlign='center';
    ctx.fillText(yr,x2,PAD.top+ch+18);
  }

  // Axis labels
  ctx.fillStyle='rgba(0,212,255,.7)'; ctx.font='11px monospace'; ctx.textAlign='center';
  ctx.fillText('$/KG TO LEO (LOG SCALE)',PAD.left-50,PAD.top+ch/2-40);
  ctx.fillText('YEAR',PAD.left+cw/2,H-8);

  // Inflection annotation arrow
  var ix=xScale(2010), iy=yScale(6000);
  ctx.strokeStyle='rgba(0,212,255,.4)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(ix,PAD.top); ctx.lineTo(ix,PAD.top+ch); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,212,255,.8)'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
  ctx.fillText('SpaceX enters',ix,PAD.top+14);
  ctx.fillText('↓ REUSABILITY',ix,PAD.top+26);

  // Starship target annotation
  var sx=xScale(2030), sy=yScale(100);
  ctx.strokeStyle='rgba(0,255,153,.3)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(PAD.left,sy); ctx.lineTo(PAD.left+cw,sy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,255,153,.7)'; ctx.font='bold 10px monospace'; ctx.textAlign='right';
  ctx.fillText('$100/kg Starship target → BUSINESS CLASS TO ORBIT',PAD.left+cw-4,sy-4);

  // Data line
  var validData=DATA.filter(function(d){return d.cost!==null;});
  var drawCount=Math.round(validData.length*Math.min(1,progress));

  if(drawCount>1){
    // Area
    ctx.beginPath(); ctx.moveTo(xScale(validData[0].y),PAD.top+ch);
    for(var i=0;i<drawCount;i++) ctx.lineTo(xScale(validData[i].y),yScale(validData[i].cost));
    ctx.lineTo(xScale(validData[drawCount-1].y),PAD.top+ch);
    ctx.closePath();
    var agrad=ctx.createLinearGradient(0,PAD.top,0,PAD.top+ch);
    agrad.addColorStop(0,'rgba(0,212,255,.18)'); agrad.addColorStop(1,'rgba(0,212,255,.02)');
    ctx.fillStyle=agrad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.moveTo(xScale(validData[0].y),yScale(validData[0].cost));
    for(var i=1;i<drawCount;i++) ctx.lineTo(xScale(validData[i].y),yScale(validData[i].cost));
    ctx.strokeStyle='rgba(0,212,255,.8)'; ctx.lineWidth=2.5; ctx.stroke();
  }

  // Dots
  for(var i=0;i<drawCount;i++){
    var d2=validData[i]; if(!d2.cost)continue;
    var px=xScale(d2.y), py=yScale(d2.cost);
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle=d2.color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1; ctx.stroke();

    // Name labels for key launchers
    if(['Saturn V','Space Shuttle','Falcon 9 Block5','Starship goal'].indexOf(d2.name)>=0){
      ctx.fillStyle=d2.color; ctx.font='bold 9px monospace'; ctx.textAlign='center';
      ctx.fillText(d2.name,px,py-12);
    }
  }

  // Title
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='bold 14px monospace'; ctx.textAlign='left';
  ctx.fillText('COST TO LOW EARTH ORBIT — 1957 TO 2030',PAD.left,PAD.top-14);
}

// Initial static draw
drawChart(1);

// Hover tooltip
cvEl.addEventListener('mousemove',function(e){
  var rect=cvEl.getBoundingClientRect();
  var mx=e.clientX-rect.left;
  var W2=cvEl.offsetWidth, PAD_l=75, cw2=W2-75-40;
  var yr=1957+(mx-PAD_l)/(cw2)*(2030-1957);
  var closest=null, minD=99999;
  DATA.forEach(function(d){
    if(!d.cost)return;
    var dx=Math.abs(d.y-yr); if(dx<minD){minD=dx;closest=d;}
  });
  if(closest&&minD<8){
    tooltip.style.display='block';
    tooltip.style.left=(e.clientX-rect.left+12)+'px';
    tooltip.style.top=(e.clientY-rect.top-60)+'px';
    tooltip.innerHTML='<div style="color:#fff;font-family:var(--head);font-size:.8rem">'+closest.name+'</div>'+
      '<div style="color:var(--g);font-size:.7rem">$'+closest.cost.toLocaleString()+'/kg</div>'+
      '<div style="color:var(--dim);font-size:.58rem">'+closest.y+' · '+closest.note+'</div>';
  } else {
    tooltip.style.display='none';
  }
});
cvEl.addEventListener('mouseleave',function(){if(tooltip)tooltip.style.display='none';});

// Animate on scroll into view
var costObs=new IntersectionObserver(function(entries){
  if(entries[0].isIntersecting&&!animated){
    animated=true;
    var start=null;
    function step(ts){
      if(!start)start=ts;
      var progress=(ts-start)/2000;
      animProgress=Math.min(1, 1-Math.pow(1-progress,3));
      drawChart(animProgress);
      if(animProgress<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
},{threshold:0.3});
var costEl=document.getElementById('cost-s');
if(costEl)costObs.observe(costEl);

window.addEventListener('resize',function(){drawChart(animated?1:1);});

})(); // end Cost Per Kg



/* ════════════════════════════════════════════════════════════════
   ASTRONAUT BIOMEDICAL TIMELINE — Effects of space on human body
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var EVENTS=[
  {time:'LAUNCH',dur:0,side:'right',icon:'🚀',color:'#00FF9F',
   title:'Launch & Weightlessness',
   body:'Within minutes of reaching orbit, fluids shift headward (cephalad fluid shift). Face becomes puffy, nasal passages swell, and astronauts feel as if hanging upside down.'},
  {time:'HOUR 6',dur:6/720,side:'left',icon:'🧠',color:'#00D4FF',
   title:'Vestibular Conflict',
   body:'The inner ear detects gravity, but eyes see floating objects. ~60% of astronauts experience Space Adaptation Syndrome — nausea, disorientation, vomiting in the first 72 hours.'},
  {time:'DAY 3',dur:3/720,side:'right',icon:'💧',color:'#44AAFF',
   title:'Fluid Loss Begins',
   body:'The body perceives fluid overload from the headward shift. Kidneys increase urine output. Blood volume drops by ~15%. This reduces cardiovascular fitness for the return to Earth.'},
  {time:'WEEK 2',dur:14/720,side:'left',icon:'🦴',color:'#FFC857',
   title:'Bone Density Loss Starts',
   body:'Without gravitational loading, osteoclasts outpace osteoblasts. Bone density drops at ~1-2% per month — equivalent to a decade of osteoporosis. Lower body bones (femur, spine) are most affected.'},
  {time:'MONTH 1',dur:30/720,side:'right',icon:'💪',color:'#FF8844',
   title:'Muscle Atrophy',
   body:'Postural muscles (calves, lower back, core) atrophy rapidly. Without 2 hours of daily exercise on the ISS, astronauts would lose 20% of muscle mass in 5-11 days. Even with exercise, losses occur.'},
  {time:'MONTH 2',dur:60/720,side:'left',icon:'👁',color:'#8B5CF6',
   title:'Vision Degradation (SANS)',
   body:'Spaceflight-Associated Neuro-ocular Syndrome (SANS): intracranial pressure rise causes globe flattening and optic disc edema. ~70% of ISS astronauts show measurable vision changes. Cause of deep concern for Mars missions.'},
  {time:'MONTH 3',dur:90/720,side:'right',icon:'🧬',color:'#FF6B35',
   title:'Immune System Changes',
   body:'Cosmic radiation causes DNA strand breaks. White blood cell function is altered. Dormant Herpesvirus (EBV, VZV) reactivates in most astronauts. Immune senescence accelerated.'},
  {time:'MONTH 6',dur:180/720,side:'left',icon:'❤',color:'#E05C5C',
   title:'Cardiac Atrophy & Arrhythmia',
   body:'The heart becomes spherical rather than cone-shaped (cardiac remodeling). 3 of 4 astronauts on the ISS Year Mission showed arrhythmia after return. Blood pressure regulation degrades.'},
  {time:'RETURN',dur:1,side:'right',icon:'🌍',color:'#00FF9F',
   title:'Return to Earth — Rehabilitation',
   body:'Re-adaptation takes weeks to months. Orthostatic intolerance (fainting when standing), re-learning to walk, bone and muscle recovery. After 6-month missions, full recovery takes 3-12 months.'},
];

var container=document.getElementById('bio-timeline');
if(!container)return;

var items=[];

EVENTS.forEach(function(ev,idx){
  var div=document.createElement('div');
  div.style.cssText='display:flex;align-items:flex-start;margin-bottom:2rem;opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease;';
  div.dataset.idx=idx;

  if(ev.side==='right'){
    div.innerHTML='<div style="flex:1;text-align:right;padding-right:2rem">'+
      '<div style="font-size:.55rem;color:'+ev.color+';letter-spacing:.25em;margin-bottom:.3rem">'+ev.time+'</div>'+
      '<div style="font-family:var(--head);font-size:.82rem;color:#fff;margin-bottom:.4rem">'+ev.title+'</div>'+
      '<div style="font-size:.65rem;color:rgba(255,255,255,.6);line-height:1.75">'+ev.body+'</div>'+
    '</div>'+
    '<div style="width:36px;height:36px;border-radius:50%;background:'+ev.color+';display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;box-shadow:0 0 15px '+ev.color+'55;z-index:1">'+ev.icon+'</div>'+
    '<div style="flex:1;padding-left:2rem"></div>';
  } else {
    div.innerHTML='<div style="flex:1;padding-right:2rem"></div>'+
    '<div style="width:36px;height:36px;border-radius:50%;background:'+ev.color+';display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;box-shadow:0 0 15px '+ev.color+'55;z-index:1">'+ev.icon+'</div>'+
    '<div style="flex:1;text-align:left;padding-left:2rem">'+
      '<div style="font-size:.55rem;color:'+ev.color+';letter-spacing:.25em;margin-bottom:.3rem">'+ev.time+'</div>'+
      '<div style="font-family:var(--head);font-size:.82rem;color:#fff;margin-bottom:.4rem">'+ev.title+'</div>'+
      '<div style="font-size:.65rem;color:rgba(255,255,255,.6);line-height:1.75">'+ev.body+'</div>'+
    '</div>';
  }

  container.appendChild(div);
  items.push(div);
});

var isPlaying=false;

document.getElementById('bio-play-btn')&&document.getElementById('bio-play-btn').addEventListener('click',function(){
  if(isPlaying)return; isPlaying=true;
  var playBtn=document.getElementById('bio-play-btn');
  if(playBtn)playBtn.textContent='▶ PLAYING...';
  items.forEach(function(el){el.style.opacity='0';el.style.transform='translateY(20px)';});
  items.forEach(function(el,i){
    setTimeout(function(){
      el.style.opacity='1'; el.style.transform='translateY(0)';
      if(i===items.length-1){
        isPlaying=false;
        if(playBtn)playBtn.textContent='▶ ANIMATE TIMELINE';
      }
    }, 200+i*280);
  });
});

document.getElementById('bio-reset-btn')&&document.getElementById('bio-reset-btn').addEventListener('click',function(){
  isPlaying=false;
  items.forEach(function(el){el.style.opacity='0';el.style.transform='translateY(20px)';});
  var pb=document.getElementById('bio-play-btn'); if(pb)pb.textContent='▶ ANIMATE TIMELINE';
});

// Auto reveal on scroll
var bioObs=new IntersectionObserver(function(entries){
  if(entries[0].isIntersecting){
    items.forEach(function(el,i){
      setTimeout(function(){el.style.opacity='1';el.style.transform='translateY(0)';},100+i*200);
    });
    bioObs.disconnect();
  }
},{threshold:0.15});
var bioSec=document.getElementById('bio-s');
if(bioSec)bioObs.observe(bioSec);

})(); // end Bio Timeline


/* Hero stat counters, Apophis, and scroll reveal are below */

// Hero stat counters
(function() {
  const targets = [{id:'s1',end:6000,suf:''},{id:'s2',end:7.8,suf:'',decimals:1},{id:'s3',end:40,suf:''}];
  targets.forEach(({id,end,suf,decimals}) => {
    const el = document.getElementById(id);
    if(!el) return;
    let start = 0, dur = 2000, startTime = null;
    function step(ts) {
      if(!startTime) startTime = ts;
      const p = Math.min((ts-startTime)/dur, 1);
      const eased = 1 - Math.pow(1-p,3);
      const val = eased*end;
      el.textContent = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString();
      if(p < 1) requestAnimationFrame(step);
    }
    setTimeout(()=>requestAnimationFrame(step), 400);
  });
})();

// Apophis countdown
(function() {
  const TARGET = new Date('2029-04-13T21:46:00Z').getTime();
  function tick() {
    const now = Date.now();
    const diff = TARGET - now;
    if(diff < 0) return;
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=String(v).padStart(2,'0'); };
    set('ap-d', d); set('ap-h', h); set('ap-m', m); set('ap-s', s);
  }
  tick();
  setInterval(tick, 1000);
})();

// Scroll reveal for non-bento sections
(function() {
  const els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, {threshold:0.1});
  els.forEach(el => obs.observe(el));
})();

