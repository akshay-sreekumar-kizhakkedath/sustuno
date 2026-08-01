export const predictionKpis = [
  {
    label: 'Predicted TDS',
    value: '1570',
    unit: 'mg/L',
    accent: '#712ae2',
    progress: { value: 93, color: '#712ae2' },
    sub: 'Confidence Score 93%',
  },
  {
    label: 'Predicted COD',
    value: '482',
    unit: 'mg/L',
    accent: '#2563eb',
    sub: 'Last Refreshed: 2m ago',
  },
  {
    label: 'Predicted BOD',
    value: '196',
    unit: 'mg/L',
    accent: '#10b981',
    sub: '-4% vs Last Batch',
  },
  {
    label: 'Pollution Load',
    value: '89.4',
    unit: 'kg/day',
    accent: '#bc4800',
    sub: 'Prediction Time: 14:30 IST',
  },
]

export const optimizedRecipe = {
  batch: 'Batch #9822',
  rows: [
    { component: 'Reactive Blue 19', current: '2.45', recommended: '2.06', reduction: '-16%' },
    { component: 'Common Salt (NaCl)', current: '60.00', recommended: '52.80', reduction: '-12%' },
    { component: 'Soda Ash (Light)', current: '20.00', recommended: '16.40', reduction: '-18%' },
    { component: 'Leveling Agent', current: '1.50', recommended: '1.35', reduction: '-10%' },
  ],
}

export const impactMetrics = [
  { label: 'Exp. Color Match', value: '96%', sub: 'Within ΔE < 1.0' },
  { label: 'Waste Reduction', value: '13%', sub: 'Estimated Vol.' },
  { label: 'Estimated Savings', value: '₹145', sub: 'Per Meter Fabric' },
  { label: 'Energy Efficiency', value: 'A++', sub: 'Low-Temp Cycle' },
]

export const controlCenter = {
  waterSaved: '2.4 KL',
  chemicals: '4.8 kg',
}

export const predictorForm = {
  fabricTypes: ['Organic Cotton Jersey', 'Recycled Polyester', 'Silk-Linen Blend'],
  machines: ['Fong’s Jigger-04', 'Thies iMaster-02'],
}
