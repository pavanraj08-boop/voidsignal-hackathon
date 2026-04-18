"""
Merge script: Takes all the rich feature sections from the original voidsignal.pages.dev
and injects them into the new cinematic scroll index.html, wrapped in the
glass-panel tac-section format.
"""

with open('void_pages_dev_dump.html', encoding='utf-8') as f:
    old = f.read()

with open('index.html', encoding='utf-8') as f:
    new = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# Helper to wrap a raw HTML block into a cinematic glass-panel tac-section
# ─────────────────────────────────────────────────────────────────────────────
def section(sec_id, scene, content, wide=False):
    width_style = "max-width:1100px;" if wide else ""
    return f"""
    <!-- ═══ {sec_id.upper()} ═══ -->
    <div class="tac-section" data-scene="{scene}" id="{sec_id}" style="{width_style}">
      <div class="tac-card-inner glass-panel" style="padding:2.5rem; border-radius:16px; background:rgba(3,7,16,0.72); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.08); box-shadow:0 20px 60px rgba(0,0,0,0.6);">
{content}
      </div>
    </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 1. TODAY IN SPACE  &  APOPHIS COUNTDOWN  (lines 110-150)
# ─────────────────────────────────────────────────────────────────────────────
today_apophis = """
        <span class="tac-st">// HISTORY + INCOMING</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start" class="reveal">
          <!-- Today in Space -->
          <div>
            <div class="sh" style="margin-bottom:1.4rem">
              <span class="st">// HISTORY</span>
              <h2 class="sn" style="font-size:1.1rem">TODAY IN SPACE</h2>
              <div class="sl"></div>
            </div>
            <div class="today-box" id="today-box"></div>
          </div>
          <!-- Apophis Countdown -->
          <div>
            <div class="sh" style="margin-bottom:1.4rem">
              <span class="st">// INCOMING</span>
              <h2 class="sn" style="font-size:1.1rem">APOPHIS <span style="color:var(--o)">2029</span></h2>
              <div class="sl"></div>
            </div>
            <div style="font-size:.72rem;color:var(--dim);line-height:1.7;margin-bottom:1rem">
              On <strong style="color:#fff">April 13, 2029</strong>, asteroid Apophis (370m wide) will pass Earth
              closer than GPS satellites — <strong style="color:var(--o)">31,000 km away</strong>.
              3 billion people will be able to see it with the naked eye.
            </div>
            <div class="apophis-bar" id="apophis-bar">
              <div class="ap-pulse"></div>
              <div><div class="ap-label">DAYS</div><div class="ap-val" id="ap-d">—</div></div>
              <div class="ap-sep"></div>
              <div><div class="ap-label">HOURS</div><div class="ap-val" id="ap-h">—</div></div>
              <div class="ap-sep"></div>
              <div><div class="ap-label">MINUTES</div><div class="ap-val" id="ap-m">—</div></div>
              <div class="ap-sep"></div>
              <div><div class="ap-label">SECONDS</div><div class="ap-val" id="ap-s">—</div></div>
            </div>
            <div style="margin-top:1rem">
              <a href="https://twitter.com/intent/tweet?text=In%20April%202029%2C%20asteroid%20Apophis%20will%20pass%20INSIDE%20the%20ring%20of%20GPS%20satellites%20%E2%80%94%2031%2C000km%20from%20Earth.%20%40VoidSignal%20%23Apophis%20%23Space" target="_blank" class="share-btn">
                𝕏 SHARE THIS FACT
              </a>
            </div>
          </div>
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 2. LIVE SPACE INTEL / NEWS
# ─────────────────────────────────────────────────────────────────────────────
news_block = """
        <span class="tac-st">// UPLINK</span>
        <h2 class="tac-sn">LIVE SPACE <span style="color:var(--c)">INTEL</span></h2>
        <span class="smeta" id="news-ts" style="display:block;margin-bottom:1rem"></span>
        <div class="news-g" id="news-g">
          <div class="nc-load">⬡ CONNECTING TO UPLINK...</div>
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 3. SPACE WEATHER
# ─────────────────────────────────────────────────────────────────────────────
sw_block = """
        <span class="tac-st">// SOLAR ACTIVITY</span>
        <h2 class="tac-sn">SPACE <span style="color:var(--o)">WEATHER</span></h2>
        <span class="smeta" id="sw-updated" style="display:block;margin-bottom:1rem">LIVE · NOAA SWPC</span>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.4rem">
          <div class="sw-card" id="sw-kp-card"><div class="sw-label">Kp INDEX <span class="sw-badge" id="sw-kp-badge">QUIET</span></div><div class="sw-big" id="sw-kp">—</div><div class="sw-sub">Geomagnetic activity 0–9</div><div class="sw-bar-track"><div class="sw-bar-fill" id="sw-kp-bar" style="width:0%"></div></div></div>
          <div class="sw-card"><div class="sw-label">SOLAR WIND SPEED</div><div class="sw-big" id="sw-wind">—</div><div class="sw-sub">km/s at L1 point</div></div>
          <div class="sw-card"><div class="sw-label">X-RAY FLUX</div><div class="sw-big" id="sw-xray">—</div><div class="sw-sub">Solar flare level</div></div>
          <div class="sw-card"><div class="sw-label">PROTON DENSITY</div><div class="sw-big" id="sw-proton">—</div><div class="sw-sub">p/cm³ solar wind</div></div>
          <div class="sw-card" id="sw-aurora-card"><div class="sw-label">AURORA PROBABILITY</div><div class="sw-big" id="sw-aurora">—</div><div class="sw-sub" id="sw-aurora-sub">Enable location</div></div>
          <div class="sw-card"><div class="sw-label">RADIO BLACKOUT</div><div class="sw-big" id="sw-radio">—</div><div class="sw-sub">HF communications</div></div>
          <div class="sw-card"><div class="sw-label">IMF Bz COMPONENT</div><div class="sw-big" id="sw-bz">—</div><div class="sw-sub" id="sw-bz-sub">Interplanetary magnetic field</div></div>
          <div class="sw-card"><div class="sw-label">ACTIVE NOAA ALERTS</div><div class="sw-big" id="sw-alert-count">—</div><div class="sw-sub">Space weather warnings</div></div>
        </div>
        <div id="sw-storm-banner" style="display:none;background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.4);padding:.8rem 1.2rem;font-size:.72rem;color:var(--o);letter-spacing:.1em;text-align:center;margin-bottom:1rem;animation:kpulse 1.5s ease-in-out infinite">
          ⚠ GEOMAGNETIC STORM IN PROGRESS — GPS ACCURACY AFFECTED · AURORA VISIBLE AT MID-LATITUDES
        </div>
        <div style="font-size:.65rem;color:var(--dim);line-height:1.7">
          Solar wind data from NOAA's L1 monitoring point. Kp index measures geomagnetic disturbance globally on a 0–9 scale. Kp≥5 = storm conditions.
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 4. DEEP SPACE NETWORK
# ─────────────────────────────────────────────────────────────────────────────
dsn_block = """
        <span class="tac-st">// LIVE TRANSMISSIONS</span>
        <h2 class="tac-sn">DEEP SPACE <span style="color:var(--c)">NETWORK</span></h2>
        <span class="smeta" style="display:block;margin-bottom:1rem">GOLDSTONE · MADRID · CANBERRA · REAL-TIME</span>
        <p style="font-size:.72rem;color:var(--dim);line-height:1.8;max-width:680px;margin-bottom:1.6rem">
          NASA's Deep Space Network — three antenna complexes 120° apart — is the only way to talk to spacecraft beyond Earth orbit. Right now these dishes are transmitting and receiving signals from probes across the solar system.
        </p>
        <div style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-bottom:1rem;font-size:.62rem">
          <span style="color:var(--g)">● TX UPLINK</span>
          <span style="color:var(--c)">● RX DOWNLINK</span>
          <span style="color:var(--dim)">● STANDBY</span>
          <span style="margin-left:auto;color:var(--dim)" id="dsn-ts">⬡ CONNECTING...</span>
        </div>
        <div class="dsn-complex-grid" id="dsn-grid">
          <div class="dsn-loading">⬡ CONNECTING TO DSN TELEMETRY...</div>
        </div>
        <div id="dsn-contacts" style="margin-top:1.2rem"></div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 5. STARLINK DENSITY
# ─────────────────────────────────────────────────────────────────────────────
sl_block = """
        <span class="tac-st">// MEGACONSTELLATION</span>
        <h2 class="tac-sn">STARLINK <span style="color:var(--r)">DENSITY</span></h2>
        <span class="smeta" id="sl-count-meta" style="display:block;margin-bottom:1rem">LOADING...</span>
        <p style="font-size:.72rem;color:var(--dim);line-height:1.8;max-width:680px;margin-bottom:1.4rem">
          SpaceX has launched over 6,000 Starlink satellites into LEO across 6 orbital shells. This 3D globe shows their real density distribution. Drag to rotate · scroll to zoom.
        </p>
        <div style="position:relative;background:#01020A;border:1px solid var(--bd);overflow:hidden">
          <canvas id="sl-cv" style="display:block;width:100%"></canvas>
          <div style="position:absolute;top:8px;left:12px;font-size:.58rem;color:var(--r);letter-spacing:.15em;opacity:.85">STARLINK 3D · LEO ORBITAL SHELLS</div>
          <div style="position:absolute;top:8px;right:12px;font-size:.55rem;color:var(--dim)">Drag to rotate · scroll to zoom</div>
          <div id="sl-legend-3d" style="position:absolute;bottom:10px;left:12px;display:flex;flex-direction:column;gap:.3rem;font-size:.55rem"></div>
        </div>
        <div class="lab-readout" style="grid-template-columns:repeat(4,1fr);margin-top:1rem">
          <div class="lr-item"><div class="lr-label">Total satellites</div><div class="lr-val" id="sl-total">—</div></div>
          <div class="lr-item"><div class="lr-label">Active shells</div><div class="lr-val green" id="sl-active">6</div></div>
          <div class="lr-item"><div class="lr-label">Orbital planes</div><div class="lr-val" id="sl-planes">72+</div></div>
          <div class="lr-item"><div class="lr-label">Kessler risk</div><div class="lr-val warn" id="sl-risk">ELEVATED</div></div>
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 6. DATABASE EXPLORER
# ─────────────────────────────────────────────────────────────────────────────
explore_block = """
        <span class="tac-st">// DATABASE</span>
        <h2 class="tac-sn">EXPLORE THE <span style="color:var(--c)">UNIVERSE</span></h2>
        <div class="sl" style="margin-bottom:1rem"></div>
        <div class="fm"><div class="fm-t" id="fm-t"></div></div>
        <div class="tab-bar">
          <button class="tab-btn on" data-tab="planets">PLANETS</button>
          <button class="tab-btn" data-tab="asteroids">ASTEROIDS</button>
          <button class="tab-btn" data-tab="deepspace">DEEP SPACE</button>
          <button class="tab-btn" data-tab="genesis">GENESIS SATS</button>
          <button class="tab-btn" data-tab="forgotten">FORGOTTEN SATS</button>
          <button class="tab-btn" data-tab="reentry">REENTRIES</button>
          <button class="tab-btn" data-tab="launches">UPCOMING</button>
        </div>
        <div id="tab-planets"   class="tab-p on"><div class="obj-g" id="pg"></div></div>
        <div id="tab-asteroids" class="tab-p"><div class="obj-g" id="ag"></div></div>
        <div id="tab-deepspace" class="tab-p"><div class="obj-g" id="dg"></div></div>
        <div id="tab-genesis"   class="tab-p"><div class="sat-g" id="gg"></div></div>
        <div id="tab-forgotten" class="tab-p"><div class="sat-g" id="fg"></div></div>
        <div id="tab-reentry"   class="tab-p"><div class="sat-g" id="rg"></div></div>
        <div id="tab-launches"  class="tab-p"><div class="news-g" id="lg"></div></div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 7. MISSION THEATER
# ─────────────────────────────────────────────────────────────────────────────
mt_block = """
        <span class="tac-st">// TRAJECTORY SIMULATION</span>
        <h2 class="tac-sn">MISSION <span style="color:var(--c)">THEATER</span></h2>
        <span class="smeta" style="display:block;margin-bottom:1rem">6 MISSIONS · REAL TRAJECTORIES · GRAVITY ASSISTS · LAUNCH TO DESTINATION</span>
        <p style="font-size:.72rem;color:var(--dim);line-height:1.85;max-width:700px;margin-bottom:1.3rem">
          Watch spacecraft travel from Earth to their destinations using <strong style="color:var(--g)">real computed heliocentric coordinates</strong>. Gravity assist slingshots, interplanetary transfers, orbital insertions — every trajectory is physically accurate.
        </p>
        <div class="mt-cards" id="mt-cards"></div>
        <div class="mt-cv-wrap">
          <canvas id="mt-cv"></canvas>
          <div class="mt-overlay-tl">
            <div class="mt-mission-title" id="mt-title">SELECT A MISSION</div>
            <div class="mt-phase-name" id="mt-phase">—</div>
            <div class="mt-date-display" id="mt-date">—</div>
          </div>
          <div class="mt-info-panel" id="mt-info">
            <div class="mt-info-title" id="mt-info-title"></div>
            <div class="mt-info-type" id="mt-info-type"></div>
            <div class="mt-info-rows" id="mt-info-rows"></div>
          </div>
          <div class="mt-milestone-banner" id="mt-milestone"></div>
          <div style="position:absolute;bottom:8px;left:12px;font-size:.52rem;color:rgba(0,212,255,.3);letter-spacing:.1em">DRAG ROTATE · SCROLL ZOOM · SCRUB TIMELINE</div>
        </div>
        <div id="mt-desc-text" style="font-size:.68rem;color:rgba(255,255,255,.72);line-height:1.75;padding:.65rem 1rem;background:var(--bg1);border:1px solid var(--bd);border-left:2px solid var(--c);min-height:2.8rem;margin-bottom:.6rem;transition:border-color .4s">
          Select a mission and press Play to begin.
        </div>
        <div class="mt-controls">
          <button class="btn" id="mt-play" style="padding:.4rem .9rem;font-size:.6rem">▶ PLAY</button>
          <button class="btn secondary" id="mt-slower" style="padding:.4rem .8rem;font-size:.6rem">◀◀</button>
          <button class="btn secondary" id="mt-faster" style="padding:.4rem .8rem;font-size:.6rem">▶▶</button>
          <button class="btn btn-c" id="mt-reset" style="padding:.4rem .8rem;font-size:.6rem">⟳ RESET</button>
          <span style="font-size:.58rem;color:var(--dim)">SPEED: <span id="mt-spd" style="color:var(--g)">1×</span></span>
          <div class="mt-cam-btns" style="margin-left:.5rem">
            <button class="mt-cam-btn active" data-cam="cinematic">🎬 CINEMATIC</button>
            <button class="mt-cam-btn" data-cam="orbit">🌐 ORBIT</button>
            <button class="mt-cam-btn" data-cam="top">⬆ TOP</button>
          </div>
          <span class="mt-hint" id="mt-scale" style="min-width:200px;text-align:right">—</span>
        </div>
        <div style="display:flex;gap:1.4rem;font-size:.58rem;color:var(--dim);margin-bottom:.4rem;flex-wrap:wrap">
          <span id="mt-craft-spd" style="color:var(--g)">—</span>
          <span id="mt-light-delay" style="color:var(--c)">—</span>
          <span id="mt-scale-rel" style="color:var(--dim)">—</span>
        </div>
        <div class="mt-timeline-wrap">
          <div class="mt-timeline-track"><div class="mt-timeline-fill" id="mt-tl-fill"></div></div>
          <div class="mt-phase-markers" id="mt-phase-marks"></div>
          <input type="range" id="mt-timeline" min="0" max="1000" value="0">
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 8. MISSION LAB (all 7 tools with tabs)
# ─────────────────────────────────────────────────────────────────────────────
lab_block = """
        <span class="tac-st">// AEROSPACE TOOLS</span>
        <h2 class="tac-sn">MISSION <span style="color:var(--c)">LAB</span></h2>
        <span class="smeta" style="display:block;margin-bottom:1rem">7 SIMULATIONS · REAL PHYSICS · 3D · DRAG TO ROTATE</span>
        <p class="lab-info">Built from real aerospace engineering. <strong>Atmospheric models, orbital mechanics, delta-v budgets, Keplerian elements</strong> — the exact equations used in real mission design.</p>

        <div class="lab-tab-bar">
          <button class="lab-tab-btn on"  data-lab="t1">🔥 REENTRY FORGE</button>
          <button class="lab-tab-btn"     data-lab="t2">⚙ ORBITAL SANDBOX</button>
          <button class="lab-tab-btn"     data-lab="t3">💥 DEBRIS FIELD</button>
          <button class="lab-tab-btn"     data-lab="t4">🚀 DELTA-V PLANNER</button>
          <button class="lab-tab-btn"     data-lab="t5">☄ APOPHIS 2029</button>
          <button class="lab-tab-btn"     data-lab="t6">🌟 EXOPLANET TRANSITS</button>
          <button class="lab-tab-btn"     data-lab="t7">⚫ BLACK HOLE</button>
        </div>

        <!-- TOOL 1: REENTRY FORGE -->
        <div class="lab-p on" id="lab-t1">
          <div class="lab-layout">
            <div class="lab-controls">
              <div><div class="lc-label">Satellite</div>
                <select class="lc-select" id="rf-sat">
                  <option value="custom">— Custom parameters —</option>
                  <option value="skylab">Skylab (1979) — 77t</option>
                  <option value="mir">Mir (2001) — 135t</option>
                  <option value="tiangong">Tiangong-1 (2018) — 8.5t</option>
                  <option value="rosat">ROSAT (2011) — 2.4t</option>
                  <option value="erbs">ERBS (2023) — 2.45t</option>
                  <option value="cosmos">Cosmos-954 (1978) — 3.8t</option>
                </select></div>
              <div><div class="lc-label">Mass (kg) <span id="rf-mass-v" class="lc-val">2400</span></div><input type="range" class="lc-input" id="rf-mass" min="100" max="200000" value="2400" step="100"></div>
              <div><div class="lc-label">Cross-section (m²) <span id="rf-area-v" class="lc-val">10</span></div><input type="range" class="lc-input" id="rf-area" min="1" max="500" value="10" step="1"></div>
              <div><div class="lc-label">Drag coeff. Cd <span id="rf-cd-v" class="lc-val">2.2</span></div><input type="range" class="lc-input" id="rf-cd" min="1.5" max="3.5" value="2.2" step="0.1"></div>
              <div><div class="lc-label">Initial altitude (km) <span id="rf-alt-v" class="lc-val">400</span></div><input type="range" class="lc-input" id="rf-alt" min="150" max="600" value="400" step="5"></div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <button class="lab-btn" id="rf-btn-sim">▶ SIMULATE</button>
                <button class="lab-btn secondary" id="rf-btn-reset">⟳ RESET</button>
              </div>
              <div id="rf-status" class="lab-status ls-orbit">AWAITING SIMULATION</div>
              <div class="lab-readout">
                <div class="lr-item"><div class="lr-label">Altitude</div><div class="lr-val" id="rf-r-alt">—</div></div>
                <div class="lr-item"><div class="lr-label">Velocity</div><div class="lr-val" id="rf-r-vel">—</div></div>
                <div class="lr-item"><div class="lr-label">Heating Q̇</div><div class="lr-val" id="rf-r-heat">—</div></div>
                <div class="lr-item"><div class="lr-label">Dyn. pressure</div><div class="lr-val" id="rf-r-q">—</div></div>
                <div class="lr-item"><div class="lr-label">Ballistic coeff.</div><div class="lr-val" id="rf-r-bc">—</div></div>
                <div class="lr-item"><div class="lr-label">Survives?</div><div class="lr-val" id="rf-r-surv">—</div></div>
              </div>
            </div>
            <div class="lab-cv-wrap"><canvas id="rf-cv"></canvas></div>
          </div>
        </div>

        <!-- TOOL 2: ORBITAL SANDBOX -->
        <div class="lab-p" id="lab-t2">
          <div class="lab-layout">
            <div class="lab-controls">
              <div><div class="lc-label">Semi-major axis <span id="os-sma-v" class="lc-val">6771 km</span></div><input type="range" class="lc-input" id="os-sma" min="6571" max="42164" value="6771" step="50"></div>
              <div><div class="lc-label">Eccentricity <span id="os-ecc-v" class="lc-val">0.00</span></div><input type="range" class="lc-input" id="os-ecc" min="0" max="0.9" value="0" step="0.01"></div>
              <div><div class="lc-label">Inclination <span id="os-inc-v" class="lc-val">0°</span></div><input type="range" class="lc-input" id="os-inc" min="0" max="180" value="0" step="1"></div>
              <div><div class="lc-label">RAAN Ω <span id="os-raan-v" class="lc-val">0°</span></div><input type="range" class="lc-input" id="os-raan" min="0" max="360" value="0" step="1"></div>
              <div><div class="lc-label">Arg. of perigee ω <span id="os-aop-v" class="lc-val">0°</span></div><input type="range" class="lc-input" id="os-aop" min="0" max="360" value="0" step="1"></div>
              <div><div class="lc-label">True anomaly θ <span id="os-ta-v" class="lc-val">0°</span></div><input type="range" class="lc-input" id="os-ta" min="0" max="359" value="0" step="1"></div>
              <div class="lab-readout">
                <div class="lr-item"><div class="lr-label">Periapsis</div><div class="lr-val" id="os-peri">200 km</div></div>
                <div class="lr-item"><div class="lr-label">Apoapsis</div><div class="lr-val" id="os-apo">200 km</div></div>
                <div class="lr-item"><div class="lr-label">Period</div><div class="lr-val" id="os-period">88 min</div></div>
                <div class="lr-item"><div class="lr-label">Velocity</div><div class="lr-val" id="os-vel">7.8 km/s</div></div>
              </div>
              <div class="match-sat" id="os-match">Closest match: <strong>ISS</strong></div>
            </div>
            <div class="lab-cv-wrap"><canvas id="os-cv"></canvas></div>
          </div>
        </div>

        <!-- TOOL 3: DEBRIS FIELD -->
        <div class="lab-p" id="lab-t3">
          <div class="lab-cv-wrap full" style="margin-bottom:1rem"><canvas id="df-cv"></canvas></div>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem">
            <div><div class="lc-label">Shell</div>
              <select class="lc-select" id="df-shell" style="width:160px">
                <option value="leo">LEO (200–2000 km)</option>
                <option value="meo">MEO (2000–20000 km)</option>
                <option value="geo">GEO (35786 km)</option>
              </select></div>
            <button class="lab-btn" id="df-btn-add">+ ADD 10 OBJECTS</button>
            <button class="lab-btn danger" id="df-btn-casc">⚠ TRIGGER CASCADE</button>
            <button class="lab-btn secondary" id="df-btn-reset">⟳ RESET</button>
          </div>
          <div class="lab-readout" style="grid-template-columns:repeat(4,1fr)">
            <div class="lr-item"><div class="lr-label">Total objects</div><div class="lr-val" id="df-count">0</div></div>
            <div class="lr-item"><div class="lr-label">Collision prob.</div><div class="lr-val" id="df-prob">0.00%</div></div>
            <div class="lr-item"><div class="lr-label">Years to cascade</div><div class="lr-val" id="df-years">∞</div></div>
            <div class="lr-item"><div class="lr-label">Status</div><div class="lr-val" id="df-status">STABLE</div></div>
          </div>
          <div class="kessler-warn" id="df-kessler">⚠ KESSLER SYNDROME — CASCADE IN PROGRESS</div>
        </div>

        <!-- TOOL 4: DELTA-V PLANNER -->
        <div class="lab-p" id="lab-t4">
          <div class="lab-layout">
            <div class="lab-controls">
              <div><div class="lc-label">Origin</div>
                <select class="lc-select" id="dv-from">
                  <option value="leo">Low Earth Orbit (LEO)</option>
                  <option value="geo">Geostationary (GEO)</option>
                  <option value="moon">Lunar orbit</option>
                </select></div>
              <div><div class="lc-label">Destination</div>
                <select class="lc-select" id="dv-to">
                  <option value="geo">Geostationary (GEO)</option>
                  <option value="moon">Lunar orbit</option>
                  <option value="mars">Mars orbit</option>
                  <option value="venus">Venus orbit</option>
                  <option value="jupiter">Jupiter orbit</option>
                </select></div>
              <div><div class="lc-label">Mass (kg) <span id="dv-mass-v" class="lc-val">1000</span></div><input type="range" class="lc-input" id="dv-mass" min="100" max="50000" value="1000" step="100"></div>
              <div><div class="lc-label">Isp (s) <span id="dv-isp-v" class="lc-val">450</span></div><input type="range" class="lc-input" id="dv-isp" min="200" max="5000" value="450" step="50"></div>
              <div id="dv-budget" class="dv-budget"></div>
              <div id="dv-ttime" class="transfer-time"></div>
              <div class="lab-readout">
                <div class="lr-item"><div class="lr-label">Total Δv</div><div class="lr-val" id="dv-total">—</div></div>
                <div class="lr-item"><div class="lr-label">Propellant</div><div class="lr-val" id="dv-fuel">—</div></div>
              </div>
            </div>
            <div class="lab-cv-wrap"><canvas id="dv-cv"></canvas></div>
          </div>
        </div>

        <!-- TOOL 5: APOPHIS 2029 -->
        <div class="lab-p" id="lab-t5">
          <div class="lab-cv-wrap full" style="margin-bottom:1rem;position:relative">
            <canvas id="ap-cv"></canvas>
            <div class="apophis-closest" id="ap-badge">⬡ APPROACHING</div>
          </div>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem">
            <button class="lab-btn" id="ap-play">▶ PLAY</button>
            <button class="lab-btn secondary" id="ap-btn-reset">⟳ RESET</button>
            <div style="flex:1;display:flex;align-items:center;gap:.8rem">
              <span style="font-size:.6rem;color:var(--dim);white-space:nowrap">Apr 8</span>
              <input type="range" class="lc-input" id="ap-slider" min="0" max="1000" value="0" step="1" style="flex:1">
              <span style="font-size:.6rem;color:var(--dim);white-space:nowrap">Apr 18</span>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span style="font-size:.6rem;color:var(--dim)">SPEED</span>
              <input type="range" class="lc-input" id="ap-speed" min="1" max="8" value="1" step="1" style="width:80px">
              <span id="ap-speed-v" style="font-size:.6rem;color:var(--g);min-width:16px">1×</span>
            </div>
          </div>
          <div class="lab-readout" style="grid-template-columns:repeat(4,1fr)">
            <div class="lr-item"><div class="lr-label">Date (UTC)</div><div class="lr-val" id="ap-date" style="font-size:.62rem">Apr 1, 2029</div></div>
            <div class="lr-item"><div class="lr-label">Distance from Earth</div><div class="lr-val" id="ap-dist">—</div></div>
            <div class="lr-item"><div class="lr-label">From surface</div><div class="lr-val" id="ap-surf">—</div></div>
            <div class="lr-item"><div class="lr-label">Relative velocity</div><div class="lr-val" id="ap-vel">—</div></div>
          </div>
          <p style="font-size:.65rem;color:var(--dim);margin-top:.7rem;line-height:1.7">
            Apophis (370m wide) passes Earth at <strong style="color:var(--r)">37,371 km</strong> on April 13, 2029 — inside the GPS satellite ring. 3 billion people will see it naked-eye.
          </p>
        </div>

        <!-- TOOL 6: EXOPLANET TRANSITS -->
        <div class="lab-p" id="lab-t6">
          <div class="lab-cv-wrap full" style="margin-bottom:1rem;position:relative">
            <canvas id="et-cv"></canvas>
            <div style="position:absolute;top:10px;left:12px;font-size:.65rem;color:var(--p);letter-spacing:.15em;text-shadow:0 0 5px var(--p)">EXOPLANET TRANSIT OBSERVATION</div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:120px;background:rgba(1,2,10,0.85);border-top:1px solid var(--p);padding:10px;display:flex;flex-direction:column">
              <div style="font-size:.58rem;color:var(--p);letter-spacing:.15em;margin-bottom:5px;display:flex;justify-content:space-between">
                <span>RELATIVE FLUX (STAR BRIGHTNESS)</span>
                <span id="et-flux-val" style="color:#fff">100.00%</span>
              </div>
              <div style="flex:1;position:relative" id="et-graph-wrap">
                <canvas id="et-graph-cv" style="width:100%;height:100%"></canvas>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem">
            <div style="flex:1;display:flex;align-items:center;gap:.8rem;min-width:200px">
              <span style="font-size:.6rem;color:var(--dim);white-space:nowrap;width:70px">PLANET SIZE</span>
              <input type="range" class="lc-input" id="et-size" min="0.05" max="0.5" value="0.15" step="0.01" style="flex:1;accent-color:var(--p)">
              <span id="et-size-v" style="font-size:.6rem;color:var(--p);min-width:30px">1.5 R⊕</span>
            </div>
            <div style="flex:1;display:flex;align-items:center;gap:.8rem;min-width:200px">
              <span style="font-size:.6rem;color:var(--dim);white-space:nowrap;width:70px">ORBIT DISTANCE</span>
              <input type="range" class="lc-input" id="et-dist" min="1.1" max="4.0" value="2.0" step="0.1" style="flex:1;accent-color:var(--p)">
              <span id="et-dist-v" style="font-size:.6rem;color:var(--p);min-width:30px">0.2 AU</span>
            </div>
            <button class="lab-btn secondary" id="et-btn-reset" style="border-color:var(--p);color:var(--p)">⟳ RESET</button>
          </div>
          <div class="lab-readout" style="grid-template-columns:repeat(4,1fr);border-color:rgba(139,92,246,0.3)">
            <div class="lr-item"><div class="lr-label">Transit Depth</div><div class="lr-val" id="et-depth" style="color:var(--p)">2.25%</div></div>
            <div class="lr-item"><div class="lr-label">Status</div><div class="lr-val" id="et-status">OUT OF TRANSIT</div></div>
            <div class="lr-item"><div class="lr-label">Discovery Method</div><div class="lr-val">Transit Photometry</div></div>
            <div class="lr-item"><div class="lr-label">Equivalent</div><div class="lr-val" id="et-equiv" style="font-size:.58rem">Kepler-22b</div></div>
          </div>
        </div>

        <!-- TOOL 7: BLACK HOLE (placeholder) -->
        <div class="lab-p" id="lab-t7">
          <div class="lab-cv-wrap full"><canvas id="bh-cv"></canvas></div>
          <p style="font-size:.65rem;color:var(--dim);margin-top:.7rem;line-height:1.7">
            Event horizon simulation using the Kerr metric — light bending, gravitational lensing, and photon orbits around a rotating black hole.
          </p>
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 9. SPACE QUIZ
# ─────────────────────────────────────────────────────────────────────────────
quiz_block = """
        <span class="tac-st">// KNOWLEDGE TEST</span>
        <h2 class="tac-sn">SPACE <span style="color:var(--a)">QUIZ</span></h2>
        <span class="smeta" style="display:block;margin-bottom:1rem">10 QUESTIONS · REAL AEROSPACE SCIENCE</span>
        <div class="quiz-box" id="quiz-box">
          <div id="quiz-inner">
            <div class="quiz-score-bar">
              <span id="quiz-score-label">0 / 0</span>
              <div class="quiz-score-track"><div class="quiz-score-fill" id="quiz-bar"></div></div>
              <span id="quiz-q-num" style="color:var(--c)">Q1 / 10</span>
            </div>
            <div class="quiz-num" id="quiz-category">ORBITAL MECHANICS</div>
            <div class="quiz-q" id="quiz-question">Loading question...</div>
            <div class="quiz-opts" id="quiz-opts"></div>
            <div class="quiz-explain" id="quiz-explain"></div>
            <div style="display:flex;justify-content:flex-end">
              <button class="btn" id="quiz-next" style="display:none" onclick="nextQuestion()">NEXT QUESTION →</button>
            </div>
          </div>
          <div id="quiz-result" class="quiz-result" style="display:none">
            <div class="quiz-result-n" id="res-score"></div>
            <div class="quiz-result-t" id="res-label"></div>
            <div style="font-size:.72rem;color:var(--dim);margin-bottom:1.8rem;line-height:1.7" id="res-msg"></div>
            <div class="quiz-share">
              <button class="btn" onclick="restartQuiz()">⟳ RETRY</button>
              <a id="quiz-tweet" href="#" target="_blank" class="btn btn-c">𝕏 SHARE SCORE</a>
            </div>
          </div>
        </div>"""

# ─────────────────────────────────────────────────────────────────────────────
# 10. ABOUT / FOOTER (keeping the original $VOID section & footer)
# ─────────────────────────────────────────────────────────────────────────────
about_block = """
        <div class="about-w">
          <div class="ab-role">// SIGNAL ORIGIN — AEROSPACE ENGINEER</div>
          <h2 class="ab-q">
            I compute reentry heating profiles for a living.<br>
            <span>VøidSignal is what that looks like as art.</span>
          </h2>
          <p class="ab-p">
            I'm an aerospace engineering student grinding through student debt with one plan: make space
            so beautiful and so understandable that people can't look away.<br><br>
            Every animation here is built from real orbital mechanics. Every satellite has a real story.
            Every number is physics, not fiction.<br><br>
            Space is the most extraordinary thing our species has ever done.
            Most people have never been shown how extraordinary it really is. That's what this is for.
          </p>
          <div class="ab-tags">
            <span class="ab-tag">ORBITAL MECHANICS</span>
            <span class="ab-tag">REENTRY DYNAMICS</span>
            <span class="ab-tag">ASTRODYNAMICS</span>
            <span class="ab-tag">PYTHON + NUMPY</span>
            <span class="ab-tag">STUDENT DEBT SURVIVOR</span>
            <span class="ab-tag">FUTURE SPACE RESEARCHER</span>
          </div>
        </div>"""

# Build the new sections to inject
new_sections = (
    section("sec-today", "scene-blank", today_apophis, wide=True) +
    section("sec-news", "scene-blank", news_block, wide=True) +
    section("sec-sw", "scene-orrery", sw_block, wide=True) +
    section("sec-dsn", "scene-blank", dsn_block, wide=True) +
    section("sec-sl", "scene-sl", sl_block, wide=True) +
    section("sec-explore", "scene-blank", explore_block, wide=True) +
    section("sec-mt", "scene-mt-canvas", mt_block, wide=True) +
    section("sec-lab", "scene-rf", lab_block, wide=True) +
    section("sec-quiz", "scene-blank", quiz_block, wide=True) +
    section("sec-about", "scene-blank", about_block, wide=False)
)

# ─────────────────────────────────────────────────────────────────────────────
# Inject BEFORE the $VOID token section (sec-void) but AFTER the existing sections
# We'll look for the closing </div> right before canvas-fixed-bg
# ─────────────────────────────────────────────────────────────────────────────
# Target: the "</div>" that closes the content-scroll wrapper (line 305 in index.html)
# This is the line that has "   </div>" right before the whitespace before canvas-fixed-bg

# Approach: insert before the $VOID section
INJECT_MARKER = '    <!-- $VOID TOKEN -->'
if INJECT_MARKER in new:
    new = new.replace(INJECT_MARKER, new_sections + '\n\n' + INJECT_MARKER)
    print("✓ Successfully injected all missing sections before $VOID TOKEN marker!")
else:
    # Fallback: inject before the closing of content-scroll
    FALLBACK = '    </div>\n\n  \n  </div>\n\n  <div id="canvas-fixed-bg"'
    if FALLBACK in new:
        new = new.replace(FALLBACK, new_sections + '\n' + FALLBACK)
        print("✓ Injected via fallback marker!")
    else:
        print("ERROR: Could not find injection point! Check index.html structure.")
        exit(1)

# Also update nav links to include the new sections
old_nav = '''      <a href="#sec-iss3d" style="color:#fff; text-decoration:none;">TELEMETRY</a>
      <a href="#sec-jwst" style="color:#fff; text-decoration:none;">JWST</a>
      <a href="#sec-orrery" style="color:#fff; text-decoration:none;">ORRERY</a>
      <a href="#sec-rf" style="color:#fff; text-decoration:none;">SIMULATIONS</a>'''

new_nav = '''      <a href="#sec-iss3d" style="color:#fff; text-decoration:none;">TELEMETRY</a>
      <a href="#sec-jwst" style="color:#fff; text-decoration:none;">JWST</a>
      <a href="#sec-orrery" style="color:#fff; text-decoration:none;">ORRERY</a>
      <a href="#sec-sw" style="color:#fff; text-decoration:none;">WEATHER</a>
      <a href="#sec-mt" style="color:#fff; text-decoration:none;">MISSIONS</a>
      <a href="#sec-lab" style="color:#fff; text-decoration:none; color:var(--c);">LAB</a>
      <a href="#sec-explore" style="color:#fff; text-decoration:none;">DATABASE</a>
      <a href="#sec-void" style="color:var(--a); text-decoration:none; font-weight:700;">$VOID</a>'''

new = new.replace(old_nav, new_nav)

# Write out
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new)

print("✓ index.html written successfully! All sections merged.")
print(f"New file length: {len(new)} bytes")
