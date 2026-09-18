/**
 * FrontWing Security Hardening Verification Suite
 * Tests Rate Limiting, Input Validation, CORS Restrictions, and Error Handling Leakage.
 */

const http = require('http');
const { app } = require('../src/index');

let server;
let port;
let baseUrl;

async function startTestServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Security Test] Test server running on ${baseUrl}`);
      resolve();
    });
  });
}

function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof Buffer)) {
    body = JSON.stringify(body);
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: body || undefined,
  });

  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    data,
    rawText: text
  };
}

async function runTests() {
  console.log('=================================================================');
  console.log('FRONTWING SECURITY HARDENING VERIFICATION AUDIT');
  console.log('=================================================================\n');

  await startTestServer();
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} - ${extra}`);
      failed++;
    }
  }

  // INTENTIONAL FAILURE FOR GITHUB ACTIONS CI PIPELINE VERIFICATION
  assert(
    'INTENTIONAL_CI_FAILURE: Verifying GitHub Actions CI blocks broken builds',
    false,
    'This test failure was intentionally added to verify that the pipeline fails loudly and blocks merge.'
  );

  try {
    // -------------------------------------------------------------
    // PART 1: RATE LIMITING
    // -------------------------------------------------------------
    console.log('--- PART 1: RATE LIMITING VERIFICATION ---');

    // 1.1 Auth Rate Limiter (Limit is 10 requests per 15 min)
    console.log('Sending rapid requests to /auth/login to trigger rate limit (limit = 10)...');
    let hitRateLimit = false;
    let rateLimitStatus = 0;
    let rateLimitPayload = null;

    for (let i = 1; i <= 13; i++) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: `test_${i}@example.com`, password: 'password123' }
      });
      if (res.status === 429) {
        hitRateLimit = true;
        rateLimitStatus = res.status;
        rateLimitPayload = res.data;
        console.log(`  [Rate Limit Hit] Request #${i} returned 429 Too Many Requests`);
        break;
      }
    }

    assert(
      'Auth endpoint enforces 429 Too Many Requests after threshold',
      hitRateLimit && rateLimitStatus === 429,
      `Status was ${rateLimitStatus}`
    );
    assert(
      'Rate limit response contains safe error message and status',
      rateLimitPayload && rateLimitPayload.error && rateLimitPayload.error.includes('Too many authentication attempts'),
      JSON.stringify(rateLimitPayload)
    );

    // -------------------------------------------------------------
    // PART 2: INPUT VALIDATION & SANITIZATION
    // -------------------------------------------------------------
    console.log('\n--- PART 2: INPUT VALIDATION & SANITIZATION AUDIT ---');

    // 2.1 Malformed JSON payload handling
    const malformedRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "test@example.com", "password": invalid_json'
    });
    assert(
      'Malformed JSON payload rejected with 400 Bad Request',
      malformedRes.status === 400,
      `Status was ${malformedRes.status}`
    );
    assert(
      'Malformed JSON returns clean error message with NO stack trace leak',
      malformedRes.data && malformedRes.data.error === 'Malformed JSON payload in request body' && !malformedRes.rawText.includes('SyntaxError:'),
      malformedRes.rawText
    );

    // 2.2 Question Length Limits on /engineer/query (Max 2,000 chars)
    const { generateToken } = require('../src/utils/jwt');
    const testToken = generateToken({ id: '00000000-0000-0000-0000-000000000001', email: 'auditor@frontwing.f1' });

    const oversizedQuestion = 'A'.repeat(2500);
    const oversizedRes = await request('/engineer/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`
      },
      body: { question: oversizedQuestion }
    });
    assert(
      'Oversized question (>2,000 chars) rejected with 400 Bad Request',
      oversizedRes.status === 400,
      `Status was ${oversizedRes.status}`
    );
    assert(
      'Oversized question error explains character limit',
      oversizedRes.data && JSON.stringify(oversizedRes.data).includes('exceeds maximum length limit of 2,000 characters'),
      JSON.stringify(oversizedRes.data)
    );

    // 2.3 Empty/Too short question (<2 chars)
    const tooShortRes = await request('/engineer/query', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${testToken}` },
      body: { question: '?' }
    });
    assert(
      'Too short question (<2 chars) rejected with 400 Bad Request',
      tooShortRes.status === 400,
      `Status was ${tooShortRes.status}`
    );

    // 2.4 Control character sanitization
    const controlCharsQuestion = 'Analyze\x00 lap\x07 telemetry\x1F degradation';
    const { sanitizeText } = require('../src/middleware/validation.middleware');
    const sanitized = sanitizeText(controlCharsQuestion);
    assert(
      'Control characters cleanly stripped from text inputs',
      sanitized === 'Analyze lap telemetry degradation',
      `Got: "${sanitized}"`
    );

    // 2.5 Ghost battle driver selection validation (< 2 drivers)
    const invalidDriversRes = await request('/ghost-battle/data', {
      method: 'POST',
      body: { session_id: '2024_dutch_gp_race', driver_ids: ['VER'] }
    });
    assert(
      'Ghost battle with < 2 drivers rejected with 400 Bad Request',
      invalidDriversRes.status === 400,
      `Status was ${invalidDriversRes.status}`
    );

    // 2.6 History invalid UUID path param
    const invalidUuidRes = await request('/history/not-a-valid-uuid', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${testToken}` }
    });
    assert(
      'Invalid UUID path parameter rejected with 400 Bad Request',
      invalidUuidRes.status === 400,
      `Status was ${invalidUuidRes.status}`
    );

    // -------------------------------------------------------------
    // PART 4: CORS CONFIGURATION
    // -------------------------------------------------------------
    console.log('\n--- PART 4: CORS RESTRICTION AUDIT ---');

    // 4.1 Allowed Origin (Frontend dev server)
    const allowedOriginRes = await request('/health', {
      headers: { 'Origin': 'http://localhost:5173' }
    });
    assert(
      'Allowed origin http://localhost:5173 receives CORS header',
      allowedOriginRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
      `Origin header was: ${allowedOriginRes.headers['access-control-allow-origin']}`
    );

    // 4.2 Production CORS Restriction Simulation
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const maliciousOriginRes = await request('/health', {
        headers: { 'Origin': 'http://evil-tracker-site.com' }
      });
      assert(
        'Disallowed origin in production is rejected (403 Forbidden)',
        maliciousOriginRes.status === 403 && maliciousOriginRes.data?.error?.includes('CORS policy violation'),
        `Status was ${maliciousOriginRes.status}: ${JSON.stringify(maliciousOriginRes.data)}`
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }

    // -------------------------------------------------------------
    // PART 5: ERROR HANDLING & INFORMATION LEAKAGE
    // -------------------------------------------------------------
    console.log('\n--- PART 5: ERROR HANDLING & INFO LEAKAGE AUDIT ---');

    // 5.1 Trigger error with missing auth token
    const unauthRes = await request('/me');
    assert(
      'Unauthenticated request returns 401 with clean error',
      unauthRes.status === 401 && unauthRes.data?.error === 'Access token required',
      JSON.stringify(unauthRes.data)
    );

    // 5.2 Confirm no stack traces or server paths in client responses
    const allResponses = [malformedRes, oversizedRes, tooShortRes, invalidDriversRes, invalidUuidRes, unauthRes];
    let hasLeak = false;
    for (const r of allResponses) {
      const txt = r.rawText || '';
      if (txt.includes('node_modules') || txt.includes('\\backend\\src') || txt.includes('/backend/src') || txt.includes('at Object.<anonymous>')) {
        hasLeak = true;
        console.error('LEAK DETECTED in response:', txt);
      }
    }
    assert(
      'Zero stack traces, internal paths, or file locations leaked in error responses',
      !hasLeak,
      'Internal stack trace found in client payload'
    );

  } finally {
    await stopTestServer();
  }

  console.log('\n=================================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
