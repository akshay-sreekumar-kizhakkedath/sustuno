export interface Batch {
  id: string
  batch_id: string
  order_number?: string
  customer?: string
  shift?: string
  operator?: string
  start_time?: string
  end_time?: string
  status?: string
  created_at?: string
}

export interface FabricDetail {
  id: string
  batch_id: string
  type?: string
  weight?: number
  gsm?: number
  lot_number?: string
  qc_verified?: boolean
}

export interface DyeMachineSetting {
  id: string
  batch_id: string
  dye_name?: string
  shade?: string
  machine?: string
  duration_minutes?: number
  liquor_ratio?: string
}

export interface ChemicalRecipeAnalysis {
  id: string
  batch_id: string
  agent?: string
  planned_amount?: number
  actual_amount?: number
  status?: string
}

export interface ResourceUtilization {
  id: string
  batch_id: string
  resource_type?: string
  value?: number
  unit?: string
  percentage?: number
}
