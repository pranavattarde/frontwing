const path = require('path');
const { execFile } = require('child_process');
const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');

const HERO_CACHE_KEY = 'cache:f1_hero_content';
const HERO_CACHE_TTL = 3600 * 24 * 2; // 2 days in Redis

class HeroService {
  /**
   * Retrieve current live hero data
   */
  static async getCurrentHero() {
    // 1. Try Redis Cache
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(HERO_CACHE_KEY);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn('[HeroService] Redis cache lookup warning:', err.message);
    }

    // 2. Query PostgreSQL
    try {
      const res = await pool.query("SELECT * FROM hero_content WHERE id = 'current'");
      if (res.rows.length > 0) {
        const hero = res.rows[0];
        const formatted = {
          event_name: hero.event_name,
          official_event_name: hero.official_event_name,
          location: hero.location,
          country: hero.country,
          round_number: hero.round_number,
          season: hero.season,
          circuit_name: hero.circuit_name,
          circuit_key: hero.circuit_key,
          track_length_km: parseFloat(hero.track_length_km),
          turns: hero.turns,
          drs_zones: hero.drs_zones,
          lap_record: hero.lap_record,
          hero_headline: hero.hero_headline,
          hero_subheadline: hero.hero_subheadline,
          sessions: hero.sessions || [],
          suggested_questions: hero.suggested_questions || [],
          source: hero.source,
          last_updated: hero.last_updated
        };

        // Cache in Redis
        if (redisClient.isOpen) {
          try {
            await redisClient.setEx(HERO_CACHE_KEY, HERO_CACHE_TTL, JSON.stringify(formatted));
          } catch {}
        }
        return formatted;
      }
    } catch (dbErr) {
      console.warn('[HeroService] DB lookup warning:', dbErr.message);
    }

    // 3. Fallback: Trigger refresh on-demand
    return await this.refreshHero();
  }

  /**
   * Refresh Hero content via FastF1 python service
   */
  static async refreshHero() {
    console.log('[HeroService] Refreshing live FastF1 hero schedule...');
    
    // Path to python executable & script
    const projectRoot = path.resolve(__dirname, '../../../');
    const pythonExe = process.platform === 'win32'
      ? path.join(projectRoot, 'ai_services/venv/Scripts/python.exe')
      : path.join(projectRoot, 'ai_services/venv/bin/python');

    const scriptPath = path.join(projectRoot, 'ai_services/app/services/hero_service.py');

    return new Promise((resolve, reject) => {
      execFile(pythonExe, [scriptPath], { cwd: projectRoot, timeout: 45000 }, async (error, stdout, stderr) => {
        if (error) {
          console.error('[HeroService] Python hero service execution failed:', error.message);
          // If execution failed but DB has an older record, return it
          try {
            const fallbackRes = await pool.query("SELECT * FROM hero_content WHERE id = 'current'");
            if (fallbackRes.rows.length > 0) {
              return resolve(fallbackRes.rows[0]);
            }
          } catch {}
          return reject(error);
        }

        try {
          // Find JSON output in stdout
          const jsonStart = stdout.indexOf('{');
          const jsonEnd = stdout.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
            
            // Invalidate/update Redis cache
            if (redisClient.isOpen) {
              try {
                await redisClient.setEx(HERO_CACHE_KEY, HERO_CACHE_TTL, JSON.stringify(parsed));
              } catch {}
            }
            return resolve(parsed);
          }
          resolve({ status: 'completed', raw: stdout });
        } catch (parseErr) {
          console.error('[HeroService] Failed to parse python output JSON:', parseErr.message);
          resolve({ status: 'partial', error: parseErr.message });
        }
      });
    });
  }

  /**
   * Initialize 5-day scheduled recurring refresh job
   */
  static startScheduledJob() {
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    
    // Initial check on startup after 5 seconds
    setTimeout(async () => {
      try {
        const check = await pool.query("SELECT COUNT(*) FROM hero_content WHERE id = 'current'");
        if (parseInt(check.rows[0].count, 10) === 0) {
          console.log('[HeroService] No hero content found, running initial FastF1 fetch...');
          await this.refreshHero();
        }
      } catch (err) {
        console.warn('[HeroService] Initial startup check note:', err.message);
      }
    }, 5000);

    // Schedule every 5 days
    setInterval(async () => {
      try {
        console.log('[HeroService] Running scheduled 5-day FastF1 schedule update...');
        await this.refreshHero();
      } catch (jobErr) {
        console.error('[HeroService] Scheduled hero refresh job failed:', jobErr.message);
      }
    }, FIVE_DAYS_MS);
  }
}

module.exports = { HeroService };
