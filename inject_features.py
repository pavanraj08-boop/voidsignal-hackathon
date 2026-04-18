"""
inject_features.py
Adds 3 new hackathon-winning features to index.html and main.js:
  1. TLE Decoder        — paste TLE → full human-readable breakdown
  2. Cost Per Kg Chart  — animated 1957-2030 launch cost history
  3. Astronaut Bio Timeline — scroll-animated human body effects
"""

import os

# ══════════════════════════════════════════════════════════════════════════════
# HTML BLOCKS
# ══════════════════════════════════════════════════════════════════════════════

TLE_HTML = '''
<!-- ⑧ TLE DECODER — Educational orbital mechanics tool -->
<div class="wrap" id="tle-s" style="border-top:1px solid var(--bd)">
  <div class="sh">
    <span class="st">// ORBITAL MECHANICS</span>
    <h2 class="sn">TLE <span style="color:var(--c)">DECODER</span></h2>
    <div class="sl"></div>
    <span class="smeta">TWO-LINE ELEMENT SET · HUMAN-READABLE BREAKDOWN</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start">
    <div>
      <p style="font-size:.68rem;color:var(--dim);line-height:1.8;margin-bottom:1rem">
        A Two-Line Element set (TLE) is the universal format used by NORAD and NASA to describe where any satellite is in orbit. Paste any TLE below to get a complete human-readable breakdown.
      </p>
      <div style="background:var(--bg1);border:1px solid var(--bd);padding:.8rem;margin-bottom:.8rem">
        <div style="font-size:.52rem;color:var(--c);letter-spacing:.2em;margin-bottom:.5rem">// PASTE TLE BELOW</div>
        <textarea id="tle-input" placeholder="ISS (ZARYA)&#10;1 25544U 98067A   24001.50000000  .00020000  00000-0  36000-3 0  9990&#10;2 25544  51.6421 210.4235 0001234  75.2345 284.9055 15.50037600000000" style="width:100%;height:120px;background:var(--bg);border:1px solid var(--bd);color:var(--c);font-family:var(--mono);font-size:.65rem;padding:.6rem;outline:none;resize:vertical;line-height:1.6"></textarea>
      </div>
      <div style="display:flex;gap:.8rem;margin-bottom:1rem">
        <button class="btn" id="tle-decode-btn" style="font-size:.65rem;padding:.5rem 1.2rem">⬡ DECODE TLE</button>
        <button class="btn secondary" id="tle-iss-btn" style="font-size:.65rem;padding:.5rem 1rem">📡 LOAD ISS</button>
        <button class="btn secondary" id="tle-hubble-btn" style="font-size:.65rem;padding:.5rem 1rem">🔭 HUBBLE</button>
      </div>
      <canvas id="tle-cv" style="display:block;width:100%;height:200px;background:#01020A;border:1px solid var(--bd)"></canvas>
    </div>
    <div id="tle-output" style="background:var(--bg1);border:1px solid var(--bd);padding:1.2rem;min-height:300px">
      <div style="font-size:.6rem;color:var(--dim);text-align:center;padding:3rem 1rem;letter-spacing:.15em">⬡ PASTE A TLE AND CLICK DECODE</div>
    </div>
  </div>
</div>
'''

COST_HTML = '''
<!-- ⑨ COST PER KG TO ORBIT — Historical animated chart -->
<div class="wrap" id="cost-s" style="border-top:1px solid var(--bd)">
  <div class="sh">
    <span class="st">// LAUNCH ECONOMICS</span>
    <h2 class="sn">COST TO <span style="color:var(--g)">ORBIT</span></h2>
    <div class="sl"></div>
    <span class="smeta">1957–2030 · $/KG TO LEO · REUSABILITY REVOLUTION</span>
  </div>
  <div style="position:relative">
    <canvas id="cost-cv" style="display:block;width:100%;height:420px;background:#01020A;border:1px solid var(--bd)"></canvas>
    <div id="cost-tooltip" style="display:none;position:absolute;background:rgba(3,6,18,.95);border:1px solid var(--bd);padding:.7rem 1rem;font-size:.6rem;pointer-events:none;border-left:2px solid var(--g);backdrop-filter:blur(12px)"></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:1.4rem">
    <div style="background:var(--bg1);border:1px solid var(--bd);padding:1rem;border-left:2px solid #888888">
      <div style="font-size:.52rem;color:var(--dim);letter-spacing:.2em;margin-bottom:.3rem">SATURN V (1969)</div>
      <div style="font-family:var(--head);font-size:1.1rem;color:#BBBBBB">$54,000</div>
      <div style="font-size:.52rem;color:var(--dim)">/kg to LEO</div>
    </div>
    <div style="background:var(--bg1);border:1px solid var(--bd);padding:1rem;border-left:2px solid #CC4444">
      <div style="font-size:.52rem;color:var(--dim);letter-spacing:.2em;margin-bottom:.3rem">SPACE SHUTTLE (1981)</div>
      <div style="font-family:var(--head);font-size:1.1rem;color:#CC7777">$65,000</div>
      <div style="font-size:.52rem;color:var(--dim)">/kg to LEO</div>
    </div>
    <div style="background:var(--bg1);border:1px solid var(--bd);padding:1rem;border-left:2px solid var(--c)">
      <div style="font-size:.52rem;color:var(--dim);letter-spacing:.2em;margin-bottom:.3rem">FALCON 9 REUSE</div>
      <div style="font-family:var(--head);font-size:1.1rem;color:var(--c)">$2,700</div>
      <div style="font-size:.52rem;color:var(--dim)">/kg to LEO</div>
    </div>
    <div style="background:var(--bg1);border:1px solid var(--bd);padding:1rem;border-left:2px solid var(--g)">
      <div style="font-size:.52rem;color:var(--dim);letter-spacing:.2em;margin-bottom:.3rem">STARSHIP TARGET</div>
      <div style="font-family:var(--head);font-size:1.1rem;color:var(--g)">$100</div>
      <div style="font-size:.52rem;color:var(--dim)">/kg to LEO · projected</div>
    </div>
  </div>
  <p style="font-size:.66rem;color:var(--dim);line-height:1.85;margin-top:1.2rem;max-width:820px">
    At Starship's target price of <strong style="color:var(--g)">$100/kg</strong>, sending a human to orbit (average mass 80 kg) costs <strong style="color:var(--g)">$8,000</strong> — less than a business class flight to Tokyo. The inflection point with reusability is the most dramatic cost reduction in the history of transportation.
  </p>
</div>
'''

BIO_HTML = '''
<!-- ⑩ ASTRONAUT BIOMEDICAL TIMELINE -->
<div class="wrap" id="bio-s" style="border-top:1px solid var(--bd)">
  <div class="sh">
    <span class="st">// HUMAN SPACEFLIGHT</span>
    <h2 class="sn">ASTRONAUT <span style="color:var(--r)">BIOMEDICAL</span></h2>
    <div class="sl"></div>
    <span class="smeta">WHAT SPACE DOES TO THE HUMAN BODY · MARS MISSION RISK</span>
  </div>
  <div style="position:relative">
    <div id="bio-timeline" style="position:relative;overflow:hidden">
      <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--bd);transform:translateX(-50%)"></div>
      <!-- Events populated by JS -->
    </div>
    <div style="display:flex;justify-content:center;gap:1rem;margin-top:2rem">
      <button class="btn" id="bio-play-btn" style="font-size:.65rem;padding:.5rem 1.4rem">▶ ANIMATE TIMELINE</button>
      <button class="btn secondary" id="bio-reset-btn" style="font-size:.65rem;padding:.5rem 1rem">⟳ RESET</button>
    </div>
    <p style="font-size:.64rem;color:var(--dim);line-height:1.85;margin-top:1.2rem;max-width:820px">
      A Mars mission takes <strong style="color:var(--r)">6–9 months</strong> each way. Astronauts returning from the ISS after 6 months show measurable bone density loss, vision degradation from intracranial pressure, and reduced immune function. These are real risks to real people — not science fiction.
    </p>
  </div>
</div>
'''

# ══════════════════════════════════════════════════════════════════════════════
# JS MODULES
# ══════════════════════════════════════════════════════════════════════════════

TLE_JS = r'''
/* ════════════════════════════════════════════════════════════════
   TLE DECODER — Two-Line Element set human-readable parser
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var ISS_TLE = ['ISS (ZARYA)','1 25544U 98067A   24001.50000000  .00020000  00000-0  36000-3 0  9990','2 25544  51.6421 210.4235 0001234  75.2345 284.9055 15.50037600000000'];
var HUBBLE_TLE = ['HST','1 20580U 90037B   24001.50000000  .00000880  00000-0  46200-4 0  9996','2 20580  28.4703 339.2453 0002658 280.5477  79.5197 15.09257143000000'];

function parseTLE(raw){
  var lines=raw.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
  if(lines.length<2) return null;
  var name='', l1, l2;
  if(lines.length>=3 && lines[1][0]==='1'){name=lines[0];l1=lines[1];l2=lines[2];}
  else{l1=lines[0];l2=lines[1];}
  if(l1[0]!=='1'||l2[0]!=='2') return null;

  var catNum=parseInt(l1.substring(2,7)),
      classification=l1[7]||'U',
      intlDesig=l1.substring(9,17).trim(),
      epochStr=l1.substring(18,32).trim(),
      meanMotionDot=parseFloat(l1.substring(33,43)),
      bstar=parseBstar(l1.substring(53,61)),
      elsetNum=parseInt(l1.substring(64,68)),
      incl=parseFloat(l2.substring(8,16)),
      raan=parseFloat(l2.substring(17,25)),
      eccStr=l2.substring(26,33),
      ecc=parseFloat('0.'+eccStr),
      argPerigee=parseFloat(l2.substring(34,42)),
      meanAnomaly=parseFloat(l2.substring(43,51)),
      meanMotion=parseFloat(l2.substring(52,63)),
      revNum=parseInt(l2.substring(63,68));

  // Derived
  var mu=398600.4418;
  var n=meanMotion*2*Math.PI/86400;
  var a=Math.pow(mu/(n*n),1/3);
  var periodMin=(1440/meanMotion);
  var Re=6371;
  var apogee= a*(1+ecc)-Re;
  var perigee=a*(1-ecc)-Re;
  var velApogee=Math.sqrt(mu*(2/(a*(1+ecc))-1/a));
  var velPerigee=Math.sqrt(mu*(2/(a*(1-ecc))-1/a));

  // Epoch to date
  var epochYear=parseInt(epochStr.substring(0,2));
  var epYearFull=epochYear<57?2000+epochYear:1900+epochYear;
  var epochDay=parseFloat(epochStr.substring(2));
  var epochDate=new Date(Date.UTC(epYearFull,0,1)+(epochDay-1)*86400000);
  var daysSince=(Date.now()-epochDate.getTime())/86400000;

  return {
    name:name,catNum:catNum,classification:classification,intlDesig:intlDesig,
    epochStr:epochStr,epochDate:epochDate,daysSince:daysSince,
    meanMotionDot:meanMotionDot,bstar:bstar,elsetNum:elsetNum,
    incl:incl,raan:raan,ecc:ecc,arg:argPerigee,M:meanAnomaly,
    meanMotion:meanMotion,periodMin:periodMin,revNum:revNum,
    a:a,apogee:apogee,perigee:perigee,velApogee:velApogee,velPerigee:velPerigee
  };
}

function parseBstar(s){
  s=s.trim();
  if(s[0]==='-'){return -parseFloat('0.'+s.substring(2,7))*Math.pow(10,-parseInt(s[7])||0);}
  return parseFloat('0.'+s.substring(1,6))*Math.pow(10,-parseInt(s[6])||0);
}

function accuracy(daysSince){
  if(daysSince<1)return{label:'EXCELLENT',color:'#00FF9F',note:'< 1 day old, sub-kilometre accuracy'};
  if(daysSince<3)return{label:'GOOD',color:'#00FF9F',note:daysSince.toFixed(1)+' days old, ~km accuracy'};
  if(daysSince<7)return{label:'FAIR',color:'#FFC857',note:daysSince.toFixed(1)+' days old, tens of km drift possible'};
  if(daysSince<14)return{label:'DEGRADED',color:'#FF6B35',note:daysSince.toFixed(1)+' days old, hundreds of km error'};
  return{label:'STALE',color:'#E05C5C',note:daysSince.toFixed(1)+' days old · REFRESH NEEDED'};
}

function renderOutput(d){
  var acc=accuracy(d.daysSince);
  var epochStr=d.epochDate.toUTCString().replace(' GMT','');
  var out=document.getElementById('tle-output');
  out.innerHTML=[
    row('SATELLITE NAME',   d.name||'UNNAMED',              '#fff'),
    row('CATALOG NUMBER',   '#'+d.catNum+' ('+classify(d.classification)+')', 'var(--c)'),
    row('INTL DESIGNATOR',  d.intlDesig||'—',               'var(--a)'),
    '<div style="height:.5rem"></div>',
    hdr('ORBITAL EPOCH'),
    row('EPOCH UTC',        epochStr,                        '#fff'),
    row('TLE AGE',          d.daysSince.toFixed(2)+' days','var(--a)'),
    row('ACCURACY',         acc.label+' — '+acc.note,       acc.color),
    '<div style="height:.5rem"></div>',
    hdr('ORBITAL MECHANICS'),
    row('INCLINATION',      d.incl.toFixed(4)+'°',          'var(--c)'),
    row('RAAN',             d.raan.toFixed(4)+'° ('+raanDesc(d.raan)+')', '#fff'),
    row('ECCENTRICITY',     d.ecc.toFixed(7)+' ('+eccDesc(d.ecc)+')',     '#fff'),
    row('ARG OF PERIGEE',   d.arg.toFixed(4)+'°',           'var(--a)'),
    row('MEAN ANOMALY',     d.M.toFixed(4)+'°',             'var(--dim)'),
    '<div style="height:.5rem"></div>',
    hdr('DERIVED PARAMETERS'),
    row('ORBITAL PERIOD',   d.periodMin.toFixed(2)+' min  ('+d.meanMotion.toFixed(5)+' rev/day)', 'var(--g)'),
    row('SEMI-MAJOR AXIS',  (d.a/1000).toFixed(1)+' Mm',   'var(--g)'),
    row('APOGEE',           d.apogee.toFixed(1)+' km',      'var(--c)'),
    row('PERIGEE',          d.perigee.toFixed(1)+' km',     'var(--c)'),
    row('VEL @ APOGEE',     d.velApogee.toFixed(3)+' km/s', '#fff'),
    row('VEL @ PERIGEE',    d.velPerigee.toFixed(3)+' km/s','#fff'),
    '<div style="height:.5rem"></div>',
    hdr('METADATA'),
    row('ELEMENT SET #',    d.elsetNum.toString(),           'var(--dim)'),
    row('REVOLUTION #',     d.revNum.toString(),             'var(--dim)'),
    row('MEAN MOTION DRAG', d.meanMotionDot.toExponential(4)+' rev/day²', 'var(--dim)'),
    row('BSTAR DRAG TERM',  d.bstar.toExponential(4)+' 1/RE',             'var(--dim)'),
  ].join('');

  drawOrbit(d);
}

function hdr(t){return '<div style="font-size:.52rem;color:var(--c);letter-spacing:.22em;margin:.6rem 0 .3rem">// '+t+'</div>';}
function row(k,v,c){return '<div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.04);padding:.28rem 0;font-size:.6rem"><span style="color:rgba(255,255,255,.38);min-width:150px">'+k+'</span><span style="color:'+c+';text-align:right;word-break:break-all">'+v+'</span></div>';}
function classify(c){return c==='U'?'Unclassified':c==='C'?'Classified':'Secret';}
function raanDesc(r){return r<90?'Ascending NE':r<180?'Ascending NW':r<270?'Descending SW':'Descending SE';}
function eccDesc(e){return e<0.001?'Near-circular':e<0.1?'Slightly elliptic':e<0.5?'Elliptic':'Highly elliptic';}

function drawOrbit(d){
  var cv=document.getElementById('tle-cv'); if(!cv)return;
  var W=cv.offsetWidth||600, H=200;
  cv.width=W; cv.height=H;
  var ctx=cv.getContext('2d');
  ctx.fillStyle='#01020A'; ctx.fillRect(0,0,W,H);

  var cx=W/2, cy=H/2;
  var scale=H*0.38;
  var Re=6371;

  // Earth
  var earthR=(Re/d.a)*scale;
  var eg=ctx.createRadialGradient(cx,cy,0,cx,cy,earthR);
  eg.addColorStop(0,'#2266CC'); eg.addColorStop(1,'#0D2A52');
  ctx.beginPath(); ctx.arc(cx,cy,Math.max(4,earthR),0,Math.PI*2);
  ctx.fillStyle=eg; ctx.fill();

  // Atmosphere glow
  ctx.beginPath(); ctx.arc(cx,cy,earthR*1.15,0,Math.PI*2);
  ctx.strokeStyle='rgba(0,100,255,0.2)'; ctx.lineWidth=3; ctx.stroke();

  // Orbit ellipse
  var ae=d.ecc; var a2=scale; var b2=scale*Math.sqrt(1-ae*ae);
  var focusOffset=ae*a2;
  ctx.beginPath();
  ctx.ellipse(cx+focusOffset,cy,a2,b2,0,0,Math.PI*2);
  ctx.strokeStyle='rgba(0,212,255,0.7)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

  // Apogee / Perigee markers
  ctx.fillStyle='#FFC857'; ctx.font='bold 9px monospace';
  ctx.fillText('APO '+d.apogee.toFixed(0)+'km', cx+a2+focusOffset+4, cy-3);
  ctx.fillStyle='#00FF9F';
  ctx.fillText('PERI '+d.perigee.toFixed(0)+'km', cx-a2+focusOffset-4-ctx.measureText('PERI').width-40, cy-3);

  // Incl line
  var inclR=d.incl*Math.PI/180;
  ctx.strokeStyle='rgba(139,92,246,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-a2*0.9*Math.cos(inclR-Math.PI/2),cy-a2*0.9*Math.sin(inclR-Math.PI/2));
  ctx.lineTo(cx+a2*0.9*Math.cos(inclR-Math.PI/2),cy+a2*0.9*Math.sin(inclR-Math.PI/2)); ctx.stroke();
  ctx.fillStyle='rgba(139,92,246,.8)'; ctx.font='9px monospace';
  ctx.fillText('i='+d.incl.toFixed(1)+'°', cx+5, cy-a2*0.6*Math.sin(inclR)+10);
}

function decode(){
  var raw=document.getElementById('tle-input').value;
  var d=parseTLE(raw);
  if(!d){
    document.getElementById('tle-output').innerHTML='<div style="color:var(--r);padding:1rem;font-size:.65rem">⚠ Invalid TLE format. Make sure you paste 2 or 3 lines starting with "1 " and "2 ".</div>';
    return;
  }
  renderOutput(d);
}

document.getElementById('tle-decode-btn')&&document.getElementById('tle-decode-btn').addEventListener('click',decode);
document.getElementById('tle-iss-btn')&&document.getElementById('tle-iss-btn').addEventListener('click',function(){
  document.getElementById('tle-input').value=ISS_TLE.join('\n'); decode();
});
document.getElementById('tle-hubble-btn')&&document.getElementById('tle-hubble-btn').addEventListener('click',function(){
  document.getElementById('tle-input').value=HUBBLE_TLE.join('\n'); decode();
});

// Auto-decode ISS on load for demo
setTimeout(function(){
  if(document.getElementById('tle-input')){
    document.getElementById('tle-input').value=ISS_TLE.join('\n');
    decode();
  }
},500);

})(); // end TLE Decoder
'''

COST_JS = r'''
/* ════════════════════════════════════════════════════════════════
   COST PER KG TO ORBIT — Animated historical chart 1957–2030
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var DATA=[
  {y:1957,name:'Sputnik R-7',cost:null,color:'#888888',note:'Cost unknown'},
  {y:1962,name:'Titan II',cost:62000,color:'#888888',note:'Gemini era'},
  {y:1964,name:'Saturn I',cost:55000,color:'#AAAAAA',note:'Apollo buildup'},
  {y:1969,name:'Saturn V',cost:54000,color:'#CCCCCC',note:'Moon rocket'},
  {y:1973,name:'Delta II equiv.',cost:48000,color:'#AAAAAA',note:'Post-Apollo'},
  {y:1981,name:'Space Shuttle',cost:65000,color:'#CC4444',note:'Expensive reuse'},
  {y:1990,name:'Space Shuttle',cost:60000,color:'#CC4444',note:'Peak operations'},
  {y:1998,name:'Proton K',cost:12000,color:'#8888CC',note:'Russian cost advantage'},
  {y:2002,name:'Delta IV',cost:13000,color:'#AAAACC',note:'EELV era'},
  {y:2010,name:'Falcon 9 v1',cost:6000,color:'#44AACC',note:'SpaceX enters'},
  {y:2014,name:'Falcon 9 v1.1',cost:4000,color:'#44AADD',note:'Fairing recovery'},
  {y:2018,name:'Falcon 9 Block5',cost:2700,color:'#00CCFF',note:'Full reusability'},
  {y:2020,name:'Falcon 9 reuse',cost:2300,color:'#00D4FF',note:'Rapid cadence'},
  {y:2022,name:'Vulcan (est.)',cost:5000,color:'#7777CC',note:'New entrants'},
  {y:2024,name:'Falcon 9 current',cost:2200,color:'#00E5FF',note:'62 launches in 2023'},
  {y:2026,name:'Starship (est.)',cost:500,color:'#00FF99',note:'First commercial ops'},
  {y:2028,name:'Starship target',cost:200,color:'#00FF88',note:'High cadence'},
  {y:2030,name:'Starship goal',cost:100,color:'#00FF77',note:'Target price'},
];

var cvEl=document.getElementById('cost-cv');
var tooltip=document.getElementById('cost-tooltip');
if(!cvEl)return;

var animated=false;
var animProgress=0;

function drawChart(progress){
  var W=cvEl.offsetWidth||900, H=420;
  cvEl.width=W; cvEl.height=H;
  var ctx=cvEl.getContext('2d');

  var PAD={top:40,right:40,bottom:55,left:75};
  var cw=W-PAD.left-PAD.right, ch=H-PAD.top-PAD.bottom;

  ctx.fillStyle='#01020A'; ctx.fillRect(0,0,W,H);

  // Grid
  var maxCost=75000, minYear=1957, maxYear=2030;
  var yScale=function(v){return PAD.top+ch*(1-Math.log10(v)/Math.log10(maxCost));};
  var xScale=function(y){return PAD.left+cw*(y-minYear)/(maxYear-minYear);};

  // Y gridlines (log scale)
  [100,500,1000,2000,5000,10000,20000,50000,75000].forEach(function(v){
    var y2=yScale(v);
    if(y2<PAD.top||y2>PAD.top+ch)return;
    ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD.left,y2); ctx.lineTo(PAD.left+cw,y2); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='10px monospace'; ctx.textAlign='right';
    ctx.fillText('$'+(v>=1000?(v/1000)+'K':v),PAD.left-6,y2+3);
  });

  // X axis ticks
  for(var yr=1960;yr<=2030;yr+=10){
    var x2=xScale(yr);
    ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x2,PAD.top); ctx.lineTo(x2,PAD.top+ch); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font='11px monospace'; ctx.textAlign='center';
    ctx.fillText(yr,x2,PAD.top+ch+18);
  }

  // Axis labels
  ctx.fillStyle='rgba(0,212,255,.7)'; ctx.font='11px monospace'; ctx.textAlign='center';
  ctx.fillText('$/KG TO LEO (LOG SCALE)',PAD.left-50,PAD.top+ch/2-40);
  ctx.fillText('YEAR',PAD.left+cw/2,H-8);

  // Inflection annotation arrow
  var ix=xScale(2010), iy=yScale(6000);
  ctx.strokeStyle='rgba(0,212,255,.4)'; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(ix,PAD.top); ctx.lineTo(ix,PAD.top+ch); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,212,255,.8)'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
  ctx.fillText('SpaceX enters',ix,PAD.top+14);
  ctx.fillText('↓ REUSABILITY',ix,PAD.top+26);

  // Starship target annotation
  var sx=xScale(2030), sy=yScale(100);
  ctx.strokeStyle='rgba(0,255,153,.3)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(PAD.left,sy); ctx.lineTo(PAD.left+cw,sy); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(0,255,153,.7)'; ctx.font='bold 10px monospace'; ctx.textAlign='right';
  ctx.fillText('$100/kg Starship target → BUSINESS CLASS TO ORBIT',PAD.left+cw-4,sy-4);

  // Data line
  var validData=DATA.filter(function(d){return d.cost!==null;});
  var drawCount=Math.round(validData.length*Math.min(1,progress));

  if(drawCount>1){
    // Area
    ctx.beginPath(); ctx.moveTo(xScale(validData[0].y),PAD.top+ch);
    for(var i=0;i<drawCount;i++) ctx.lineTo(xScale(validData[i].y),yScale(validData[i].cost));
    ctx.lineTo(xScale(validData[drawCount-1].y),PAD.top+ch);
    ctx.closePath();
    var agrad=ctx.createLinearGradient(0,PAD.top,0,PAD.top+ch);
    agrad.addColorStop(0,'rgba(0,212,255,.18)'); agrad.addColorStop(1,'rgba(0,212,255,.02)');
    ctx.fillStyle=agrad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.moveTo(xScale(validData[0].y),yScale(validData[0].cost));
    for(var i=1;i<drawCount;i++) ctx.lineTo(xScale(validData[i].y),yScale(validData[i].cost));
    ctx.strokeStyle='rgba(0,212,255,.8)'; ctx.lineWidth=2.5; ctx.stroke();
  }

  // Dots
  for(var i=0;i<drawCount;i++){
    var d2=validData[i]; if(!d2.cost)continue;
    var px=xScale(d2.y), py=yScale(d2.cost);
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2);
    ctx.fillStyle=d2.color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1; ctx.stroke();

    // Name labels for key launchers
    if(['Saturn V','Space Shuttle','Falcon 9 Block5','Starship goal'].indexOf(d2.name)>=0){
      ctx.fillStyle=d2.color; ctx.font='bold 9px monospace'; ctx.textAlign='center';
      ctx.fillText(d2.name,px,py-12);
    }
  }

  // Title
  ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='bold 14px monospace'; ctx.textAlign='left';
  ctx.fillText('COST TO LOW EARTH ORBIT — 1957 TO 2030',PAD.left,PAD.top-14);
}

// Initial static draw
drawChart(1);

// Hover tooltip
cvEl.addEventListener('mousemove',function(e){
  var rect=cvEl.getBoundingClientRect();
  var mx=e.clientX-rect.left;
  var W2=cvEl.offsetWidth, PAD_l=75, cw2=W2-75-40;
  var yr=1957+(mx-PAD_l)/(cw2)*(2030-1957);
  var closest=null, minD=99999;
  DATA.forEach(function(d){
    if(!d.cost)return;
    var dx=Math.abs(d.y-yr); if(dx<minD){minD=dx;closest=d;}
  });
  if(closest&&minD<8){
    tooltip.style.display='block';
    tooltip.style.left=(e.clientX-rect.left+12)+'px';
    tooltip.style.top=(e.clientY-rect.top-60)+'px';
    tooltip.innerHTML='<div style="color:#fff;font-family:var(--head);font-size:.8rem">'+closest.name+'</div>'+
      '<div style="color:var(--g);font-size:.7rem">$'+closest.cost.toLocaleString()+'/kg</div>'+
      '<div style="color:var(--dim);font-size:.58rem">'+closest.y+' · '+closest.note+'</div>';
  } else {
    tooltip.style.display='none';
  }
});
cvEl.addEventListener('mouseleave',function(){if(tooltip)tooltip.style.display='none';});

// Animate on scroll into view
var costObs=new IntersectionObserver(function(entries){
  if(entries[0].isIntersecting&&!animated){
    animated=true;
    var start=null;
    function step(ts){
      if(!start)start=ts;
      var progress=(ts-start)/2000;
      animProgress=Math.min(1, 1-Math.pow(1-progress,3));
      drawChart(animProgress);
      if(animProgress<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
},{threshold:0.3});
var costEl=document.getElementById('cost-s');
if(costEl)costObs.observe(costEl);

window.addEventListener('resize',function(){drawChart(animated?1:1);});

})(); // end Cost Per Kg
'''

BIO_JS = r'''
/* ════════════════════════════════════════════════════════════════
   ASTRONAUT BIOMEDICAL TIMELINE — Effects of space on human body
════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var EVENTS=[
  {time:'LAUNCH',dur:0,side:'right',icon:'🚀',color:'#00FF9F',
   title:'Launch & Weightlessness',
   body:'Within minutes of reaching orbit, fluids shift headward (cephalad fluid shift). Face becomes puffy, nasal passages swell, and astronauts feel as if hanging upside down.'},
  {time:'HOUR 6',dur:6/720,side:'left',icon:'🧠',color:'#00D4FF',
   title:'Vestibular Conflict',
   body:'The inner ear detects gravity, but eyes see floating objects. ~60% of astronauts experience Space Adaptation Syndrome — nausea, disorientation, vomiting in the first 72 hours.'},
  {time:'DAY 3',dur:3/720,side:'right',icon:'💧',color:'#44AAFF',
   title:'Fluid Loss Begins',
   body:'The body perceives fluid overload from the headward shift. Kidneys increase urine output. Blood volume drops by ~15%. This reduces cardiovascular fitness for the return to Earth.'},
  {time:'WEEK 2',dur:14/720,side:'left',icon:'🦴',color:'#FFC857',
   title:'Bone Density Loss Starts',
   body:'Without gravitational loading, osteoclasts outpace osteoblasts. Bone density drops at ~1-2% per month — equivalent to a decade of osteoporosis. Lower body bones (femur, spine) are most affected.'},
  {time:'MONTH 1',dur:30/720,side:'right',icon:'💪',color:'#FF8844',
   title:'Muscle Atrophy',
   body:'Postural muscles (calves, lower back, core) atrophy rapidly. Without 2 hours of daily exercise on the ISS, astronauts would lose 20% of muscle mass in 5-11 days. Even with exercise, losses occur.'},
  {time:'MONTH 2',dur:60/720,side:'left',icon:'👁',color:'#8B5CF6',
   title:'Vision Degradation (SANS)',
   body:'Spaceflight-Associated Neuro-ocular Syndrome (SANS): intracranial pressure rise causes globe flattening and optic disc edema. ~70% of ISS astronauts show measurable vision changes. Cause of deep concern for Mars missions.'},
  {time:'MONTH 3',dur:90/720,side:'right',icon:'🧬',color:'#FF6B35',
   title:'Immune System Changes',
   body:'Cosmic radiation causes DNA strand breaks. White blood cell function is altered. Dormant Herpesvirus (EBV, VZV) reactivates in most astronauts. Immune senescence accelerated.'},
  {time:'MONTH 6',dur:180/720,side:'left',icon:'❤',color:'#E05C5C',
   title:'Cardiac Atrophy & Arrhythmia',
   body:'The heart becomes spherical rather than cone-shaped (cardiac remodeling). 3 of 4 astronauts on the ISS Year Mission showed arrhythmia after return. Blood pressure regulation degrades.'},
  {time:'RETURN',dur:1,side:'right',icon:'🌍',color:'#00FF9F',
   title:'Return to Earth — Rehabilitation',
   body:'Re-adaptation takes weeks to months. Orthostatic intolerance (fainting when standing), re-learning to walk, bone and muscle recovery. After 6-month missions, full recovery takes 3-12 months.'},
];

var container=document.getElementById('bio-timeline');
if(!container)return;

var items=[];

EVENTS.forEach(function(ev,idx){
  var div=document.createElement('div');
  div.style.cssText='display:flex;align-items:flex-start;margin-bottom:2rem;opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease;';
  div.dataset.idx=idx;

  if(ev.side==='right'){
    div.innerHTML='<div style="flex:1;text-align:right;padding-right:2rem">'+
      '<div style="font-size:.55rem;color:'+ev.color+';letter-spacing:.25em;margin-bottom:.3rem">'+ev.time+'</div>'+
      '<div style="font-family:var(--head);font-size:.82rem;color:#fff;margin-bottom:.4rem">'+ev.title+'</div>'+
      '<div style="font-size:.65rem;color:rgba(255,255,255,.6);line-height:1.75">'+ev.body+'</div>'+
    '</div>'+
    '<div style="width:36px;height:36px;border-radius:50%;background:'+ev.color+';display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;box-shadow:0 0 15px '+ev.color+'55;z-index:1">'+ev.icon+'</div>'+
    '<div style="flex:1;padding-left:2rem"></div>';
  } else {
    div.innerHTML='<div style="flex:1;padding-right:2rem"></div>'+
    '<div style="width:36px;height:36px;border-radius:50%;background:'+ev.color+';display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;box-shadow:0 0 15px '+ev.color+'55;z-index:1">'+ev.icon+'</div>'+
    '<div style="flex:1;text-align:left;padding-left:2rem">'+
      '<div style="font-size:.55rem;color:'+ev.color+';letter-spacing:.25em;margin-bottom:.3rem">'+ev.time+'</div>'+
      '<div style="font-family:var(--head);font-size:.82rem;color:#fff;margin-bottom:.4rem">'+ev.title+'</div>'+
      '<div style="font-size:.65rem;color:rgba(255,255,255,.6);line-height:1.75">'+ev.body+'</div>'+
    '</div>';
  }

  container.appendChild(div);
  items.push(div);
});

var isPlaying=false;

document.getElementById('bio-play-btn')&&document.getElementById('bio-play-btn').addEventListener('click',function(){
  if(isPlaying)return; isPlaying=true;
  var playBtn=document.getElementById('bio-play-btn');
  if(playBtn)playBtn.textContent='▶ PLAYING...';
  items.forEach(function(el){el.style.opacity='0';el.style.transform='translateY(20px)';});
  items.forEach(function(el,i){
    setTimeout(function(){
      el.style.opacity='1'; el.style.transform='translateY(0)';
      if(i===items.length-1){
        isPlaying=false;
        if(playBtn)playBtn.textContent='▶ ANIMATE TIMELINE';
      }
    }, 200+i*280);
  });
});

document.getElementById('bio-reset-btn')&&document.getElementById('bio-reset-btn').addEventListener('click',function(){
  isPlaying=false;
  items.forEach(function(el){el.style.opacity='0';el.style.transform='translateY(20px)';});
  var pb=document.getElementById('bio-play-btn'); if(pb)pb.textContent='▶ ANIMATE TIMELINE';
});

// Auto reveal on scroll
var bioObs=new IntersectionObserver(function(entries){
  if(entries[0].isIntersecting){
    items.forEach(function(el,i){
      setTimeout(function(){el.style.opacity='1';el.style.transform='translateY(0)';},100+i*200);
    });
    bioObs.disconnect();
  }
},{threshold:0.15});
var bioSec=document.getElementById('bio-s');
if(bioSec)bioObs.observe(bioSec);

})(); // end Bio Timeline
'''

# ══════════════════════════════════════════════════════════════════════════════
# PATCH index.html
# ══════════════════════════════════════════════════════════════════════════════

with open('index.html','r',encoding='utf-8') as f:
    html=f.read()

# Add nav links to top bar
OLD_AI = '<a href="#terminal-s">AI</a>'
NEW_AI = '<a href="#terminal-s">AI</a>\n    <a href="#tle-s">TLE</a>\n    <a href="#cost-s">COST</a>\n    <a href="#bio-s">BIO</a>'
html=html.replace(OLD_AI, NEW_AI, 1)

# Inject sections before the terminal
INJECT_BEFORE = '<!-- ④ VOID-AI TERMINAL -->'
NEW_SECTIONS = TLE_HTML + '\n' + COST_HTML + '\n' + BIO_HTML + '\n\n'
if INJECT_BEFORE in html:
    html=html.replace(INJECT_BEFORE, NEW_SECTIONS + INJECT_BEFORE, 1)
    print('HTML: injected 3 new sections before terminal.')
else:
    print('WARNING: could not find terminal comment in HTML')

# Update smeta for JWST
html=html.replace('SUN · EARTH · L1–L5 · FULL SOLAR SYSTEM',
                  'SUN · MERCURY · VENUS · EARTH+MOON · L1–L5 · JWST · PARKER PROBE', 1)
# Update JWST header
html=html.replace('<span class="st">// L2 LAGRANGE POINT</span>',
                  '<span class="st">// INNER SOLAR SYSTEM · L1–L5 OBSERVATORY</span>', 1)

with open('index.html','w',encoding='utf-8') as f:
    f.write(html)
print('index.html saved.')

# ══════════════════════════════════════════════════════════════════════════════
# PATCH main.js — append JS modules before the last IIFE
# ══════════════════════════════════════════════════════════════════════════════

with open('main.js','r',encoding='utf-8') as f:
    js=f.read()

# Insert before the hero stat counters section (near end of file)
INSERT_BEFORE='/* Hero stat counters, Apophis, and scroll reveal are below */'
NEW_JS=TLE_JS+'\n\n'+COST_JS+'\n\n'+BIO_JS+'\n\n'

if INSERT_BEFORE in js:
    js=js.replace(INSERT_BEFORE, NEW_JS+INSERT_BEFORE, 1)
    print('main.js: injected TLE, Cost, Bio JS modules.')
else:
    # fallback: append before last 200 chars
    js=js.rstrip()+'\n\n'+NEW_JS
    print('main.js: appended JS modules at end (fallback).')

with open('main.js','w',encoding='utf-8') as f:
    f.write(js)
print('main.js saved. Done!')
