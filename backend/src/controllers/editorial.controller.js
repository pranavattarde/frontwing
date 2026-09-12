const { EditorialService } = require('../services/editorial.service');

class EditorialController {
  static async getCurrent(req, res) {
    try {
      const data = await EditorialService.getCurrentEditorial();
      return res.json(data);
    } catch (err) {
      console.error('[EditorialController] Failed to get editorial data:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve editorial content' });
    }
  }

  static async refresh(req, res) {
    try {
      const data = await EditorialService.refreshEditorial();
      return res.json({ status: 'refreshed', data });
    } catch (err) {
      console.error('[EditorialController] Failed to refresh editorial data:', err.message);
      return res.status(500).json({ error: 'Failed to refresh editorial content', details: err.message });
    }
  }
}

module.exports = { EditorialController };
