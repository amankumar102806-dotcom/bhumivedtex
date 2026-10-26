const express = require('express');
const router = express.Router();

// Mining Engineering Geotechnical Telemetry & Field Observations Store
let fieldInspections = [
  {
    id: 'INSP-DHN-882',
    sector_id: 'JHR-S4',
    inspector: 'Er. Sandeep Mukherjee (Chief Geotechnical Engineer, BCCL Area IX)',
    date: new Date(Date.now() - 3 * 3600000).toISOString(),
    bench_level: 'Bench Level +240m RL',
    crack_width_cm: 6.8,
    crack_length_m: 42.0,
    tension_crack_strike: 'N 45° E (parallel to dump face)',
    water_seepage_observed: 'MODERATE_SPRING_AT_TOE',
    rockfall_evidence: 'FREQUENT_RAVELLING',
    face_bulging_detected: true,
    recommendation: 'Immediate shovel withdrawal and berm flattening with dozer D-155.',
    status: 'ACTIVE_WARNING'
  },
  {
    id: 'INSP-DHN-879',
    sector_id: 'KSN-M2',
    inspector: 'Er. P.K. Banerji (Sr. Geologist, DGMS Certified)',
    date: new Date(Date.now() - 26 * 3600000).toISOString(),
    bench_level: 'Bench Level +210m RL',
    crack_width_cm: 2.1,
    crack_length_m: 18.5,
    tension_crack_strike: 'N 20° W',
    water_seepage_observed: 'DRY',
    rockfall_evidence: 'OCCASIONAL',
    face_bulging_detected: false,
    recommendation: 'Install 2 additional prism targets for continuous total station tracking.',
    status: 'MONITORING'
  }
];

// Inclinometer Depth Profiles for Dhanbad Benches (0m down to -35m)
const INCLINOMETER_DEPTHS = [0, -5, -10, -15, -20, -25, -30, -35];

function generateInclinometerProfile(sectorId) {
  const isHighRisk = sectorId === 'JHR-S4' || sectorId === 'BST-P2' || sectorId === 'LDN-D3';
  const maxShearDepth = -15; // Shear plane at 15m depth
  return INCLINOMETER_DEPTHS.map(depth => {
    let dispA = 0;
    if (depth >= maxShearDepth) {
      // Upper sliding block moves more
      dispA = isHighRisk
        ? 18.5 + (depth - maxShearDepth) * 0.4 + (Math.random() - 0.5) * 1.5
        : 4.2 + (depth - maxShearDepth) * 0.15 + (Math.random() - 0.5) * 0.5;
    } else {
      // Stable bedrock beneath shear plane
      dispA = (Math.random() * 0.8);
    }
    return {
      depth_m: depth,
      displacement_a_axis_mm: parseFloat(Math.max(0, dispA).toFixed(2)),
      displacement_b_axis_mm: parseFloat((dispA * 0.25 + (Math.random() - 0.5) * 0.4).toFixed(2)),
      rate_mm_day: isHighRisk ? parseFloat((1.2 + Math.random() * 0.8).toFixed(2)) : 0.15
    };
  });
}

// 1. Get Comprehensive Mining Engineer Telemetry for Sector
router.get('/telemetry', (req, res) => {
  const sectorId = req.query.sector_id || 'JHR-S4';

  const telemetry = {
    sector_id: sectorId,
    timestamp: new Date().toISOString(),
    inclinometer_profile: generateInclinometerProfile(sectorId),
    piezometers: [
      { id: 'PZ-01-CREST', depth_m: 25, pore_pressure_kpa: 114.5, water_head_m: 11.67, status: 'HIGH_PRESSURE' },
      { id: 'PZ-02-MIDSLOPE', depth_m: 35, pore_pressure_kpa: 98.2, water_head_m: 10.01, status: 'NORMAL' },
      { id: 'PZ-03-TOE', depth_m: 15, pore_pressure_kpa: 142.8, water_head_m: 14.55, status: 'CRITICAL_CONFINED' }
    ],
    crackmeters: [
      { id: 'CM-DHN-01', location: 'Crest Fissure 1', current_opening_mm: 38.4, rate_mm_day: 4.8, status: 'ACCELERATING' },
      { id: 'CM-DHN-02', location: 'Mid-bench Joint', current_opening_mm: 14.2, rate_mm_day: 1.1, status: 'STEADY_CREEP' },
      { id: 'CM-DHN-03', location: 'Haul Ramp Edge', current_opening_mm: 8.6, rate_mm_day: 0.4, status: 'STABLE' }
    ],
    microseismic: {
      geophone_array_id: 'MS-GEO-DHN-04',
      events_last_24h: 47,
      energy_release_joules: 14200,
      dominant_frequency_hz: 68.4,
      b_value: 0.78, // b-value < 1.0 indicates high stress concentration prior to failure
      microcracking_status: 'ELEVATED_ACOUSTIC_ACTIVITY'
    },
    robotic_total_station_prisms: [
      { prism_id: 'PRISM-A1', dx_mm: 22.4, dy_mm: -14.2, dz_mm: -31.8, resultant_3d_mm: 41.4 },
      { prism_id: 'PRISM-A2', dx_mm: 18.1, dy_mm: -9.5, dz_mm: -24.2, resultant_3d_mm: 31.7 },
      { prism_id: 'PRISM-B1', dx_mm: 5.2, dy_mm: -2.1, dz_mm: -4.8, resultant_3d_mm: 7.4 }
    ],
    geotechnical_properties: {
      formation: 'Barakar Sandstone / Overburden Shales',
      cohesion_kpa: 28.5,
      friction_angle_deg: 34.0,
      unit_weight_kn_m3: 22.5,
      rock_mass_rating_rmr: 44, // Fair rock mass
      geological_strength_index_gsi: 48,
      ucs_mpa: 24.0,
      critical_hydraulic_gradient: 0.85
    }
  };

  res.json({ success: true, telemetry });
});

// 2. Submit Manual Field Observation by Mining Engineer
router.post('/inspection', (req, res) => {
  const {
    sector_id,
    inspector,
    bench_level,
    crack_width_cm,
    crack_length_m,
    tension_crack_strike,
    water_seepage_observed,
    rockfall_evidence,
    face_bulging_detected,
    recommendation
  } = req.body;

  const inspection = {
    id: `INSP-DHN-${Date.now().toString().slice(-4)}`,
    sector_id: sector_id || 'JHR-S4',
    inspector: inspector || 'Mining Engineer / Field Geologist',
    date: new Date().toISOString(),
    bench_level: bench_level || 'Bench Level +240m',
    crack_width_cm: Number(crack_width_cm) || 0,
    crack_length_m: Number(crack_length_m) || 0,
    tension_crack_strike: tension_crack_strike || 'N 45° E',
    water_seepage_observed: water_seepage_observed || 'NONE',
    rockfall_evidence: rockfall_evidence || 'NONE',
    face_bulging_detected: Boolean(face_bulging_detected),
    recommendation: recommendation || 'Routine surveillance.',
    status: (crack_width_cm > 5 || face_bulging_detected) ? 'CRITICAL_INSPECTION' : 'ROUTINE'
  };

  fieldInspections.unshift(inspection);

  res.json({
    success: true,
    message: 'Engineering field inspection logged and factored into EWS model!',
    inspection
  });
});

// 3. Get Field Inspections
router.get('/inspections', (req, res) => {
  res.json({
    success: true,
    inspections: fieldInspections
  });
});

module.exports = router;
