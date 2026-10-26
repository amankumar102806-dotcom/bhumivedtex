/**
 * Chart.js Real-Time Telemetry & Geotechnical Analytics
 */

let chartInSARTimeseries = null;
let chartInclinometer = null;
let chartFosTrends = null;
let chartRainTrends = null;
let chartMoistTrends = null;
let chartPoreTrends = null;

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: "'Inter', sans-serif", size: 11 }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#fff',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 10
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 10 } }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: '#64748b', font: { family: "'JetBrains Mono', monospace", size: 10 } }
    }
  }
};

// Initialize InSAR Time-Series Chart
function initInSARChart(timeSeriesData) {
  const ctx = document.getElementById('chart-insar-timeseries');
  if (!ctx) return;

  const labels = timeSeriesData.map(p => p.date);
  const dispData = timeSeriesData.map(p => p.displacement_mm);
  const rainData = timeSeriesData.map(p => p.precipitation_mm);

  if (chartInSARTimeseries) {
    chartInSARTimeseries.destroy();
  }

  chartInSARTimeseries = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative LOS Displacement (mm)',
          data: dispData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          yAxisID: 'y'
        },
        {
          label: '12-Day Precipitation (mm)',
          data: rainData,
          type: 'bar',
          backgroundColor: 'rgba(6, 182, 212, 0.45)',
          borderColor: '#06b6d4',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: {
          ...CHART_DEFAULTS.scales.y,
          title: { display: true, text: 'Displacement (mm)', color: '#ef4444' }
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#06b6d4' },
          title: { display: true, text: 'Rainfall (mm)', color: '#06b6d4' }
        }
      }
    }
  });
}

// Initialize Inclinometer Depth vs Deflection Profile
function initInclinometerChart(profileData) {
  const ctx = document.getElementById('chart-inclinometer');
  if (!ctx) return;

  const depths = profileData.map(d => `${d.depth_m}m`);
  const dispA = profileData.map(d => d.displacement_a_axis_mm);
  const dispB = profileData.map(d => d.displacement_b_axis_mm);

  if (chartInclinometer) {
    chartInclinometer.destroy();
  }

  chartInclinometer = new Chart(ctx, {
    type: 'line',
    data: {
      labels: depths,
      datasets: [
        {
          label: 'A-Axis (Dip Direction) Deflection (mm)',
          data: dispA,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          fill: true,
          tension: 0.2,
          borderWidth: 2
        },
        {
          label: 'B-Axis (Strike Direction) Deflection (mm)',
          data: dispB,
          borderColor: '#8b5cf6',
          borderDash: [5, 5],
          tension: 0.2,
          borderWidth: 1.5
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y', // Depth along Y-axis!
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          title: { display: true, text: 'Lateral Deflection (mm)', color: '#94a3b8' }
        },
        y: {
          ...CHART_DEFAULTS.scales.y,
          title: { display: true, text: 'Borehole Depth (m)', color: '#94a3b8' }
        }
      }
    }
  });
}

// Real-Time Analytics Charts in Analytics Tab
function initAnalyticsCharts() {
  const timeLabels = ['-20m', '-16m', '-12m', '-8m', '-4m', 'NOW'];

  // 1. FoS Trends
  const ctxFos = document.getElementById('chart-fos-trends');
  if (ctxFos && !chartFosTrends) {
    chartFosTrends = new Chart(ctxFos, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Jharia Sector-4',
            data: [1.08, 1.02, 0.98, 0.95, 0.93, 0.92],
            borderColor: '#ef4444',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Lodna Deep Pit',
            data: [0.96, 0.94, 0.91, 0.89, 0.88, 0.88],
            borderColor: '#dc2626',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Kusunda East Bench',
            data: [1.25, 1.22, 1.19, 1.17, 1.16, 1.15],
            borderColor: '#f59e0b',
            borderWidth: 2,
            tension: 0.3
          },
          {
            label: 'Katras Colliery',
            data: [1.52, 1.50, 1.49, 1.49, 1.48, 1.48],
            borderColor: '#10b981',
            borderWidth: 1.5,
            tension: 0.3
          }
        ]
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          ...CHART_DEFAULTS.scales,
          y: {
            ...CHART_DEFAULTS.scales.y,
            min: 0.6,
            max: 1.8,
            title: { display: true, text: 'Factor of Safety', color: '#94a3b8' }
          }
        }
      }
    });
  }

  // 2. Rainfall Trends
  const ctxRain = document.getElementById('chart-rain-trends');
  if (ctxRain && !chartRainTrends) {
    chartRainTrends = new Chart(ctxRain, {
      type: 'bar',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [
          {
            label: 'Hourly Rainfall (mm)',
            data: [4.2, 8.5, 18.2, 26.4, 14.8, 6.4],
            backgroundColor: 'rgba(6, 182, 212, 0.6)',
            borderColor: '#06b6d4',
            borderWidth: 1
          }
        ]
      },
      options: CHART_DEFAULTS
    });
  }

  // 3. Soil Moisture Trends
  const ctxMoist = document.getElementById('chart-moist-trends');
  if (ctxMoist && !chartMoistTrends) {
    chartMoistTrends = new Chart(ctxMoist, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Sector-4 (% VWC)',
            data: [72, 76, 81, 85, 87, 88.2],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            fill: true,
            borderWidth: 2
          }
        ]
      },
      options: CHART_DEFAULTS
    });
  }

  // 4. Pore Pressure Trends
  const ctxPore = document.getElementById('chart-pore-trends');
  if (ctxPore && !chartPoreTrends) {
    chartPoreTrends = new Chart(ctxPore, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            label: 'PZ-01 Crest (kPa)',
            data: [98, 102, 108, 115, 120, 122.4],
            borderColor: '#8b5cf6',
            borderWidth: 2
          }
        ]
      },
      options: CHART_DEFAULTS
    });
  }
}
