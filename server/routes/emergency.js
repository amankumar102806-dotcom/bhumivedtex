const express = require('express');
const router = express.Router();

// Real Dhanbad Mining Emergency Hospitals and Rescue Units
const HOSPITALS = [
  {
    id: 'HOSP-BCCL',
    name: 'BCCL Central Hospital, Koyla Nagar',
    city: 'Dhanbad',
    contact: '0326-2310400',
    emergency_contact: '0326-2310401',
    distance_km: 7.2,
    trauma_beds_available: 14,
    burn_unit: true,
    lat: 23.8115,
    lng: 86.4382,
    status: 'ACTIVE_READY'
  },
  {
    id: 'HOSP-SNMMCH',
    name: 'Shahid Nirmal Mahto Medical College Hospital (SNMMCH / PMCH)',
    city: 'Dhanbad',
    contact: '0326-2301296',
    emergency_contact: '108',
    distance_km: 9.8,
    trauma_beds_available: 28,
    burn_unit: true,
    lat: 23.8240,
    lng: 86.4420,
    status: 'ACTIVE_READY'
  },
  {
    id: 'HOSP-ASARFI',
    name: 'Asarfi Hospital, Barwadda',
    city: 'Dhanbad',
    contact: '0326-2314000',
    emergency_contact: '0326-2314001',
    distance_km: 12.5,
    trauma_beds_available: 9,
    burn_unit: false,
    lat: 23.8450,
    lng: 86.4250,
    status: 'STANDBY'
  }
];

// Active Ambulance Fleet in Dhanbad Mining Belt
let ambulanceFleet = [
  {
    id: 'AMB-DHN-01',
    plate: 'JH-10-AZ-4102',
    station: 'BCCL Central Hospital Unit 1',
    driver: 'Manoj Kumar',
    driver_phone: '+91 94311 20114',
    type: 'Advanced Life Support (ALS)',
    status: 'AVAILABLE',
    current_lat: 23.8115,
    current_lng: 86.4382,
    eta_min: 0,
    assigned_sector: null
  },
  {
    id: 'AMB-DHN-02',
    plate: 'JH-10-BB-8831',
    station: 'Jharia Coalfield First Aid Post',
    driver: 'Deepak Soren',
    driver_phone: '+91 94313 77412',
    type: 'Basic Life Support (BLS)',
    status: 'STANDBY',
    current_lat: 23.7480,
    current_lng: 86.4170,
    eta_min: 0,
    assigned_sector: null
  },
  {
    id: 'AMB-DHN-03',
    plate: 'JH-10-CA-5529',
    station: 'Katras Colliery Dispensary',
    driver: 'Santosh Yadav',
    driver_phone: '+91 94315 90823',
    type: 'Advanced Life Support (ALS)',
    status: 'AVAILABLE',
    current_lat: 23.7820,
    current_lng: 86.3640,
    eta_min: 0,
    assigned_sector: null
  },
  {
    id: 'AMB-DHN-04',
    plate: 'JH-10-DB-1994',
    station: 'Bhowra Safety Complex',
    driver: 'Rajiv Sinha',
    driver_phone: '+91 94317 44109',
    type: 'BLS Mining Trauma Ambulance',
    status: 'AVAILABLE',
    current_lat: 23.7200,
    current_lng: 86.4300,
    eta_min: 0,
    assigned_sector: null
  }
];

// Active Incident Tracker
let activeIncidents = [
  {
    id: 'INC-2026-001',
    sector_id: 'JHR-S4',
    sector_name: 'Jharia Overburden Dump Sector-4',
    type: 'SLOPE_DEFORMATION_CRACK',
    description: 'Active 35-meter tension crack observed along the crest of dump bench 3. Subsidence of 22mm registered by crackmeter.',
    reported_at: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'INVESTIGATING',
    severity: 'HIGH',
    casualties: 0,
    ambulances_dispatched: 0,
    evacuation_status: 'PARTIAL_STAGE_1'
  }
];

// Casualty Register
let casualtyDesk = [
  {
    id: 'CAS-DHN-101',
    incident_id: 'INC-2026-001',
    name: 'Rameshwar Singh',
    designation: 'Dumper Operator (JH-10-EX-88)',
    triage: 'YELLOW',
    status: 'TREATED_ON_SITE',
    injury: 'Ankle sprain during rapid bench step-off',
    hospital: 'BCCL Central Hospital OPD',
    reported_time: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'CAS-DHN-102',
    incident_id: 'INC-2026-001',
    name: 'Baidyanath Mahato',
    designation: 'Survey Helper',
    triage: 'GREEN',
    status: 'OBSERVATION',
    injury: 'Minor abrasions from loose gravel roll',
    hospital: 'Jharia First Aid Center',
    reported_time: new Date(Date.now() - 15 * 60000).toISOString()
  }
];

// Missing Persons / FIRs
let missingFirs = [
  {
    id: 'FIR-JHR-2026-89',
    person_name: 'Gopal Tudu',
    role: 'Blasting Helper (Night Shift)',
    last_seen_location: 'Sector 4 East Berm Bench Level 2',
    last_contact: '23:10 IST',
    status: 'SEARCH_IN_PROGRESS',
    search_team: 'DGMS Mine Rescue Squad Alpha',
    reported_by: 'Mines Foreman K.K. Verma'
  },
  {
    id: 'FIR-JHR-2026-90',
    person_name: 'Sunil Paswan',
    role: 'Dozer Assistant',
    last_seen_location: 'Dump Toe Haul Access Ramp',
    last_contact: '23:25 IST',
    status: 'LOCATED_SAFE',
    search_team: 'BCCL Safety Patrol',
    reported_by: 'Shift Incharge S.R. Murmu'
  }
];

// PA Broadcast History
let speakerBroadcastLog = [];

// 1. Get Emergency Overview (Hospitals, Ambulances, Casualties, FIRs)
router.get('/overview', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      hospitals: HOSPITALS,
      ambulances: ambulanceFleet,
      casualty_count: casualtyDesk.length,
      missing_count: missingFirs.filter(f => f.status === 'SEARCH_IN_PROGRESS').length,
      active_incidents: activeIncidents.length,
      hospital_alertness: 'AMBER_STANDBY'
    }
  });
});

// 2. Dispatch Ambulance
router.post('/dispatch-ambulance', (req, res) => {
  const { sector_id, location, estimated_casualties, description, hospital_choice } = req.body;

  // Find available ambulance
  const amb = ambulanceFleet.find(a => a.status === 'AVAILABLE') || ambulanceFleet[0];
  amb.status = 'EN_ROUTE';
  amb.assigned_sector = sector_id || 'JHR-S4';
  amb.eta_min = Math.floor(6 + Math.random() * 8);

  const selectedHospital = HOSPITALS.find(h => h.id === hospital_choice) || HOSPITALS[0];

  const dispatchEvent = {
    dispatch_id: `DISP-${Date.now()}`,
    ambulance: { ...amb },
    hospital_notified: selectedHospital,
    sector_id: sector_id || 'JHR-S4',
    location: location || 'Jharia Overburden Dump Sector-4 (Pit Crest)',
    estimated_casualties: Number(estimated_casualties) || 1,
    notes: description || 'Immediate trauma response for mining bench slope displacement.',
    dispatch_time: new Date().toISOString(),
    eta_minutes: amb.eta_min,
    status: 'DISPATCHED_ACTIVE'
  };

  // Add to active incident
  activeIncidents.unshift({
    id: `INC-${Date.now()}`,
    sector_id: sector_id || 'JHR-S4',
    sector_name: location || 'Jharia Overburden Dump',
    type: 'AMBULANCE_DISPATCH',
    description: `Ambulance ${amb.plate} dispatched. ETA: ${amb.eta_min} mins. Dest: ${selectedHospital.name}`,
    reported_at: new Date().toISOString(),
    status: 'ACTIVE_RESPONSE',
    severity: 'HIGH',
    casualties: Number(estimated_casualties) || 1,
    ambulances_dispatched: 1,
    evacuation_status: 'STAGE_2_ACTIVE'
  });

  res.json({
    success: true,
    message: `Ambulance ${amb.plate} dispatched immediately!`,
    dispatch: dispatchEvent
  });
});

// 3. PA Speaker Announcement System
router.post('/speaker-alert', (req, res) => {
  const { sector_id, sector_name, priority, message_en, message_hi, speaker_zones } = req.body;

  const defaultEn = priority === 'HIGH'
    ? `EMERGENCY ALERT: High risk of slope failure detected at ${sector_name || 'Jharia Sector 4'}! Immediate bench evacuation ordered! Move to Safe Shelter B immediately!`
    : `SAFETY ADVISORY: Elevated deformation rate recorded. All machinery retreat from slope toe.`;

  const defaultHi = priority === 'HIGH'
    ? `आपातकालीन चेतावनी: ${sector_name || 'झरिया सेक्टर 4'} में ढलान विफलता का भारी खतरा है! तुरंत बेंच खाली करें और सुरक्षित शेल्टर की ओर जाएं!`
    : `सुरक्षा सूचना: ढलान पर दबाव बढ़ रहा है। सभी वाहन ढलान के निचले हिस्से से पीछे हटें।`;

  const announcement = {
    id: `PA-DHN-${Date.now()}`,
    sector_id: sector_id || 'ALL',
    sector_name: sector_name || 'All Mining Sectors',
    priority: priority || 'HIGH',
    message_en: message_en || defaultEn,
    message_hi: message_hi || defaultHi,
    speaker_zones: speaker_zones || ['Sector-4 Dump Horns', 'Central Haul Road PA', 'Pit Bottom Horns', 'Workshop Tannoy'],
    broadcast_time: new Date().toISOString(),
    siren_pattern: priority === 'HIGH' ? 'WAIL_HIGH_LOW_800_1200HZ' : 'CHIME_ALERT_600HZ',
    decibel_output: 120, // dB outdoor mining sirens
    repeat_count: priority === 'HIGH' ? 3 : 1,
    operator: 'Automated EWS Trigger / Safety Controller',
    status: 'TRANSMITTED_SUCCESSFULLY'
  };

  speakerBroadcastLog.unshift(announcement);
  if (speakerBroadcastLog.length > 50) speakerBroadcastLog.pop();

  res.json({
    success: true,
    message: 'PA Announcement transmitted across mining speaker array!',
    announcement
  });
});

// 4. Report Casualty
router.post('/report-casualty', (req, res) => {
  const { incident_id, name, designation, triage, injury, hospital } = req.body;

  const newCas = {
    id: `CAS-DHN-${Date.now().toString().slice(-4)}`,
    incident_id: incident_id || 'INC-2026-001',
    name: name || 'Unidentified Mining Worker',
    designation: designation || 'General Workman',
    triage: triage || 'YELLOW',
    status: 'TRIAGED_AWAITING_TRANSPORT',
    injury: injury || 'Trauma from slope rockfall / debris',
    hospital: hospital || 'BCCL Central Hospital, Koyla Nagar',
    reported_time: new Date().toISOString()
  };

  casualtyDesk.unshift(newCas);

  res.json({
    success: true,
    message: 'Casualty logged and medical response triggered!',
    casualty: newCas
  });
});

// 5. Get Casualties & Missing FIRs
router.get('/casualties', (req, res) => {
  res.json({
    success: true,
    casualties: casualtyDesk,
    missing_firs: missingFirs,
    active_incidents: activeIncidents,
    broadcast_history: speakerBroadcastLog
  });
});

// 6. Generate SITREP (Situation Report)
router.get('/sitrep', (req, res) => {
  const format = req.query.format || 'json';
  const getSectors = req.app.locals.getSectors;
  const sectors = getSectors ? getSectors() : [];

  const highRiskSectors = sectors.filter(s => s.fos < 1.0);
  const modRiskSectors = sectors.filter(s => s.fos >= 1.0 && s.fos < 1.3);

  const sitrep = {
    sitrep_id: `SITREP-DHN-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`,
    generated_at: new Date().toISOString(),
    reporting_agency: 'BCCL Mine Safety & DGMS Joint Early Warning Cell, Dhanbad',
    area_covered: 'Jharia Coalfield & Dhanbad Opencast Mining Belt, Jharkhand',
    operational_status: highRiskSectors.length > 0 ? 'STAGE_3_HIGH_ALERT' : 'STAGE_1_ROUTINE',
    hazard_summary: {
      total_monitored_sectors: sectors.length,
      high_risk_sectors_count: highRiskSectors.length,
      moderate_risk_sectors_count: modRiskSectors.length,
      high_risk_sectors: highRiskSectors.map(s => ({
        id: s.id,
        name: s.name,
        fos: s.fos,
        rainfall: s.rainfall_mm,
        displacement: s.displacement_mm
      }))
    },
    emergency_ops: {
      ambulances_active: ambulanceFleet.filter(a => a.status !== 'AVAILABLE').length,
      ambulances_available: ambulanceFleet.filter(a => a.status === 'AVAILABLE').length,
      casualties_under_care: casualtyDesk.length,
      missing_firs_unresolved: missingFirs.filter(f => f.status === 'SEARCH_IN_PROGRESS').length,
      last_pa_broadcast: speakerBroadcastLog[0] || null
    },
    recommended_dgms_actions: [
      'Immediate barricading of 150m safety perimeter at Sector 4 Overburden Dump toe.',
      'Divert heavy dumpers away from Haul Road Section 2B due to tension fissures.',
      'Deploy portable diesel dewatering pumps to sump S-3 to relieve hydro-static pore pressure.',
      'Continuous InSAR & automated total station prism tracking at 5-minute intervals.'
    ]
  };

  if (format === 'text') {
    let txt = `===================================================================\n`;
    txt += `          DIRECTOR GENERAL OF MINES SAFETY (DGMS) & BCCL           \n`;
    txt += `            SLOPE FAILURE EARLY WARNING SITUATION REPORT           \n`;
    txt += `===================================================================\n`;
    txt += `SITREP ID: ${sitrep.sitrep_id}\n`;
    txt += `Generated: ${sitrep.generated_at}\n`;
    txt += `Status: ${sitrep.operational_status}\n`;
    txt += `Monitored Sectors: ${sectors.length} | High Risk: ${highRiskSectors.length} | Moderate: ${modRiskSectors.length}\n\n`;
    txt += `CRITICAL SECTORS:\n`;
    highRiskSectors.forEach(s => {
      txt += `  - ${s.name} (FoS: ${s.fos}, Rain: ${s.rainfall_mm}mm, Disp: ${s.displacement_mm}mm)\n`;
    });
    txt += `\nEMERGENCY STATUS:\n`;
    txt += `  - Casualties Tracked: ${sitrep.emergency_ops.casualties_under_care}\n`;
    txt += `  - Missing Personnel: ${sitrep.emergency_ops.missing_firs_unresolved}\n`;
    txt += `  - Ambulances Available: ${sitrep.emergency_ops.ambulances_available}\n\n`;
    txt += `MANDATED ACTIONS:\n`;
    sitrep.recommended_dgms_actions.forEach((a, i) => {
      txt += `  ${i + 1}. ${a}\n`;
    });
    txt += `===================================================================\n`;
    res.setHeader('Content-Type', 'text/plain');
    return res.send(txt);
  }

  res.json({ success: true, sitrep });
});

module.exports = router;
