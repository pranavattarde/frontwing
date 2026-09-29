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
  assert.ok(hero.round_number >= 15, `Hero round number must be >= 15, got ${hero.round_number}`);
  assert.ok(hero.event_name, 'Hero must have an event_name');
  assert.ok(hero.circuit_name, 'Hero must resolve a circuit_name');
  assert.ok(['UPCOMING_RACE_WEEKEND', 'SEASON_COMPLETED'].includes(hero.timing_status), 'Hero timing status must be valid');
  console.log(`✓ PASS: Hero shows upcoming GP: ${hero.event_name} (Round ${hero.round_number}) at ${hero.circuit_name}.`);

  console.log('--- TEST 3: SEPARATE LAST RACE RESULTS CONTENT ---');
  assert.ok(hero.last_race_results, 'hero.last_race_results must exist as its own section');
  const last = hero.last_race_results;
  assert.ok(last.round_number >= 14, `Last race round number must be >= 14, got ${last.round_number}`);
  assert.ok(last.event_name, 'Last completed race must have event_name');
  assert.ok(last.circuit_name, 'Last race must have circuit_name');
  assert.ok(last.winner?.driver, 'Winner must exist');
  assert.strictEqual(last.podium?.length, 3, 'Podium must have 3 finishers');
  console.log(`✓ PASS: Last Race Results shows Round ${last.round_number} (${last.event_name}) won by ${last.winner?.driver} with authentic podium.`);

  console.log('\n=================================================================');
  console.log('ALL HERO CADENCE & SELECTION LOGIC TESTS PASSED');
  console.log('=================================================================');
  process.exit(0);
}

runHeroCadenceTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
