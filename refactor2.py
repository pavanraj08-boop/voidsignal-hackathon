import re

# Load the already split index.html
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# Load the original HTML to extract mc-grid safely
with open("voidsignal_v22_FINAL (2).html", "r", encoding="utf-8", errors="ignore") as f:
    orig_html = f.read()

# 1. Update logo in HTML
html = re.sub(
    r'<a href="#" class="logo">VøID <span>SIGNAL</span></a>',
    r'<a href="#" class="logo"><img src="logo.png" alt="Vøid Signal Logo" style="height: 24px; vertical-align: middle; margin-right: 8px;">VøID <span>SIGNAL</span></a>',
    html
)

# 2. Extract mc-grid from ORIGINAL HTML
mc_grid_match = re.search(r'(<div class="mc-grid">.*?</div>\s*<!-- \$\(DOCUMENT\) -->\s*</div>)', orig_html, flags=re.DOTALL)
if not mc_grid_match:
    # Try a looser match ending at the first <!-- ═══════════ that follows
    mc_grid_match_2 = re.search(r'(<div class="mc-grid">.*?)<!-- ═══════════════════════════════════════════════\s*ISS LIVE ORBIT', orig_html, flags=re.DOTALL)
    if mc_grid_match_2:
        mc_grid_html = mc_grid_match_2.group(1).strip()
        # Trim off trailing div closing tags if needed, or keep them to balance.
        # Actually, let's just grab the whole inner HTML of mc-s except the canvas:
        # We can extract just the panel section:
        pan_match = re.search(r'(<div class="mc-grid">.*?<div id="crew-list">\s*</div>\s*</div>\s*</div>)', orig_html, flags=re.DOTALL)
        if pan_match:
            mc_grid_html = pan_match.group(1)
        else:
            mc_grid_html = "<!-- FAILED TO EXTRACT MC-GRID -->"
    else:
        mc_grid_html = "<!-- MC-GRID NOT FOUND -->"
else:
    mc_grid_html = mc_grid_match.group(1)

# Now, remove mc-s completely from index.html
html = re.sub(r'<!-- ═══════════════════════════════════════════════\s*MISSION CONTROL.*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)

# Insert the mc_grid into #iss3d-s
def append_telemetry(m):
    # m.group(1) is the <div id="iss3d-s"> up to the next section divider
    # Let's insert the telemetry right after the canvas wrap
    inside_iss3d = m.group(1)
    new_html = inside_iss3d.replace('</canvas></div>\n      <div class="tip-box">', '</canvas></div>\n\n    <!-- TELEMETRY ADDED BELOW GLOBE -->\n    <div class="wrap" style="padding-top:0; padding-bottom: 2rem;">\n' + mc_grid_html + '\n    </div>\n\n      <div class="tip-box">')
    return new_html + m.group(2)

html = re.sub(r'(<!-- ═══════════════════════════════════════════════\s*ISS LIVE ORBIT.*?)(<!-- ═══════════════════════════════════════════════)', append_telemetry, html, flags=re.DOTALL)

# 3. Fix duplicate Mission Lab buttons 
html = html.replace('<a href="#lab-s" class="btn btn-c">MISSION LAB ↗</a>', '', 1)

# 4. Write back
with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("HTML refactor completed.")
