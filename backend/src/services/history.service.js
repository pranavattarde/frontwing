const { pool } = require('../config/db');

class HistoryService {
  static async saveInvestigation(dto) {
    const {
      user_id,
      question,
      ai_response,
      session,
      provider_used = 'gemini-2.5-flash',
      investigation_metadata = {},
    } = dto;

    const result = await pool.query(
      `INSERT INTO investigations (user_id, question, ai_response, session, provider_used, investigation_metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user_id || null,
        question,
        JSON.stringify(ai_response),
        session || null,
        provider_used,
        JSON.stringify(investigation_metadata),
      ]
    );

    return result.rows[0];
  }

  static async getHistory(
    userId,
    params = {}
  ) {
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const values = [userId];
    let queryWhere = 'WHERE i.user_id = $1';

    if (params.session) {
      values.push(params.session);
      queryWhere += ` AND i.session = $${values.length}`;
    }

    if (params.search) {
      values.push(`%${params.search}%`);
      queryWhere += ` AND (i.question ILIKE $${values.length} OR i.display_title ILIKE $${values.length})`;
    }

    if (params.group_id) {
      if (params.group_id === 'null' || params.group_id === 'ungrouped') {
        queryWhere += ` AND i.group_id IS NULL`;
      } else {
        values.push(params.group_id);
        queryWhere += ` AND i.group_id = $${values.length}`;
      }
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM investigations i ${queryWhere}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit);
    const limitIndex = values.length;
    values.push(offset);
    const offsetIndex = values.length;

    const query = `
      SELECT 
        i.*,
        COALESCE(i.display_title, i.question) as display_title,
        g.name as group_name,
        CASE WHEN si.id IS NOT NULL THEN true ELSE false END as is_saved
      FROM investigations i
      LEFT JOIN investigation_groups g ON i.group_id = g.id
      LEFT JOIN saved_investigations si 
        ON i.id = si.investigation_id AND si.user_id = $1
      ${queryWhere}
      ORDER BY i.pinned DESC, i.timestamp DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await pool.query(query, values);
    return {
      investigations: result.rows,
      total,
    };
  }

  static async getInvestigationById(
    id,
    userId
  ) {
    let query = `
      SELECT 
        i.*,
        COALESCE(i.display_title, i.question) as display_title,
        g.name as group_name,
        ${userId ? 'CASE WHEN si.id IS NOT NULL THEN true ELSE false END as is_saved' : 'false as is_saved'}
      FROM investigations i
      LEFT JOIN investigation_groups g ON i.group_id = g.id
    `;

    const values = [id];

    if (userId) {
      query += ` LEFT JOIN saved_investigations si ON i.id = si.investigation_id AND si.user_id = $2 WHERE i.id = $1 AND (i.user_id = $2 OR i.user_id IS NULL)`;
      values.push(userId);
    } else {
      query += ` WHERE i.id = $1 AND i.user_id IS NULL`;
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  static async updateInvestigation(id, userId, updates = {}) {
    const fields = [];
    const values = [id, userId];
    let idx = 3;

    if (typeof updates.pinned === 'boolean') {
      fields.push(`pinned = $${idx++}`);
      values.push(updates.pinned);
    }

    if (updates.display_title !== undefined) {
      const cleanTitle = typeof updates.display_title === 'string' ? updates.display_title.trim() : null;
      fields.push(`display_title = $${idx++}`);
      values.push(cleanTitle || null);
    }

    if (updates.group_id !== undefined) {
      const cleanGroupId = updates.group_id ? updates.group_id : null;
      fields.push(`group_id = $${idx++}`);
      values.push(cleanGroupId);
    }

    if (fields.length === 0) {
      return this.getInvestigationById(id, userId);
    }

    const query = `
      UPDATE investigations
      SET ${fields.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *, COALESCE(display_title, question) as display_title
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    return this.getInvestigationById(id, userId);
  }

  static async deleteInvestigation(id, userId) {
    const result = await pool.query(
      `DELETE FROM investigations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  static async toggleSaveInvestigation(
    userId,
    investigationId
  ) {
    const check = await pool.query(
      `SELECT id FROM saved_investigations WHERE user_id = $1 AND investigation_id = $2`,
      [userId, investigationId]
    );

    if (check.rows.length > 0) {
      await pool.query(
        `DELETE FROM saved_investigations WHERE user_id = $1 AND investigation_id = $2`,
        [userId, investigationId]
      );
      return { saved: false };
    } else {
      await pool.query(
        `INSERT INTO saved_investigations (user_id, investigation_id) VALUES ($1, $2)`,
        [userId, investigationId]
      );
      return { saved: true };
    }
  }

  // --- Investigation Groups ---

  static async getGroups(userId) {
    const result = await pool.query(
      `SELECT 
         g.id, 
         g.name, 
         g.created_at, 
         COUNT(i.id)::int as count
       FROM investigation_groups g
       LEFT JOIN investigations i ON g.id = i.group_id AND i.user_id = $1
       WHERE g.user_id = $1
       GROUP BY g.id, g.name, g.created_at
       ORDER BY g.name ASC`,
      [userId]
    );
    return result.rows;
  }

  static async createGroup(userId, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Group name cannot be empty');
    }

    const result = await pool.query(
      `INSERT INTO investigation_groups (user_id, name)
       VALUES ($1, $2)
       ON CONFLICT (user_id, name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, trimmed]
    );

    return result.rows[0];
  }

  static async deleteGroup(userId, groupId) {
    // Ungroup all investigations currently assigned to this group
    await pool.query(
      `UPDATE investigations SET group_id = NULL WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    const result = await pool.query(
      `DELETE FROM investigation_groups WHERE id = $1 AND user_id = $2 RETURNING id`,
      [groupId, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  static async renameGroup(userId, groupId, name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Group name cannot be empty');
    }

    const result = await pool.query(
      `UPDATE investigation_groups 
       SET name = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [trimmed, groupId, userId]
    );

    return result.rows[0] || null;
  }
}

module.exports = {
  HistoryService
};
