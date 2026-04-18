import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject GSAP in the head/body
gsap_script = """
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
"""
content = content.replace('<script src="main.js"></script>', gsap_script + '\n  <script src="main.js"></script>')

# 2. Extract left pane content and right pane
left_pane_match = re.search(r'<div id="left-pane">(.*?)</div> <!-- /left-pane -->', content, re.DOTALL)
left_items = left_pane_match.group(1) if left_pane_match else ""

right_pane_match = re.search(r'<div id="right-pane">(.*?)</div> <!-- /right-pane -->', content, re.DOTALL)
right_items = right_pane_match.group(1) if right_pane_match else ""

# 3. Build new layout
# Extract the sticky header from left_pane and throw it away, replacing it with a new <header>
sticky_header_pattern = r'<div style="padding: 2\.5rem.*?</div>'
left_items = re.sub(sticky_header_pattern, '', left_items, count=1, flags=re.DOTALL)

# Also let's find the JWST lagrange info and remove any old styling that conflicts with our cinematic look if any.

header_html = """
  <header id="main-header" style="position:fixed; top:0; left:0; width:100%; display:flex; justify-content:space-between; align-items:center; padding:1.2rem 2.5rem; z-index:100; background:rgba(2,4,10,0.6); backdrop-filter:blur(16px); border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.3s;">
    <div>
      <div style="font-family: var(--head); font-weight: 900; font-size: 1.5rem; color: #fff; letter-spacing:-0.03em;">VøID<span style="color:var(--c)">SIGNAL</span></div>
      <div style="font-size: 0.5rem; color: var(--dim); letter-spacing: 0.25em;">AEROSPACE INTEL</div>
    </div>
    <div style="display:flex; gap:2rem; font-size:0.75rem; font-family:var(--mono);">
      <a href="#sec-iss3d" style="color:#fff; text-decoration:none; opacity:0.8; hover:opacity:1;">TELEMETRY</a>
      <a href="#sec-jwst" style="color:#fff; text-decoration:none; opacity:0.8; hover:opacity:1;">JWST</a>
      <a href="#sec-orrery" style="color:#fff; text-decoration:none; opacity:0.8; hover:opacity:1;">ORRERY</a>
      <a href="#sec-rf" style="color:#fff; text-decoration:none; opacity:0.8; hover:opacity:1;">SIMULATIONS</a>
    </div>
    <div style="display: flex; gap: 1.5rem; align-items:center;">
      <div style="font-size: 0.65rem; color: var(--a);" id="tb-void-price">$VOID: —</div>
      <div style="font-size: 0.65rem; color: var(--g);"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--g);margin-right:6px;box-shadow:0 0 5px var(--g);"></span>UPLINK SECURE</div>
    </div>
  </header>

  <section id="hero-section" style="position:relative; width:100%; height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; overflow:hidden;">
     <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(to bottom, rgba(2,4,10,0.3) 0%, rgba(2,4,10,0.9) 100%), rgba(2,4,10,0.4); z-index:1;"></div>
     <video src="139586-773417795.mp4" autoplay loop muted playsinline style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); min-width:100%; min-height:100%; width:auto; height:auto; object-fit:cover; z-index:0; filter:contrast(1.1) brightness(0.85); opacity:0.85;"></video>
     
     <div style="position:relative; z-index:2; text-align:center; max-width:800px; padding:0 2rem;">
        <h1 style="font-family: var(--head); font-weight: 900; font-size: 5rem; line-height:1.1; color: #fff; letter-spacing:-0.04em; margin-bottom:1rem; text-shadow:0 10px 30px rgba(0,0,0,0.8);">
            TACTICAL MISSION <br/><span style="color:var(--c);">COMMAND</span>
        </h1>
        <p style="font-family:var(--mono); font-size:0.9rem; color:rgba(255,255,255,0.7); line-height:1.6; letter-spacing:0.05em; margin-bottom:2.5rem; max-width:600px; margin-left:auto; margin-right:auto;">
            Deploy advanced orbital analytics, visualize Keplerian trajectories, and execute high-fidelity deep space simulations directly from your browser.
        </p>
        <button onclick="document.getElementById('sec-iss3d').scrollIntoView({behavior:'smooth'})" style="background:var(--c); color:#000; border:none; padding:1rem 2.5rem; font-family:var(--head); font-weight:800; font-size:0.85rem; letter-spacing:0.15em; cursor:pointer; border-radius:2px; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 0 20px rgba(0,212,255,0.6)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='none'; this.style.transform='none';">ENTER TERMINAL</button>
     </div>
     
     <div style="position:absolute; bottom:2rem; left:50%; transform:translateX(-50%); z-index:2; color:rgba(255,255,255,0.4); font-size:0.6rem; letter-spacing:0.2em; text-align:center;">
        SCROLL TO INITIATE<br/>
        <div style="height:40px; width:1px; background:linear-gradient(to bottom, rgba(255,255,255,0.4), transparent); margin:10px auto 0;"></div>
     </div>
  </section>

  <div id="content-scroll" style="position:relative; z-index:10; padding-bottom:10vh;">
    <div style="max-width:550px; margin-left:5vw;">
"""

# Put the left panel sections inside the content-scroll
footer_html = """
    </div>
  </div>

  <div id="canvas-fixed-bg" style="position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; pointer-events:none;">
"""

content = re.sub(r'<div id="left-pane">.*?</div> <!-- /right-pane -->', header_html + left_items + footer_html + right_items + '\n  </div> <!-- /canvas-fixed-bg -->', content, flags=re.DOTALL)

# Remove the old script logic for IntersectionObserver from the bottom since we'll use GSAP in main.js
script_pattern = r'<script>\s*document\.addEventListener.*?<\/script>'
content = re.sub(script_pattern, '', content, flags=re.DOTALL)

# Add a tiny helper to allow interaction with canvas via z-index
content = content.replace('<div id="ai-terminal-float">', '<div id="ai-terminal-float" style="z-index:9999;">')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html layout.")
