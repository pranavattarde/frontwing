const path = require('path');
const fs = require('fs');
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
    // 1. Try Redis Cache (only if fresh within 12 hours)
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(HERO_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const cacheTime = parsed.last_updated ? new Date(parsed.last_updated).getTime() : 0;
          const ageHours = (Date.now() - cacheTime) / (1000 * 60 * 60);
          if (ageHours < 12) {
            return parsed;
          }
          console.log(`[HeroService] Redis cache is stale (${ageHours.toFixed(1)}h old), fetching fresh content...`);
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
          timing_status: hero.timing_status || 'UPCOMING_RACE_WEEKEND',
          has_telemetry: hero.has_telemetry === true,
          track_geometry: hero.track_geometry || null,
          last_race_results: hero.last_race_results || null,
          countdown_target: hero.countdown_target || (hero.sessions && hero.sessions[0]?.utc) || null,
          source: hero.source,
          last_updated: hero.last_updated
        };

        // Cache fresh data in Redis
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
   * Refresh Hero content via remote AI service (HF Spaces) or FastF1 python service
   */
  static async refreshHero() {
    console.log('[HeroService] Refreshing live FastF1 hero schedule...');
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'https://pranav722-frontwing-ai-services.hf.space';

    // 1. Try remote AI Service endpoint (FastAPI on Hugging Face Spaces)
    try {
      console.log(`[HeroService] Triggering remote refresh via ${aiServiceUrl}/hero/refresh...`);
      const response = await fetch(`${aiServiceUrl}/hero/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000)
      });
      if (response.ok) {
        const json = await response.json();
        const heroData = json.hero || json.data || json;
        if (heroData && heroData.event_name) {
          console.log(`[HeroService] Remote AI service refresh succeeded for: ${heroData.event_name} (Round ${heroData.round_number})`);
          if (redisClient.isOpen) {
            try {
              await redisClient.setEx(HERO_CACHE_KEY, HERO_CACHE_TTL, JSON.stringify(heroData));
            } catch {}
          }
          return heroData;
        }
      } else {
        console.warn(`[HeroService] Remote AI service returned HTTP ${response.status}`);
      }
    } catch (remoteErr) {
      console.warn('[HeroService] Remote AI service refresh attempt note:', remoteErr.message);
    }

    // 2. Local Python execution fallback (for local development environments with venv)
    const projectRoot = path.resolve(__dirname, '../../../');
    const pythonExe = process.platform === 'win32'
      ? path.join(projectRoot, 'ai_services/venv/Scripts/python.exe')
      : path.join(projectRoot, 'ai_services/venv/bin/python');

    const scriptPath = path.join(projectRoot, 'ai_services/app/services/hero_service.py');

    if (fs.existsSync(pythonExe) && fs.existsSync(scriptPath)) {
      return new Promise((resolve) => {
        execFile(pythonExe, [scriptPath], { cwd: projectRoot, timeout: 60000 }, async (error, stdout) => {
          if (error) {
            console.warn('[HeroService] Local Python execution note:', error.message);
          } else {
            try {
              const jsonStart = stdout.indexOf('{');
              const jsonEnd = stdout.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
                if (redisClient.isOpen) {
                  try {
                    await redisClient.setEx(HERO_CACHE_KEY, HERO_CACHE_TTL, JSON.stringify(parsed));
                  } catch {}
                }
                return resolve(parsed);
              }
            } catch (pErr) {
              console.warn('[HeroService] JSON parse note:', pErr.message);
            }
          }
          // Read latest from DB
          try {
            const fallback = await pool.query("SELECT * FROM hero_content WHERE id = 'current'");
            if (fallback.rows.length > 0) {
              return resolve(fallback.rows[0]);
            }
          } catch {}
          resolve({ status: 'completed' });
        });
      });
    }

    // 3. Fallback: Query current PostgreSQL record and update Redis
    try {
      const fallbackRes = await pool.query("SELECT * FROM hero_content WHERE id = 'current'");
      if (fallbackRes.rows.length > 0) {
        const row = fallbackRes.rows[0];
        if (redisClient.isOpen) {
          try {
            await redisClient.setEx(HERO_CACHE_KEY, HERO_CACHE_TTL, JSON.stringify(row));
          } catch {}
        }
        return row;
      }
    } catch (fallbackDbErr) {
      console.error('[HeroService] Fallback DB query failed:', fallbackDbErr.message);
    }

    return { status: 'fallback', message: 'Hero content unavailable' };
  }

  /**
   * Return scheduled refresh cadence in ms (4 hours)
   */
  static getRefreshIntervalMs() {
    return 4 * 60 * 60 * 1000;
  }

  /**
   * Initialize scheduled recurring refresh job
   */
  static startScheduledJob() {
    const REFRESH_INTERVAL_MS = this.getRefreshIntervalMs();
    
    // Check on startup after 5 seconds: if data is stale (>12h old), trigger refresh immediately
    setTimeout(async () => {
      try {
        const check = await pool.query("SELECT last_updated FROM hero_content WHERE id = 'current'");
        let isStale = true;
        if (check.rows.length > 0 && check.rows[0].last_updated) {
          const lastUpdated = new Date(check.rows[0].last_updated);
          const ageHours = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
          if (ageHours < 12) {
            isStale = false;
          }
        }
        if (isStale) {
          console.log('[HeroService] Hero content is missing or stale (>12h old). Triggering automatic FastF1 refresh...');
          await this.refreshHero();
        } else {
          console.log('[HeroService] Hero content is fresh, next refresh scheduled on 6-hour interval.');
        }
      } catch (err) {
        console.warn('[HeroService] Startup freshness check note:', err.message);
      }
    }, 5000);

    // Schedule every 6 hours so data is automatically kept fresh every day
    setInterval(async () => {
      try {
        console.log('[HeroService] Running scheduled recurring 6-hour FastF1 schedule update...');
        await this.refreshHero();
      } catch (jobErr) {
        console.error('[HeroService] Scheduled hero refresh job failed:', jobErr.message);
      }
    }, REFRESH_INTERVAL_MS);
  }
}

module.exports = { HeroService };
