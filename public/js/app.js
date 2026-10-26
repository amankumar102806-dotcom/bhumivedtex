/**
 * GeoGuard AI — Dhanbad Mining Slope Early Warning System
 * Master Application State, WebSocket Client, Web Audio Siren, Web Speech PA, and Operations Controller
 */

// Application State
let appState = {
  sectors: [],
  selectedSectorId: 'JHR-S4',
  activeFilter: 'ALL',
  searchQuery: '',
  audioMuted: false,
  photoMode: 'optical', // 'optical' or 'thermal'
  imdApiKey: localStorage.getItem('imd_api_key') || '',
  activeTab: 'map',
  ambulanceList: [],
  casualtyList: [],
  firList: [],
  inspectionsList: []
};

// Expose sectors globally for map.js
window.activeSectorsData = [];

// Web Audio API Evacuation Siren Synthesizer
let audioCtx = null;
let sirenOsc1 = null;
let sirenOsc2 = null;
let sirenGain = null;
let isSirenPlaying = false;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Generate realistic two-tone wailing industrial evacuation alarm
function startAudibleSiren(durationMs = 8000) {
  if (appState.audioMuted) return;
  try {
    initAudioContext();
    if (isSirenPlaying) return;

    isSirenPlaying = true;
    sirenOsc1 = audioCtx.createOscillator();
    sirenOsc2 = audioCtx.createOscillator();
    sirenGain = audioCtx.createGain();

    sirenOsc1.type = 'sawtooth';
    sirenOsc2.type = 'sine';

    // Frequency modulation (800Hz to 1200Hz wailing cycle)
    const now = audioCtx.currentTime;
    sirenOsc1.frequency.setValueAtTime(800, now);
    sirenOsc2.frequency.setValueAtTime(805, now);

    for (let t = 0; t < durationMs / 1000; t += 1.5) {
      sirenOsc1.frequency.linearRampToValueAtTime(1200, now + t + 0.75);
      sirenOsc1.frequency.linearRampToValueAtTime(800, now + t + 1.5);
      sirenOsc2.frequency.linearRampToValueAtTime(1205, now + t + 0.75);
      sirenOsc2.frequency.linearRampToValueAtTime(805, now + t + 1.5);
    }

    sirenGain.gain.setValueAtTime(0.25, now);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, now + (durationMs / 1000));

    sirenOsc1.connect(sirenGain);
    sirenOsc2.connect(sirenGain);
    sirenGain.connect(audioCtx.destination);

    sirenOsc1.start();
    sirenOsc2.start();

    setTimeout(() => {
      stopAudibleSiren();
    }, durationMs);
  } catch (err) {
    console.warn('Web Audio siren failed:', err.message);
  }
}

function stopAudibleSiren() {
  try {
    if (sirenOsc1) { sirenOsc1.stop(); sirenOsc1.disconnect(); sirenOsc1 = null; }
    if (sirenOsc2) { sirenOsc2.stop(); sirenOsc2.disconnect(); sirenOsc2 = null; }
    if (sirenGain) { sirenGain.disconnect(); sirenGain = null; }
    isSirenPlaying = false;
  } catch (e) {}
}

function toggleAudioMute() {
  appState.audioMuted = !appState.audioMuted;
  const icon = document.getElementById('audio-icon');
  if (appState.audioMuted) {
    icon.className = 'fa-solid fa-volume-xmark';
    stopAudibleSiren();
    showToast('Speaker & Siren sound muted.');
  } else {
    icon.className = 'fa-solid fa-volume-high';
    showToast('Speaker & Siren sound unmuted.');
  }
}

// Web Speech API Bilingual Voice Announcement
function speakWarningBilingual(msgEn, msgHi) {
  if (appState.audioMuted || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  // 1. English announcement
  if (msgEn) {
    const utterEn = new SpeechSynthesisUtterance(msgEn);
    utterEn.rate = 1.0;
    utterEn.pitch = 1.1;
    utterEn.lang = 'en-US';
    window.speechSynthesis.speak(utterEn);
  }

  // 2. Hindi announcement
  if (msgHi) {
    setTimeout(() => {
      const utterHi = new SpeechSynthesisUtterance(msgHi);
      utterHi.rate = 0.95;
      utterHi.lang = 'hi-IN';
      window.speechSynthesis.speak(utterHi);
    }, 4500);
  }
}

// ===================================================================
// WEBSOCKET CLIENT & REAL-TIME POLLING
// ===================================================================
let wsClient = null;

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    wsClient = new WebSocket(wsUrl);

    wsClient.onopen = () => {
      console.log('✅ Connected to Dhanbad EWS Live WebSocket');
    };

    wsClient.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'initial_state' || payload.type === 'sensor_update') {
          handleIncomingSensorData(payload.data);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    wsClient.onclose = () => {
      console.warn('WS disconnected. Reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    };

    wsClient.onerror = () => {
      wsClient.close();
    };
  } catch (err) {
    console.error('WebSocket connection error:', err);
    setTimeout(connectWebSocket, 3000);
  }
}

// Process incoming telemetry updates from backend
function handleIncomingSensorData(data) {
  if (!data || !data.sectors) return;

  appState.sectors = data.sectors;
  window.activeSectorsData = data.sectors;

  // Update Top KPIs
  const highCount = data.sectors.filter(s => s.risk_level === 'HIGH').length;
  const modCount = data.sectors.filter(s => s.risk_level === 'MODERATE').length;
  const safeCount = data.sectors.filter(s => s.risk_level === 'SAFE').length;

  document.getElementById('top-kpi-high').textContent = highCount;
  document.getElementById('top-kpi-mod').textContent = modCount;
  document.getElementById('top-kpi-safe').textContent = safeCount;

  // Update Ticker
  if (data.weather) {
    document.getElementById('ticker-rain').textContent = `Dhanbad Rain: ${data.weather.rainfall_24h} mm/24h`;
    document.getElementById('ticker-temp').textContent = `${data.weather.temperature}°C • ${data.weather.humidity}% RH`;
  }

  // Render Left Sectors List
  renderLeftSectorsList();

  // Update Main Map Markers
  if (typeof renderSectorMarkers === 'function') {
    renderSectorMarkers(data.sectors);
  }

  // Update Selected Sector
  const selectedSector = data.sectors.find(s => s.id === appState.selectedSectorId) || data.sectors[0];
  if (selectedSector) {
    updateSelectedSectorPanels(selectedSector);
  }
}

// Clock updates
function startClock() {
  const clockElem = document.getElementById('clock-display');
  const update = () => {
    const now = new Date();
    clockElem.textContent = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
  };
  update();
  setInterval(update, 1000);
}

// ===================================================================
// SECTOR LIST & FILTERING
// ===================================================================
function renderLeftSectorsList() {
  const container = document.getElementById('sectors-scroll-list');
  if (!container) return;

  let filtered = appState.sectors;

  // Apply Risk Filter
  if (appState.activeFilter !== 'ALL') {
    filtered = filtered.filter(s => s.risk_level === appState.activeFilter);
  }

  // Apply Search Query
  if (appState.searchQuery.trim()) {
    const q = appState.searchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.coalfield && s.coalfield.toLowerCase().includes(q)) ||
      (s.sub_district && s.sub_district.toLowerCase().includes(q))
    );
  }

  document.getElementById('sectors-count-label').textContent = filtered.length;

  container.innerHTML = filtered.map(sector => {
    const isSelected = sector.id === appState.selectedSectorId;
    const riskClass = `risk-${sector.risk_level.toLowerCase()}`;
    const badgeClass = sector.risk_level.toLowerCase();

    return `
      <div class="sector-nav-card ${riskClass} ${isSelected ? 'active' : ''}" onclick="selectSectorById('${sector.id}')">
        <div class="snc-header">
          <span class="snc-name" title="${sector.name}">${sector.name}</span>
          <span class="snc-badge ${badgeClass}">${sector.risk_level}</span>
        </div>
        <div class="snc-meta">
          <span>${sector.sub_district || 'Dhanbad'}</span>
          <span>${sector.elevation}m RL</span>
        </div>
        <div class="snc-stats">
          <div class="snc-stat-col">
            <span>FoS</span>
            <strong class="${sector.fos < 1.0 ? 'text-red' : sector.fos < 1.3 ? 'text-amber' : 'text-emerald'}">${sector.fos}</strong>
          </div>
          <div class="snc-stat-col">
            <span>Rain 24h</span>
            <strong>${sector.rainfall_mm}mm</strong>
          </div>
          <div class="snc-stat-col">
            <span>Disp</span>
            <strong class="${sector.displacement_mm > 15 ? 'text-red' : ''}">${sector.displacement_mm}mm</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleSectorSearch(query) {
  appState.searchQuery = query;
  renderLeftSectorsList();
}

function filterSectors(filterType, btnElement) {
  appState.activeFilter = filterType;

  // Update button classes
  document.querySelectorAll('.fpill').forEach(btn => btn.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  } else {
    const match = document.querySelector(`.fpill[data-filter="${filterType}"]`);
    if (match) match.classList.add('active');
  }

  renderLeftSectorsList();
  showToast(`Filtering sectors: ${filterType}`);
}

function selectSectorById(sectorId) {
  appState.selectedSectorId = sectorId;
  const sector = appState.sectors.find(s => s.id === sectorId);
  if (!sector) return;

  renderLeftSectorsList();
  updateSelectedSectorPanels(sector);

  // Pan main map to sector
  if (mainMap) {
    mainMap.setView([sector.lat, sector.lng], 14, { animate: true });
  }

  // Update Micro Sector Card
  if (typeof updateMicroSectorView === 'function') {
    updateMicroSectorView(sector);
  }
}

function resetSectorView() {
  if (mainMap) {
    mainMap.setView([23.7600, 86.4100], 12);
    showToast('Map view reset to entire Dhanbad coal belt.');
  }
}

// Update Right Panel Operations & Floating Micro Card
function updateSelectedSectorPanels(sector) {
  // Right Panel Banner
  document.getElementById('rp-sector-name').textContent = sector.name;
  document.getElementById('rp-coalfield').textContent = `${sector.coalfield || 'Jharia Coalfield'} • LoRa: ${sector.lora_node || 'NODE-DHN-01'}`;

  const riskTag = document.getElementById('rp-risk-tag');
  riskTag.className = `badge-tag ${sector.risk_level === 'HIGH' ? 'red' : sector.risk_level === 'MODERATE' ? 'amber' : 'green'}`;
  riskTag.textContent = `${sector.risk_level} RISK`;

  // FoS Gauge
  const fosVal = document.getElementById('rp-fos-val');
  fosVal.textContent = sector.fos;
  fosVal.className = `gauge-val ${sector.fos < 1.0 ? 'text-red' : sector.fos < 1.3 ? 'text-amber' : 'text-emerald'}`;

  // Metrics
  document.getElementById('rp-rain-val').textContent = `${sector.rainfall_mm} mm`;
  document.getElementById('rp-disp-val').textContent = `${sector.displacement_mm} mm`;
  document.getElementById('rp-moist-val').textContent = `${sector.soil_moisture} % VWC`;
  document.getElementById('rp-pore-val').textContent = `${sector.pore_pressure || 105} kPa`;
  document.getElementById('rp-insar-val').textContent = `${sector.insar_los_rate || -24.5} mm/yr`;
  document.getElementById('rp-slope-val').textContent = `${sector.slope_angle || 40.0}°`;
}

// ===================================================================
// WORKSPACE VIEW SWITCHING
// ===================================================================
function switchView(tabName) {
  appState.activeTab = tabName;

  // Update Tab buttons
  document.querySelectorAll('.vtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update View panels
  document.querySelectorAll('.view-content').forEach(view => {
    view.classList.remove('active');
  });

  const activeView = document.getElementById(`view-${tabName}`);
  if (activeView) activeView.classList.add('active');

  // Trigger lazy initializations
  if (tabName === 'map') {
    if (!mainMap) initMainMap();
    else mainMap.invalidateSize();
    if (microMap) microMap.invalidateSize();
  } else if (tabName === 'dem') {
    setTimeout(() => {
      if (!isDemInitialized) init3DDEM();
      else onDEMWindowResize();
    }, 50);
  } else if (tabName === 'insar') {
    loadInSARTimeseries(appState.selectedSectorId);
    loadInSARSummaryTable();
  } else if (tabName === 'engineer') {
    loadEngineerTelemetry(appState.selectedSectorId);
    loadFieldInspections();
  } else if (tabName === 'photos') {
    loadProneAreaPhotos();
  } else if (tabName === 'imd') {
    loadIMDWeatherView();
  } else if (tabName === 'emergency') {
    loadEmergencyDashboard();
  } else if (tabName === 'charts') {
    setTimeout(initAnalyticsCharts, 50);
  }
}

// ===================================================================
// INSAR & COPERNICUS MODULE
// ===================================================================
async function loadInSARTimeseries(sectorId) {
  try {
    const res = await fetch(`/api/sentinel/time-series?sector_id=${sectorId}`);
    const json = await res.json();
    if (json.success && json.time_series) {
      initInSARChart(json.time_series);
    }
  } catch (err) {
    console.error('Failed to load InSAR time-series:', err);
  }
}

async function loadInSARSummaryTable() {
  const tbody = document.getElementById('insar-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('/api/sentinel/insar');
    const json = await res.json();
    if (json.success && json.data) {
      tbody.innerHTML = json.data.map(item => `
        <tr>
          <td><strong class="text-cyan">${item.sector_id}</strong></td>
          <td>${item.name}</td>
          <td class="text-red font-mono">${item.los_velocity_mm_yr} mm/yr</td>
          <td class="font-mono">${item.cumulative_displacement_mm} mm</td>
          <td class="font-mono">${item.mean_coherence}</td>
          <td><span class="badge-tag ${item.isro_susceptibility_category === 'VERY_HIGH' ? 'red' : 'amber'}">${item.isro_susceptibility_category}</span></td>
          <td>${item.subsurface_creep_detected ? '<span class="text-red"><i class="fa-solid fa-triangle-exclamation"></i> Active Creep</span>' : '<span class="text-emerald">Stable</span>'}</td>
          <td><button class="btn btn-sm btn-outline" onclick="selectSectorById('${item.sector_id}')">Inspect</button></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load InSAR summary table:', err);
  }
}

function refreshInSARData() {
  showToast('Connecting to Copernicus Open Access Hub & ISRO NRSC...', 'info');
  setTimeout(() => {
    loadInSARTimeseries(appState.selectedSectorId);
    loadInSARSummaryTable();
    showToast('Copernicus Sentinel-1 InSAR data synchronized!');
  }, 800);
}

// ===================================================================
// MINING ENGINEER MODULE & BISHOP CALCULATOR
// ===================================================================
async function loadEngineerTelemetry(sectorId) {
  try {
    const res = await fetch(`/api/engineer/telemetry?sector_id=${sectorId}`);
    const json = await res.json();
    if (json.success && json.telemetry) {
      initInclinometerChart(json.telemetry.inclinometer_profile);
    }
  } catch (err) {
    console.error('Failed to load engineer telemetry:', err);
  }
}

async function loadFieldInspections() {
  const tbody = document.getElementById('engineer-inspections-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/engineer/inspections');
    const json = await res.json();
    if (json.success && json.inspections) {
      appState.inspectionsList = json.inspections;
      tbody.innerHTML = json.inspections.map(insp => `
        <tr>
          <td><strong class="text-cyan">${insp.id}</strong></td>
          <td>${insp.sector_id}</td>
          <td>${insp.inspector}</td>
          <td>${insp.bench_level}</td>
          <td class="text-red">${insp.crack_width_cm} cm (${insp.crack_length_m}m)</td>
          <td>${insp.water_seepage_observed}</td>
          <td>${insp.face_bulging_detected ? '<span class="badge-tag red">YES</span>' : '<span class="badge-tag green">NO</span>'}</td>
          <td>${insp.recommendation}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load inspections:', err);
  }
}

async function runBishopCalculation() {
  const c = document.getElementById('calc-c').value;
  const phi = document.getElementById('calc-phi').value;
  const h = document.getElementById('calc-h').value;
  const beta = document.getElementById('calc-beta').value;
  const ru = document.getElementById('calc-ru').value;

  try {
    const res = await fetch('/api/risk/calculate-bishop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cohesion: c,
        frictionAngleDeg: phi,
        benchHeight: h,
        slopeAngleDeg: beta,
        porePressureRatio: ru
      })
    });
    const data = await res.json();
    if (data.success) {
      const fosOut = document.getElementById('calc-output-fos');
      const statusOut = document.getElementById('calc-output-status');

      fosOut.textContent = data.calculated_fos;
      statusOut.textContent = data.status;

      if (data.calculated_fos < 1.0) {
        fosOut.className = 'cr-value text-red';
        statusOut.className = 'cr-status text-red';
      } else if (data.calculated_fos < 1.3) {
        fosOut.className = 'cr-value text-amber';
        statusOut.className = 'cr-status text-amber';
      } else {
        fosOut.className = 'cr-value text-emerald';
        statusOut.className = 'cr-status text-emerald';
      }

      showToast(`Bishop FoS computed: ${data.calculated_fos}`);
    }
  } catch (err) {
    console.error('Bishop calc failed:', err);
  }
}

// ===================================================================
// PRONE AREAS PHOTO SURVEILLANCE
// ===================================================================
async function loadProneAreaPhotos() {
  const container = document.getElementById('photos-container');
  if (!container) return;

  try {
    const res = await fetch('/api/photos');
    const json = await res.json();
    if (json.success && json.photos) {
      container.innerHTML = json.photos.map(photo => {
        const imgSrc = appState.photoMode === 'thermal' ? photo.thermal_url : photo.image_url;
        const modeLabel = appState.photoMode === 'thermal' ? 'THERMAL IR (COAL FIRE)' : 'RGB ORTHOMOSAIC';

        return `
          <div class="photo-card">
            <div class="photo-img-wrap">
              <img src="${imgSrc}" alt="${photo.title}" loading="lazy" />
              <div class="photo-badge-overlay">
                <span class="badge-tag ${photo.risk_level === 'HIGH_RISK' ? 'red' : 'amber'}">${photo.risk_level.replace('_', ' ')}</span>
              </div>
              <div class="photo-mode-indicator">${modeLabel}</div>
              <div class="ai-detection-overlay">
                <div class="ai-tag">TENSION CRACK: 8.4cm GAP</div>
              </div>
            </div>
            <div class="photo-body">
              <div class="photo-title">${photo.title}</div>
              <div class="photo-location"><i class="fa-solid fa-location-dot"></i> ${photo.location} (${photo.coordinates})</div>
              <p class="photo-notes">${photo.geological_notes}</p>
              <div class="photo-meta-tags">
                <span><i class="fa-solid fa-plane-up"></i> ${photo.capture_type.split('(')[0]}</span>
                <span>•</span>
                <span><i class="fa-solid fa-ruler"></i> Hazard Area: ${photo.ai_annotations.hazard_area_sq_m} m²</span>
                <span>•</span>
                <span><i class="fa-solid fa-temperature-arrow-up text-amber"></i> ${photo.ai_annotations.thermal_anomaly_deg_c}°C Hotspot</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load photos:', err);
  }
}

function setPhotoViewMode(mode) {
  appState.photoMode = mode;
  document.getElementById('btn-view-optical').classList.toggle('active', mode === 'optical');
  document.getElementById('btn-view-thermal').classList.toggle('active', mode === 'thermal');
  loadProneAreaPhotos();
  showToast(`Surveillance view mode: ${mode.toUpperCase()}`);
}

// ===================================================================
// IMD WEATHER GATEWAY VIEW
// ===================================================================
async function loadIMDWeatherView() {
  try {
    // 1. AWS Station
    const resAws = await fetch('/api/imd/aws?sid=15');
    const jsonAws = await resAws.json();
    if (jsonAws.success && jsonAws.data) {
      const d = jsonAws.data;
      document.getElementById('imd-aws-source').textContent = jsonAws.source;
      document.getElementById('imd-aws-rain-1h').textContent = `${d.rainfall_1h_mm || 4.5} mm`;
      document.getElementById('imd-aws-rain-24h').textContent = `${d.rainfall_24h_mm || 62.4} mm`;
      document.getElementById('imd-aws-temp').textContent = `${d.temperature_c} °C`;
      document.getElementById('imd-aws-humidity').textContent = `${d.relative_humidity_pct} %`;
      document.getElementById('imd-aws-wind').textContent = `${d.wind_speed_kmh} km/h (${d.wind_direction_deg || 115}°)`;
      document.getElementById('imd-aws-pressure').textContent = `${d.surface_pressure_hpa} hPa`;
    }

    // 2. District Rainfall
    const resRf = await fetch('/api/imd/rainfall');
    const jsonRf = await resRf.json();
    if (jsonRf.success && jsonRf.data) {
      const r = jsonRf.data;
      document.getElementById('imd-rainfall-source').textContent = `${r.district_name} (${r.record_date})`;
      document.getElementById('imd-rf-today').textContent = `${r.daily_rainfall_actual_mm} mm`;
      document.getElementById('imd-rf-weekly').textContent = `${r.weekly_rainfall_actual_mm} mm`;
      document.getElementById('imd-rf-cum').textContent = `${r.cumulative_seasonal_mm} mm`;
      document.getElementById('imd-rf-dep').textContent = `${r.departure_percentage > 0 ? '+' : ''}${r.departure_percentage}% (${r.rainfall_category})`;
    }

    // 3. District Warnings
    const resWarn = await fetch('/api/imd/warning');
    const jsonWarn = await resWarn.json();
    if (jsonWarn.success && jsonWarn.data && jsonWarn.data.forecast_days) {
      const w = jsonWarn.data.forecast_days;
      document.getElementById('imd-warning-content').innerHTML = w.map(d => `
        <div class="warning-day-item ${d.warning_code.toLowerCase()}">
          <strong>${d.day}: ${d.warning_code} WARNING</strong>
          <p>${d.warning_text}. ${d.action_recommended}</p>
        </div>
      `).join('');
    }

    // 4. District Nowcast
    const resNc = await fetch('/api/imd/nowcast');
    const jsonNc = await resNc.json();
    if (jsonNc.success && jsonNc.data) {
      document.getElementById('imd-nc-text').textContent = jsonNc.data.nowcast_warning;
    }
  } catch (err) {
    console.error('Failed to load IMD data:', err);
  }
}

function refreshIMDData() {
  showToast('Querying IMD Gateway endpoints...', 'info');
  loadIMDWeatherView().then(() => {
    showToast('IMD station observations & nowcast refreshed.');
  });
}

// ===================================================================
// EMERGENCY OPS & CASUALTIES MODULE
// ===================================================================
async function loadEmergencyDashboard() {
  try {
    const res = await fetch('/api/emergency/overview');
    const json = await res.json();
    if (json.success && json.summary) {
      appState.ambulanceList = json.summary.ambulances;
      renderAmbulances();
    }

    const resCas = await fetch('/api/emergency/casualties');
    const jsonCas = await resCas.json();
    if (jsonCas.success) {
      appState.casualtyList = jsonCas.casualties;
      appState.firList = jsonCas.missing_firs;
      renderCasualties();
      renderFirs();

      document.getElementById('top-cas-count').textContent = jsonCas.casualties.length;
      document.getElementById('top-fir-count').textContent = jsonCas.missing_firs.filter(f => f.status === 'SEARCH_IN_PROGRESS').length;
    }
  } catch (err) {
    console.error('Failed to load emergency dashboard:', err);
  }
}

function renderAmbulances() {
  const container = document.getElementById('ambulance-list-container');
  if (!container) return;

  container.innerHTML = appState.ambulanceList.map(amb => `
    <div class="amb-card-item">
      <div class="aci-head">
        <strong><i class="fa-solid fa-ambulance text-cyan"></i> ${amb.plate}</strong>
        <span class="badge-tag ${amb.status === 'AVAILABLE' ? 'green' : 'amber'}">${amb.status}</span>
      </div>
      <div style="font-size:10px; color:#94a3b8;">Station: ${amb.station}</div>
      <div style="font-size:10px; color:#64748b; display:flex; justify-content:space-between; margin-top:3px;">
        <span>Driver: ${amb.driver} (${amb.driver_phone})</span>
        <span>${amb.type}</span>
      </div>
    </div>
  `).join('');
}

function renderCasualties() {
  const container = document.getElementById('casualty-list-container');
  if (!container) return;

  container.innerHTML = appState.casualtyList.map(cas => `
    <div class="cas-card-item">
      <div class="cci-head">
        <strong>${cas.name} (${cas.designation})</strong>
        <span class="badge-tag ${cas.triage === 'RED' ? 'red' : cas.triage === 'YELLOW' ? 'amber' : 'green'}">${cas.triage} TRIAGE</span>
      </div>
      <div style="font-size:10px; color:#94a3b8;">${cas.injury}</div>
      <div style="font-size:9px; color:#64748b; display:flex; justify-content:space-between; margin-top:3px;">
        <span>Facility: ${cas.hospital}</span>
        <span>Status: ${cas.status}</span>
      </div>
    </div>
  `).join('');
}

function renderFirs() {
  const container = document.getElementById('fir-list-container');
  if (!container) return;

  container.innerHTML = appState.firList.map(fir => `
    <div class="fir-card-item">
      <div class="fci-head">
        <strong>${fir.person_name} (${fir.role})</strong>
        <span class="badge-tag ${fir.status === 'SEARCH_IN_PROGRESS' ? 'red' : 'green'}">${fir.status.replace(/_/g, ' ')}</span>
      </div>
      <div style="font-size:10px; color:#94a3b8;">Last seen: ${fir.last_seen_location} (${fir.last_contact})</div>
      <div style="font-size:9px; color:#64748b; margin-top:2px;">Search Unit: ${fir.search_team}</div>
    </div>
  `).join('');
}

// ===================================================================
// PUBLIC ADDRESS (PA) SPEAKER & WARNING BROADCAST
// ===================================================================
function openSpeakerAlert() {
  openModal('modal-speaker');
}

function testSirenAudio() {
  startAudibleSiren(3000);
  showToast('Playing 3-second test siren tone...');
}

function updateDefaultPaMessage() {
  const priority = document.getElementById('sp-priority').value;
  const sector = appState.sectors.find(s => s.id === appState.selectedSectorId);
  const sectorName = sector ? sector.name : 'Jharia Mining Sector 4';

  if (priority === 'HIGH') {
    document.getElementById('sp-msg-en').value = `EMERGENCY ALERT: High slope displacement detected at ${sectorName}! Immediate bench evacuation ordered! All miners and HEMM operators move to Safe Shelter B immediately!`;
    document.getElementById('sp-msg-hi').value = `आपातकालीन चेतावनी! ${sectorName} में ढलान विफलता का भारी खतरा है! तुरंत सभी ऑपरेटर और श्रमिक बेंच खाली करें और सुरक्षित स्थान पर जाएं!`;
  } else {
    document.getElementById('sp-msg-en').value = `SAFETY ADVISORY: Elevated deformation rate recorded at ${sectorName}. All machinery retreat 50 meters from dump toe.`;
    document.getElementById('sp-msg-hi').value = `सुरक्षा सूचना: ${sectorName} पर ढलान का दबाव बढ़ रहा है। सभी मशीनें ढलान के निचले हिस्से से 50 मीटर पीछे हटें।`;
  }
}

async function transmitSpeakerAlert() {
  const zone = document.getElementById('sp-zone').value;
  const priority = document.getElementById('sp-priority').value;
  const msgEn = document.getElementById('sp-msg-en').value;
  const msgHi = document.getElementById('sp-msg-hi').value;

  try {
    const res = await fetch('/api/emergency/speaker-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sector_id: zone,
        priority,
        message_en: msgEn,
        message_hi: msgHi
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-speaker');

      // 1. Play audible siren sound
      startAudibleSiren(8000);

      // 2. Speak bilingual broadcast aloud
      speakWarningBilingual(msgEn, msgHi);

      showToast(`📢 PA WARNING BROADCASTED OVER ${zone} HORNS!`, 'danger');
    }
  } catch (err) {
    console.error('Speaker alert failed:', err);
  }
}

function triggerSectorEvacuationAlert() {
  const sector = appState.sectors.find(s => s.id === appState.selectedSectorId) || appState.sectors[0];
  const msgEn = `EMERGENCY EVACUATION ORDER! High slope displacement detected at ${sector.name}! All miners evacuate immediately!`;
  const msgHi = `आपातकालीन निकासी आदेश! ${sector.name} में तुरंत ढलान खाली करें और सुरक्षित शेल्टर में जाएं!`;

  startAudibleSiren(7000);
  speakWarningBilingual(msgEn, msgHi);
  showToast(`🚨 EVACUATION ORDER TRANSMITTED TO ${sector.name.toUpperCase()}!`, 'danger');
}

function triggerEvacuationSequence() {
  triggerSectorEvacuationAlert();
}

function triggerImmediateSOS() {
  startAudibleSiren(6000);
  speakWarningBilingual(
    'SOS ALERT! Emergency response activated across all Dhanbad mining sectors!',
    'एसओएस चेतावनी! सभी झरिया खनन क्षेत्रों में आपातकालीन प्रतिक्रिया सक्रिय कर दी गई है!'
  );
  showToast('🚨 SOS ALERT TRIGGERED: All Rescue Stations & Ambulances Alerted!', 'danger');
}

function triggerSimulatedDrill() {
  const sector = appState.sectors.find(s => s.id === appState.selectedSectorId);
  if (!sector) return;

  fetch('/api/simulate-trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sector_id: sector.id, state: 'CRITICAL_FAILURE' })
  }).then(r => r.json()).then(d => {
    showToast(`Simulation Drill: ${sector.name} forced to CRITICAL BREACH!`, 'danger');
  });
}

// ===================================================================
// AMBULANCE DISPATCH & RESCUE MODAL
// ===================================================================
function openAmbulanceModal() {
  openModal('modal-ambulance');
}

async function confirmAmbulanceDispatch() {
  const sectorId = document.getElementById('amb-sector-select').value;
  const hospital = document.getElementById('amb-hospital-select').value;
  const count = document.getElementById('amb-cas-count').value;
  const notes = document.getElementById('amb-notes').value;

  try {
    const res = await fetch('/api/emergency/dispatch-ambulance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sector_id: sectorId,
        hospital_choice: hospital,
        estimated_casualties: count,
        description: notes
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-ambulance');
      showToast(`🚑 Ambulance ${data.dispatch.ambulance.plate} dispatched! ETA: ${data.dispatch.eta_minutes} mins.`, 'success');
      loadEmergencyDashboard();
    }
  } catch (err) {
    console.error('Dispatch failed:', err);
  }
}

// ===================================================================
// CASUALTY & FIR REGISTRATION
// ===================================================================
function openCasualtyModal() {
  switchView('emergency');
}

function openReportCasualtyModal() {
  openModal('modal-casualty');
}

async function submitCasualtyRecord() {
  const name = document.getElementById('cas-name').value;
  const role = document.getElementById('cas-role').value;
  const triage = document.getElementById('cas-triage-select').value;
  const injury = document.getElementById('cas-injury-notes').value;

  if (!name.trim()) {
    alert('Please enter worker name');
    return;
  }

  try {
    const res = await fetch('/api/emergency/report-casualty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        designation: role,
        triage,
        injury
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-casualty');
      showToast(`Casualty ${name} registered. Medical desk alerted!`, 'warning');
      loadEmergencyDashboard();
    }
  } catch (err) {
    console.error('Casualty submit failed:', err);
  }
}

function openFirModal() {
  switchView('emergency');
}

function openReportFirModal() {
  openModal('modal-fir');
}

function submitFirRecord() {
  const name = document.getElementById('fir-name').value;
  const role = document.getElementById('fir-role').value;
  const loc = document.getElementById('fir-loc').value;
  const squad = document.getElementById('fir-squad').value;

  if (!name.trim()) {
    alert('Please enter worker name');
    return;
  }

  appState.firList.unshift({
    id: `FIR-${Date.now().toString().slice(-4)}`,
    person_name: name,
    role: role || 'Miner',
    last_seen_location: loc || 'Overburden Dump Crest',
    last_contact: 'Just now',
    status: 'SEARCH_IN_PROGRESS',
    search_team: squad
  });

  closeModal('modal-fir');
  renderFirs();
  showToast(`FIR logged for ${name}. Rescue team dispatched!`, 'danger');
}

// ===================================================================
// THRESHOLDS CONFIGURATION
// ===================================================================
function openThresholdModal() {
  openModal('modal-thresholds');
}

async function saveThresholdChanges() {
  const rain24 = document.getElementById('th-rain-24').value;
  const rain1h = document.getElementById('th-rain-1h').value;
  const dispRate = document.getElementById('th-disp-rate').value;
  const dispCum = document.getElementById('th-disp-cum').value;
  const fosCrit = document.getElementById('th-fos-crit').value;
  const poreCrit = document.getElementById('th-pore-crit').value;

  try {
    const res = await fetch('/api/risk/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rainfall_24h_critical: Number(rain24),
        rainfall_hourly_critical: Number(rain1h),
        displacement_rate_critical: Number(dispRate),
        cumulative_displacement_critical: Number(dispCum),
        fos_critical: Number(fosCrit),
        pore_pressure_critical: Number(poreCrit)
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-thresholds');
      showToast('New geotechnical & rainfall thresholds saved!', 'success');
    }
  } catch (err) {
    console.error('Threshold save error:', err);
  }
}

// ===================================================================
// IMD API KEY MODAL
// ===================================================================
function openIMDKeyModal() {
  document.getElementById('input-imd-api-key').value = appState.imdApiKey;
  openModal('modal-imd-key');
}

async function testImdApiKey() {
  const key = document.getElementById('input-imd-api-key').value.trim();
  const statusBox = document.getElementById('imd-key-test-status');
  statusBox.style.display = 'block';
  statusBox.textContent = 'Testing connection to https://api.imd.gov.in/api/v1...';

  try {
    const res = await fetch('/api/imd/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const data = await res.json();
    statusBox.textContent = data.message;
    statusBox.style.color = data.connected ? '#34d399' : '#f87171';
  } catch (err) {
    statusBox.textContent = `Test failed: ${err.message}`;
    statusBox.style.color = '#f87171';
  }
}

function saveImdApiKey() {
  const key = document.getElementById('input-imd-api-key').value.trim();
  appState.imdApiKey = key;
  localStorage.setItem('imd_api_key', key);
  closeModal('modal-imd-key');
  showToast('IMD API Key saved.');
  refreshIMDData();
}

// ===================================================================
// MINING ENGINEER FIELD INSPECTION
// ===================================================================
function openInspectionModal() {
  openModal('modal-inspection');
}

async function submitFieldInspection() {
  const name = document.getElementById('insp-name').value;
  const bench = document.getElementById('insp-bench').value;
  const crackW = document.getElementById('insp-crack-w').value;
  const crackL = document.getElementById('insp-crack-l').value;
  const seepage = document.getElementById('insp-seepage').value;
  const recom = document.getElementById('insp-recom').value;

  try {
    const res = await fetch('/api/engineer/inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sector_id: appState.selectedSectorId,
        inspector: name,
        bench_level: bench,
        crack_width_cm: crackW,
        crack_length_m: crackL,
        water_seepage_observed: seepage,
        face_bulging_detected: Number(crackW) > 5,
        recommendation: recom
      })
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modal-inspection');
      showToast('Field inspection logged & factored into EWS model!');
      loadFieldInspections();
    }
  } catch (err) {
    console.error('Inspection save error:', err);
  }
}

// ===================================================================
// SITREP EXPORT
// ===================================================================
async function exportSITREP(format = 'json') {
  showToast(`Generating DGMS Situation Report (${format.toUpperCase()})...`);
  try {
    const res = await fetch(`/api/emergency/sitrep?format=${format}`);
    if (format === 'text') {
      const text = await res.text();
      downloadFile(text, `SITREP_DHANBAD_${Date.now()}.txt`, 'text/plain');
    } else {
      const json = await res.json();
      downloadFile(JSON.stringify(json.sitrep, null, 2), `SITREP_DHANBAD_${Date.now()}.json`, 'application/json');
    }
    showToast('Situation Report downloaded successfully!', 'success');
  } catch (err) {
    console.error('SITREP error:', err);
  }
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Quick UI Modals Helper
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

function openHospitalModal() {
  switchView('emergency');
}

function openPushWarningModal() {
  openSpeakerAlert();
}

function openHelplineModal() {
  switchView('emergency');
}

function toggleWeatherRadar() {
  switchView('map');
  const btn = document.getElementById('btn-toggle-radar-overlay');
  if (typeof toggleRadarSimulation === 'function') {
    toggleRadarSimulation(btn);
  }
}

// Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconClass = type === 'danger' ? 'fa-triangle-exclamation text-red'
    : type === 'warning' ? 'fa-bell text-amber'
    : type === 'success' ? 'fa-circle-check text-emerald'
    : 'fa-info-circle text-cyan';

  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Initialize on Document Load
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  connectWebSocket();
  initMainMap();

  // Pre-load default sector
  selectSectorById('JHR-S4');
});
