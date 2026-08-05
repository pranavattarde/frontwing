import { pool } from '../config/db';
import { Investigation, CreateInvestigationDTO, HistoryQueryParams } from '../types/history.types';

export class HistoryService {
  static async saveInvestigation(dto: CreateInvestigationDTO): Promise<Investigation> {
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
    userId: string,
    params: HistoryQueryParams = {}
  ): Promise<{ investigations: Investigation[]; total: number }> {
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    const values: any[] = [userId];
    let queryWhere = 'WHERE i.user_id = $1';

    if (params.session) {
      values.push(params.session);
      queryWhere += ` AND i.session = $${values.length}`;
    }

    if (params.search) {
      values.push(`%${params.search}%`);
      queryWhere += ` AND i.question ILIKE $${values.length}`;
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
        CASE WHEN si.id IS NOT NULL THEN true ELSE false END as is_saved
      FROM investigations i
      LEFT JOIN saved_investigations si 
        ON i.id = si.investigation_id AND si.user_id = $1
      ${queryWhere}
      ORDER BY i.timestamp DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await pool.query(query, values);
    return {
      investigations: result.rows,
      total,
    };
  }

  static async getInvestigationById(
    id: string,
    userId?: string
  ): Promise<Investigation | null> {
    let query = `
      SELECT 
        i.*,
        ${userId ? 'CASE WHEN si.id IS NOT NULL THEN true ELSE false END as is_saved' : 'false as is_saved'}
      FROM investigations i
    `;

    const values: any[] = [id];

    if (userId) {
      query += ` LEFT JOIN saved_investigations si ON i.id = si.investigation_id AND si.user_id = $2 WHERE i.id = $1`;
      values.push(userId);
    } else {
      query += ` WHERE i.id = $1`;
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  static async deleteInvestigation(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM investigations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  static async toggleSaveInvestigation(
    userId: string,
    investigationId: string
  ): Promise<{ saved: boolean }> {
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
}
