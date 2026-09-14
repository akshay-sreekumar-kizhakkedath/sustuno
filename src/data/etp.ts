export const etpKpis = [
  {
    label: 'Rec. Air Flow',
    value: '420',
    unit: 'm³/min',
    icon: 'air',
    accent: '#10b981',
    sub: '↓ 12% Efficiency Gain',
  },
  {
    label: 'Running Time',
    value: '18.5',
    unit: 'hrs/day',
    icon: 'schedule',
    accent: '#2563eb',
    sub: 'Optimization active',
  },
  {
    label: 'Sludge Volume',
    value: '2.4',
    unit: '% SV30',
    icon: 'waves',
    accent: '#2563eb',
    sub: 'Stable settling',
  },
]

export const etpDecision = {
  confidence: 93,
  verdict: 'Suitable',
  verdictSub: 'Meets Category A Reuse Standards',
  chips: [
    { label: 'BOD', value: '8', unit: 'mg/L', tone: 'green' as const },
    { label: 'COD', value: '45', unit: 'mg/L', tone: 'green' as const },
  ],
}

export const treatmentStrategy = {
  phase: 'Coagulation',
  suggestion: 'Fenton Oxidation',
  note: 'Transition recommended to handle sudden spike in refractive organics detected in influent.',
}

export const dosing = [
  { label: 'Alum', value: '14.2 g/m³', pct: 65, color: '#2563eb' },
  { label: 'Polymer', value: '1.8 g/m³', pct: 40, color: '#712ae2' },
]

export const pHControl = {
  target: 'Neutralization Tank #2',
  current: 6.8,
  aiTarget: '7.2',
  action: 'Add 5kg Lime',
}

export const directives = [
  {
    machine: 'Blower Unit 04',
    desc: 'Throttling to 80% for energy conservation phase.',
    value: '98.2% Eff.',
  },
  {
    machine: 'Dosing Pump A-1',
    desc: 'Auto-calibrated for Alum injection increase.',
    value: 'Operational',
  },
]

export const etpFinancials = {
  cost: '$1,240/day',
  chemical: '$680',
  energy: '$560',
  savings: '$184.50',
  savingsPct: '+14.2%',
}
