import sys

with open('main.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacements = {
    "getElementById('iss3d-s')": "getElementById('sec-iss3d')",
    "getElementById('jwst-s')": "getElementById('sec-jwst')",
    "getElementById('orr-s')": "getElementById('sec-orrery')",
    "getElementById('mt-s')": "getElementById('sec-mt-canvas')",
    "getElementById('sl-s')": "getElementById('sec-sl')",
    "getElementById('os-s')": "getElementById('sec-os')",
    "getElementById('rf-s')": "getElementById('sec-rf')",
    "getElementById('dv-s')": "getElementById('sec-dv')",
    "getElementById('df-s')": "getElementById('sec-df')",
    "getElementById('tle-s')": "getElementById('sec-tle')"
}

changed = False
for old, new in replacements.items():
    if old in js:
        print(f'Replacing {old} with {new}')
        js = js.replace(old, new)
        changed = True

# Also bypass IntersectionObserver threshold check for stability in GSAP
# since they are 100vh sections now and IntersectionObserver might be strict about thresholds when scrolling quickly.
js = js.replace('threshold:.05', 'threshold:0')

if changed:
    with open('main.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print('main.js successfully updated!')
else:
    print('No outdated IDs found.')
