const { HistoryService } = require('../services/history.service');

const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

class HistoryController {
  static async getHistory(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const session = req.query.session ? req.query.session : undefined;
      const search = req.query.search ? req.query.search : undefined;
      const groupId = req.query.group_id ? req.query.group_id : undefined;

      const result = await HistoryService.getHistory(userId, {
        limit,
        offset,
        session,
        search,
        group_id: groupId,
      });

      return res.json(result);
    } catch (err) {
      console.error('[HistoryController.getHistory] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error retrieving history' : err.message });
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
      console.error('[HistoryController.getHistoryById] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error retrieving investigation' : err.message });
    }
  }

  static async updateInvestigation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!id || !isUUID(id)) {
        return res.status(400).json({ error: 'Valid investigation UUID is required' });
      }

      const { pinned, display_title, group_id } = req.body;
      const updated = await HistoryService.updateInvestigation(id, userId, {
        pinned,
        display_title,
        group_id,
      });

      if (!updated) {
        return res.status(404).json({ error: 'Investigation not found or unauthorized' });
      }

      return res.json({ message: 'Investigation updated successfully', investigation: updated });
    } catch (err) {
      console.error('[HistoryController.updateInvestigation] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error updating investigation' : err.message });
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
      console.error('[HistoryController.deleteHistory] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error deleting investigation' : err.message });
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
      console.error('[HistoryController.toggleSave] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error bookmarking investigation' : err.message });
    }
  }

  // --- Group Handlers ---

  static async getGroups(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const groups = await HistoryService.getGroups(userId);
      return res.json({ groups });
    } catch (err) {
      console.error('[HistoryController.getGroups] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error retrieving groups' : err.message });
    }
  }

  static async createGroup(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const group = await HistoryService.createGroup(userId, name.trim());
      return res.status(201).json({ message: 'Group created successfully', group });
    } catch (err) {
      console.error('[HistoryController.createGroup] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error creating group' : err.message });
    }
  }

  static async deleteGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!groupId || !isUUID(groupId)) {
        return res.status(400).json({ error: 'Valid group UUID is required' });
      }

      const deleted = await HistoryService.deleteGroup(userId, groupId);
      if (!deleted) {
        return res.status(404).json({ error: 'Group not found or unauthorized' });
      }

      return res.json({ message: 'Group deleted successfully', groupId });
    } catch (err) {
      console.error('[HistoryController.deleteGroup] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error deleting group' : err.message });
    }
  }

  static async renameGroup(req, res) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!groupId || !isUUID(groupId)) {
        return res.status(400).json({ error: 'Valid group UUID is required' });
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const updated = await HistoryService.renameGroup(userId, groupId, name.trim());
      if (!updated) {
        return res.status(404).json({ error: 'Group not found or unauthorized' });
      }

      return res.json({ message: 'Group renamed successfully', group: updated });
    } catch (err) {
      console.error('[HistoryController.renameGroup] Error:', err.message, err.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error renaming group' : err.message });
    }
  }
}

module.exports = {
  HistoryController
};
