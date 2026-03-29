import re

print("Adding Exoplanet Transit Simulator...")

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add the Tab Button
html = html.replace(
    '<button class="lab-tab-btn"     data-lab="t5">☄ APOPHIS 2029</button>',
    '<button class="lab-tab-btn"     data-lab="t5">☄ APOPHIS 2029</button>\n    <button class="lab-tab-btn"     data-lab="t6">🌟 EXOPLANET TRANSITS</button>'
)

# 2. Add the Tab Content (HTML)
# We will insert it right after the closing </div> of lab-t5
et_html = """
  <!-- TOOL 6: EXOPLANET TRANSITS -->
  <div class="lab-p" id="lab-t6">
    <div class="lab-cv-wrap full" style="margin-bottom:1rem;position:relative">
      <canvas id="et-cv"></canvas>
      <div style="position:absolute;top:10px;left:12px;font-size:.65rem;color:var(--p);letter-spacing:.15em;text-shadow:0 0 5px var(--p)">EXOPLANET TRANSIT OBSERVATION</div>
      <div style="position:absolute;top:10px;right:12px;font-size:.55rem;color:var(--dim)">Drag to rotate · Scroll to orbit scale</div>
      
      <!-- Live Light Curve Graph -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:120px;background:rgba(1,2,10,0.85);border-top:1px solid var(--p);padding:10px;display:flex;flex-direction:column">
        <div style="font-size:.58rem;color:var(--p);letter-spacing:.15em;margin-bottom:5px;display:flex;justify-content:space-between">
          <span>RELATIVE FLUX (STAR BRIGHTNESS)</span>
          <span id="et-flux-val" style="color:#fff">100.00%</span>
        </div>
        <div style="flex:1;position:relative" id="et-graph-wrap">
          <canvas id="et-graph-cv" style="width:100%;height:100%"></canvas>
          <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(139,92,246,0.3);pointer-events:none;border-top:1px dashed rgba(139,92,246,0.5)"></div>
        </div>
      </div>
    </div>
    
    <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem">
      <div style="flex:1;display:flex;align-items:center;gap:.8rem;min-width:200px">
        <span style="font-size:.6rem;color:var(--dim);white-space:nowrap;width:70px">PLANET SIZE</span>
        <input type="range" class="lc-input" id="et-size" min="0.05" max="0.5" value="0.15" step="0.01" style="flex:1;accent-color:var(--p)">
        <span id="et-size-v" style="font-size:.6rem;color:var(--p);min-width:30px">1.5 R⊕</span>
      </div>
      <div style="flex:1;display:flex;align-items:center;gap:.8rem;min-width:200px">
        <span style="font-size:.6rem;color:var(--dim);white-space:nowrap;width:70px">ORBIT DISTANCE</span>
        <input type="range" class="lc-input" id="et-dist" min="1.1" max="4.0" value="2.0" step="0.1" style="flex:1;accent-color:var(--p)">
        <span id="et-dist-v" style="font-size:.6rem;color:var(--p);min-width:30px">0.2 AU</span>
      </div>
      <button class="lab-btn secondary" id="et-btn-reset" style="border-color:var(--p);color:var(--p)">⟳ RESET</button>
    </div>
    
    <div class="lab-readout" style="grid-template-columns:repeat(4,1fr);border-color:rgba(139,92,246,0.3)">
      <div class="lr-item"><div class="lr-label">Transit Depth</div><div class="lr-val" id="et-depth" style="color:var(--p)">2.25%</div></div>
      <div class="lr-item"><div class="lr-label">Status</div><div class="lr-val" id="et-status">OUT OF TRANSIT</div></div>
      <div class="lr-item"><div class="lr-label">Discovery Method</div><div class="lr-val">Transit Photometry</div></div>
      <div class="lr-item"><div class="lr-label">Equivalent</div><div class="lr-val" id="et-equiv" style="font-size:.58rem">Kepler-22b</div></div>
    </div>
    <p style="font-size:.65rem;color:var(--dim);margin-top:.7rem;line-height:1.7">
      When an exoplanet crosses the disk of its host star, it blocks a tiny fraction of the starlight. This incredibly slight dip in brightness (the "Light Curve") is how the Kepler and TESS missions have discovered over 4,000 worlds. Adjust the planet's size to see how it deepens the transit curve.
    </p>
  </div>
"""
# Insert before the closing </div> of lab-s
html = html.replace('  <!-- TOOL 5 -->', et_html + '\n  <!-- TOOL 5 -->')

# Actually, the original HTML has <div class="lab-p" id="lab-t5">...</div> followed by </div> for lab-s.
# Let's cleanly inject right before:
# </div>
#
# <div class="wrap" id="quiz-s"
html = re.sub(r'(  </div>\n</div>\n\n<div class="wrap" id="quiz-s")', et_html + r'\1', html)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML updated. Now doing JS...")

# 3. Add the JS component
js_code = """
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
"""

with open("main.js", "a", encoding="utf-8") as f:
    f.write("\n" + js_code)

print("Exoplanet Simulator highly-optimised JS injected!")
