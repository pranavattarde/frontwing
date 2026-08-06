import { Request, Response } from 'express';

export class SessionController {
  static async load(req: Request, res: Response) {
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
      return res.json(data);
    } catch (error: any) {
      console.error('[SessionController] Error in session load handler:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to load session data' });
    }
  }
}
