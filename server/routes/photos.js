const express = require('express');
const router = express.Router();

const PRONE_AREA_PHOTOS = [
  {
    id: 'PHOTO-DHN-01',
    sector_id: 'JHR-S4',
    sector_name: 'Jharia Overburden Dump Sector-4',
    title: 'Crest Tension Fissure & Active Dump Slump',
    location: 'BCCL Area IX, Jharia Coalfield, Dhanbad',
    coordinates: '23.7441° N, 86.4156° E',
    risk_level: 'HIGH_RISK',
    bench_elevation: '245m RL',
    capture_type: 'High-Resolution Drone Orthomosaic (DJI Matrice 300 RTK)',
    captured_at: '2026-10-24 14:30 IST',
    failure_mode: 'Rotational Slump along Soft Carbonaceous Shale Layer',
    image_url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-01', length_m: 42.5, max_gap_cm: 8.4, depth_est_m: 3.2, strike: 'NE-SW' },
        { id: 'CRK-02', length_m: 19.8, max_gap_cm: 4.1, depth_est_m: 1.8, strike: 'E-W' }
      ],
      hazard_area_sq_m: 3840,
      predicted_runout_distance_m: 110,
      toe_bulge_detected: true,
      thermal_anomaly_deg_c: 62.4 // Jharia coal fire hotspot
    },
    geological_notes: 'Overburden dump composed of loose sandstone boulders and shale matrix. Active subsurface fire vents releasing fumes along tension crack perimeter.'
  },
  {
    id: 'PHOTO-DHN-02',
    sector_id: 'KSN-M2',
    sector_name: 'Kusunda Mine East Bench',
    title: 'Highwall Bedding Shear & Rockfall Chute',
    location: 'BCCL Area VI, Kusunda Colliery, Dhanbad',
    coordinates: '23.7650° N, 86.3890° E',
    risk_level: 'HIGH_RISK',
    bench_elevation: '260m RL',
    capture_type: 'Aerial Photogrammetry Survey (UAV LiDAR + RGB)',
    captured_at: '2026-10-25 10:15 IST',
    failure_mode: 'Planar Sliding along Bedding Dip 38° South',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-03', length_m: 28.0, max_gap_cm: 5.6, depth_est_m: 2.5, strike: 'NW-SE' }
      ],
      hazard_area_sq_m: 2450,
      predicted_runout_distance_m: 85,
      toe_bulge_detected: false,
      thermal_anomaly_deg_c: 28.1
    },
    geological_notes: 'Massive Barakar sandstone overlying coal seam IX. Water seepage emerging from lower bedding boundary reducing shear strength.'
  },
  {
    id: 'PHOTO-DHN-03',
    sector_id: 'BST-P2',
    sector_name: 'Bastacolla Opencast Pit-2',
    title: 'Coal Fire Subsidence Cavity & Edge Ravelling',
    location: 'BCCL Area IX, Bastacolla, Dhanbad',
    coordinates: '23.7710° N, 86.4250° E',
    risk_level: 'HIGH_RISK',
    bench_elevation: '235m RL',
    capture_type: 'FLIR Thermal UAV Radiometric Camera',
    captured_at: '2026-10-25 16:45 IST',
    failure_mode: 'Cavity Collapse Induced Edge Toppling',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-04', length_m: 35.2, max_gap_cm: 11.2, depth_est_m: 4.8, strike: 'N-S' }
      ],
      hazard_area_sq_m: 4100,
      predicted_runout_distance_m: 95,
      toe_bulge_detected: true,
      thermal_anomaly_deg_c: 88.5
    },
    geological_notes: 'Underground coal fire has created sub-surface void spaces causing irregular subsidence and highwall cracking.'
  },
  {
    id: 'PHOTO-DHN-04',
    sector_id: 'LDN-D3',
    sector_name: 'Lodna Deep Pit Fire Zone',
    title: 'Overburden Dump Liquefaction Gully & Toe Heave',
    location: 'BCCL Area X, Lodna, Dhanbad',
    coordinates: '23.7280° N, 86.4420° E',
    risk_level: 'HIGH_RISK',
    bench_elevation: '238m RL',
    capture_type: 'High-Altitude Multispectral Drone Survey',
    captured_at: '2026-10-26 09:30 IST',
    failure_mode: 'Flow Slide & Debris Ravelling',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-05', length_m: 54.0, max_gap_cm: 14.5, depth_est_m: 5.1, strike: 'NE-SW' }
      ],
      hazard_area_sq_m: 5200,
      predicted_runout_distance_m: 140,
      toe_bulge_detected: true,
      thermal_anomaly_deg_c: 74.2
    },
    geological_notes: 'High monsoon rainfall saturation combined with loose dump matrix causing mudflow slurry at dump toe.'
  },
  {
    id: 'PHOTO-DHN-05',
    sector_id: 'KTR-C1',
    sector_name: 'Katras Colliery North Slope',
    title: 'Intact Sandstone Highwall with Cleat Fractures',
    location: 'BCCL Area IV, Katras, Dhanbad',
    coordinates: '23.7820° N, 86.3640° E',
    risk_level: 'MODERATE',
    bench_elevation: '290m RL',
    capture_type: 'Drone Orthomosaic (RGB)',
    captured_at: '2026-10-23 11:20 IST',
    failure_mode: 'Wedge Failure along Intersecting Joint Sets',
    image_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-06', length_m: 12.0, max_gap_cm: 1.8, depth_est_m: 0.9, strike: 'E-W' }
      ],
      hazard_area_sq_m: 1100,
      predicted_runout_distance_m: 40,
      toe_bulge_detected: false,
      thermal_anomaly_deg_c: 24.5
    },
    geological_notes: 'Relatively competent sandstone benches with localized joint weathering.'
  },
  {
    id: 'PHOTO-DHN-06',
    sector_id: 'MND-S6',
    sector_name: 'Moonidih Deep Open Face',
    title: 'Sub-vertical Open Cut Bench Face',
    location: 'Moonidih Project (WJ Area), Dhanbad',
    coordinates: '23.7420° N, 86.3530° E',
    risk_level: 'MODERATE',
    bench_elevation: '275m RL',
    capture_type: 'Terrestrial Laser Scanner (TLS) 3D Point Cloud Survey',
    captured_at: '2026-10-22 15:10 IST',
    failure_mode: 'Toppling along Sub-vertical Cleavage',
    image_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    thermal_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80',
    ai_annotations: {
      tension_cracks: [
        { id: 'CRK-07', length_m: 16.5, max_gap_cm: 2.4, depth_est_m: 1.2, strike: 'N 10° E' }
      ],
      hazard_area_sq_m: 1450,
      predicted_runout_distance_m: 55,
      toe_bulge_detected: false,
      thermal_anomaly_deg_c: 25.0
    },
    geological_notes: 'Deep open cut showing vertical joint blocks. Bench berms cleaned of loose rocks.'
  }
];

// 1. Get all photos
router.get('/', (req, res) => {
  res.json({
    success: true,
    total: PRONE_AREA_PHOTOS.length,
    photos: PRONE_AREA_PHOTOS
  });
});

// 2. Get photos for a specific sector
router.get('/sector/:sector_id', (req, res) => {
  const filtered = PRONE_AREA_PHOTOS.filter(p => p.sector_id === req.params.sector_id);
  res.json({
    success: true,
    total: filtered.length,
    photos: filtered
  });
});

module.exports = router;
