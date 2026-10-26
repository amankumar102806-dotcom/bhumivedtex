/**
 * 3D Digital Elevation Model (DEM) & Slope Failure Simulation Engine
 * Using Three.js (WebGL)
 * Visualizes Dhanbad opencast coal mine benches, slip surfaces, and rockfall runout
 */

let demScene, demCamera, demRenderer;
let demMineMesh, demSlidingBlockMesh, demRunoutMesh;
let demDisplacementArrows = [];
let demParticles;
let isDemInitialized = false;
let isDemSimulatingFailure = false;
let demFailureProgress = 0;
let demWireframeActive = false;
let demHeatmapActive = true;

// Mouse navigation state
let isMouseDown = false;
let mouseButton = 0; // 0: left, 2: right
let prevMouseX = 0, prevMouseY = 0;
let spherical = { radius: 120, theta: Math.PI / 4, phi: Math.PI / 3 };
let targetLookAt = new THREE.Vector3(0, 5, 0);

function init3DDEM() {
  const container = document.getElementById('dem-three-canvas');
  if (!container || isDemInitialized) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  // 1. Scene
  demScene = new THREE.Scene();
  demScene.background = new THREE.Color(0x060913);
  demScene.fog = new THREE.FogExp2(0x060913, 0.005);

  // 2. Camera
  demCamera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
  updateCameraPosition();

  // 3. Renderer
  demRenderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  demRenderer.setSize(width, height);
  demRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  demRenderer.shadowMap.enabled = true;
  demRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.innerHTML = '';
  container.appendChild(demRenderer.domElement);

  // 4. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  demScene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
  sunLight.position.set(80, 120, 60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  demScene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
  fillLight.position.set(-60, 40, -50);
  demScene.add(fillLight);

  // 5. Generate Opencast Pit Stepped Benches Geometry
  createOpencastPitGeometry();

  // 6. Create Sliding Block for Failure Simulation
  createSlidingFailureBlock();

  // 7. Add Animated Displacement Vector Arrows
  createDisplacementVectors();

  // 8. Add Rockfall Debris Particles
  createDustParticles();

  // 9. Mouse / Touch Orbit Controls
  setupDEMControls(container);

  // 10. Window Resize Handler
  window.addEventListener('resize', onDEMWindowResize);

  isDemInitialized = true;
  animateDEM();
}

function updateCameraPosition() {
  demCamera.position.x = targetLookAt.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
  demCamera.position.y = targetLookAt.y + spherical.radius * Math.cos(spherical.phi);
  demCamera.position.z = targetLookAt.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
  demCamera.lookAt(targetLookAt);
}

// Generate stepped opencast mine pit with berms and batters
function createOpencastPitGeometry() {
  const planeSize = 140;
  const segments = 90;
  const geometry = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Distance from pit center
    const dist = Math.sqrt(x * x + z * z);
    let y = 0;

    // Outer ground rim: y = 25m
    if (dist > 55) {
      y = 25 + Math.sin(x * 0.1) * Math.cos(z * 0.1) * 1.5;
    } else if (dist > 15) {
      // Stepped benches (4 distinct mining bench levels)
      const benchStep = Math.floor((55 - dist) / 10);
      const frac = ((55 - dist) % 10) / 10;
      // Berm is flat (frac < 0.35), Batter is steep slope (frac >= 0.35)
      const benchHeight = 6;
      if (frac < 0.35) {
        y = 25 - (benchStep * benchHeight);
      } else {
        const slopeFrac = (frac - 0.35) / 0.65;
        y = 25 - (benchStep * benchHeight) - (slopeFrac * benchHeight);
      }
    } else {
      // Pit floor: y = 1m
      y = 1 + Math.sin(x * 0.2) * 0.3;
    }

    // Add highwall tension crack depression on the north-east crest (Sector 4 dump)
    if (x > 15 && x < 40 && z > 15 && z < 40) {
      y -= 1.8 * Math.exp(-((x - 28) ** 2 + (z - 28) ** 2) / 60);
    }

    pos.setY(i, y);

    // Vertex coloring for slope hazard heatmap
    const color = new THREE.Color();
    // High risk unstable zone on north-east bench
    if (x > 12 && x < 42 && z > 12 && z < 42 && y > 8) {
      // Red to orange hazard zone
      color.setRGB(0.95, 0.2, 0.2);
    } else if (dist > 25 && dist < 50) {
      // Moderate watch benches (amber / yellow)
      color.setRGB(0.85, 0.65, 0.2);
    } else {
      // Stable bedrock / pit floor (slate / sandstone grey-green)
      const lum = 0.25 + (y / 25) * 0.2;
      color.setRGB(lum * 0.8, lum * 0.85, lum * 0.7);
    }

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true
  });

  demMineMesh = new THREE.Mesh(geometry, material);
  demMineMesh.receiveShadow = true;
  demMineMesh.castShadow = true;
  demScene.add(demMineMesh);

  // Bench contour lines overlay
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.12 });
  const wireMesh = new THREE.Mesh(geometry.clone(), wireMat);
  wireMesh.position.y += 0.05;
  demMineMesh.add(wireMesh);

  // Pit Crest Marker Label Point
  const markerGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.set(28, 22, 28);
  demScene.add(marker);
}

// Detached rock/waste block for slope failure animation
function createSlidingFailureBlock() {
  const blockGeo = new THREE.BoxGeometry(16, 7, 14);
  blockGeo.translate(0, 3.5, 0);

  const blockMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true
  });

  demSlidingBlockMesh = new THREE.Mesh(blockGeo, blockMat);
  demSlidingBlockMesh.position.set(28, 17, 28);
  demSlidingBlockMesh.rotation.y = -Math.PI / 4;
  demSlidingBlockMesh.castShadow = true;
  demScene.add(demSlidingBlockMesh);

  // Runout envelope on pit floor
  const runoutGeo = new THREE.RingGeometry(0.1, 22, 32);
  runoutGeo.rotateX(-Math.PI / 2);
  const runoutMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });
  demRunoutMesh = new THREE.Mesh(runoutGeo, runoutMat);
  demRunoutMesh.position.set(10, 1.2, 10);
  demRunoutMesh.scale.set(0.01, 1, 0.01); // starts invisible
  demScene.add(demRunoutMesh);
}

// 3D Directional Displacement Vector Arrows
function createDisplacementVectors() {
  const arrowOrigins = [
    new THREE.Vector3(30, 24, 30),
    new THREE.Vector3(26, 21, 26),
    new THREE.Vector3(22, 17, 22),
    new THREE.Vector3(18, 12, 18)
  ];
  const dir = new THREE.Vector3(-0.7, -0.4, -0.7).normalize();

  arrowOrigins.forEach(origin => {
    const arrow = new THREE.ArrowHelper(dir, origin, 5.5, 0xff0055, 1.6, 1.0);
    demScene.add(arrow);
    demDisplacementArrows.push(arrow);
  });
}

// Dust particles during rockfall simulation
function createDustParticles() {
  const particleCount = 200;
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = 20 + (Math.random() - 0.5) * 15;
    positions[i + 1] = 5 + Math.random() * 15;
    positions[i + 2] = 20 + (Math.random() - 0.5) * 15;
  }

  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xd97706,
    size: 1.2,
    transparent: true,
    opacity: 0.0
  });

  demParticles = new THREE.Points(geom, mat);
  demScene.add(demParticles);
}

// User Orbit Controls
function setupDEMControls(domElement) {
  domElement.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    mouseButton = e.button;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  domElement.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;

    const deltaX = e.clientX - prevMouseX;
    const deltaY = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    if (mouseButton === 0) {
      // Left click: Orbit
      spherical.theta -= deltaX * 0.008;
      spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.008));
      updateCameraPosition();
    } else if (mouseButton === 2) {
      // Right click: Pan
      const right = new THREE.Vector3();
      demCamera.getWorldDirection(right);
      right.cross(demCamera.up).normalize();

      targetLookAt.addScaledVector(right, -deltaX * 0.1);
      targetLookAt.y += deltaY * 0.1;
      updateCameraPosition();
    }
  });

  domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    spherical.radius = Math.max(30, Math.min(260, spherical.radius + e.deltaY * 0.08));
    updateCameraPosition();
  }, { passive: false });

  // Disable context menu on right click for smooth panning
  domElement.addEventListener('contextmenu', e => e.preventDefault());
}

function onDEMWindowResize() {
  const container = document.getElementById('dem-three-canvas');
  if (!container || !demCamera || !demRenderer) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  demCamera.aspect = width / height;
  demCamera.updateProjectionMatrix();
  demRenderer.setSize(width, height);
}

// Main Animation Loop
function animateDEM() {
  requestAnimationFrame(animateDEM);

  // Animate Slope Failure Simulation if active
  if (isDemSimulatingFailure) {
    demFailureProgress += 0.015;

    // Slide block along slip surface into pit floor
    const slideDist = Math.sin(Math.min(Math.PI / 2, demFailureProgress)) * 26;
    demSlidingBlockMesh.position.x = 28 - slideDist * 0.7;
    demSlidingBlockMesh.position.y = 17 - slideDist * 0.55;
    demSlidingBlockMesh.position.z = 28 - slideDist * 0.7;
    demSlidingBlockMesh.rotation.x = demFailureProgress * 0.3;

    // Expand runout debris apron on pit floor
    const runoutScale = Math.min(1.0, demFailureProgress * 1.2);
    demRunoutMesh.scale.set(runoutScale, 1, runoutScale);

    // Dust particles agitation
    if (demParticles) {
      demParticles.material.opacity = Math.max(0, 0.7 - (demFailureProgress - 0.5) * 0.8);
      const pos = demParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += Math.random() * 0.15;
      }
      demParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (demFailureProgress >= 1.5) {
      isDemSimulatingFailure = false;
      showToast('Slope failure simulation reached equilibrium deposit.', 'warning');
    }
  }

  // Animate displacement arrows (pulse scale)
  const time = Date.now() * 0.003;
  demDisplacementArrows.forEach((arr, idx) => {
    const pulse = 1 + Math.sin(time + idx) * 0.15;
    arr.scale.set(pulse, pulse, pulse);
  });

  demRenderer.render(demScene, demCamera);
}

// External Actions called from UI
function demAction(action) {
  if (!isDemInitialized) init3DDEM();

  if (action === 'toggle-wireframe') {
    demWireframeActive = !demWireframeActive;
    if (demMineMesh) demMineMesh.material.wireframe = demWireframeActive;
    showToast(`Wireframe: ${demWireframeActive ? 'ON' : 'OFF'}`);
  } else if (action === 'toggle-heatmap') {
    demHeatmapActive = !demHeatmapActive;
    if (demMineMesh) {
      demMineMesh.material.vertexColors = demHeatmapActive;
      demMineMesh.material.color.setHex(demHeatmapActive ? 0xffffff : 0x556677);
      demMineMesh.material.needsUpdate = true;
    }
    showToast(`Risk Contours Heatmap: ${demHeatmapActive ? 'ON' : 'OFF'}`);
  } else if (action === 'reset-camera') {
    spherical = { radius: 120, theta: Math.PI / 4, phi: Math.PI / 3 };
    targetLookAt.set(0, 5, 0);
    updateCameraPosition();
    showToast('3D DEM camera reset to default view.');
  } else if (action === 'simulate-failure') {
    demFailureProgress = 0;
    isDemSimulatingFailure = true;
    if (demParticles) demParticles.material.opacity = 0.8;
    showToast('🚨 SIMULATING ACTIVE BENCH COLLAPSE & RUNOUT!', 'danger');
  }
}
