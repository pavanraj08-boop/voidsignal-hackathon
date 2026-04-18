import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the constraining wrapper
html = html.replace('<div id="content-scroll" style="position:relative; z-index:10; padding-bottom:10vh;">\n    <div style="max-width:550px; margin-left:5vw;">', '<div id="content-scroll" style="position:relative; z-index:10; padding-bottom:10vh;">')

# The wrapper has a closing div right before </div> <!-- /canvas-fixed-bg --> ... wait, let's look at index.html
# Line 311: </div>
# Line 312: </div>
# Line 314: <div id="canvas-fixed-bg"
# So we need to remove one closing div.
html = html.replace('\n    </div>\n  </div>\n\n  <div id="canvas-fixed-bg"', '\n  </div>\n\n  <div id="canvas-fixed-bg"')

# Now we need to wrap the contents of each .tac-section in a .tac-card-inner
# A tac-section starts with <div class="tac-section..." ... id="...">
# and ends with the matching </div>
def wrap_tac_section(match):
    # match.group(0) is the entire div
    # match.group(1) is the opening tag
    # match.group(2) is the inner HTML
    # match.group(3) is the closing tag
    
    opening_tag = match.group(1)
    inner_html = match.group(2)
    
    # Wrap inner HTML
    new_inner = f'\\n       <div class="tac-card-inner glass-panel" style="padding:2.5rem; border-radius:16px; background:rgba(3,7,16,0.65); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); box-shadow:0 20px 40px rgba(0,0,0,0.5);">{inner_html}</div>\\n    '
    
    return f"{opening_tag}{new_inner}</div>"

# Use regex to find all tac-sections. Since they don't contain nested tac-sections, a simple regex works.
html = re.sub(r'(<div class="tac-section[^>]*>)(.*?)(</div>\s*<!-- [A-Z ]+ -->|</div>(?=\s*<div class="tac-section|\s*</div>\n\n  <div id="canvas-fixed-bg"))', wrap_tac_section, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('command-center.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Update .tac-section rules
new_css = """
/* ── SCROLL SECTIONS ─────────────────────────────────────── */
.tac-section {
  min-height: 120vh; /* gives enough scrolling space to trigger animations fully */
  padding: 15vh 5vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
  opacity: 0.1;
  transform: translateY(40px);
  margin-bottom: 20vh; /* the proper placeholder spacing */
}
.tac-section.active-focus {
  opacity: 1;
  transform: translateY(0);
}

.tac-card-inner {
  max-width: 550px;
  width: 100%;
  pointer-events: auto;
}

/* Alternate left and right alignment */
.tac-section:nth-child(odd) {
  align-items: flex-start;
}
.tac-section:nth-child(even) {
  align-items: flex-end;
}

/* Fix mobile viewing */
@media (max-width: 900px) {
  .tac-section {
    padding: 15vh 5vw;
  }
  .tac-section:nth-child(odd), .tac-section:nth-child(even) {
    align-items: center;
  }
  .tac-card-inner {
    max-width: 100%;
  }
}
"""

css = re.sub(r'/\* ── SCROLL SECTIONS ─────────────────────────────────────── \*/.*?/\* ── HUD UI ELEMENTS', new_css + '\n/* ── HUD UI ELEMENTS', css, flags=re.DOTALL)

with open('command-center.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Restructured index.html and CSS successfully.")
