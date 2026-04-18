import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix literal '\n' that was injected by mistake
html = html.replace('\\n', '\n')

# The broken block that prematurely closed content-scroll:
broken_block_regex = r'<div style="display: flex; gap: 1rem; margin-top: 1\.2rem;">.*?id="tb-void-price">\$VOID: —</div>\s*</div>\s*</div>'
html = re.sub(broken_block_regex, '', html, flags=re.DOTALL)

# Ensure #canvas-fixed-bg z-index is -1 so it stays behind the video and DOM text!
html = html.replace('z-index:0; pointer-events:none;">', 'z-index:-1; pointer-events:none;">')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('command-center.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = css.replace('opacity: 0.1;', 'opacity: 0.2;')
css = css.replace('z-index: 0;', 'z-index: -1;')

with open('command-center.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Fixed layout bugs")
