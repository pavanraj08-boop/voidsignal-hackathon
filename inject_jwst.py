import re

#########################
# 1. Update index.html
#########################
with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

jwst_html = """
<!-- ═══════════════════════════════════════════════
     JAMES WEBB SPACE TELESCOPE (JWST) LIVE TRACKER
════════════════════════════════════════════════ -->
<section id="jwst-s" style="position:relative; width:100%; border-top:1px solid var(--bd); background:#020512; overflow:hidden;">
  <canvas id="jwst-cv" style="display:block; width:100%; height:100%; min-height:600px; touch-action:none;"></canvas>
  <div style="position:absolute; top:2rem; left:2rem; width:100%; max-width:400px; pointer-events:none;">
    <h2 style="font-family:'Outfit',sans-serif; color:var(--a); font-size:2rem; font-weight:800; margin-bottom:0.5rem; text-shadow:0 0 10px rgba(0,240,255,0.4);">JWST OBSERVATORY</h2>
    <div style="font-family:'Inter',sans-serif; color:#a0aabf; font-size:0.85rem; letter-spacing:1px; margin-bottom:1.5rem; font-weight:600;">L2 LAGRANGE POINT HALO ORBIT</div>
    
    <div class="nc" style="padding:1.5rem; background:rgba(17,24,39,0.55); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.08); border-radius:16px; margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.8rem; margin-bottom:0.8rem;">
        <span style="color:#64748b; font-size:0.75rem;">EARTH DISTANCE</span>
        <span style="color:var(--c); font-family:'JetBrains Mono',monospace; font-weight:700;">1,500,000 km</span>
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.8rem; margin-bottom:0.8rem;">
        <span style="color:#64748b; font-size:0.75rem;">SUNSHIELD TEMP</span>
        <span style="color:#f43f5e; font-family:'JetBrains Mono',monospace; font-weight:700;">+300 K</span>
      </div>
      <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.8rem; margin-bottom:0.8rem;">
        <span style="color:#64748b; font-size:0.75rem;">MIRROR TEMP</span>
        <span style="color:#38bdf8; font-family:'JetBrains Mono',monospace; font-weight:700;">+40 K</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding-bottom:0.2rem;">
        <span style="color:#64748b; font-size:0.75rem;">OBSERVING</span>
        <span style="color:#a78bfa; font-family:'JetBrains Mono',monospace; font-weight:700;">EARLY UNIVERSE IR</span>
      </div>
    </div>

    <!-- AI Overlay -->
    <div class="nc" style="background:rgba(17,24,39,0.7); border:1px solid #8b5cf6; backdrop-filter:blur(24px); border-radius:16px; padding:1.2rem; margin-top:1rem; box-shadow:0 0 20px rgba(139,92,246,0.15);">
      <div style="font-size:0.7rem; color:#8b5cf6; font-weight:800; letter-spacing:1px; margin-bottom:0.5rem; display:flex; align-items:center;">
        <span style="display:inline-block; width:6px; height:6px; background:#8b5cf6; border-radius:50%; margin-right:6px; animation:pulse 2s infinite;"></span>
        CLAUDE SYSTEM ANALYSIS
      </div>
      <div style="font-family:'Inter',serif; color:#d1d5db; font-size:0.85rem; line-height:1.5;">
        The James Webb Space Telescope does not orbit Earth. It orbits the Sun in lockstep with Earth at the L2 Lagrange Point, allowing it to maintain an unbroken "Halo" maneuver while keeping its delicate mirrors permanently shielded from solar radiation.
      </div>
    </div>
  </div>
  <div style="position:absolute; bottom:2rem; left:50%; transform:translateX(-50%); display:flex; gap:16px; z-index:10;">
    <button class="gi" id="jwst-cam-follow" style="pointer-events:auto;">FOLLOW TELESCOPE</button>
    <button class="gi" id="jwst-cam-overview" style="pointer-events:auto;">L2 SCALED OVERVIEW</button>
  </div>
</section>
"""

# Insert right before Space Weather block
if "id=\"jwst-s\"" not in html:
    insert_pos = html.find("<!-- ═══════════════════════════════════════════════\n     SPACE WEATHER")
    if insert_pos == -1:
        insert_pos = html.find('id="sw-s"')
        
    if insert_pos != -1:
        html = html[:insert_pos] + jwst_html + html[insert_pos:]
        with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Injected HTML successfully.")
    else:
        print("ERROR: Could not find insert spot in HTML")
else:
    print("JWST HTML already present.")

#########################
# 2. Update main.js
#########################
with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\main.js', 'r', encoding='utf-8') as f:
    js = f.read()

jwst_js = """
/* ════════════════════════════════════════════════════════════════
   JWST L2 TRACKER — Real-time position, Halo Orbit simulation
   Three.js r128 
════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

let scene, camera, renderer;
let earthMesh, sunLight, l2Pivot, jwstMesh, orbitLine;
let dragging = false, lastX, lastY;
let theta = Math.PI/4, phi = Math.PI/3, radius = 25;
let followMode = false;
let built = false, animId;
let tOffset = 0; // Simulation time

// Create the 18 hexagonal primary mirror segments
function buildMirrors() {
  const mirrors = new THREE.Group();
  const hexGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.05, 6);
  // Rotate slightly so pointy bit faces right way for tight packing
  hexGeo.rotateZ(Math.PI/2); 
  hexGeo.rotateY(Math.PI/2);
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xffd700, emissive: 0x332200, shininess: 120, specular: 0xffffee, roughness: 0.1, flatShading: true
  });
  
  const d = 1.15; // spacing
  const positions = [
    [0,0],
    [d,0], [-d,0], [d/2, d*0.866], [-d/2, d*0.866], [d/2, -d*0.866], [-d/2, -d*0.866], // Inner ring
    [2*d,0], [-2*d,0], [1.5*d,d*0.866], [-1.5*d,d*0.866], [1.5*d,-d*0.866], [-1.5*d,-d*0.866], // Outer ring row 1
    [d, 2*d*0.866], [-d, 2*d*0.866], [d, -2*d*0.866], [-d, -2*d*0.866], // Outer ring row 2
    [0, 2*d*0.866], [0, -2*d*0.866] // Outer ring row 3
  ];

  // JWST only has 18 mirrors (honeycomb structure misses the center one, so we skip index 0!)
  for(let i=1; i<positions.length; i++){
    if(positions[i][1] === 2*d*0.866 && positions[i][0] === 0) continue; // top and bottom centers are full, center is empty
    if(i === 0) continue; // Center hole
    
    // Just place 18 mirrors in an approximate hex pattern
    if(mirrors.children.length < 18) {
        const mesh = new THREE.Mesh(hexGeo, goldMat);
        mesh.position.set(positions[i][0], positions[i][1], 0.1);
        mesh.rotation.x = Math.PI/2;
        mirrors.add(mesh);
    }
  }
  
  // Secondary mirror boom
  const boomMat = new THREE.MeshPhongMaterial({color: 0x222222});
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), goldMat);
  sm.position.set(0, 0, 3);
  sm.rotation.x = Math.PI/2;
  mirrors.add(sm);
  
  // Arms
  [[0,1.5,0], [1.3,-0.75,0], [-1.3,-0.75,0]].forEach(p => {
     const armGeo = new THREE.BufferGeometry().setFromPoints([
       new THREE.Vector3(p[0], p[1], 0), new THREE.Vector3(0,0,3)
     ]);
     const arm = new THREE.Line(armGeo, new THREE.LineBasicMaterial({color:0x333333, linewidth:2}));
     mirrors.add(arm);
  });

  return mirrors;
}

// Create the iconic 5-layer silver sunshield
function buildSunshield() {
  const shield = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({
    color: 0xddddff, specular: 0x9999ff, shininess: 80, side: THREE.DoubleSide
  });
  
  for(let i=0; i<5; i++){
    const w = 10 - i*0.4;
    const h = 6 - i*0.2;
    // Diamond shape
    const shape = new THREE.Shape();
    shape.moveTo(0, h/2);
    shape.lineTo(w/2, 0);
    shape.lineTo(0, -h/2);
    shape.lineTo(-w/2, 0);
    shape.moveTo(0, h/2);
    
    const geo = new THREE.ShapeGeometry(shape);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI/2;
    m.position.set(0, -0.5 - i*0.15, 0);
    shield.add(m);
  }
  return shield;
}

function buildTelescope() {
  const t = new THREE.Group();
  t.add(buildMirrors());
  t.add(buildSunshield());
  // Base bus
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshPhongMaterial({color:0x444455}));
  bus.position.set(0, -1.2, 0);
  t.add(bus);
  return t;
}

function updateCam() {
  camera.position.set(
    radius*Math.sin(phi)*Math.cos(theta),
    radius*Math.cos(phi),
    radius*Math.sin(phi)*Math.sin(theta)
  );
  if(followMode && jwstMesh){
      const l2World = new THREE.Vector3();
      l2Pivot.getWorldPosition(l2World);
      const jwstWorld = new THREE.Vector3();
      jwstMesh.getWorldPosition(jwstWorld);
      
      camera.position.add(jwstWorld);
      camera.lookAt(jwstWorld);
  } else {
      camera.lookAt(0,0,0);
  }
}

function buildScene() {
  if(built) return;
  built = true;

  const cv = document.getElementById('jwst-cv');
  if(!cv) return;
  const W = cv.parentElement.offsetWidth || 1000;
  const H = Math.max(600, W*0.5);
  cv.width = W; cv.height = H;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020512);

  camera = new THREE.PerspectiveCamera(40, W/H, 0.1, 5000);
  renderer = new THREE.WebGLRenderer({canvas:cv, antialias:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  // Lighting (Super bright sun from +X axis)
  scene.add(new THREE.AmbientLight(0x111122));
  sunLight = new THREE.DirectionalLight(0xffffee, 2);
  sunLight.position.set(500, 0, 0); // Sun is far away
  scene.add(sunLight);
  
  // Stars background
  const sp=new Float32Array(2000*3),sc=new Float32Array(2000*3);
  for(let i=0;i<2000;i++){
    const th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1),r=800+Math.random()*200;
    sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=r*Math.cos(ph);sp[i*3+2]=r*Math.sin(ph)*Math.sin(th);
    sc[i*3]=.9;sc[i*3+1]=.9;sc[i*3+2]=1;
  }
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));sg.setAttribute('color',new THREE.BufferAttribute(sc,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:.6,vertexColors:true})));

  // Earth
  const earthGeo = new THREE.SphereGeometry(2.5, 32, 32);
  const earthMat = new THREE.MeshPhongMaterial({color: 0x1144aa, emissive: 0x001133});
  earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.position.set(0,0,0);
  scene.add(earthMesh);
  
  // L2 Pivot (Always opposite the sun relative to Earth, but for simulation Earth is origin, Sun is +X)
  // L2 is at -X. Distance to L2 is 1.5 million km. Scaled here to -20
  l2Pivot = new THREE.Group();
  l2Pivot.position.set(-20, 0, 0);
  scene.add(l2Pivot);

  // Draw the Halo Orbit Path around L2
  const pts = [];
  for(let i=0; i<=200; i++){
      const t = (i/200) * Math.PI*2;
      // Lissajous curve
      pts.push(new THREE.Vector3(
          Math.sin(t*2) * 2, // X-oscillation
          Math.sin(t) * 4,   // Y-oscillation (z-axis in space)
          Math.cos(t) * 5    // Z-oscillation
      ));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
  orbitLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color: 0x8b5cf6, transparent:true, opacity:0.4}));
  l2Pivot.add(orbitLine);

  // JWST Spacecraft
  jwstMesh = buildTelescope();
  // scale telescope so it's visible but not huge
  jwstMesh.scale.set(0.6, 0.6, 0.6);
  l2Pivot.add(jwstMesh);

  // Controls
  cv.addEventListener('mousedown', e=>{dragging=true; lastX=e.clientX; lastY=e.clientY;});
  window.addEventListener('mouseup', ()=>dragging=false);
  cv.addEventListener('mousemove', e=>{
    if(!dragging) return;
    theta -= (e.clientX-lastX)*0.005;
    phi = Math.max(0.05, Math.min(Math.PI-0.05, phi-(e.clientY-lastY)*0.005));
    lastX=e.clientX; lastY=e.clientY; updateCam();
  });
  cv.addEventListener('wheel', e=>{
    radius = Math.max(10, Math.min(150, radius*(1+e.deltaY*0.001)));
    updateCam(); e.preventDefault();
  });

  document.getElementById('jwst-cam-overview')?.addEventListener('click', ()=>{
      followMode = false; radius=25; phi=Math.PI/3; theta=Math.PI/4; updateCam();
  });
  document.getElementById('jwst-cam-follow')?.addEventListener('click', ()=>{
      followMode = true; radius=12; phi=Math.PI/2; theta=0; updateCam();
  });

  updateCam();

  function loop(){
    // Rotate Earth for life
    earthMesh.rotation.y += 0.002;
    
    // Orbit JWST
    tOffset += 0.003;
    jwstMesh.position.set(
        Math.sin(tOffset*2) * 2,
        Math.sin(tOffset) * 4,
        Math.cos(tOffset) * 5
    );
    // Orient JWST to always point sunshield toward sun (+X)
    jwstMesh.lookAt(new THREE.Vector3(500,0,0).sub(l2Pivot.getWorldPosition(new THREE.Vector3())));
    
    updateCam();
    renderer.render(scene, camera);
    animId = requestAnimationFrame(loop);
  }
  loop();
}

// Lazy Load Intersection Observer
(function() {
  const el = document.getElementById('jwst-s');
  if(!el) return;
  new IntersectionObserver(entries => {
    if(entries[0].isIntersecting && !built) {
      if(typeof THREE !== 'undefined') buildScene();
      else {
        let attempts = 0;
        const t = setInterval(()=>{
          if(typeof THREE !== 'undefined'){ clearInterval(t); buildScene(); }
          if(++attempts > 30) clearInterval(t);
        }, 200);
      }
    }
  }, {threshold: 0.1}).observe(el);
})();

})(); // end JWST IIFE
"""

if "JWST L2 TRACKER" not in js:
    insert_pos = js.find("})(); // end ISS 3D IIFE")
    if insert_pos != -1:
        insert_pos += len("})(); // end ISS 3D IIFE")
        js = js[:insert_pos] + "\n\n" + jwst_js + js[insert_pos:]
        with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\main.js', 'w', encoding='utf-8') as f:
            f.write(js)
        print("Injected JS successfully.")
    else:
        print("ERROR: Could not find insert spot in JS")
else:
    print("JWST JS already present.")
