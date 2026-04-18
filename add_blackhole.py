import re

print("Adding Black Hole Gravity Simulator...")

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Add the Tab Button (Next to EXOPLANET TRANSITS)
html = html.replace(
    '<button class="lab-tab-btn"     data-lab="t6">🌟 EXOPLANET TRANSITS</button>',
    '<button class="lab-tab-btn"     data-lab="t6">🌟 EXOPLANET TRANSITS</button>\n    <button class="lab-tab-btn"     data-lab="t7">⚫ BLACK HOLE EVENT HORIZON</button>'
)

# 2. Add the Tab Content (HTML)
# We will insert it right before <div class="wrap" id="quiz-s">
bh_html = """  <!-- TOOL 7: BLACK HOLE PHYSICS -->
  <div class="lab-p" id="lab-t7">
    <div class="lab-cv-wrap full" style="margin-bottom:1rem;position:relative;background:#000;">
      <canvas id="bh-cv"></canvas>
      <div style="position:absolute;top:10px;left:12px;font-size:.65rem;color:var(--g);letter-spacing:.15em;text-shadow:0 0 5px var(--g)">GRAVITY SINK SANDBOX</div>
      <div id="bh-hint" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:1.5rem;font-family:var(--head);pointer-events:none;opacity:0.6;letter-spacing:0.2em">
        CLICK & HOLD TO SPAWN SINGULARITY
      </div>
      <div style="position:absolute;bottom:10px;left:12px;font-size:.55rem;color:var(--dim)">Particles: <span id="bh-count" style="color:var(--a)">15,000</span></div>
    </div>
    
    <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem">
      <div style="flex:1;display:flex;align-items:center;gap:.8rem;min-width:200px">
        <span style="font-size:.6rem;color:var(--dim);white-space:nowrap;width:70px">MASS (M☉)</span>
        <input type="range" class="lc-input" id="bh-mass" min="1" max="100" value="10" step="1" style="flex:1;">
        <span id="bh-mass-v" style="font-size:.6rem;color:var(--a);min-width:40px">10 M☉</span>
      </div>
      <button class="lab-btn danger" id="bh-btn-antimatter">💥 ANTIMATTER REPULSION</button>
      <button class="lab-btn secondary" id="bh-btn-reset">⟳ RESET UNIVERSE</button>
    </div>
    <p style="font-size:.65rem;color:var(--dim);margin-top:.7rem;line-height:1.7">
      This is a custom $O(n)$ 2D physics engine simulating gravitational attraction. Clicking and holding the canvas introduces a supermassive object (a Black Hole) that continuously pulls the 15,000 surrounding stellar particles toward its event horizon inversely proportional to the square of their distance.
    </p>
  </div>
"""
# Clean injection right before quiz-s wrap
html = re.sub(r'(  <!-- TOOL 6: EXOPLANET TRANSITS -->.*?</p>\n  </div>\n)(  </div>\n</div>\n\n<div class="wrap" id="quiz-s")', r'\1\n' + bh_html + r'\2', html, flags=re.DOTALL)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML updated. Now doing JS...")

# 3. Add the JS component
js_code = """
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
"""

with open("main.js", "a", encoding="utf-8") as f:
    f.write("\n" + js_code)

print("Black Hole Gravity Simulator JS injected!")
