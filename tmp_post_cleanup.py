"""
Post-merge cleanup:
1. Remove the hidden compatibility stubs for feeds/DSN/epitaphs (they are now real sections)
2. Remove sc-sl canvas from canvas-fixed-bg (sl-cv is now inline in the Starlink section)
3. Ensure hidden stubs dont shadow the real IDs
"""

with open('index.html', encoding='utf-8') as f:
    html = f.read()

# Remove the hidden stubs we added earlier (now replaced by real sections)
stubs_to_remove = [
    '  <div style="display:none;" id="epitaphs-s"><div id="ep-grid"></div><div id="fg"></div></div>\r\n',
    '  <div style="display:none;" id="epitaphs-s"><div id="ep-grid"></div><div id="fg"></div></div>\n',
    '  <div style="display:none;" id="dsn-s"><div id="dsn-ts"></div><div id="dsn-grid"></div><div id="dsn-contacts"></div></div>\r\n',
    '  <div style="display:none;" id="dsn-s"><div id="dsn-ts"></div><div id="dsn-grid"></div><div id="dsn-contacts"></div></div>\n',
    '  <div style="display:none;" id="feeds-s"><div id="news-g"></div><div id="lg"></div><div id="today-box"></div></div>\r\n',
    '  <div style="display:none;" id="feeds-s"><div id="news-g"></div><div id="lg"></div><div id="today-box"></div></div>\n',
    '  <div style="display:none;" id="cost-cv"></div><div style="display:none;" id="cost-tooltip"></div>\r\n',
    '  <div style="display:none;" id="cost-cv"></div><div style="display:none;" id="cost-tooltip"></div>\n',
    '  <div style="display:none;" id="bio-timeline"></div><button style="display:none;" id="bio-play-btn"></button><button style="display:none;" id="bio-reset-btn"></button>\r\n',
    '  <div style="display:none;" id="bio-timeline"></div><button style="display:none;" id="bio-play-btn"></button><button style="display:none;" id="bio-reset-btn"></button>\n',
    '  <div style="display:none" id="void-last-update"></div>\r\n',
    '  <div style="display:none" id="void-last-update"></div>\n',
]

for stub in stubs_to_remove:
    if stub in html:
        html = html.replace(stub, '')
        print(f"Removed stub: {stub[:60]}...")

# sl-cv canvas is now an inline canvas in the scroll section, so remove it from the fixed bg layer  
# (leave the id in the fixed bg to avoid canvas reuse confusion - just disable it)
html = html.replace(
    '    <div class="scene-container" id="scene-sl"><canvas id="sl-cv"></canvas></div>',
    '    <div class="scene-container" id="scene-sl"><!-- sl-cv is inline in sec-sl --></div>'
)
print("Moved sl-cv out of fixed-bg (it is now inline)")

# Also add missing el-s and orrery-ticker stubs the JS might need  
# (check if orr-ticker is somewhere)
if 'id="orr-ticker"' not in html:
    # Add hidden stubs so JS doesnt crash
    fallback_stubs = '''
  <!-- JS compatibility stubs (hidden) -->
  <div style="display:none" id="orr-ticker"></div>
  <div style="display:none" id="orr-panel"></div>
  <div style="display:none" id="orr-legend"></div>
  <div style="display:none" id="orr-speed-lbl"></div>
  <div style="display:none" id="orr-clock"></div>
  <div style="display:none" id="orr-iss-lbl"></div>
  <div style="display:none" id="mc-s"></div>
  <div style="display:none" id="mc-lat"></div>
  <div style="display:none" id="mc-lon"></div>
  <div style="display:none" id="mc-alt"></div>
  <div style="display:none" id="mc-vel"></div>
  <div style="display:none" id="mc-vis"></div>
  <div style="display:none" id="mc-day"></div>
  <div style="display:none" id="mc-period"></div>
  <div style="display:none" id="mc-orbit-fill"></div>
  <div style="display:none" id="mc-orbits-day"></div>
  <div style="display:none" id="mc-total-orbits"></div>
  <div style="display:none" id="mc-km-total"></div>
  <div style="display:none" id="mc-days-orbit"></div>
  <div style="display:none" id="mc-passes-grid"></div>
  <div style="display:none" id="mc-pass-status"></div>
  <div style="display:none" id="mc-passes-fallback"></div>
  <div style="display:none" id="mc-crew-grid"></div>
  <div style="display:none" id="mc-crew-count"></div>
  <div style="display:none" id="mc-last-update"></div>
  <div style="display:none" id="mc-location-info"></div>
  <button style="display:none" id="mc-loc-btn"></button>
  <div style="display:none" id="sky-s"><div id="sky-grid"></div><span id="sky-location"></span><button id="sky-loc-btn"></button></div>
  <div style="display:none" id="et-grid"></div>
  <div style="display:none" id="orr-clock-sm"></div>
  <div style="display:none" id="hero-stats"><span id="s1">60</span><span id="s2">7.8</span><span id="s3">40</span></div>
  <canvas style="display:none" id="sf"></canvas>
  <canvas style="display:none" id="hero-cv"></canvas>
  <div style="display:none" id="tick-t"></div>'''
    
    html = html.replace('  <!-- SCRIPT -->', fallback_stubs + '\n\n  <!-- SCRIPT -->')
    print("Added JS compatibility stubs")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\n✓ Cleanup done. Final size: {len(html)} bytes")
