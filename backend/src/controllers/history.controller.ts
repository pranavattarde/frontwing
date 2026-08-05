import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { HistoryService } from '../services/history.service';

export class HistoryController {
  static async getHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const session = req.query.session ? (req.query.session as string) : undefined;
      const search = req.query.search ? (req.query.search as string) : undefined;

      const result = await HistoryService.getHistory(userId, {
        limit,
        offset,
        session,
        search,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[HistoryController.getHistory] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getHistoryById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id) {
        return res.status(400).json({ error: 'Investigation ID is required' });
      }

      const investigation = await HistoryService.getInvestigationById(id, userId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      return res.json(investigation);
    } catch (err: any) {
      console.error('[HistoryController.getHistoryById] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async deleteHistory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Investigation ID is required' });
      }

      const deleted = await HistoryService.deleteInvestigation(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Investigation not found or unauthorized' });
      }

      return res.json({ message: 'Investigation deleted successfully', id });
    } catch (err: any) {
      console.error('[HistoryController.deleteHistory] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async toggleSave(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await HistoryService.toggleSaveInvestigation(userId, id);
      return res.json(result);
    } catch (err: any) {
      console.error('[HistoryController.toggleSave] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}
