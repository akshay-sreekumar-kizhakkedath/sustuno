export const batch = {
  id: '#BT-842',
  order: 'ORD-2024-09',
  customer: 'Vogue Textiles Ltd.',
  shift: 'Morning (A)',
  operator: 'M. Rahman',
}

export const fabric = {
  type: 'Cotton 100% Combed',
  weight: '1,200 kg',
  gsm: '180',
  lot: 'L-88219',
}

export const dyeMachine = {
  dye: 'Reactive Blue 19',
  shade: 'Navy',
  machine: 'Jet-04',
  duration: '240 min',
  ratio: '1:6 Ratio',
}

export const recipeAnalysis = [
  {
    agent: 'Dye Powder (Blue 19)',
    planned: '4.50',
    actual: '4.48',
    ok: true,
  },
  { agent: 'Salt (Glauber)', planned: '60.00', actual: '60.15', ok: true },
  { agent: 'Soda Ash', planned: '20.00', actual: '19.90', ok: true },
  { agent: 'Wetting Agent', planned: '1.50', actual: '1.62', ok: false },
  { agent: 'Sequestering Agent', planned: '1.00', actual: '1.00', ok: true },
  { agent: 'Acetic Acid (60%)', planned: '0.50', actual: '0.49', ok: true },
]

export const resources = [
  { label: 'Fresh Water', value: '7,200 L', pct: 65, color: '#2563eb' },
  { label: 'Recycle Water', value: '4,800 L', pct: 40, color: '#10b981' },
]

export const resourceTiles = [
  { label: 'Steam', value: '840 kg' },
  { label: 'Energy', value: '240 kWh' },
]
