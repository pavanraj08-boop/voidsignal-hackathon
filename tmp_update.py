import re

# 1. REWRITE command-center.css
css_content = """/* ════════════════════════════════════════════════════════════════
   TACTICAL COMMAND CENTER UI - CINEMATIC SCROLL
════════════════════════════════════════════════════════════════ */

body {
  margin: 0;
  padding: 0;
  background: #000;
  color: #fff;
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

/* ── LAYOUT ─────────────────────────────────────────────────── */
#content-scroll {
  position: relative;
  z-index: 10;
  padding-bottom: 10vh;
}

/* Full screen fixed canvas layer */
#canvas-fixed-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  background: #000;
}

/* ── SCENE CONTAINERS ───────────────────────────────────────── */
.scene-container {
  position: absolute;
  top: 0;left: 0;
  width: 100%;height: 100%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 1.2s ease-in-out;
}
.scene-container.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

.scene-container canvas {
  display: block;
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover;
}

/* Overlay UI for specific scenes */
.scene-overlay {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 10;
  pointer-events: auto;
}

/* ── SCROLL SECTIONS ─────────────────────────────────────── */
.tac-section {
  min-height: 100vh;
  padding: 10vh 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: opacity 0.4s;
  opacity: 0.3;
}
.tac-section.active-focus {
  opacity: 1;
}
.tac-section:hover {
  opacity: 0.8;
}

.tac-header { margin-bottom: 1.5rem; }
.tac-st {
  font-family: var(--mono, monospace);
  font-size: 0.65rem;
  color: #00FF9F;
  letter-spacing: 0.2em;
  display: block;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(0,0,0,0.8);
}
.tac-sn {
  font-family: var(--head, sans-serif);
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 20px rgba(0,0,0,0.8);
}

/* ── HUD UI ELEMENTS ────────────────────────────────────────── */
.hud-panel {
  background: rgba(3, 7, 16, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 159, 0.2);
  padding: 1.2rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.hud-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-family: var(--mono, monospace);
  font-size: 0.75rem;
}
.hud-label { color: rgba(255,255,255,0.7); }
.hud-val { color: #fff; font-weight: 700; text-shadow: 0 0 8px rgba(0,0,0,0.6); }
.hud-green { color: #00FF9F; }
.hud-amber { color: #FFC857; }
.hud-cyan { color: #00d4ff; }
.hud-purple { color: #8B5CF6; }

/* AI Terminal floating */
#ai-terminal-float {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 450px;
  z-index: 1000;
  background: rgba(5, 8, 15, 0.95);
  border: 1px solid rgba(0, 212, 255, 0.4);
  border-top: 3px solid #00d4ff;
  box-shadow: 0 10px 40px rgba(0,0,0,0.9);
  border-radius: 8px;
  transform: translateY(150%);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
#ai-terminal-float.open { transform: translateY(0); }
.term-toggle-btn {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #00d4ff;
  color: #000;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s;
}
.term-toggle-btn.hidden { opacity: 0; pointer-events: none; }

@media (max-width: 900px) {
  #content-scroll > div { max-width: 90% !important; margin: 0 auto !important; }
  #ai-terminal-float { width: 90%; right: 5%; bottom: 5rem; }
}

/* Typography styles for readable texts over background */
.tac-section p {
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  font-size: 0.9rem !important;
}
"""

with open('command-center.css', 'w', encoding='utf-8') as f:
    f.write(css_content)


# 2. INJECT GSAP LOGIC INTO main.js
gsap_logic = """
/* ════════════════════════════════════════════════════════════════
   GSAP & SCROLL SCENE HANDLING
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    gsap.registerPlugin(ScrollTrigger);

    // AI Terminal
    const term = document.getElementById('ai-terminal-float');
    const btn = document.getElementById('ai-toggle-btn');
    const closeBtn = document.getElementById('ai-close-btn');
    if(btn) btn.addEventListener('click', () => { term.classList.add('open'); btn.classList.add('hidden'); document.getElementById('ti').focus(); });
    if(closeBtn) closeBtn.addEventListener('click', () => { term.classList.remove('open'); btn.classList.remove('hidden'); });

    const sections = document.querySelectorAll('.tac-section');
    const containers = document.querySelectorAll('.scene-container');

    function switchScene(sceneId) {
        containers.forEach(c => c.classList.remove('active'));
        let targetCanvas = document.getElementById(sceneId);
        if(!targetCanvas && document.getElementById(sceneId+'-canvas')) { targetCanvas = document.getElementById(sceneId+'-canvas'); }
        if(targetCanvas) targetCanvas.classList.add('active');
        window.dispatchEvent(new Event('resize'));
    }

    sections.forEach((sec, i) => {
        const sceneId = sec.getAttribute('data-scene');
        
        ScrollTrigger.create({
            trigger: sec,
            start: "top center",
            end: "bottom center",
            onEnter: () => {
                sections.forEach(s => s.classList.remove('active-focus'));
                sec.classList.add('active-focus');
                switchScene(sceneId);
            },
            onEnterBack: () => {
                sections.forEach(s => s.classList.remove('active-focus'));
                sec.classList.add('active-focus');
                switchScene(sceneId);
            }
        });
    });

    // Make hero header parallax
    gsap.to("#hero-section video", {
        yPercent: 30,
        ease: "none",
        scrollTrigger: { trigger: "#hero-section", start: "top top", end: "bottom top", scrub: true }
    });
});
"""

with open('main.js', 'a', encoding='utf-8') as f:
    f.write(gsap_logic)

# 3. FIX index.html minor tag issues if any
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
    
# Smooth scroll behavior for body 
with open('style.css', 'r', encoding='utf-8') as f:
    css2 = f.read()
css2 = re.sub(r'body\{.*?\}', 'body{background:var(--bg);color:#fff;font-family:var(--mono);overflow-x:hidden;cursor:crosshair;text-rendering:optimizeLegibility}', css2, count=1)
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css2)

print("Updated JS, CSS successfully")
