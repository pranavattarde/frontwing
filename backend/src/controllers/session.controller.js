const { CacheService } = require('../services/cache.service');

class SessionController {
  static async load(req, res) {
    try {
      const { year, gp, session } = req.body;

      if (!year || !gp || !session) {
        return res.status(400).json({ error: 'Missing required parameters: year, gp, session' });
      }

      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${aiServiceUrl}/sessions/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, gp, session }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).send(errText);
      }

      const data = await response.json();

      // Invalidate stale cached responses for this session so updated data is served immediately
      if (data && data.session_id) {
        await CacheService.invalidateSessionCache(data.session_id);
      } else {
        await CacheService.clearInvestigationCache();
      }

      return res.json(data);
    } catch (error) {
      console.error('[SessionController] Error in session load handler:', error.message, error.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error loading session data' : (error.message || 'Failed to load session data') });
    }
  }

  static async backfillStatus(req, res) {
    try {
      const { sessionId } = req.params;
      if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId parameter' });
      }

      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${aiServiceUrl}/sessions/backfill-status/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).send(errText);
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error('[SessionController] Error in backfillStatus handler:', error.message, error.stack);
      const isProd = process.env.NODE_ENV === 'production';
      return res.status(500).json({ error: isProd ? 'Internal server error checking backfill status' : (error.message || 'Failed to fetch backfill status') });
    }
  }
}

module.exports = {
  SessionController
};
