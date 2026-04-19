/* ═══════════════════════════════════════════════════════════════
   VOIDSIGNAL — CINEMATIC 3D BACKGROUND ENGINE
   Three.js r128 · Planet · Orbital Rings · Satellites · Nebula · Stars
   Mouse parallax · Scroll-reactive camera
═══════════════════════════════════════════════════════════════ */
(function() {
'use strict';

const bgCanvas = document.getElementById('bg-canvas');
if (!bgCanvas) return;

// Wait for Three.js
function initWhenReady() {
  if (typeof THREE === 'undefined') {
    setTimeout(initWhenReady, 80);
    return;
  }
  init();
}
initWhenReady();

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050510, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 30, 80);
  camera.lookAt(0, 0, 0);

  // Atmospheric fog
  scene.fog = new THREE.FogExp2(0x050510, 0.004);

  // ── STARS ──────────────────────────────────────────────────────
  const starCount = 5000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    starPos[i*3]   = (Math.random() - 0.5) * 700;
    starPos[i*3+1] = (Math.random() - 0.5) * 700;
    starPos[i*3+2] = (Math.random() - 0.5) * 700;
    starSizes[i] = Math.random() * 2.5 + 0.3;
    // Varied star colours: blue-white, orange-red, pure white
    const t = Math.random();
    const c = new THREE.Color();
    if (t < 0.08)       c.setHSL(0.04, 0.9, 0.75);  // orange giants
    else if (t < 0.18)  c.setHSL(0.62, 0.9, 0.85);  // blue hot stars
    else                c.setHSL(0.0,  0.0, 0.95);   // white
    starColors[i*3] = c.r; starColors[i*3+1] = c.g; starColors[i*3+2] = c.b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('size',     new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute('color',    new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      uniform float uTime;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (220.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = 0.45 + 0.55 * sin(uTime * 0.4 + position.x * 0.08 + position.y * 0.07);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float alpha = (1.0 - d) * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ── CENTRAL PLANET ─────────────────────────────────────────────
  const planetGeo = new THREE.SphereGeometry(8, 96, 96);
  const planetMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 2.8);
        vec3 deep   = vec3(0.01, 0.06, 0.18);
        vec3 ocean  = vec3(0.0, 0.6, 1.0);
        vec3 land   = vec3(0.1, 0.35, 0.15);
        vec3 atm    = vec3(0.5, 0.32, 0.96);
        float n1 = sin(vPos.x * 2.5 + uTime * 0.4) * sin(vPos.y * 2.2 + uTime * 0.25) * sin(vPos.z * 2.8 + uTime * 0.35);
        float n2 = sin(vPos.x * 5.0 + uTime * 0.6 + 1.2) * sin(vPos.y * 4.5 + uTime * 0.5);
        float landMask = smoothstep(0.1, 0.4, n1 * 0.5 + 0.5);
        vec3 surface = mix(mix(deep, ocean, 0.7), land, landMask * 0.65);
        vec3 col = mix(surface, atm, fresnel * 0.8);
        col += fresnel * vec3(0.0, 0.55, 1.1) * 0.6;
        col += n2 * 0.04 * vec3(0.5, 0.8, 1.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const planet = new THREE.Mesh(planetGeo, planetMat);
  scene.add(planet);

  // Atmosphere shell
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.62 - dot(vNormal, vec3(0,0,1)), 3.0);
        gl_FragColor = vec4(0.0, 0.55, 1.0, intensity * 0.5);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(9.5, 64, 64), atmosMat));

  // Outer glow
  const outerGlowMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.5 - dot(vNormal, vec3(0,0,1)), 4.0);
        gl_FragColor = vec4(0.3, 0.2, 0.9, intensity * 0.25);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 32), outerGlowMat));

  // ── ORBITAL RINGS ──────────────────────────────────────────────
  const rings = [];
  const ringData = [
    { r: 22, color: 0x00f0ff, op: 0.18, tilt: 0.42 },
    { r: 34, color: 0x8b5cf6, op: 0.14, tilt: 0.45 },
    { r: 48, color: 0xff00ff, op: 0.10, tilt: 0.48 },
    { r: 62, color: 0x00ff88, op: 0.08, tilt: 0.38 },
  ];
  ringData.forEach((rd, i) => {
    const geo = new THREE.RingGeometry(rd.r - 0.12, rd.r + 0.12, 160);
    const mat = new THREE.MeshBasicMaterial({
      color: rd.color, transparent: true, opacity: rd.op, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = rd.tilt + i * 0.025;
    ring.rotation.z = i * 0.12;
    scene.add(ring);
    rings.push({ mesh: ring, speed: 0.015 + i * 0.007, tiltZ: i * 0.12 });
  });

  // ── ORBITING SATELLITES ────────────────────────────────────────
  const sats = [];
  const satColors = [0x00f0ff, 0x8b5cf6, 0xff00ff, 0x00ff88];
  for (let i = 0; i < 10; i++) {
    const satGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const satMat = new THREE.MeshBasicMaterial({ color: satColors[i % 4], transparent: true, opacity: 0.92 });
    const sat = new THREE.Mesh(satGeo, satMat);
    const glowGeo = new THREE.SphereGeometry(1.6, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: satColors[i % 4], transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
    sat.add(new THREE.Mesh(glowGeo, glowMat));
    const rd = ringData[i % 4];
    sat.userData = {
      orbitR: rd.r,
      speed: 0.18 + Math.random() * 0.25,
      offset: Math.random() * Math.PI * 2,
      tilt:   rd.tilt + (i % 4) * 0.025
    };
    scene.add(sat);
    sats.push(sat);
  }

  // ── NEBULA CLOUD ───────────────────────────────────────────────
  const nebCount = 2000;
  const nebGeo = new THREE.BufferGeometry();
  const nebPos = new Float32Array(nebCount * 3);
  const nebCol = new Float32Array(nebCount * 3);
  for (let i = 0; i < nebCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.random() * Math.PI;
    const r     = 90 + Math.random() * 130;
    nebPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    nebPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.28;
    nebPos[i*3+2] = r * Math.cos(phi);
    const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.32, 0.85, 0.38 + Math.random() * 0.28);
    nebCol[i*3] = c.r; nebCol[i*3+1] = c.g; nebCol[i*3+2] = c.b;
  }
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color',    new THREE.BufferAttribute(nebCol, 3));
  const nebMat = new THREE.PointsMaterial({ size: 1.8, transparent: true, opacity: 0.12, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const nebula = new THREE.Points(nebGeo, nebMat);
  scene.add(nebula);

  // ── LIGHTING ───────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x112244, 0.6));
  const sunLight = new THREE.DirectionalLight(0xffeedd, 1.6);
  sunLight.position.set(80, 30, 50);
  scene.add(sunLight);
  const rimLight = new THREE.DirectionalLight(0x4422aa, 0.5);
  rimLight.position.set(-60, -20, -40);
  scene.add(rimLight);

  // ── MOUSE / SCROLL TRACKING ────────────────────────────────────
  let mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollY = 0;
  document.addEventListener('mousemove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── ANIMATION LOOP ─────────────────────────────────────────────
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Smooth mouse / camera parallax
    mouse.x += (mouse.tx - mouse.x) * 0.055;
    mouse.y += (mouse.ty - mouse.y) * 0.055;
    const scrollF = scrollY * 0.018;
    camera.position.x = mouse.x * 9;
    camera.position.y = 30 - scrollF * 0.6 + mouse.y * 5;
    camera.position.z = 80 - scrollF * 0.35;
    camera.lookAt(0, -scrollF * 0.32, 0);

    // Planet rotation + shader time
    planet.rotation.y = time * 0.08;
    planetMat.uniforms.uTime.value = time;
    starMat.uniforms.uTime.value   = time;

    // Rings
    rings.forEach((r, i) => {
      r.mesh.rotation.z = r.tiltZ + time * r.speed;
    });

    // Satellites orbit
    sats.forEach(s => {
      const d = s.userData;
      const angle = time * d.speed + d.offset;
      s.position.x = Math.cos(angle) * d.orbitR;
      s.position.z = Math.sin(angle) * d.orbitR;
      s.position.y = Math.sin(angle) * d.orbitR * Math.cos(d.tilt) * 0.28;
    });

    // Nebula slow spin
    nebula.rotation.y = time * 0.009;

    renderer.render(scene, camera);
  }
  animate();
}

})();
