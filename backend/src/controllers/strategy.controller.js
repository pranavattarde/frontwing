const { CacheService } = require('../services/cache.service');
const { HistoryService } = require('../services/history.service');

class StrategyController {
  static async query(req, res) {
    try {
      const { question, session, session_id, driver_id, grand_prix, season } = req.body;
      const queryText = question;

      if (!queryText) {
        return res.status(400).json({ error: 'Question is required for strategy queries' });
      }

      const activeSession = session_id || session || null;

      const conversationId = req.body.conversation_id || null;

      // 1. Check Redis Cache for identical request (only for fresh standalone queries)
      if (!conversationId) {
        const cached = await CacheService.getCachedResponse(queryText, activeSession);
        if (cached && (cached.strategy_report || cached.whatif_simulation || cached.executive_summary)) {
          let savedId = cached.id;
          if (req.user?.id) {
            try {
              const saved = await HistoryService.saveInvestigation({
                user_id: req.user.id,
                question: queryText,
                ai_response: cached,
                session: activeSession,
                provider_used: 'strategy-planner-redis',
                investigation_metadata: { cached: true, strategy: true },
              });
              if (saved && saved.id) {
                savedId = saved.id;
              }
            } catch (histErr) {
              console.warn('[StrategyController] Failed to save history for cached strategy query:', histErr.message);
            }
          }
          return res.json({ ...cached, id: savedId, cached: true });
        }
      }

      // 2. Proxy request to Python AI Microservice /strategy/query
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      console.log(`[StrategyController] Proxying strategy query to: ${aiServiceUrl}/strategy/query (conv: ${conversationId})`);

      const response = await fetch(`${aiServiceUrl}/strategy/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: queryText,
          session_id: activeSession,
          driver_id: driver_id || null,
          grand_prix: grand_prix || null,
          season: season || null,
          conversation_id: conversationId,
          context: {
            ...(req.body.context || {}),
            user_id: req.user?.id || null
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[StrategyController] AI service returned error: ${response.status} - ${errText}`);
        return res.status(response.status).send(errText);
      }

      const data = await response.json();

      // 3. Cache response in Redis
      if (data && data.status === 'success') {
        await CacheService.setCachedResponse(queryText, data, activeSession);
      }

      // 4. Save to PostgreSQL History
      try {
        const saved = await HistoryService.saveInvestigation({
          user_id: req.user?.id || null,
          question: queryText,
          ai_response: data,
          session: activeSession || data.session_id || null,
          provider_used: 'strategy-planner',
          investigation_metadata: {
            session_id: activeSession || data.session_id,
            query_type: data.query_type,
          },
        });
        if (saved && saved.id) {
          data.id = saved.id;
        }
      } catch (histErr) {
        console.warn('[StrategyController] Failed to save strategy investigation history:', histErr.message);
      }

      return res.json(data);
    } catch (error) {
      console.error('[StrategyController] Strategy query error:', error.message, error.stack);
      const isProd = process.env.NODE_ENV === 'production';
      const safeMsg = isProd ? 'Internal server error processing strategy query' : error.message;
      return res.status(500).json({ error: safeMsg });
    }
  }
}

module.exports = {
  StrategyController
};
