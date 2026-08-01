export interface ReportType {
  icon: string
  label: string
  active?: boolean
  accent?: 'purple' | 'green'
}

export const reportTypes: ReportType[] = [
  { icon: 'today', label: 'Daily', active: true },
  { icon: 'calendar_view_week', label: 'Weekly' },
  { icon: 'calendar_month', label: 'Monthly' },
  { icon: 'event_note', label: 'Yearly' },
  { icon: 'layers', label: 'Batch-wise' },
  { icon: 'auto_awesome', label: 'AI Prediction', accent: 'purple' },
  { icon: 'gavel', label: 'Compliance' },
  { icon: 'eco', label: 'Carbon Reduction', accent: 'green' },
]

export const facilitySegments = [
  'Main Effluent Plant A',
  'Secondary Treatment Unit',
  'RO Pre-filtration Stage',
]

export const exportFormats = [
  { icon: 'picture_as_pdf', label: 'PDF Document', sub: 'High-fidelity print ready', chip: 'red' },
  { icon: 'table_view', label: 'Excel Worksheet', sub: 'Raw data and calculations', chip: 'green' },
  { icon: 'csv', label: 'CSV Feed', sub: 'Lightweight flat file', chip: 'blue' },
]

export const recentReports = [
  {
    name: 'Compliance_ETP_A_Q3_24.pdf',
    icon: 'description',
    iconTone: 'red',
    date: 'Oct 24, 2024 · 14:30',
    type: 'Compliance',
    typeTone: 'purple' as const,
    status: 'Verified',
  },
  {
    name: 'AI_Predictive_Model_V2.xlsx',
    icon: 'auto_awesome',
    iconTone: 'blue',
    date: 'Oct 23, 2024 · 09:12',
    type: 'AI Prediction',
    typeTone: 'purple' as const,
    status: 'Completed',
  },
  {
    name: 'Carbon_Footprint_Reduction_Monthly.pdf',
    icon: 'eco',
    iconTone: 'green',
    date: 'Oct 21, 2024 · 18:45',
    type: 'Sustainability',
    typeTone: 'gray' as const,
    status: 'Archived',
  },
  {
    name: 'Daily_Production_Log_10-20.csv',
    icon: 'history',
    iconTone: 'gray',
    date: 'Oct 20, 2024 · 23:59',
    type: 'Daily',
    typeTone: 'gray' as const,
    status: 'Stored',
  },
]

export const insightsSummary = [
  { value: '320.4 Kg', label: 'Carbon Reduced This Month' },
  { value: '99.98%', label: 'Compliance Accuracy' },
  { value: '1,242', label: 'Total Reports Archived' },
]
