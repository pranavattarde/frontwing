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
      conversation_id,
    } = dto;

    const answerText = ai_response?.final_answer || 
                       ai_response?.executive_summary || 
                       ai_response?.whatif_simulation?.analysis_summary || 
                       ai_response?.strategy_report?.what_happened?.narrative || 
                       ai_response?.investigation_report?.["Executive Summary"] || 
                       '';

    let existingThread = null;
    if (conversation_id) {
      // Check if thread exists by conversation_id OR id
      const checkResult = await pool.query(
        `SELECT * FROM investigations 
         WHERE (conversation_id = $1 OR id::text = $1)
         AND ($2::uuid IS NULL OR user_id = $2::uuid OR user_id IS NULL)
         LIMIT 1`,
        [String(conversation_id), user_id || null]
      );
      if (checkResult.rows.length > 0) {
        existingThread = checkResult.rows[0];
      }
    }

    if (existingThread) {
      const canonicalCid = existingThread.conversation_id || existingThread.id.toString();

      // Update the thread record
      const updateResult = await pool.query(
        `UPDATE investigations
         SET timestamp = CURRENT_TIMESTAMP,
             ai_response = $1,
             session = COALESCE($2, session),
             investigation_metadata = $3
         WHERE id = $4
         RETURNING *`,
        [
          JSON.stringify(ai_response),
          session || null,
          JSON.stringify(investigation_metadata),
          existingThread.id
        ]
      );

      // Append turn to conversations
      await pool.query(
        `INSERT INTO conversations (conversation_id, question, answer, context, response, user_id, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          canonicalCid,
          question,
          answerText,
          JSON.stringify(investigation_metadata || {}),
          JSON.stringify(ai_response || {}),
          user_id || null
        ]
      );

      const resRow = updateResult.rows[0];
      resRow.conversation_id = canonicalCid;
      return resRow;
    } else {
      // Create new investigation thread
      const cid = conversation_id ? String(conversation_id) : null;
      const result = await pool.query(
        `INSERT INTO investigations (user_id, question, ai_response, session, provider_used, investigation_metadata, conversation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          user_id || null,
          question,
          JSON.stringify(ai_response),
          session || null,
          provider_used,
          JSON.stringify(investigation_metadata),
          cid
        ]
      );

      const threadRow = result.rows[0];
      const canonicalCid = threadRow.conversation_id || threadRow.id.toString();
      if (!threadRow.conversation_id) {
        await pool.query(
          `UPDATE investigations SET conversation_id = $1 WHERE id = $2`,
          [canonicalCid, threadRow.id]
        );
        threadRow.conversation_id = canonicalCid;
      }

      // Append Turn 1 to conversations
      await pool.query(
        `INSERT INTO conversations (conversation_id, question, answer, context, response, user_id, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          canonicalCid,
          question,
          answerText,
          JSON.stringify(investigation_metadata || {}),
          JSON.stringify(ai_response || {}),
          user_id || null
        ]
      );

      return threadRow;
    }
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

    const values = [String(id)];

    if (userId) {
      query += ` LEFT JOIN saved_investigations si ON i.id = si.investigation_id AND si.user_id = $2 
                 WHERE (i.id::text = $1 OR i.conversation_id = $1) 
                 AND (i.user_id = $2 OR i.user_id IS NULL)`;
      values.push(userId);
    } else {
      query += ` WHERE (i.id::text = $1 OR i.conversation_id = $1)`;
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }

    const investigation = result.rows[0];
    const canonicalCid = investigation.conversation_id || investigation.id.toString();

    // Query all turns from conversations ordered chronologically
    const turnsRes = await pool.query(
      `SELECT id, conversation_id, question, answer, context, response, timestamp
       FROM conversations
       WHERE conversation_id = $1 OR conversation_id = $2
       ORDER BY id ASC`,
      [canonicalCid, investigation.id.toString()]
    );

    if (turnsRes.rows.length > 0) {
      investigation.turns = turnsRes.rows.map(r => ({
        id: r.id,
        conversation_id: r.conversation_id,
        question: r.question,
        answer: r.answer,
        context: r.context,
        response: r.response || investigation.ai_response,
        timestamp: r.timestamp
      }));
    } else {
      investigation.turns = [
        {
          id: 1,
          conversation_id: canonicalCid,
          question: investigation.question,
          answer: investigation.ai_response?.final_answer || investigation.ai_response?.executive_summary || '',
          context: investigation.investigation_metadata,
          response: investigation.ai_response,
          timestamp: investigation.timestamp
        }
      ];
    }

    return investigation;
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
    const inv = await pool.query(
      `SELECT id, conversation_id FROM investigations 
       WHERE (id::text = $1 OR conversation_id = $1) 
       AND ($2::uuid IS NULL OR user_id = $2::uuid OR user_id IS NULL)`,
      [String(id), userId || null]
    );

    if (inv.rows.length > 0) {
      const row = inv.rows[0];
      const cid = row.conversation_id || row.id.toString();
      await pool.query(
        `DELETE FROM conversations WHERE conversation_id = $1 OR conversation_id = $2`,
        [cid, row.id.toString()]
      );
    }

    const result = await pool.query(
      `DELETE FROM investigations 
       WHERE (id::text = $1 OR conversation_id = $1) 
       AND ($2::uuid IS NULL OR user_id = $2::uuid OR user_id IS NULL) 
       RETURNING id`,
      [String(id), userId || null]
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
