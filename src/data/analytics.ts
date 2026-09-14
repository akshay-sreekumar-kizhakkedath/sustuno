export const envMetrics = [
  { label: 'Chemical Load', value: '14.2 kg', note: 'Target: 12.0kg (Optimizing...)', pct: 65, icon: 'experiment', color: '#2563eb' },
  { label: 'Energy Index', value: '0.82 kWh/m', note: 'Grid-Efficiency Optimal', pct: 42, icon: 'bolt', color: '#712ae2' },
]

export const envTrendCards = [
  { label: 'COD Levels', value: '42 mg/L', chip: '-12%', tone: 'green' as const },
  { label: 'BOD Levels', value: '18 mg/L', chip: '-4%', tone: 'green' as const },
  { label: 'TDS Concentration', value: '1850 ppm', chip: '+8%', tone: 'red' as const },
  { label: 'Compliance Trend', value: '98.4%', chip: 'Stable', tone: 'green' as const },
]

export const waterUsageSeries = {
  xLabels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
  series: [
    {
      name: 'm³ per 1000m',
      color: '#2563eb',
      area: true,
      data: [210, 195, 205, 165, 175, 120, 130, 90],
    },
  ],
}

export const complianceBars = [
  { month: 'Jan', pct: 88 },
  { month: 'Feb', pct: 91 },
  { month: 'Mar', pct: 94 },
  { month: 'Apr', pct: 96 },
  { month: 'May', pct: 93 },
  { month: 'Jun', pct: 98 },
  { month: 'Jul', pct: 99 },
  { month: 'Aug', pct: 95 },
  { month: 'Sep', pct: 96 },
  { month: 'Oct', pct: 98 },
  { month: 'Nov', pct: 99 },
  { month: 'Dec', pct: 100 },
]

export const savingsPortfolio = {
  cost: '$248.5k',
  pollutionTons: '1,402',
  roi: 82,
}

export const modelAccuracy = [
  { label: 'Load Forecasting', value: '98.2%' },
  { label: 'Chemical Interaction', value: '94.7%' },
  { label: 'Effluent Quality Prediction', value: '96.8%' },
]

export const analyticsFilters = {
  dateRanges: ['Last 30 Days', 'Last Quarter', 'Fiscal Year 2023', 'Custom Range'],
  machines: ['All Systems', 'Loom-402', 'Dye-Station-09', 'ETP-Main'],
  batches: ['Current Batches', 'Polyester-60', 'Cotton-White-12'],
  fabrics: ['All Materials', 'Synthetic Blend', 'Natural Organic'],
}
