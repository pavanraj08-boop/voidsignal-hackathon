with open('void_pages_dev_dump.html', encoding='utf-8') as f:
    html = f.read()

# Ensure Three.js CDN is loaded before main.js
if 'three.min.js' not in html:
    html = html.replace(
        '<script src="main.js"></script>',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script src="main.js"></script>'
    )

# Remove duplicate main.js if present
# pages.dev dump has it once at the bottom, keep it
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Done. {len(html)} bytes, {html.count(chr(10))} lines")
