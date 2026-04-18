import re

print("Patching bugs in main.js...")

with open("main.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Fix Kessler Debris Visibility
# The user's Windows WebGL driver limits sizeAttenuation: false points to 1px making them invisible.
# We change it to sizeAttenuation: true and use world-space size (0.02 = ~127km wide, very visible)
js = js.replace(
"""  dfPoints = new THREE.Points(dfGeom, new THREE.PointsMaterial({
    size: 3.5,               // pixel size — visible on all screen sizes
    vertexColors: true,
    sizeAttenuation: false,  // FIXED pixel size regardless of camera distance""",
"""  dfPoints = new THREE.Points(dfGeom, new THREE.PointsMaterial({
    size: 0.03,              // PATCHED: WebGL 1.0 PointSize limits fixed
    vertexColors: true,
    sizeAttenuation: true,   // FIXED: Scales properly now"""
)

# 2. Fix Kessler Cascade Expansion Size
js = js.replace(
    'dfPoints.material.size = 5.5;  // larger pixels during cascade',
    'dfPoints.material.size = 0.06;  // PATCHED: larger particles during cascade'
)

# 3. Fix Runaway Narration (SpeechSynthesis)
# Append cancellation to the Pause button
js = js.replace(
    "document.getElementById('mt-play').textContent=mtPlaying?'⏸ PAUSE':'▶ PLAY';",
    "document.getElementById('mt-play').textContent=mtPlaying?'⏸ PAUSE':'▶ PLAY';\n  if(!mtPlaying && window.speechSynthesis) window.speechSynthesis.cancel();"
)

# Append cancellation to Reset button
js = js.replace(
    "  document.getElementById('mt-play').textContent='▶ PLAY';",
    "  document.getElementById('mt-play').textContent='▶ PLAY';\n  if(window.speechSynthesis) window.speechSynthesis.cancel();"
)

# Append cancellation to scrub bar
js = js.replace(
"""document.getElementById('mt-timeline')?.addEventListener('input',e=>{
  mtT=+e.target.value/1000;""",
"""document.getElementById('mt-timeline')?.addEventListener('input',e=>{
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  mtT=+e.target.value/1000;"""
)

# Append cancellation to clicking a new Mission Card
js = js.replace(
    "card.addEventListener('click',()=>{ if(mtBuilt) mtSelectMission(m.id); });",
    "card.addEventListener('click',()=>{ if(window.speechSynthesis) window.speechSynthesis.cancel(); if(mtBuilt) mtSelectMission(m.id); });"
)

# Append cancellation to clicking different lab tabs
js = js.replace(
    "t.classList.add('on');",
    "t.classList.add('on');\n      if(window.speechSynthesis) window.speechSynthesis.cancel();"
)

with open("main.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Bug patches applied successfully!")
