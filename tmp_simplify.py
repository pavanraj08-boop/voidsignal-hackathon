"""
Fix hero ordering and replace fixed-bg canvas approach with inline canvases.
"""
with open('index.html', encoding='utf-8') as f:
    html = f.read()

# 1. Fix hero: VoidSignal as main title, TACTICAL MISSION COMMAND as sub
old_hero_text = '''         <h1 style="font-family: var(--head); font-weight: 900; font-size: 5rem; line-height:1.1; color: #fff; letter-spacing:-0.04em; margin-bottom:1rem; text-shadow:0 10px 30px rgba(0,0,0,0.8);">
             TACTICAL MISSION <br/><span style="color:var(--c);">COMMAND</span>
         </h1>
         <p style="font-family:var(--mono); font-size:0.9rem; color:rgba(255,255,255,0.7); line-height:1.6; letter-spacing:0.05em; margin-bottom:2.5rem; max-width:600px; margin-left:auto; margin-right:auto;">
             Deploy advanced orbital analytics, visualize Keplerian trajectories, and execute high-fidelity deep space simulations directly from your browser.
         </p>'''

new_hero_text = '''         <div style="font-family:var(--mono); font-size:0.7rem; letter-spacing:0.3em; color:rgba(0,212,255,0.8); margin-bottom:1.2rem; text-transform:uppercase;">// AUTONOMOUS SPACE INTELLIGENCE //</div>
         <h1 style="font-family: var(--head); font-weight: 900; font-size: 6rem; line-height:1; color: #fff; letter-spacing:-0.04em; margin-bottom:0.6rem; text-shadow:0 10px 40px rgba(0,0,0,0.9);">
             VøID<span style="color:var(--c);">SIGNAL</span>
         </h1>
         <div style="font-family:var(--head); font-weight:700; font-size:1.4rem; color:rgba(255,255,255,0.6); letter-spacing:0.1em; margin-bottom:1.2rem;">
             TACTICAL MISSION <span style="color:var(--c);">COMMAND</span>
         </div>
         <p style="font-family:var(--mono); font-size:0.8rem; color:rgba(255,255,255,0.55); line-height:1.7; letter-spacing:0.04em; margin-bottom:2.5rem; max-width:560px; margin-left:auto; margin-right:auto;">
             Deploy advanced orbital analytics, visualize Keplerian trajectories, and execute high-fidelity deep space simulations directly from your browser.
         </p>'''

if old_hero_text in html:
    html = html.replace(old_hero_text, new_hero_text)
    print("✓ Hero text fixed")
else:
    print("! Hero text pattern not matched - checking alternate...")
    # Try to find and replace just the h1
    import re
    html = re.sub(
        r'<h1 style="[^"]*">[\s\S]*?TACTICAL MISSION[\s\S]*?</h1>',
        '''<div style="font-family:var(--mono); font-size:0.7rem; letter-spacing:0.3em; color:rgba(0,212,255,0.8); margin-bottom:1.2rem;">// AUTONOMOUS SPACE INTELLIGENCE //</div>
         <h1 style="font-family: var(--head); font-weight: 900; font-size: 6rem; line-height:1; color: #fff; letter-spacing:-0.04em; margin-bottom:0.6rem; text-shadow:0 10px 40px rgba(0,0,0,0.9);">VøID<span style="color:var(--c);">SIGNAL</span></h1>
         <div style="font-family:var(--head); font-weight:700; font-size:1.4rem; color:rgba(255,255,255,0.6); letter-spacing:0.1em; margin-bottom:1.2rem;">TACTICAL MISSION <span style="color:var(--c);">COMMAND</span></div>''',
        html, count=1
    )
    print("✓ Hero text fixed via regex")

# 2. Remove the canvas-fixed-bg entire block (causes black screen)
import re
html = re.sub(
    r'  <div id="canvas-fixed-bg"[\s\S]*?</div>\s*<!-- /canvas-fixed-bg -->',
    '  <!-- canvas-fixed-bg removed: canvases are now inline in each section -->',
    html
)
print("✓ Removed canvas-fixed-bg layer")

# 3. Remove GSAP script tags (not needed anymore)
html = html.replace(
    '  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>\n',
    ''
)
print("✓ Removed GSAP script tags")

# 4. Remove data-scene attributes (no longer switching scenes)
html = re.sub(r' data-scene="[^"]*"', '', html)
print("✓ Removed data-scene attributes")

# 5. Replace tac-section styling - make it work like original .wrap sections
# Add inline canvas for ISS 3D section since it was in fixed-bg before
# The iss3d-cv canvas needs to exist inline
if 'canvas id="iss3d-cv"' not in html:
    html = html.replace(
        '<span class="tac-st">// ORBITAL TRACKING</span>',
        '<canvas id="iss3d-cv" style="display:block;width:100%;height:400px;border-radius:8px;margin-bottom:1rem"></canvas>\n        <span class="tac-st">// ORBITAL TRACKING</span>'
    )
    print("✓ Added inline iss3d-cv canvas")

# 6. Add inline JWST canvas
if 'canvas id="jwst-cv"' not in html or html.count('canvas id="jwst-cv"') < 1:
    html = html.replace(
        '<span class="tac-st">// L2 OBSERVATORY</span>',
        '<canvas id="jwst-cv" style="display:block;width:100%;height:400px;border-radius:8px;margin-bottom:1rem"></canvas>\n        <span class="tac-st">// L2 OBSERVATORY</span>'
    )
    print("✓ Added inline jwst-cv canvas")

# 7. Add inline Orrery canvas  
if 'canvas id="orr-cv"' not in html:
    html = html.replace(
        '<span class="tac-st">// DEEP SPACE</span>',
        '<canvas id="orr-cv" style="display:block;width:100%;height:400px;border-radius:8px;margin-bottom:1rem"></canvas>\n        <span class="tac-st">// DEEP SPACE</span>'
    )
    print("✓ Added inline orr-cv canvas")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"\n✓ Done. Size: {len(html)} bytes")
