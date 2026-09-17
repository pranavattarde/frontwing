const assert = require('assert');
const dotenv = require('dotenv');
dotenv.config();
const { pool } = require('../src/config/db');
const { HistoryService } = require('../src/services/history.service');

async function testHistoryManagement() {
  console.log('--- TESTING HISTORY MANAGEMENT & GROUPS ---');

  // 1. Create a dummy test user
  const testEmail = `test_hist_${Date.now()}@example.com`;
  const userRes = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, 'dummy_hash', 'Test User')
     RETURNING id`,
    [testEmail]
  );
  const userId = userRes.rows[0].id;
  console.log('✓ Created test user:', userId);

  try {
    // 2. Create 2 investigations for this user
    const inv1 = await HistoryService.saveInvestigation({
      user_id: userId,
      question: 'Why did Hamilton finish P3 at Silverstone?',
      ai_response: { answer: 'Hamilton executed a strong soft tire stint.' },
      session: '2024_british_gp_race',
    });
    console.log('✓ Created investigation 1:', inv1.id);

    const inv2 = await HistoryService.saveInvestigation({
      user_id: userId,
      question: 'Analyze Verstappen telemetry at Dutch GP',
      ai_response: { answer: 'Verstappen lost pace in Turn 1.' },
      session: '2024_dutch_gp_race',
    });
    console.log('✓ Created investigation 2:', inv2.id);

    // 3. Test Pinning: Pin inv1
    const pinnedInv1 = await HistoryService.updateInvestigation(inv1.id, userId, { pinned: true });
    assert.strictEqual(pinnedInv1.pinned, true, 'inv1 should be pinned');
    console.log('✓ Successfully pinned investigation 1');

    // 4. Test Sorting: inv1 (pinned) must appear BEFORE inv2 in getHistory
    const histBefore = await HistoryService.getHistory(userId);
    assert.strictEqual(histBefore.investigations.length, 2, 'Should have 2 investigations');
    assert.strictEqual(histBefore.investigations[0].id, inv1.id, 'Pinned item must be sorted first');
    assert.strictEqual(histBefore.investigations[0].pinned, true);
    console.log('✓ Pinned item sorted first in getHistory');

    // 5. Test Rename: update display_title on inv1
    const renamed = await HistoryService.updateInvestigation(inv1.id, userId, {
      display_title: 'Hamilton Silverstone P3 Tactical Debrief'
    });
    assert.strictEqual(renamed.display_title, 'Hamilton Silverstone P3 Tactical Debrief', 'Title should be updated');
    console.log('✓ Renamed investigation display title successfully');

    // 6. Test Groups: Create a group "Silverstone 2024"
    const group = await HistoryService.createGroup(userId, 'Silverstone 2024');
    assert(group.id, 'Group should have UUID id');
    assert.strictEqual(group.name, 'Silverstone 2024');
    console.log('✓ Created investigation group:', group.id, group.name);

    // 7. Test Move: Move inv1 into "Silverstone 2024"
    const moved = await HistoryService.updateInvestigation(inv1.id, userId, { group_id: group.id });
    assert.strictEqual(moved.group_id, group.id, 'inv1 group_id should match group.id');
    assert.strictEqual(moved.group_name, 'Silverstone 2024', 'group_name should be joined');
    console.log('✓ Moved investigation 1 into group');

    // 8. Test getGroups count
    const groupsList = await HistoryService.getGroups(userId);
    assert.strictEqual(groupsList.length, 1);
    assert.strictEqual(groupsList[0].count, 1, 'Group count should be 1');
    console.log('✓ getGroups correctly reflects item count');

    // 9. Test Ungrouping: move inv1 back to null
    const ungrouped = await HistoryService.updateInvestigation(inv1.id, userId, { group_id: null });
    assert.strictEqual(ungrouped.group_id, null, 'group_id should be null');
    console.log('✓ Ungrouped investigation 1');

    // 10. Test Delete Group
    const groupDeleted = await HistoryService.deleteGroup(userId, group.id);
    assert.strictEqual(groupDeleted, true);
    console.log('✓ Deleted group successfully');

    // 11. Test Delete Investigation
    const invDeleted = await HistoryService.deleteInvestigation(inv1.id, userId);
    assert.strictEqual(invDeleted, true);
    const histAfter = await HistoryService.getHistory(userId);
    assert.strictEqual(histAfter.investigations.length, 1);
    assert.strictEqual(histAfter.investigations[0].id, inv2.id);
    console.log('✓ Deleted investigation 1 successfully');

    console.log('=================================================================');
    console.log('ALL HISTORY MANAGEMENT & GROUP TESTS PASSED!');
    console.log('=================================================================');
  } finally {
    // Cleanup test user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('✓ Test user cleaned up');
  }
}

testHistoryManagement()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
