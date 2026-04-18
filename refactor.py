import os
import re

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

with open("main.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Update logo in HTML
# The nav logo is: <a href="#" class="logo">VøID <span>SIGNAL</span></a>
# We'll replace it with an image for Image 2
html = re.sub(
    r'<a href="#" class="logo">VøID <span>SIGNAL</span></a>',
    r'<a href="#" class="logo"><img src="logo.png" alt="Vøid Signal" style="height: 24px; vertical-align: middle; margin-right: 8px;">VøID <span>SIGNAL</span></a>',
    html
)

# 2. Fix the ISS Live Orbit & Mission Control duplicate
# We need to take the telemetry grid out of #mc-s and put it into #iss3d-s
# We'll extract the <div class="mc-grid">...</div> block 
mc_grid_match = re.search(r'(<div class="mc-grid">.*?</div>)\s*(?=</div>\s*<!-- ══════════════)', html, flags=re.DOTALL)
if mc_grid_match:
    mc_grid_html = mc_grid_match.group(1)
    
    # Remove #mc-s completely from html
    html = re.sub(r'<!-- ═══════════════════════════════════════════════\s*MISSION CONTROL.*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)
    
    # Insert the mc_grid into #iss3d-s right after the canvas <div class="mc-3d-wrap">
    # Wait, the structure in #iss3d-s is:
    # <div class="wrap full" id="iss3d-s" ...>
    #   <div class="mc-3d-wrap"> ... <canvas id="iss3d-cv"> ... </div>
    # </div>
    # We will append mc_grid before the closing </div> of #iss3d-s
    
    # Let's find #iss3d-s block
    def append_telemetry(m):
        # m.group(1) is the entire #iss3d-s up to the last </div>
        return m.group(1) + '\n    <!-- TELEMETRY ADDED BELOW GLOBE -->\n    <div class="wrap" style="padding-top:0">\n' + mc_grid_html + '\n    </div>\n' + m.group(2)
    
    # Actually just simple replace
    html = re.sub(r'(<div class="wrap full" id="iss3d-s".*?)(<!-- ═══════════════════════════════════════════════)', append_telemetry, html, flags=re.DOTALL)

# 3. Fix duplicate Mission Lab buttons 
html = html.replace('<a href="#lab-s" class="btn btn-c">MISSION LAB ↗</a>', '', 1)

# 4. Kessler Syndrome Fix in JS
# Find dfTriggerCascade and fix it
# Original: function dfTriggerCascade() { ... }
# Better: ensure dfInit() is called if dfScene3 is null
kas_fix = """
function dfTriggerCascade() {
  if(!dfScene3) {
    dfInit();
    setTimeout(dfTriggerCascade, 100);
    return;
  }
"""
js = js.replace("function dfTriggerCascade() {\n", kas_fix)

# 5. Remove the second ISS 3D initialization from main.js 
# The second one uses mc-3d-cv and iss3LatLonToXYZ.
js = re.sub(r'/\* ════════════════════════════════════════════════════════════════\s*ISS 3D LIVE TRACKER.*?// Hook into existing mcApplyPosition.*?\n};\s*', '', js, flags=re.DOTALL)

# 6. Set ID on the trigger button in html
# It already has id="df-btn-casc", but let's make sure the listener is wired up.
# "document.getElementById('df-btn-casc')?.addEventListener('click', dfTriggerCascade);" is in the code.
# The issue is the button wasn't initializing the canvas because its tab wasn't active. The fix above resolves this.

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
with open("main.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Refactor complete.")
