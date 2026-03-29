import os
import re

print("Starting refactor...")

# Load the newly split index.html and main.js
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

with open("main.js", "r", encoding="utf-8") as f:
    js = f.read()

# Load the original HTML to extract mc-grid safely
with open("voidsignal_v22_FINAL (2).html", "r", encoding="utf-8", errors="ignore") as f:
    orig_html = f.read()

# 1. Update logo in HTML
html = re.sub(
    r'<a href="#" class="logo">VøID <span>SIGNAL</span></a>',
    r'<a href="#" class="logo"><img src="logo.png" alt="Vøid Signal Logo" style="height: 24px; vertical-align: middle; margin-right: 8px;">VøID <span>SIGNAL</span></a>',
    html
)

# Fix double MISSION LAB links 
html = html.replace('<a href="#lab-s" class="btn btn-c">MISSION LAB ↗</a>', '', 1)

# 2. Extract telemetry grid from original
pan_match = re.search(r'(<div class="mc-grid">.*?<div id="crew-list">\s*</div>\s*</div>\s*</div>)', orig_html, flags=re.DOTALL)
if pan_match:
    mc_grid_html = pan_match.group(1)
    print("Found mc-grid!")
else:
    mc_grid_html = "<!-- MC-GRID NOT FOUND -->"
    print("FAILED to find mc-grid!")

# 3. Replace the entire #mc-s block from HTML so it's not duplicate
html = re.sub(r'<!-- ═══════════════════════════════════════════════\s*MISSION CONTROL.*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)

# 4. Insert mc-grid below the 3D globe in #iss3d-s
def append_telemetry(m):
    head = m.group(1)
    # the canvas ends and there's a status bar. Let's put our grid right after the canvas container.
    new_head = head.replace('</canvas></div>\n      <div class="tip-box">', '</canvas></div>\n\n    <!-- TELEMETRY ADDED BELOW GLOBE -->\n    <div class="wrap" style="padding-top:0; padding-bottom: 2rem; border-top: none;">\n' + mc_grid_html + '\n    </div>\n\n      <div class="tip-box">')
    if new_head == head:
        print("Warning: Did not find exact insertion point for telemetry!")
    return new_head + m.group(2)

html = re.sub(r'(<!-- ═══════════════════════════════════════════════\s*ISS LIVE ORBIT.*?)(<!-- ═══════════════════════════════════════════════)', append_telemetry, html, flags=re.DOTALL)

# 5. Fix Kessler Syndrome bug in main.js
kas_fix = """
function dfTriggerCascade() {
  if(!dfScene3) {
    dfInit();
    setTimeout(dfTriggerCascade, 150);
    return;
  }
"""
js = js.replace("function dfTriggerCascade() {\n", kas_fix)

# 6. Remove duplicate mc-3d-cv 3D viewer implementation in main.js
# Searching for text "function iss3Build() {" within the duplicate block
# We know the duplicate starts with:
# /* ════════════════════════════════════════════════════════════════
#    ISS 3D LIVE TRACKER
# and ends with: 
# window.mcApplyPosition=function(lat,lon,vis){ ... };
duplicate_3d_match = re.search(r'/\* ════════════════════════════════════════════════════════════════\s*ISS 3D LIVE TRACKER.*?window\.mcApplyPosition=function.*?\}\;', js, flags=re.DOTALL)
if duplicate_3d_match:
    js = js.replace(duplicate_3d_match.group(0), "")
    print("Removed duplicate ISS 3D block from main.js!")
else:
    print("Warning: Failed to find duplicate ISS 3D block to remove.")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)
with open("main.js", "w", encoding="utf-8") as f:
    f.write(js)

print("HTML/JS Refactor completed.")
