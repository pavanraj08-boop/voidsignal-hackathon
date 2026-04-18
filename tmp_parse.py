import re
with open(r'c:\Users\rajrp\OneDrive\Desktop\void signal\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all wrap divs and sections
matches = re.finditer(r'<(div class="wrap"|section).*?id="([^"]+)"', content)
for m in matches:
    print(m.group(2))
