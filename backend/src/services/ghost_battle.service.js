const path = require('path');
const { execFile } = require('child_process');
const { redisClient } = require('../config/redis');

const TTL_YEARS = 3600 * 24 * 7; // 7 days
const TTL_GPS = 3600 * 24 * 3;   // 3 days
const TTL_ROSTER = 3600 * 24 * 7; // 7 days (historical grid does not change)
const TTL_BATTLE_DATA = 3600 * 24 * 7; // 7 days (telemetry for fastest lap is immutable)

class GhostBattleService {
  static getPythonEnvironment() {
    const projectRoot = path.resolve(__dirname, '../../../');
    const pythonExe = process.platform === 'win32'
      ? path.join(projectRoot, 'ai_services/venv/Scripts/python.exe')
      : path.join(projectRoot, 'ai_services/venv/bin/python');
    const scriptPath = path.join(projectRoot, 'ai_services/app/services/ghost_battle_service.py');
    return { projectRoot, pythonExe, scriptPath };
  }

  static async runPython(action, args = [], timeoutMs = 60000) {
    const { projectRoot, pythonExe, scriptPath } = this.getPythonEnvironment();
    
    return new Promise((resolve, reject) => {
      execFile(pythonExe, [scriptPath, action, ...args], { cwd: projectRoot, timeout: timeoutMs, maxBuffer: 1024 * 1024 * 30 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[GhostBattleService] Python execution error for ${action}:`, error.message);
          return reject(error);
        }
        
        try {
          const jsonStart = stdout.indexOf('{');
          const jsonEnd = stdout.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const parsed = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
            if (parsed.status === 'error') {
              return reject(new Error(parsed.message || 'Python service error'));
            }
            return resolve(parsed);
          }
          reject(new Error('No valid JSON returned from Ghost Battle Python service'));
        } catch (parseErr) {
          console.error('[GhostBattleService] JSON parse error:', parseErr.message, stdout.slice(0, 300));
          reject(parseErr);
        }
      });
    });
  }

  /**
   * 1. GET /ghost-battle/available-years
   */
  static async getAvailableYears() {
    const cacheKey = 'cache:ghost_battle:years';
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[GhostBattleService] Redis lookup warning:', err.message);
    }

    const data = await this.runPython('available_years', [], 20000);
    
    if (redisClient.isOpen && data && data.years) {
      try {
        await redisClient.setEx(cacheKey, TTL_YEARS, JSON.stringify(data));
      } catch {}
    }
    return data;
  }

  /**
   * 2. GET /ghost-battle/available-gps?year=X
   */
  static async getAvailableGPs(year) {
    const y = parseInt(year) || 2024;
    const cacheKey = `cache:ghost_battle:gps:${y}`;
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[GhostBattleService] Redis lookup warning:', err.message);
    }

    const data = await this.runPython('available_gps', [y.toString()], 25000);
    
    if (redisClient.isOpen && data && data.gps) {
      try {
        await redisClient.setEx(cacheKey, TTL_GPS, JSON.stringify(data));
      } catch {}
    }
    return data;
  }

  /**
   * 3. GET /ghost-battle/drivers-teams?session_id=X
   */
  static async getDriversAndTeams(sessionId) {
    if (!sessionId) throw new Error('session_id is required');
    const cacheKey = `cache:ghost_battle:roster:${sessionId}`;
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[GhostBattleService] Redis lookup warning:', err.message);
    }

    const data = await this.runPython('drivers_teams', [sessionId], 30000);
    
    if (redisClient.isOpen && data && data.teams) {
      try {
        await redisClient.setEx(cacheKey, TTL_ROSTER, JSON.stringify(data));
      } catch {}
    }
    return data;
  }

  /**
   * 4. POST /ghost-battle/data
   * Enforces min 2 / max 22 driver selection server-side.
   */
  static async getGhostBattleData(sessionId, driverIds) {
    if (!sessionId) {
      const err = new Error('session_id is required');
      err.status = 400;
      throw err;
    }

    if (!Array.isArray(driverIds) || driverIds.length < 2 || driverIds.length > 22) {
      const err = new Error(`Invalid driver selection: Minimum 2 and maximum 22 drivers required (received ${Array.isArray(driverIds) ? driverIds.length : 0}).`);
      err.status = 400;
      throw err;
    }

    // Clean and sort driver IDs for consistent cache key
    const cleanedDrivers = driverIds.map(d => String(d).trim().toUpperCase()).sort();
    const hashKey = `${sessionId}:${cleanedDrivers.join(',')}`;
    const cacheKey = `cache:ghost_battle:data:${hashKey}`;

    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[GhostBattleService] Redis lookup warning:', err.message);
    }

    const data = await this.runPython('ghost_battle_data', [sessionId, cleanedDrivers.join(',')], 150000);

    if (redisClient.isOpen && data && data.drivers) {
      try {
        await redisClient.setEx(cacheKey, TTL_BATTLE_DATA, JSON.stringify(data));
      } catch {}
    }
    return data;
  }
}

module.exports = { GhostBattleService };
