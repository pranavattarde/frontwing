const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const fetch = globalThis.fetch || require('node-fetch');
const { pool } = require('../backend/src/config/db');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('🏁 FRONTWING END-TO-END AUTH & ISOLATION VERIFICATION');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 1: 401 on Unauthenticated Protected Endpoints
  // ----------------------------------------------------
  console.log('\n--- 1. Testing 401 Rejection on Protected Endpoints (No Token) ---');
  
  const protectedEndpoints = [
    { url: `${BASE_URL}/history`, method: 'GET' },
    { url: `${BASE_URL}/engineer/query`, method: 'POST', body: { question: 'test' } },
    { url: `${BASE_URL}/strategy/query`, method: 'POST', body: { question: 'test' } },
    { url: `${BASE_URL}/ghost-battle/austrian_2024`, method: 'GET' },
    { url: `${BASE_URL}/bookmarks`, method: 'GET' }
  ];

  for (const ep of protectedEndpoints) {
    const res = await fetch(ep.url, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    assert(res.status === 401, `${ep.method} ${ep.url} rejected with 401 (got ${res.status}): ${JSON.stringify(data)}`);
  }

  // ----------------------------------------------------
  // TEST 2: 401 on Invalid / Tampered Token
  // ----------------------------------------------------
  console.log('\n--- 2. Testing 401 Rejection on Invalid Token ---');
  const invalidTokenRes = await fetch(`${BASE_URL}/history`, {
    headers: { 'Authorization': 'Bearer invalid.token.payload' }
  });
  assert(invalidTokenRes.status === 401, `GET /history with invalid token rejected with 401 (got ${invalidTokenRes.status})`);

  // ----------------------------------------------------
  // TEST 3: Email Format Validation
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Email Format Validation ---');
  const badEmailRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-a-valid-email', password: 'Password123!', name: 'Bad Email' })
  });
  const badEmailData = await badEmailRes.json();
  assert(badEmailRes.status === 400, `POST /auth/register rejected invalid email with 400: ${badEmailData.error}`);
  assert(badEmailData.error.toLowerCase().includes('email'), 'Error message specifies invalid email format');

  // ----------------------------------------------------
  // TEST 4: Register Account 1 (Lewis Hamilton)
  // ----------------------------------------------------
  console.log('\n--- 4. Registering Account 1 (Lewis Hamilton) ---');
  const user1Email = `hamilton_${Date.now()}@mercedes-f1.com`;
  const user1Pass = 'HammerTime44!';
  const user1Name = 'Lewis Hamilton';

  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, password: user1Pass, name: user1Name })
  });
  const reg1Data = await reg1Res.json();
  assert(reg1Res.status === 201, `Account 1 registered successfully (201): user_id=${reg1Data.user?.id}`);
  assert(!!reg1Data.token, 'Account 1 issued a JWT token');
  assert(reg1Data.user?.email === user1Email, 'Account 1 user object contains correct email');

  const token1 = reg1Data.token;
  const user1Id = reg1Data.user.id;

  // Verify bcrypt cost factor 12 in database
  const user1Db = await pool.query('SELECT password_hash FROM users WHERE id = $1', [user1Id]);
  const hash1 = user1Db.rows[0]?.password_hash;
  assert(hash1 && hash1.startsWith('$2b$12$') || hash1.startsWith('$2a$12$'), `Bcrypt cost factor is 12: ${hash1.slice(0, 10)}...`);

  // Test duplicate email rejection
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, password: 'AnotherPassword!', name: 'Duplicate Lewis' })
  });
  const dupData = await dupRes.json();
  assert(dupRes.status === 400, `Duplicate email rejected with 400: ${dupData.error}`);
  assert(dupData.error.toLowerCase().includes('already exists') || dupData.error.toLowerCase().includes('already in use'), 'Duplicate email returns clear error message');

  // ----------------------------------------------------
  // TEST 5: Register Account 2 (Max Verstappen)
  // ----------------------------------------------------
  console.log('\n--- 5. Registering Account 2 (Max Verstappen) ---');
  const user2Email = `verstappen_${Date.now()}@redbull-f1.com`;
  const user2Pass = 'SimplyLovely33!';
  const user2Name = 'Max Verstappen';

  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user2Email, password: user2Pass, name: user2Name })
  });
  const reg2Data = await reg2Res.json();
  assert(reg2Res.status === 201, `Account 2 registered successfully (201): user_id=${reg2Data.user?.id}`);
  assert(!!reg2Data.token, 'Account 2 issued a JWT token');

  const token2 = reg2Data.token;
  const user2Id = reg2Data.user.id;

  // ----------------------------------------------------
  // TEST 6: Login Verification & Generic Error on Failure
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Login & Generic Credential Errors ---');
  
  // Non-existent email -> generic error
  const wrongEmailRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent_ghost_driver@f1.com', password: 'Password123!' })
  });
  const wrongEmailData = await wrongEmailRes.json();
  assert(wrongEmailRes.status === 401, `Non-existent email rejected with 401`);
  assert(wrongEmailData.error === 'Invalid credentials', `Generic error message does NOT leak email existence: "${wrongEmailData.error}"`);

  // Existing email, wrong password -> identical generic error
  const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, password: 'WrongPassword123!' })
  });
  const wrongPassData = await wrongPassRes.json();
  assert(wrongPassRes.status === 401, `Wrong password rejected with 401`);
  assert(wrongPassData.error === 'Invalid credentials', `Generic error identical: "${wrongPassData.error}"`);

  // Correct credentials -> 200 OK
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user1Email, password: user1Pass })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, `Login succeeded with 200 OK`);
  assert(!!loginData.token, `Login returned valid JWT`);
  assert(loginData.user?.id === user1Id, `Login user id matches Account 1`);

  // ----------------------------------------------------
  // TEST 7: Create Investigations Under Each User
  // ----------------------------------------------------
  console.log('\n--- 7. Creating Separate Investigations Under Each Account ---');
  
  // Insert Investigation 1 for User 1
  const inv1 = await pool.query(
    `INSERT INTO investigations (user_id, question, ai_response, session, provider_used)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, question, created_at`,
    [
      user1Id,
      'Could Hamilton have won the Austrian GP with an earlier Turn 4 brake point?',
      JSON.stringify({ verdict: 'Hamilton braking point delta showed +0.142s loss in Turn 4.' }),
      'austrian_gp_2024',
      'fastf1-engine'
    ]
  );
  const inv1Row = inv1.rows[0];
  console.log('  Created Investigation 1:', inv1Row);
  assert(inv1Row.user_id === user1Id, 'Investigation 1 tagged with User 1 ID');

  // Insert Investigation 2 for User 2
  const inv2 = await pool.query(
    `INSERT INTO investigations (user_id, question, ai_response, session, provider_used)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, question, created_at`,
    [
      user2Id,
      'Why did Verstappen experience tire blistering on lap 54 at the Red Bull Ring?',
      JSON.stringify({ verdict: 'Verstappen tire degradation accelerated by high track temperature (48°C).' }),
      'austrian_gp_2024',
      'strategy-engine'
    ]
  );
  const inv2Row = inv2.rows[0];
  console.log('  Created Investigation 2:', inv2Row);
  assert(inv2Row.user_id === user2Id, 'Investigation 2 tagged with User 2 ID');

  // ----------------------------------------------------
  // TEST 8: Strict History Isolation Verification
  // ----------------------------------------------------
  console.log('\n--- 8. Verifying Strict Per-User History Isolation via GET /history ---');

  // Fetch history as User 1
  const hist1Res = await fetch(`${BASE_URL}/history`, {
    headers: { 'Authorization': `Bearer ${token1}` }
  });
  const hist1Data = await hist1Res.json();
  console.log('\nRaw GET /history response for User 1 (Hamilton):');
  console.log(JSON.stringify(hist1Data, null, 2));

  assert(hist1Res.status === 200, 'GET /history returned 200 for User 1');
  assert(Array.isArray(hist1Data.investigations), 'User 1 history is an array');
  assert(hist1Data.investigations.length === 1, `User 1 history has exactly 1 investigation (got ${hist1Data.investigations.length})`);
  assert(hist1Data.investigations[0].id === inv1Row.id, `User 1 history contains Investigation 1 (${inv1Row.id})`);
  assert(!hist1Data.investigations.some(i => i.id === inv2Row.id), `CRITICAL: User 1 history DOES NOT contain User 2's Investigation 2 (${inv2Row.id})`);

  // Fetch history as User 2
  const hist2Res = await fetch(`${BASE_URL}/history`, {
    headers: { 'Authorization': `Bearer ${token2}` }
  });
  const hist2Data = await hist2Res.json();
  console.log('\nRaw GET /history response for User 2 (Verstappen):');
  console.log(JSON.stringify(hist2Data, null, 2));

  assert(hist2Res.status === 200, 'GET /history returned 200 for User 2');
  assert(Array.isArray(hist2Data.investigations), 'User 2 history is an array');
  assert(hist2Data.investigations.length === 1, `User 2 history has exactly 1 investigation (got ${hist2Data.investigations.length})`);
  assert(hist2Data.investigations[0].id === inv2Row.id, `User 2 history contains Investigation 2 (${inv2Row.id})`);
  assert(!hist2Data.investigations.some(i => i.id === inv1Row.id), `CRITICAL: User 2 history DOES NOT contain User 1's Investigation 1 (${inv1Row.id})`);

  // ----------------------------------------------------
  // TEST 9: Database Foreign Key & Table Query Proof
  // ----------------------------------------------------
  console.log('\n--- 9. Raw PostgreSQL Database Query Proving Isolation ---');
  const dbProof = await pool.query(
    `SELECT i.id, i.user_id, u.email, u.name, i.question, i.session, i.created_at
     FROM investigations i
     JOIN users u ON i.user_id = u.id
     WHERE i.user_id IN ($1, $2)
     ORDER BY i.created_at ASC`,
    [user1Id, user2Id]
  );
  console.table(dbProof.rows);

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED! FULL DATA ISOLATION PROVEN.`);
  console.log('====================================================\n');

  await pool.end();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed with exception:', err);
  process.exit(1);
});
