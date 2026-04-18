"""
fix_bugs.py - Fix syntax bugs injected by the feature script
1. JWST solar wing uses unicode minus (−3) instead of ASCII (-3)
2. canvas.roundRect() not supported in all browsers → replace with fillRect
3. Verify inject_features JS is present in main.js
"""

with open('main.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix 1: Unicode minus sign in JWST solar wing code
# The code had [-3,3].forEach(...) but with a unicode −
before1 = '  [-3,3].forEach(function(sx){'
after1  = '  [-3,3].forEach(function(sx){'
# More likely it's stored with the unicode minus from the Python string
import unicodedata
# Check if the unicode minus is present
if '\u22123' in js or '\u22123'.encode() in js.encode():
    js = js.replace('\u22123', '-3')
    print('Fixed unicode minus in JS.')

# Also fix the escaped minus that may appear
js = js.replace('[\u22123,3]', '[-3,3]')
js = js.replace('[\u2212 3,3]', '[-3,3]')

# Fix 2: roundRect compatibility — replace with a safe cross-browser version
# The canvas roundRect is not supported in older Chrome/Edge
OLD_ROUND = '''  tx.fillStyle=lp.hex+'28'; tx.strokeStyle=lp.hex+'AA'; tx.lineWidth=2;
  tx.beginPath();
  tx.roundRect(2,2,556,72,10);
  tx.fill(); tx.stroke();'''

NEW_ROUND = '''  tx.fillStyle=lp.hex+'28'; tx.strokeStyle=lp.hex+'AA'; tx.lineWidth=2;
  tx.beginPath();
  if(tx.roundRect){tx.roundRect(2,2,556,72,10);}
  else{tx.rect(2,2,556,72);}
  tx.fill(); tx.stroke();'''

if OLD_ROUND in js:
    js = js.replace(OLD_ROUND, NEW_ROUND)
    print('Fixed roundRect compatibility.')
else:
    print('roundRect pattern not found (may already be fixed or different whitespace).')

# Verify key features are in the file
checks = ['TLE DECODER', 'COST PER KG', 'ASTRONAUT BIOMEDICAL', 'jwBuildParker', 'JW_LAGRANGE', 'PARKER SOLAR PROBE']
for c in checks:
    if c in js:
        print(f'  ✓ Found: {c}')
    else:
        print(f'  ✗ MISSING: {c}')

with open('main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('\nmain.js saved.')

# Now verify HTML
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html_checks = ['tle-s', 'cost-s', 'bio-s', 'TLE DECODER', 'COST TO', 'ASTRONAUT', 'jwst-cv']
for c in html_checks:
    if c in html:
        print(f'  HTML ✓ {c}')
    else:
        print(f'  HTML ✗ MISSING: {c}')
