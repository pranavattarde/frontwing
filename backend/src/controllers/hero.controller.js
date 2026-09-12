const { HeroService } = require('../services/hero.service');

class HeroController {
  static async getCurrent(req, res) {
    try {
      const data = await HeroService.getCurrentHero();
      return res.json(data);
    } catch (err) {
      console.error('[HeroController] Failed to get hero data:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve hero content' });
    }
  }

  static async refresh(req, res) {
    try {
      const data = await HeroService.refreshHero();
      return res.json({ status: 'refreshed', data });
    } catch (err) {
      console.error('[HeroController] Failed to refresh hero data:', err.message);
      return res.status(500).json({ error: 'Failed to refresh hero content', details: err.message });
    }
  }
}

module.exports = { HeroController };
