
const { supabase } = require('../supabaseClient');

class DyeOptInputRepository {
  // Create a new input
  async create(inputData) {
    const { data, error } = await supabase
      .from('dye_opt_inputs')
      .insert([inputData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create multiple inputs
  async createMany(inputs) {
    const { data, error } = await supabase
      .from('dye_opt_inputs')
      .insert(inputs)
      .select();

    if (error) throw error;
    return data;
  }

  // Find inputs by session ID
  async findBySessionId(sessionId) {
    const { data, error } = await supabase
      .from('dye_opt_inputs')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return data;
  }

  // Update input by ID
  async update(id, updateData) {
    const { data, error } = await supabase
      .from('dye_opt_inputs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete input by ID
  async delete(id) {
    const { error } = await supabase
      .from('dye_opt_inputs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Delete all inputs for a session
  async deleteBySessionId(sessionId) {
    const { error } = await supabase
      .from('dye_opt_inputs')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;
    return { success: true };
  }
}

module.exports = new DyeOptInputRepository();

