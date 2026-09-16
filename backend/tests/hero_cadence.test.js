const assert = require('assert');
const { HeroService } = require('../src/services/hero.service');

async function runHeroCadenceTests() {
  console.log('--- TEST 1: HERO SCHEDULE REFRESH CADENCE ---');
  const intervalMs = HeroService.getRefreshIntervalMs();
  const EXPECTED_4_HOURS_MS = 4 * 60 * 60 * 1000;
  
  assert.strictEqual(
    intervalMs,
    EXPECTED_4_HOURS_MS,
    `Refresh cadence must be 4 hours (${EXPECTED_4_HOURS_MS}ms), but got ${intervalMs}ms`
  );
  console.log('✓ PASS: Refresh cadence is exactly 4 hours (14,400,000 ms).');

  console.log('--- TEST 2: HERO DATA RESOLUTION (NEXT UPCOMING VS LAST COMPLETED) ---');
  const hero = await HeroService.getCurrentHero();

  assert.ok(hero, 'Hero content must not be null');
  assert.strictEqual(hero.round_number, 15, 'Next upcoming race relative to today (Sep 16, 2026) must be Round 15');
  assert.strictEqual(hero.event_name, 'Azerbaijan Grand Prix', 'Hero must show upcoming Azerbaijan Grand Prix');
  assert.strictEqual(hero.circuit_name, 'Baku City Circuit', 'Hero circuit must resolve to Baku City Circuit');
  assert.strictEqual(hero.timing_status, 'UPCOMING_RACE_WEEKEND', 'Hero timing status must be UPCOMING_RACE_WEEKEND');
  assert.strictEqual(hero.has_telemetry, false, 'Upcoming race prior to session running must have has_telemetry: false');
  console.log('✓ PASS: Hero shows upcoming Azerbaijan GP (Round 15) with has_telemetry: false.');

  console.log('--- TEST 3: SEPARATE LAST RACE RESULTS CONTENT ---');
  assert.ok(hero.last_race_results, 'hero.last_race_results must exist as its own section');
  const last = hero.last_race_results;
  assert.strictEqual(last.round_number, 14, 'Last race must be Round 14');
  assert.strictEqual(last.event_name, 'Spanish Grand Prix', 'Last completed race must be Spanish Grand Prix');
  assert.strictEqual(last.circuit_name, 'Madring Circuit (Madrid)', '2026 Spanish GP circuit must resolve to Madring Circuit (Madrid)');
  assert.strictEqual(last.circuit_key, 'madrid', 'Circuit key must be madrid');
  assert.strictEqual(last.has_telemetry, true, 'Ingested 2026 Madrid race must have has_telemetry: true');
  assert.ok(last.track_geometry?.trackPath, 'Madrid track geometry must contain real SVG trackPath');
  assert.strictEqual(last.winner?.driver, 'Kimi Antonelli', 'Winner must be Kimi Antonelli');
  assert.strictEqual(last.podium?.length, 3, 'Podium must have 3 finishers');
  assert.strictEqual(last.podium[0].driver, 'Kimi Antonelli', 'P1 must be Kimi Antonelli');
  assert.strictEqual(last.podium[1].driver, 'Max Verstappen', 'P2 must be Max Verstappen');
  assert.strictEqual(last.podium[2].driver, 'Lando Norris', 'P3 must be Lando Norris');
  console.log('✓ PASS: Last Race Results shows Round 14 Madrid GP with authentic telemetry track & podium.');

  console.log('\n=================================================================');
  console.log('ALL HERO CADENCE & SELECTION LOGIC TESTS PASSED');
  console.log('=================================================================');
  process.exit(0);
}

runHeroCadenceTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
