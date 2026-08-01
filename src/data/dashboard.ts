export const waterKpis = [
  {
    label: 'pH Level',
    value: '7.12',
    unit: 'pH',
    icon: 'water_drop',
    accent: '#10b981',
    badge: { tone: 'green' as const, text: 'NORMAL' },
    sub: 'Stable (last 1h)',
  },
  {
    label: 'EC (Conductivity)',
    value: '2.35',
    unit: 'mS/cm',
    icon: 'electric_bolt',
    accent: '#712ae2',
    badge: { tone: 'purple' as const, text: 'HIGH' },
    sub: '+12% vs trend',
  },
  {
    label: 'Turbidity',
    value: '14.8',
    unit: 'NTU',
    icon: 'opacity',
    accent: '#10b981',
    badge: { tone: 'green' as const, text: 'NORMAL' },
    sub: '-2.1 NTU clearing',
  },
  {
    label: 'Temperature',
    value: '29.6',
    unit: '°C',
    icon: 'thermostat',
    accent: '#10b981',
    badge: { tone: 'green' as const, text: 'NORMAL' },
    sub: 'Optimal range: 25-32°C',
  },
  {
    label: 'Flow Rate',
    value: '28.6',
    unit: 'm³/hr',
    icon: 'waves',
    accent: '#10b981',
    badge: { tone: 'green' as const, text: 'NORMAL' },
    sub: 'System Load: 74%',
  },
]

export const waterTrend = {
  title: 'Real-time Water Quality Trends',
  subtitle: 'Inlet monitoring data across multi-sensor array',
  xLabels: ['04:00', '05:00', '06:00', '07:00', '08:00', '09:00'],
  series: [
    {
      name: 'pH',
      color: '#2563eb',
      area: true,
      data: [7.05, 7.1, 7.02, 7.16, 7.08, 7.14],
    },
    {
      name: 'EC',
      color: '#8a4cfc',
      dashed: true,
      data: [2.42, 2.31, 2.48, 2.26, 2.4, 2.31],
    },
  ],
}

export const chemOptimizationTable = [
  {
    component: 'Reactive Blue 19',
    standard: '12.40 kg',
    recommended: '11.85 kg',
    diff: '-0.55 kg',
    impact: { tone: 'green', text: 'COST SAVE' },
  },
  {
    component: 'Soda Ash (Alkali)',
    standard: '24.00 kg',
    recommended: '21.20 kg',
    diff: '-2.80 kg',
    impact: { tone: 'blue', text: 'LESS TDS' },
  },
  {
    component: 'Leveling Agent',
    standard: '1.20 kg',
    recommended: '1.05 kg',
    diff: '-0.15 kg',
    impact: { tone: 'amber', text: 'EFFICIENCY' },
  },
]

export const aiInsights = [
  {
    label: 'Cost Reduction',
    value: '$14,280',
    badge: '↑ 14%',
    tone: 'green' as const,
  },
  {
    label: 'Water Savings',
    value: '842.5 m³',
    badge: '↑ 8%',
    tone: 'blue' as const,
  },
  {
    label: 'Pollution Load Reduction',
    value: '-18.4% COD',
    badge: 'TARGET REACHED',
    tone: 'purple' as const,
  },
]

export const predictedQuality = [
  { label: 'TDS (Predicted)', value: '4,120', unit: 'mg/L', pct: 85, color: '#712ae2' },
  { label: 'COD (Predicted)', value: '1,850', unit: 'mg/L', pct: 60, color: '#2563eb' },
  { label: 'BOD (Predicted)', value: '640', unit: 'mg/L', pct: 45, color: '#10b981' },
  { label: 'Pollution Load', value: 'Medium', unit: '', pct: 30, color: '#bc4800' },
]

export const etpStrategies = [
  {
    icon: 'vaccines',
    title: 'Chemical Dosing Adjustment',
    status: 'OPTIMAL',
    tone: 'green' as const,
    desc: 'Reduce Poly-Aluminum Chloride by 4.2% based on incoming COD.',
  },
  {
    icon: 'science',
    title: 'Fenton Treatment Protocol',
    status: 'REQUIRED',
    tone: 'purple' as const,
    desc: 'Execute Phase 2 oxidation to neutralize high dye concentration.',
  },
  {
    icon: 'restart_alt',
    title: 'Water Reuse Suitability',
    status: '78% RECYCLABLE',
    tone: 'blue' as const,
    desc: 'Predicted output quality suitable for low-grade scouring process.',
  },
]

export const workflowSteps = [
  { icon: 'sensors', label: 'IoT Sensing', color: '#2563eb' },
  { icon: 'psychology', label: 'AI Analytics', color: '#712ae2' },
  { icon: 'tune', label: 'Calibration', color: '#2563eb' },
  { icon: 'check_circle', label: 'Execution', color: '#10b981' },
]

export const alerts = [
  {
    tone: 'purple' as const,
    title: 'AI Recommendation Update',
    desc: 'Batch #842 calibrated for high-hardness inlet water.',
    time: '2 mins ago',
  },
  {
    tone: 'red' as const,
    title: 'High Conductivity Warning',
    desc: 'Inlet EC exceeds threshold of 2.2 mS/cm.',
    time: '14 mins ago',
  },
  {
    tone: 'green' as const,
    title: 'Compliance Log Generated',
    desc: 'Daily environmental report uploaded to cloud.',
    time: '1 hour ago',
  },
]

export const compliance = {
  score: 96.2,
  grade: 'GRADE A',
  caption: 'ZDHC MRSL Version 2.0 Compliant',
}

export const optimizerForm = {
  fabricTypes: ['Cotton 100% (Combed)', 'Polyester Blend'],
  machines: ['Jet-04 (HTHP)', 'Winch-02'],
  defaults: {
    shade: 'Midnight Navy B-12',
    weight: '1200',
    depth: '2.45',
    ratio: '1:6',
  },
}
