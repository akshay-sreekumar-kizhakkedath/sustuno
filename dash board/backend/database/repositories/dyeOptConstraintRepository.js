
const { supabase } = require('../supabaseClient');

class DyeOptConstraintRepository {
  // Create a new constraint
  async create(constraintData) {
    const { data, error } = await supabase
      .from('dye_opt_constraints')
      .insert([constraintData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Create multiple constraints
  async createMany(constraints) {
    const { data, error } = await supabase
      .from('dye_opt_constraints')
      .insert(constraints)
      .select();

    if (error) throw error;
    return data;
  }

  // Find constraints by session ID
  async findBySessionId(sessionId) {
    const { data, error } = await supabase
      .from('dye_opt_constraints')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return data;
  }

  // Update constraint by ID
  async update(id, updateData) {
    const { data, error } = await supabase
      .from('dye_opt_constraints')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete constraint by ID
  async delete(id) {
    const { error } = await supabase
      .from('dye_opt_constraints')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // Delete all constraints for a session
  async deleteBySessionId(sessionId) {
    const { error } = await supabase
      .from('dye_opt_constraints')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;
    return { success: true };
  }
}

module.exports = new DyeOptConstraintRepository();

