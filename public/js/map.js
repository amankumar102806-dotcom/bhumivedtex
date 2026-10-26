/**
 * Leaflet GIS Interactive Map Engine
 * Features:
 * - Free, high-res satellite & topo basemaps (Zero API key required, NO watermarks!)
 * - Dhanbad opencast coalfield sectors with dynamic pulsing risk rings
 * - Micro-Sector high-resolution inset map with sensor markers, danger polygons, and evacuation routes
 * - InSAR deformation layer & Doppler weather radar simulation
 */

let mainMap = null;
let microMap = null;
let currentBasemapLayer = null;
let microBasemapLayer = null;
let sectorMarkersGroup = null;
let insarHeatmapGroup = null;
let weatherRadarGroup = null;
let microSensorsGroup = null;

let isInsarLayerVisible = false;
let isRadarLayerVisible = false;

// Basemap Tile Providers (100% Free, Reliable, No API Key Required)
const BASEMAP_TILES = {
  esri: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics'
    }
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
    }
  }
};

// Initialize Main GIS Map
function initMainMap() {
  const mapElement = document.getElementById('map-canvas');
  if (!mapElement || mainMap) return;

  // Center on Dhanbad Mining Belt / Jharia Coalfield (Lat: 23.76, Lng: 86.41)
  mainMap = L.map('map-canvas', {
    center: [23.7600, 86.4100],
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(mainMap);

  // Set default basemap: Esri World Imagery (Stunning Satellite of Opencast Mines!)
  currentBasemapLayer = L.tileLayer(BASEMAP_TILES.esri.url, BASEMAP_TILES.esri.options);
  currentBasemapLayer.addTo(mainMap);

  // Groups
  sectorMarkersGroup = L.layerGroup().addTo(mainMap);
  insarHeatmapGroup = L.layerGroup().addTo(mainMap);
  weatherRadarGroup = L.layerGroup().addTo(mainMap);

  // Render initial sector markers
  if (window.activeSectorsData) {
    renderSectorMarkers(window.activeSectorsData);
  }

  // Initialize InSAR Heatmap Layer
  generateInSARHeatmapOverlays();

  // Initialize Micro-Sector Map
  initMicroSectorMap();
}

// Change Basemap on the fly
function changeBasemap(type, btnElement) {
  if (!mainMap || !BASEMAP_TILES[type]) return;

  if (currentBasemapLayer) {
    mainMap.removeLayer(currentBasemapLayer);
  }

  currentBasemapLayer = L.tileLayer(BASEMAP_TILES[type].url, BASEMAP_TILES[type].options);
  currentBasemapLayer.addTo(mainMap);

  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    if (btn.dataset.layer) btn.classList.remove('active');
  });
  if (btnElement) btnElement.classList.add('active');

  showToast(`Basemap switched to ${type.toUpperCase()}`);
}

// Render Sector Markers on Main Map with Pulsing Hazard Rings
function renderSectorMarkers(sectors) {
  if (!mainMap || !sectorMarkersGroup) return;
  sectorMarkersGroup.clearLayers();

  sectors.forEach(sector => {
    const isHigh = sector.risk_level === 'HIGH';
    const isMod = sector.risk_level === 'MODERATE';
    const color = isHigh ? '#ef4444' : isMod ? '#f59e0b' : '#10b981';
    const glowClass = isHigh ? 'pulse-ring-red' : isMod ? 'pulse-ring-amber' : '';

    // Custom HTML marker with glowing halo
    const iconHtml = `
      <div class="custom-map-marker ${glowClass}">
        <div class="cmm-circle" style="background:${color}; box-shadow:0 0 12px ${color};">
          <i class="fa-solid fa-mountain" style="font-size:10px; color:#fff;"></i>
        </div>
        <div class="cmm-label" style="border-left: 3px solid ${color};">
          <strong>${sector.name.split(' ')[0]}</strong>
          <span>FoS ${sector.fos}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [120, 36],
      iconAnchor: [16, 18]
    });

    const marker = L.marker([sector.lat, sector.lng], { icon: customIcon });

    marker.on('click', () => {
      selectSectorById(sector.id);
    });

    marker.bindTooltip(`
      <div style="font-family:'Inter',sans-serif; padding:4px;">
        <strong style="color:#fff;">${sector.name}</strong><br/>
        <span style="color:#94a3b8; font-size:10px;">${sector.coalfield}</span><br/>
        <span style="color:${color}; font-weight:700;">Status: ${sector.risk_level} (FoS: ${sector.fos})</span>
      </div>
    `, { className: 'custom-leaflet-tooltip', offset: [0, -10] });

    sectorMarkersGroup.addLayer(marker);

    // Hazard zone boundary radius circle around high/moderate sectors
    if (isHigh || isMod) {
      const hazardCircle = L.circle([sector.lat, sector.lng], {
        radius: isHigh ? 650 : 400,
        color: color,
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: color,
        fillOpacity: isHigh ? 0.15 : 0.08
      });
      sectorMarkersGroup.addLayer(hazardCircle);
    }
  });
}

// InSAR LOS Deformation Heatmap Circles Overlay
function generateInSARHeatmapOverlays() {
  if (!insarHeatmapGroup) return;
  insarHeatmapGroup.clearLayers();

  const insarPoints = [
    { lat: 23.7441, lng: 86.4156, rate: -28.4, radius: 800, color: '#ff0055' },
    { lat: 23.7280, lng: 86.4420, rate: -24.7, radius: 700, color: '#ff0033' },
    { lat: 23.7650, lng: 86.3890, rate: -21.2, radius: 600, color: '#ff6600' },
    { lat: 23.7710, lng: 86.4250, rate: -16.8, radius: 550, color: '#ff9900' },
    { lat: 23.7820, lng: 86.3640, rate: -8.4, radius: 450, color: '#33cc33' },
    { lat: 23.7200, lng: 86.4300, rate: -6.2, radius: 400, color: '#00cc88' }
  ];

  insarPoints.forEach(pt => {
    const circle = L.circle([pt.lat, pt.lng], {
      radius: pt.radius,
      color: pt.color,
      weight: 1,
      fillColor: pt.color,
      fillOpacity: 0.28
    }).bindPopup(`<strong>Sentinel-1 InSAR Hotspot</strong><br/>LOS Velocity: ${pt.rate} mm/yr<br/>Coherence: 0.76`);

    insarHeatmapGroup.addLayer(circle);
  });
}

function toggleInSARLayer(btnElement) {
  isInsarLayerVisible = !isInsarLayerVisible;
  if (isInsarLayerVisible) {
    mainMap.addLayer(insarHeatmapGroup);
    if (btnElement) btnElement.classList.add('active');
    showToast('Copernicus InSAR Deformation Heatmap enabled.');
  } else {
    mainMap.removeLayer(insarHeatmapGroup);
    if (btnElement) btnElement.classList.remove('active');
    showToast('InSAR Deformation Heatmap hidden.');
  }
}

// Doppler Weather Radar Overlay Simulation
function toggleRadarSimulation(btnElement) {
  isRadarLayerVisible = !isRadarLayerVisible;
  if (isRadarLayerVisible) {
    // Generate animated radar echoes over Dhanbad
    const radarEchoes = [
      L.circle([23.7700, 86.4000], { radius: 3500, color: '#06b6d4', weight: 1, fillColor: '#06b6d4', fillOpacity: 0.25 }),
      L.circle([23.7500, 86.4300], { radius: 2200, color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.35 }),
      L.circle([23.7441, 86.4156], { radius: 1200, color: '#ef4444', weight: 1.5, fillColor: '#ef4444', fillOpacity: 0.45 })
    ];
    radarEchoes.forEach(e => weatherRadarGroup.addLayer(e));
    mainMap.addLayer(weatherRadarGroup);
    if (btnElement) btnElement.classList.add('active');
    showToast('IMD Doppler Radar Echoes Overlay: ACTIVE (46.5 dBZ Convective Cell)');
  } else {
    weatherRadarGroup.clearLayers();
    mainMap.removeLayer(weatherRadarGroup);
    if (btnElement) btnElement.classList.remove('active');
    showToast('Doppler Weather Radar overlay hidden.');
  }
}

// ===================================================================
// HIGH-RESOLUTION MICRO-SECTOR INSET MAP (Matching Reference Image)
// ===================================================================
function initMicroSectorMap() {
  const microElem = document.getElementById('micro-map-canvas');
  if (!microElem || microMap) return;

  // Zoomed in high-res view of the selected sector bench
  microMap = L.map('micro-map-canvas', {
    center: [23.7441, 86.4156],
    zoom: 16,
    zoomControl: false,
    attributionControl: false
  });

  microBasemapLayer = L.tileLayer(BASEMAP_TILES.esri.url, BASEMAP_TILES.esri.options).addTo(microMap);
  microSensorsGroup = L.layerGroup().addTo(microMap);

  renderMicroSectorSensors('JHR-S4');
}

function updateMicroSectorView(sector) {
  if (!sector) return;
  const card = document.getElementById('micro-sector-card');
  if (card) card.style.display = 'flex';

  document.getElementById('msc-sector-name').textContent = sector.name;
  document.getElementById('msc-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${sector.coalfield || 'Jharia Coalfield'}`;
  document.getElementById('msc-lora').innerHTML = `<i class="fa-solid fa-tower-cell"></i> LoRa: ${sector.lora_node || 'NODE-DHN-JHR01'}`;

  const riskBadge = document.getElementById('msc-risk-badge');
  riskBadge.className = `msc-status-badge ${sector.risk_level.toLowerCase()}`;
  riskBadge.textContent = sector.risk_level === 'HIGH' ? 'HIGH RISK: EVACUATION' : sector.risk_level === 'MODERATE' ? 'MODERATE: ACTIVE WATCH' : 'SAFE: STABLE BENCH';

  document.getElementById('msc-coords-badge').innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Lat: ${sector.lat.toFixed(4)}° N | Lng: ${sector.lng.toFixed(4)}° E | ${sector.elevation}m RL`;

  // Telemetry numbers
  document.getElementById('msc-soil-val').textContent = sector.soil_moisture;
  document.getElementById('msc-soil-bar').style.width = `${Math.min(100, sector.soil_moisture)}%`;

  document.getElementById('msc-rain-val').textContent = (sector.rainfall_mm * 0.4).toFixed(1);
  document.getElementById('msc-rain-bar').style.width = `${Math.min(100, sector.rainfall_mm)}%`;
  document.getElementById('msc-rain-24h').textContent = `${sector.rainfall_mm} mm`;

  document.getElementById('msc-fos-val').textContent = sector.fos;
  document.getElementById('msc-fos-bar').style.width = `${Math.min(100, (sector.fos / 2) * 100)}%`;

  document.getElementById('msc-disp-val').textContent = sector.displacement_mm;
  document.getElementById('msc-disp-bar').style.width = `${Math.min(100, (sector.displacement_mm / 30) * 100)}%`;

  if (microMap) {
    microMap.setView([sector.lat, sector.lng], 16);
    renderMicroSectorSensors(sector.id, sector.lat, sector.lng);
  }
}

function renderMicroSectorSensors(sectorId, centerLat = 23.7441, centerLng = 86.4156) {
  if (!microMap || !microSensorsGroup) return;
  microSensorsGroup.clearLayers();

  // 1. Danger Zone Perimeter Polygon
  const polygonPoints = [
    [centerLat + 0.0025, centerLng - 0.0030],
    [centerLat + 0.0030, centerLng + 0.0025],
    [centerLat - 0.0010, centerLng + 0.0035],
    [centerLat - 0.0025, centerLng - 0.0015]
  ];

  const dangerPolygon = L.polygon(polygonPoints, {
    color: '#ef4444',
    weight: 2,
    dashArray: '4, 4',
    fillColor: '#ef4444',
    fillOpacity: 0.2
  }).addTo(microSensorsGroup);

  // 2. Evacuation Path Polyline
  const evacPath = [
    [centerLat - 0.0005, centerLng - 0.0010],
    [centerLat - 0.0025, centerLng - 0.0040],
    [centerLat - 0.0035, centerLng - 0.0055]
  ];

  L.polyline(evacPath, {
    color: '#10b981',
    weight: 3,
    dashArray: '8, 8'
  }).addTo(microSensorsGroup);

  // 3. Sensor Icon Markers
  const createSensorMarker = (lat, lng, iconHtml, title) => {
    const icon = L.divIcon({
      html: `<div class="micro-sensor-icon">${iconHtml}</div>`,
      className: 'micro-div-icon',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    return L.marker([lat, lng], { icon }).bindTooltip(title, { direction: 'top' });
  };

  // Inclinometer (35m)
  createSensorMarker(centerLat + 0.0015, centerLng - 0.0012, '<i class="fa-solid fa-circle-dot" style="color:#06b6d4;"></i>', 'Borehole Inclinometer (35m)').addTo(microSensorsGroup);

  // Soil Moisture Sensor
  createSensorMarker(centerLat + 0.0002, centerLng + 0.0010, '<i class="fa-solid fa-droplet" style="color:#3b82f6;"></i>', 'VWC Soil Moisture Probe').addTo(microSensorsGroup);

  // Rain Gauge
  createSensorMarker(centerLat + 0.0018, centerLng + 0.0018, '<i class="fa-solid fa-cloud-rain" style="color:#6366f1;"></i>', 'Automatic Rain Gauge (ARG)').addTo(microSensorsGroup);

  // LoRa Gateway
  createSensorMarker(centerLat - 0.0018, centerLng - 0.0030, '<i class="fa-solid fa-tower-broadcast" style="color:#a855f7;"></i>', 'LoRaWAN Gateway Relay').addTo(microSensorsGroup);

  // Safe Assembly Shelter
  createSensorMarker(centerLat - 0.0035, centerLng - 0.0055, '<i class="fa-solid fa-person-shelter" style="color:#10b981;"></i>', 'Designated Safe Shelter B').addTo(microSensorsGroup);
}

function closeMicroSectorCard() {
  const card = document.getElementById('micro-sector-card');
  if (card) card.style.display = 'none';
}
