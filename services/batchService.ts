import { supabase } from '../lib/supabase'
import type { Batch, FabricDetail, DyeMachineSetting, ChemicalRecipeAnalysis, ResourceUtilization } from '../types/database'

export async function getBatch(id: string): Promise<Batch | null> {
  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .eq('batch_id', id)
    .single()
  if (error) console.error('getBatch error:', error)
  return data ?? null
}

export async function getBatchByUuid(uuid: string): Promise<Batch | null> {
  const { data, error } = await supabase.from('batches').select('*').eq('id', uuid).single()
  if (error) console.error('getBatchByUuid error:', error)
  return data ?? null
}

export async function getFabricForBatch(batchId: string): Promise<FabricDetail | null> {
  const { data } = await supabase.from('fabric_details').select('*').eq('batch_id', batchId).single()
  return data ?? null
}

export async function getDyeSettings(batchId: string): Promise<DyeMachineSetting | null> {
  const { data } = await supabase.from('dye_machine_settings').select('*').eq('batch_id', batchId).single()
  return data ?? null
}

export async function getRecipeAnalysis(batchId: string): Promise<ChemicalRecipeAnalysis[]> {
  const { data } = await supabase.from('chemical_recipe_analysis').select('*').eq('batch_id', batchId)
  return data ?? []
}

export async function getResourceUtilization(batchId: string): Promise<ResourceUtilization[]> {
  const { data } = await supabase.from('resource_utilization').select('*').eq('batch_id', batchId)
  return data ?? []
}
