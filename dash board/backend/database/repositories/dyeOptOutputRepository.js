
const { supabase } = require('../supabaseClient');

class DyeOptOutputRepository {
  // Create a new output
  async create(outputData) {
    const { data, error } = await supabase
      .from('dye_opt_outputs')
      .insert([outputData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create multiple outputs
  async createMany(outputs) {
    const { data, error } = await supabase
      .from('dye_opt_outputs')
      .insert(outputs)
      .select();

    if (error) throw error;
    return data;
  }

  // Find outputs by session ID
  async findBySessionId(sessionId) {
    const { data, error } = await supabase
      .from('dye_opt_outputs')
      .select('*')
      .eq('session_id', sessionId)
      .order('rank', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Update output by ID
  async update(id, updateData) {
    const { data, error } = await supabase
      .from('dye_opt_outputs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete output by ID
  async delete(id) {
    const { error } = await supabase
      .from('dye_opt_outputs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Delete all outputs for a session
  async deleteBySessionId(sessionId) {
    const { error } = await supabase
      .from('dye_opt_outputs')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;
    return { success: true };
  }
}

module.exports = new DyeOptOutputRepository();

