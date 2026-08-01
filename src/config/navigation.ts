export interface NavItem {
  path: string
  label: string
  icon: string
  badge?: string
  badgeTone?: 'green' | 'purple' | 'blue' | 'red' | 'amber'
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Overview', icon: 'dashboard' },
  { path: '/production', label: 'Production', icon: 'precision_manufacturing' },
  { path: '/iot', label: 'IoT Monitoring', icon: 'sensors' },
  { path: '/prediction', label: 'AI Prediction', icon: 'online_prediction', badge: 'AI' },
  { path: '/etp', label: 'ETP Decision Support', icon: 'fact_check' },
  { path: '/analytics', label: 'Analytics', icon: 'analytics' },
  { path: '/reports', label: 'Reports', icon: 'description' },
]

export const MODULE_META: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Operational Overview',
    subtitle: 'Live water quality, AI optimization, and compliance across the plant',
  },
  '/production': {
    title: 'Production Management',
    subtitle: 'Configure batch parameters and chemical recipes for AI analysis',
  },
  '/iot': {
    title: 'IoT Real-Time Monitoring',
    subtitle: 'Live telemetry and predictive diagnostics for AI-driven textile effluent treatment',
  },
  '/prediction': {
    title: 'AI Prediction Engine',
    subtitle: 'Forecast effluent quality and optimize dye recipes with machine learning',
  },
  '/etp': {
    title: 'ETP Decision Support',
    subtitle: 'AI-driven chemical dosing and operational recommendations based on real-time sensor data',
  },
  '/analytics': {
    title: 'Long-Term Performance Analytics',
    subtitle: 'Plant efficiency, chemical optimization, and environmental compliance trends',
  },
  '/reports': {
    title: 'Reports & Archive',
    subtitle: 'Generate, export, and manage AI-enhanced wastewater intelligence documentation',
  },
}
