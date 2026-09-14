
const { supabase } = require('../supabaseClient');

class DyeOptSessionRepository {
  // Create a new dye optimization session
  async create(sessionData) {
    const { data, error } = await supabase
      .from('dye_opt_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Find session by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('dye_opt_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Find sessions by batch ID
  async findByBatchId(batchId) {
    const { data, error } = await supabase
      .from('dye_opt_sessions')
      .select('*')
      .eq('batch_id', batchId);

    if (error) throw error;
    return data;
  }

  // Update session by ID
  async update(id, updateData) {
    const { data, error } = await supabase
      .from('dye_opt_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete session by ID
  async delete(id) {
    const { error } = await supabase
      .from('dye_opt_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // List sessions with optional filtering
  async list(filters = {}, limit = 100, offset = 0) {
    let query = supabase.from('dye_opt_sessions').select('*');

    // Apply filters
    if (filters.batch_id) {
      query = query.eq('batch_id', filters.batch_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }
}

module.exports = new DyeOptSessionRepository();

