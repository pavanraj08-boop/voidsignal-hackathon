import os

print("Starting clean rebuild...")

# Let's read the initial split html (just to get the base structure if needed? No, let's process the original file directly into index.html, style.css, main.js!)
# Processing by lines is much safer for exact precision.

with open("voidsignal_v22_FINAL (2).html", "r", encoding="utf-8") as f:
    lines = f.readlines()

css_lines = []
js_lines = []
html_lines = []

in_style = False
in_script = False

for i, line in enumerate(lines):
    # CSS Extraction
    if "<style>" in line and not in_style:
        in_style = True
        continue
    if "</style>" in line and in_style:
        in_style = False
        continue
    
    # JS Extraction 
    if "<script>" in line and not ('src=' in line):
        in_script = True
        continue
    if "</script>" in line and in_script:
        in_script = False
        continue
        
    if in_style:
        css_lines.append(line)
    elif in_script:
        js_lines.append(line)
    else:
        # Keep <script src="..."> but handle general html
        html_lines.append(line)

print(f"Extracted {len(css_lines)} lines of CSS")
print(f"Extracted {len(js_lines)} lines of JS")

html_text = "".join(html_lines)
js_text = "".join(js_lines)

# Now, we do string replacements on the rebuilt html_text.

# 1. Add css and js links
html_text = html_text.replace("</head>", '    <link rel="stylesheet" href="style.css">\n</head>')
html_text = html_text.replace("</body>", '    <script src="main.js"></script>\n</body>')

# 2. Fix the Logo
html_text = html_text.replace('<a href="#" class="logo">VøID <span>SIGNAL</span></a>', 
                              '<a href="#" class="logo"><img src="logo.png" alt="Vøid Signal Logo" style="height: 24px; vertical-align: middle; margin-right: 8px;">VøID <span>SIGNAL</span></a>')

# 3. Fix Duplicate Mission Lab Link
html_text = html_text.replace('<a href="#lab-s" class="btn btn-c">MISSION LAB ↗</a>', '', 1)

# 4. Extract telemetry panels (mc-grid and crew list and footer) 
# Lines 763 to 835 in original file
telemetry_panels = "".join(lines[762:836]) # 0-indexed: 762 to 835

# 5. Remove original mc-s completely from HTML
# We can find <!-- ════════... MISSION CONTROL up to </section> before ISS LIVE 3D TRACKER
import re
html_text = re.sub(r'<!-- ═══════════════════════════════════════════════\s*MISSION CONTROL.*?</section>', '', html_text, flags=re.DOTALL)

# 6. Insert telemetry_panels into iss3d-s
# Right below the </canvas> block.
insertion_point = """
      <div class="iss3d-info">
        <div class="iss3d-info-title">⬡ ISS FACTS</div>
        <div class="iss3d-info-detail" id="iss3d-fact">
          450 tonnes · 109m wide · 16 orbits/day · Inhabited since Nov 2000
        </div>
      </div>
    </div>
"""
replacement = insertion_point + "\n    <div style='margin-top: 2rem;'>\n" + telemetry_panels + "\n    </div>\n"
html_text = html_text.replace(insertion_point, replacement)


# 7. JS fixes
kas_fix = """
function dfTriggerCascade() {
  if(!dfScene3) {
    dfInit();
    setTimeout(dfTriggerCascade, 150);
    return;
  }
"""
js_text = js_text.replace("function dfTriggerCascade() {\n", kas_fix)

duplicate_3d_match = re.search(r'/\* ════════════════════════════════════════════════════════════════\s*ISS 3D LIVE TRACKER.*?window\.mcApplyPosition=function.*?\}\;', js_text, flags=re.DOTALL)
if duplicate_3d_match:
    js_text = js_text.replace(duplicate_3d_match.group(0), "")
    print("Removed duplicate ISS 3D block from main.js!")
else:
    print("Warning: Failed to find duplicate ISS 3D block to remove.")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html_text)
with open("style.css", "w", encoding="utf-8") as f:
    f.write("".join(css_lines))
with open("main.js", "w", encoding="utf-8") as f:
    f.write(js_text)

print("Rebuild complete!")
