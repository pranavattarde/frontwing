import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { CacheService } from '../services/cache.service';
import { HistoryService } from '../services/history.service';

export class EngineerController {
  static async query(req: AuthRequest, res: Response) {
    try {
      const { question, session, prompt } = req.body;
      const queryText = question || prompt;

      if (!queryText) {
        return res.status(400).json({ error: 'Question or prompt is required' });
      }

      // 1. Check Redis Cache for identical request
      const cached = await CacheService.getCachedResponse(queryText, session);
      if (cached) {
        // If authenticated user, log connection/save in history
        if (req.user?.id) {
          try {
            await HistoryService.saveInvestigation({
              user_id: req.user.id,
              question: queryText,
              ai_response: cached,
              session: session || null,
              provider_used: cached.provider || 'cached-redis',
              investigation_metadata: { cached: true },
            });
          } catch (histErr: any) {
            console.warn('[EngineerController] Failed to save history for cached query:', histErr.message);
          }
        }
        return res.json(cached);
      }

      // 2. Proxy request to Python AI Microservice
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      console.log(`[EngineerController] Proxying query to: ${aiServiceUrl}/engineer/query`);

      const response = await fetch(`${aiServiceUrl}/engineer/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[EngineerController] AI service returned error: ${response.status} - ${errText}`);
        return res.status(response.status).send(errText);
      }

      const data: any = await response.json();

      // 3. Cache response in Redis
      await CacheService.setCachedResponse(queryText, data, session);

      // 4. Save to PostgreSQL Investigation History
      try {
        await HistoryService.saveInvestigation({
          user_id: req.user?.id || null,
          question: queryText,
          ai_response: data,
          session: session || null,
          provider_used: data.provider || data.trace?.provider || 'gemini-2.5-flash',
          investigation_metadata: {
            session_id: session,
            trace_id: data.trace?.trace_id,
          },
        });
      } catch (histErr: any) {
        console.warn('[EngineerController] Failed to save investigation history:', histErr.message);
      }

      return res.json(data);
    } catch (error: any) {
      console.error('[EngineerController] Query handling error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
