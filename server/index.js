require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Relaxed rate limiter for mining telemetry dashboard
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 2000 });
app.use('/api/', limiter);

// Register API Routes
app.use('/api/imd', require('./routes/imd'));
app.use('/api/sentinel', require('./routes/sentinel'));
app.use('/api/risk', require('./routes/risk'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/engineer', require('./routes/engineer'));
app.use('/api/photos', require('./routes/photos'));

// Complete Dhanbad Mining Belt Sectors (Jharia Coalfield, BCCL)
const SECTORS = [
  {
    id: 'JHR-S4',
    name: 'Jharia Overburden Dump Sector-4',
    lat: 23.7441,
    lng: 86.4156,
    elevation: 245,
    coalfield: 'Jharia Coalfield (BCCL Area IX)',
    sub_district: 'Jharia',
    lora_node: 'NODE-DHN-JHR01',
    initial_fos: 0.92, // High risk
    initial_rain: 78.5,
    initial_moist: 88.2,
    initial_disp: 22.4,
    slope_angle: 42.0,
    pore_pressure: 122.4,
    insar_los_rate: -28.4
  },
  {
    id: 'LDN-D3',
    name: 'Lodna Deep Pit Fire Zone',
    lat: 23.7280,
    lng: 86.4420,
    elevation: 238,
    coalfield: 'Lodna Area (BCCL Area X)',
    sub_district: 'Lodna',
    lora_node: 'NODE-DHN-LDN03',
    initial_fos: 0.88, // High risk
    initial_rain: 74.0,
    initial_moist: 86.5,
    initial_disp: 24.8,
    slope_angle: 44.5,
    pore_pressure: 118.0,
    insar_los_rate: -24.7
  },
  {
    id: 'KSN-M2',
    name: 'Kusunda Mine East Bench',
    lat: 23.7650,
    lng: 86.3890,
    elevation: 260,
    coalfield: 'Kusunda Colliery (BCCL Area VI)',
    sub_district: 'Kusunda',
    lora_node: 'NODE-DHN-KSN02',
    initial_fos: 1.15, // Moderate risk
    initial_rain: 52.0,
    initial_moist: 74.0,
    initial_disp: 11.2,
    slope_angle: 36.0,
    pore_pressure: 96.5,
    insar_los_rate: -21.2
  },
  {
    id: 'BST-P2',
    name: 'Bastacolla Opencast Pit-2',
    lat: 23.7710,
    lng: 86.4250,
    elevation: 235,
    coalfield: 'Bastacolla Area (BCCL Area IX)',
    sub_district: 'Bastacolla',
    lora_node: 'NODE-DHN-BST02',
    initial_fos: 1.22, // Moderate risk
    initial_rain: 48.5,
    initial_moist: 71.5,
    initial_disp: 9.8,
    slope_angle: 35.0,
    pore_pressure: 92.0,
    insar_los_rate: -16.8
  },
  {
    id: 'KTR-C1',
    name: 'Katras Colliery North Slope',
    lat: 23.7820,
    lng: 86.3640,
    elevation: 290,
    coalfield: 'Katras Area (BCCL Area IV)',
    sub_district: 'Katras',
    lora_node: 'NODE-DHN-KTR01',
    initial_fos: 1.48, // Safe
    initial_rain: 32.0,
    initial_moist: 58.0,
    initial_disp: 4.5,
    slope_angle: 28.0,
    pore_pressure: 76.0,
    insar_los_rate: -8.4
  },
  {
    id: 'BHW-C3',
    name: 'Bhowra Colliery West Face',
    lat: 23.7200,
    lng: 86.4300,
    elevation: 235,
    coalfield: 'Bhowra Area (BCCL Area XI)',
    sub_district: 'Bhowra',
    lora_node: 'NODE-DHN-BHW03',
    initial_fos: 1.55, // Safe
    initial_rain: 28.4,
    initial_moist: 54.0,
    initial_disp: 3.2,
    slope_angle: 26.5,
    pore_pressure: 72.0,
    insar_los_rate: -6.2
  },
  {
    id: 'SDM-M5',
    name: 'Sudamdih Shaft Buffer Slope',
    lat: 23.7950,
    lng: 86.4500,
    elevation: 275,
    coalfield: 'Sudamdih Area (BCCL Area XI)',
    sub_district: 'Sudamdih',
    lora_node: 'NODE-DHN-SDM05',
    initial_fos: 1.68, // Safe
    initial_rain: 22.0,
    initial_moist: 49.0,
    initial_disp: 1.8,
    slope_angle: 22.0,
    pore_pressure: 68.0,
    insar_los_rate: -3.1
  },
  {
    id: 'MND-S6',
    name: 'Moonidih Deep Open Face',
    lat: 23.7420,
    lng: 86.3530,
    elevation: 270,
    coalfield: 'Moonidih Project (WJ Area)',
    sub_district: 'Moonidih',
    lora_node: 'NODE-DHN-MND06',
    initial_fos: 1.42, // Safe
    initial_rain: 35.5,
    initial_moist: 62.0,
    initial_disp: 5.1,
    slope_angle: 30.0,
    pore_pressure: 81.0,
    insar_los_rate: -9.5
  }
];

function getRiskLevel(fos) {
  if (fos < 1.00) return 'HIGH';
  if (fos < 1.30) return 'MODERATE';
  return 'SAFE';
}

let sectorState = SECTORS.map(s => ({
  ...s,
  fos: s.initial_fos,
  rainfall_mm: s.initial_rain,
  soil_moisture: s.initial_moist,
  displacement_mm: s.initial_disp,
  pore_pressure: s.pore_pressure,
  insar_coherence: parseFloat((0.68 + Math.random() * 0.22).toFixed(3)),
  sentinel_backscatter: parseFloat((-14 + Math.random() * 5).toFixed(2)),
  risk_level: getRiskLevel(s.initial_fos),
  last_updated: new Date().toISOString()
}));

function updateSectors() {
  sectorState = sectorState.map(s => {
    // Slight continuous realistic drift
    const deltaFos = (Math.random() - 0.5) * 0.02;
    const newFos = Math.max(0.55, Math.min(2.1, s.fos + deltaFos));

    const deltaRain = (Math.random() - 0.48) * 0.8;
    const newRain = Math.max(5, Math.min(180, s.rainfall_mm + deltaRain));

    const deltaMoist = (Math.random() - 0.49) * 0.5;
    const newMoist = Math.max(25, Math.min(96, s.soil_moisture + deltaMoist));

    // High risk sectors creep faster
    const isCritical = newFos < 1.0;
    const creep = isCritical ? 0.05 + Math.random() * 0.08 : 0.01 + Math.random() * 0.02;
    const newDisp = Math.max(0, Math.min(75, s.displacement_mm + creep));

    const deltaPore = (Math.random() - 0.5) * 1.2;
    const newPore = Math.max(40, Math.min(160, (s.pore_pressure || 85) + deltaPore));

    return {
      ...s,
      fos: parseFloat(newFos.toFixed(3)),
      rainfall_mm: parseFloat(newRain.toFixed(1)),
      soil_moisture: parseFloat(newMoist.toFixed(1)),
      displacement_mm: parseFloat(newDisp.toFixed(2)),
      pore_pressure: parseFloat(newPore.toFixed(1)),
      insar_coherence: parseFloat((0.68 + Math.random() * 0.22).toFixed(3)),
      sentinel_backscatter: parseFloat((-14 + Math.random() * 5).toFixed(2)),
      risk_level: getRiskLevel(newFos),
      last_updated: new Date().toISOString()
    };
  });
  return sectorState;
}

// Global sector getter
app.locals.getSectors = () => sectorState;

// Allow manual trigger to force sector into high risk or safe state for drills/simulations
app.post('/api/simulate-trigger', (req, res) => {
  const { sector_id, state } = req.body;
  const sector = sectorState.find(s => s.id === sector_id);
  if (!sector) return res.status(404).json({ success: false, message: 'Sector not found' });

  if (state === 'CRITICAL_FAILURE') {
    sector.fos = 0.76;
    sector.displacement_mm = 38.5;
    sector.rainfall_mm = 96.0;
    sector.soil_moisture = 94.2;
    sector.pore_pressure = 148.0;
  } else if (state === 'RESET_SAFE') {
    sector.fos = 1.45;
    sector.displacement_mm = 4.2;
    sector.rainfall_mm = 24.0;
    sector.soil_moisture = 55.0;
    sector.pore_pressure = 75.0;
  }
  sector.risk_level = getRiskLevel(sector.fos);
  sector.last_updated = new Date().toISOString();

  broadcast({
    type: 'sensor_update',
    data: {
      sectors: sectorState,
      timestamp: new Date().toISOString()
    }
  });

  res.json({ success: true, sector });
});

// WebSocket clients
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send immediate initial state
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      sectors: sectorState,
      timestamp: new Date().toISOString(),
      weather: {
        district: 'Dhanbad',
        rainfall_24h: 62.4,
        temperature: 24.2,
        humidity: 78.0,
        wind_speed: 14.5,
        warning_level: 'ORANGE'
      }
    }
  }));

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Broadcast live sensor updates every 4 seconds
setInterval(() => {
  const updated = updateSectors();
  broadcast({
    type: 'sensor_update',
    data: {
      sectors: updated,
      timestamp: new Date().toISOString(),
      weather: {
        district: 'Dhanbad',
        rainfall_24h: parseFloat((55 + Math.random() * 25).toFixed(1)),
        temperature: parseFloat((24 + Math.random() * 4).toFixed(1)),
        humidity: parseFloat((72 + Math.random() * 15).toFixed(1)),
        wind_speed: parseFloat((12 + Math.random() * 8).toFixed(1)),
        warning_level: 'ORANGE'
      }
    }
  });
}, 4000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚨 Dhanbad SlopeGuard EWS running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server listening on ws://localhost:${PORT}`);
});

module.exports = { app, server };
