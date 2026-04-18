import re

with open("voidsignal_v22_FINAL (2).html", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Extract all <style> blocks
style_blocks = []
def replace_style(match):
    style_blocks.append(match.group(1))
    return ""

html_no_styles = re.sub(r'<style[^>]*>(.*?)</style>', replace_style, content, flags=re.DOTALL | re.IGNORECASE)

# Extract all <script> blocks (ignore ones with src attribute)
script_blocks = []
def replace_script(match):
    attrs = match.group(1)
    # Don't remove scripts with src
    if "src=" in attrs.lower():
        return match.group(0)
    script_blocks.append(match.group(2))
    return ""

html_no_scripts = re.sub(r'<script([^>]*)>(.*?)</script>', replace_script, html_no_styles, flags=re.DOTALL | re.IGNORECASE)

# Write CSS
with open("style.css", "w", encoding="utf-8") as f:
    f.write("\n\n/* COMBINED STYLES */\n\n".join(style_blocks))

# Write JS
with open("main.js", "w", encoding="utf-8") as f:
    f.write("\n\n/* COMBINED SCRIPTS */\n\n".join(script_blocks))

# Add the link and script tags to the head and body
html_final = html_no_scripts.replace('</head>', '    <link rel="stylesheet" href="style.css">\n</head>')
html_final = html_final.replace('</body>', '    <script src="main.js"></script>\n</body>')

# Write HTML
with open("index.html", "w", encoding="utf-8") as f:
    f.write(html_final)

print(f"Extracted {len(style_blocks)} style blocks to style.css")
print(f"Extracted {len(script_blocks)} script blocks to main.js")
print(f"Saved remaining HTML to index.html")
