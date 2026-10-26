# GeoGuard AI — Dhanbad Mining Slope Failure Early Warning System

A comprehensive, production-grade early warning system designed for opencast coal mining sectors in **Dhanbad (Jharia Coalfield, BCCL, Jharkhand)** to monitor slope stability, predict failure hazards, and coordinate emergency responses.

## 🌟 Key Architecture & Features

### 1. Multi-Source Geotechnical & Meteorological Inputs
- **Copernicus Sentinel-1 InSAR**: C-band SAR (Descending Track 85 / Ascending Track 121), Line-of-Sight (LOS) velocity tracking (mm/yr), 24-point repeat-pass displacement time-series, interferometric coherence, and deformation heatmaps.
- **Official IMD Weather API Integration**:
  - `https://api.imd.gov.in/api/v1/aws_data?sid=15` (Dhanbad AWS Station 42591 records)
  - `https://api.imd.gov.in/api/v1/districtrainfall` (Daily, weekly, cumulative & normal rainfall)
  - `https://api.imd.gov.in/api/v1/districtwarning` (Multi-day severe rain & lightning warning codes)
  - `https://api.imd.gov.in/api/v1/districtnowcast` (3-hour convective storm nowcasts)
  - *Hybrid Failover*: Automatic live Dhanbad meteorological telemetry from Open-Meteo coordinates (`23.7957° N, 86.4304° E`) when IMD API key is absent.
- **ISRO NRSC Landslide Atlas of India**: Machine Learning risk scoring (XGBoost + Random Forest ensemble) trained on geological lineaments, Barakar formation lithology, and 118 historical mining slide events.

### 2. Geotechnical Risk & Trigger Thresholds
- Limit Equilibrium Bishop & Janbu Factor of Safety ($FoS$):
  - **Critical Evacuation**: $FoS < 1.00$
  - **Active Watch**: $1.00 \le FoS < 1.30$
  - **Stable Bench**: $FoS > 1.30$
- Trigger thresholds for 24h rainfall ($>65$ mm), displacement velocity ($>12$ mm/day), pore water pressure ($>110$ kPa), and soil moisture ($>85\%$ VWC).
- Automatic SMS, WhatsApp, and email alerts dispatched to BCCL Safety General Manager, DGMS Zonal Inspector, and Mine Rescue Superintendents.

### 3. Interactive WebGL 3D Digital Elevation Model (DEM)
- Built with **Three.js**:
- 3D stepped benches (berms and batters) representing opencast pit excavations.
- Color-coded risk contours & animated 3D directional displacement vector arrows.
- Dynamic **Slope Failure Simulation**: Animates bench shear detachment, debris slide into the pit floor, dust particle emissions, and expanding runout impact zones.

### 4. Interactive GIS Map & Micro-Sector Inset
- Built with **Leaflet**:
- **Zero API Key Watermark**: Features **Esri World Imagery** high-resolution satellite tiles, OpenStreetMap, and Carto Dark Matter with seamless toggling.
- Pulsing hazard rings around high-risk and moderate-risk mining sectors.
- **High-Resolution Micro-Sector Inset**: Displays micro-topography, LoRa sensors (Inclinometers, Moisture probes, Rain gauges, Gateways), danger perimeters, and evacuation paths.

### 5. Mining Engineer Geotechnical Hub
- **Borehole Inclinometer Deflection Profile**: Displays A-axis and B-axis lateral shear displacement from 0m down to -35m depth.
- **Vibrating Wire Piezometers & Pore Pressure**: Real-time groundwater heads.
- **Extensometers & Crackmeters**: Monitored fissure opening rates.
- **Interactive Bishop FoS Calculator**: Allows engineers to input cohesion ($c'$), friction angle ($\phi'$), bench height ($H$), and pore pressure ratio ($r_u$) to calculate stability instantaneously.
- **Field Inspection Logger**: Submit bench crack widths and water seepage observations.

### 6. Public Announcement (PA) Speaker & Evacuation Siren System
- **Web Audio API Industrial Siren**: Dual-oscillator 800Hz–1200Hz wailing evacuation siren synthesized directly in the browser.
- **Web Speech API Bilingual Voice Broadcast**: Speaks warnings aloud in both English and Hindi across mine speaker horns.
- Speaker zone targeting (Sector 4 Horns, Pit Bottom, Haul Road, Workshop).

### 7. Emergency Response, Ambulances & Casualty Triage
- **Ambulance Fleet Dispatch**: Live tracking for BCCL Central Hospital Koyla Nagar, SNMMCH Dhanbad, and Asarfi Hospital with real-time ETA calculation.
- **Casualty Triage Desk**: Track injured miners with Red (Immediate), Yellow (Urgent), Green (Minor), and Black classifications.
- **Missing Personnel / Police FIRs**: File and dispatch DGMS Mine Rescue squads.
- **DGMS Situation Report (SITREP) Export**: Generate and download official situation reports in JSON or printable text.

### 8. Photographic Surveillance & Thermal IR
- Aerial drone orthomosaics of critical slope zones across Dhanbad.
- AI bounding boxes highlighting active tension cracks and fissures.
- **Radiometric Thermal IR toggle** to identify subsurface Jharia underground coal fires destabilizing the overburden dump.

---

## 🚀 How to Run

1. Open a terminal in this directory:
   ```bash
   cd "C:\Users\aman kumar\.gemini\antigravity\scratch\dhanbad-slope-guard"
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open your browser:
   ```
   http://localhost:3000
   ```
