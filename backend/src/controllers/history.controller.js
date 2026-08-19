const { HistoryService } = require('../services/history.service');

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

class HistoryController {
  static async getHistory(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const session = req.query.session ? req.query.session : undefined;
      const search = req.query.search ? req.query.search : undefined;

      const result = await HistoryService.getHistory(userId, {
        limit,
        offset,
        session,
        search,
      });

      return res.json(result);
    } catch (err) {
      console.error('[HistoryController.getHistory] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async getHistoryById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!id || !isUUID(id)) {
        return res.status(400).json({ error: 'Valid investigation UUID is required' });
      }

      const investigation = await HistoryService.getInvestigationById(id, userId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      return res.json(investigation);
    } catch (err) {
      console.error('[HistoryController.getHistoryById] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async deleteHistory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!id || !isUUID(id)) {
        return res.status(400).json({ error: 'Valid investigation UUID is required' });
      }

      const deleted = await HistoryService.deleteInvestigation(id, userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Investigation not found or unauthorized' });
      }

      return res.json({ message: 'Investigation deleted successfully', id });
    } catch (err) {
      console.error('[HistoryController.deleteHistory] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  static async toggleSave(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!id || !isUUID(id)) {
        return res.status(400).json({ error: 'Valid investigation UUID is required' });
      }

      const result = await HistoryService.toggleSaveInvestigation(userId, id);
      return res.json(result);
    } catch (err) {
      console.error('[HistoryController.toggleSave] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = {
  HistoryController
};
