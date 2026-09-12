const { GhostBattleService } = require('../services/ghost_battle.service');

class GhostBattleController {
  /**
   * GET /ghost-battle/available-years
   */
  static async getAvailableYears(req, res) {
    try {
      const data = await GhostBattleService.getAvailableYears();
      return res.json(data);
    } catch (err) {
      console.error('[GhostBattleController] getAvailableYears error:', err.message);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  /**
   * GET /ghost-battle/available-gps?year=X
   */
  static async getAvailableGPs(req, res) {
    try {
      const year = req.query.year || req.query.season || 2024;
      const data = await GhostBattleService.getAvailableGPs(year);
      return res.json(data);
    } catch (err) {
      console.error('[GhostBattleController] getAvailableGPs error:', err.message);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  /**
   * GET /ghost-battle/drivers-teams?session_id=X
   */
  static async getDriversTeams(req, res) {
    try {
      const sessionId = req.query.session_id || req.query.session;
      if (!sessionId) {
        return res.status(400).json({ status: 'error', message: 'session_id query parameter is required.' });
      }
      const data = await GhostBattleService.getDriversAndTeams(sessionId);
      return res.json(data);
    } catch (err) {
      console.error('[GhostBattleController] getDriversTeams error:', err.message);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  /**
   * POST /ghost-battle/data
   */
  static async getGhostBattleData(req, res) {
    try {
      const { session_id, driver_ids } = req.body;

      if (!session_id) {
        return res.status(400).json({
          status: 'error',
          message: 'session_id is required in request body.'
        });
      }

      if (!Array.isArray(driver_ids) || driver_ids.length < 2 || driver_ids.length > 22) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid driver selection: Minimum 2 and maximum 22 drivers required (received ${Array.isArray(driver_ids) ? driver_ids.length : 0}).`
        });
      }

      const data = await GhostBattleService.getGhostBattleData(session_id, driver_ids);
      return res.json(data);
    } catch (err) {
      console.error('[GhostBattleController] getGhostBattleData error:', err.message, err.stack);
      const statusCode = err.status || 500;
      const isProd = process.env.NODE_ENV === 'production';
      const safeMsg = statusCode >= 500 && isProd
        ? 'Internal server error retrieving ghost battle telemetry'
        : err.message;
      return res.status(statusCode).json({ status: 'error', message: safeMsg });
    }
  }
}

module.exports = { GhostBattleController };
