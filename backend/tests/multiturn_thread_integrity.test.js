const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { HistoryService } = require('../src/services/history.service');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/frontwing'
});

async function runMultiTurnIntegrityTest() {
  console.log('=================================================================');
  console.log('MULTI-TURN CONVERSATION THREAD INTEGRITY AUDIT (CRITICAL FIX II)');
  console.log('=================================================================\n');

  // 1. Create a dedicated test user
  const userRes = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [`test_multiturn_${Date.now()}@frontwing.test`, 'hashed_pw_test', 'MultiTurn Tester']
  );
  const testUserId = userRes.rows[0].id;
  console.log(`✓ Created test user: ${testUserId}`);

  const testInvConvId = `conv-inv-${Date.now()}`;
  const testStratConvId = `conv-strat-${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // PART 1: INVESTIGATION ROOM (1 Initial + 3 Follow-ups = 4 Turns)
    // -------------------------------------------------------------
    console.log('\n--- PART 1: INVESTIGATION ROOM MULTI-TURN THREAD INTEGRITY ---');

    const invTurns = [
      {
        q: "Why did Russell finish P4 at the 2026 Miami GP?",
        resp: {
          final_answer: "Russell executed a standard 1-stop strategy at the 2026 Miami GP, pitting on lap 20.",
          investigation_report: { "Executive Summary": "Russell finished P4 on a medium-to-hard strategy." },
          session: "2026_miami_gp_race"
        }
      },
      {
        q: "what if he pitted 5 laps earlier?",
        resp: {
          final_answer: "Simulated pit stop on Lap 15 yields net delta -16.71s with 36.46s traffic loss.",
          whatif_simulation: { analysis_summary: "Lap 15 pit stop results in P10 finish." }
        }
      },
      {
        q: "what if he pitted on 2nd lap only?",
        resp: {
          final_answer: "Simulated pit stop on Lap 2 yields net delta -51.40s with P13 finish.",
          whatif_simulation: { analysis_summary: "Lap 2 emergency stop drops car to P13." }
        }
      },
      {
        q: "what if he pitted on lap 30?",
        resp: {
          final_answer: "Simulated pit stop on Lap 30 yields net delta -14.52s with P10 finish.",
          whatif_simulation: { analysis_summary: "Lap 30 overcut yields P10 finish." }
        }
      }
    ];

    let invThreadId = null;
    for (let i = 0; i < invTurns.length; i++) {
      const turn = invTurns[i];
      const saved = await HistoryService.saveInvestigation({
        user_id: testUserId,
        question: turn.q,
        ai_response: turn.resp,
        session: "2026_miami_gp_race",
        provider_used: "gemini-2.5-flash",
        investigation_metadata: { turnIndex: i },
        conversation_id: testInvConvId
      });
      if (i === 0) {
        invThreadId = saved.id;
      }
      console.log(`  Turn ${i + 1} saved: Thread ID = ${saved.id}, conversation_id = ${saved.conversation_id}`);
    }

    // Verify DB table counts for Investigation Thread
    const invRowCount = await pool.query(
      `SELECT COUNT(*) FROM investigations WHERE conversation_id = $1 OR id = $2`,
      [testInvConvId, invThreadId]
    );
    const convTurnCount = await pool.query(
      `SELECT COUNT(*) FROM conversations WHERE conversation_id = $1`,
      [testInvConvId]
    );

    console.log(`\n  Investigation Thread Table Counts:`);
    console.log(`    investigations rows: ${invRowCount.rows[0].count} (Expected: 1)`);
    console.log(`    conversations rows:  ${convTurnCount.rows[0].count} (Expected: 4)`);

    if (parseInt(invRowCount.rows[0].count, 10) !== 1) {
      throw new Error(`FAIL: Expected exactly 1 row in investigations, found ${invRowCount.rows[0].count}`);
    }
    if (parseInt(convTurnCount.rows[0].count, 10) !== 4) {
      throw new Error(`FAIL: Expected exactly 4 rows in conversations, found ${convTurnCount.rows[0].count}`);
    }
    console.log(`  ✓ PASS: Exactly 1 thread in investigations and 4 turns in conversations`);

    // Verify Sidebar History shows EXACTLY ONE entry for this thread
    const histRes = await HistoryService.getHistory(testUserId);
    const matchingEntries = histRes.investigations.filter(it => it.conversation_id === testInvConvId || it.id === invThreadId);
    console.log(`    Sidebar history matching entries: ${matchingEntries.length} (Expected: 1)`);
    if (matchingEntries.length !== 1) {
      throw new Error(`FAIL: Expected exactly 1 sidebar history entry, found ${matchingEntries.length}`);
    }
    console.log(`  ✓ PASS: Sidebar history displays exactly ONE entry for the 4-turn thread`);

    // Verify History Loading restores all 4 turns with real content
    const loadedInv = await HistoryService.getInvestigationById(invThreadId, testUserId);
    console.log(`    Loaded turns count: ${loadedInv.turns?.length} (Expected: 4)`);
    if (!loadedInv.turns || loadedInv.turns.length !== 4) {
      throw new Error(`FAIL: Expected 4 restored turns, got ${loadedInv.turns?.length}`);
    }
    for (let i = 0; i < loadedInv.turns.length; i++) {
      const turn = loadedInv.turns[i];
      console.log(`      Turn ${i + 1}: Q: "${turn.question}"`);
      console.log(`              A: "${turn.answer.slice(0, 70)}..."`);
      if (turn.question !== invTurns[i].q) {
        throw new Error(`FAIL: Turn ${i + 1} question mismatch. Expected "${invTurns[i].q}", got "${turn.question}"`);
      }
      if (!turn.response) {
        throw new Error(`FAIL: Turn ${i + 1} response payload is missing!`);
      }
    }
    console.log(`  ✓ PASS: All 4 turns restored in chronological order with full question & answer content`);

    // -------------------------------------------------------------
    // PART 2: STRATEGY ENGINEER (1 Initial + 3 What-If Follow-ups = 4 Turns)
    // -------------------------------------------------------------
    console.log('\n--- PART 2: STRATEGY ENGINEER MULTI-TURN THREAD INTEGRITY ---');

    const stratTurns = [
      {
        q: "Why did Verstappen finish P2 at the 2024 Dutch GP?",
        resp: {
          final_answer: "Verstappen finished P2 after being overtaken by Norris on lap 18.",
          strategy_report: {
            what_happened: { narrative: "Verstappen lost lead to Norris on lap 18, pitted lap 27 on Hard." },
            why_it_happened: { narrative: "Tyre degradation on Medium compound was 0.12s/lap higher than McLaren." }
          },
          session_id: "2024_dutch_gp_race"
        }
      },
      {
        q: "What if Verstappen pitted on lap 22 at the 2024 Dutch GP?",
        resp: {
          final_answer: "Simulating pit stop on Lap 22 onto HARD yields Net Delta -25.19s with P7 finish.",
          whatif_simulation: {
            analysis_summary: "Lap 22 undercut results in P7 finish with 16.21s traffic loss."
          }
        }
      },
      {
        q: "What if Verstappen pitted on lap 35 at the 2024 Dutch GP?",
        resp: {
          final_answer: "Simulating pit stop on Lap 35 onto HARD yields Net Delta -32.75s with P8 finish.",
          whatif_simulation: {
            analysis_summary: "Lap 35 overcut results in P8 finish with 30.78s traffic loss."
          }
        }
      },
      {
        q: "What if Verstappen pitted on the 3rd lap at the 2024 Dutch GP?",
        resp: {
          final_answer: "Simulating pit stop on Lap 3 onto HARD yields Net Delta -81.57s with P13 finish.",
          whatif_simulation: {
            analysis_summary: "Lap 3 emergency stop drops car to P13."
          }
        }
      }
    ];

    let stratThreadId = null;
    for (let i = 0; i < stratTurns.length; i++) {
      const turn = stratTurns[i];
      const saved = await HistoryService.saveInvestigation({
        user_id: testUserId,
        question: turn.q,
        ai_response: turn.resp,
        session: "2024_dutch_gp_race",
        provider_used: "strategy-planner",
        investigation_metadata: {
          type: "strategy",
          query_type: i === 0 ? "strategy_analysis" : "whatif_simulation",
          turnIndex: i
        },
        conversation_id: testStratConvId
      });
      if (i === 0) {
        stratThreadId = saved.id;
      }
      console.log(`  Strat Turn ${i + 1} saved: Thread ID = ${saved.id}, conversation_id = ${saved.conversation_id}`);
    }

    // Verify DB table counts for Strategy Thread
    const stratRowCount = await pool.query(
      `SELECT COUNT(*) FROM investigations WHERE conversation_id = $1 OR id = $2`,
      [testStratConvId, stratThreadId]
    );
    const stratTurnCount = await pool.query(
      `SELECT COUNT(*) FROM conversations WHERE conversation_id = $1`,
      [testStratConvId]
    );

    console.log(`\n  Strategy Thread Table Counts:`);
    console.log(`    investigations rows: ${stratRowCount.rows[0].count} (Expected: 1)`);
    console.log(`    conversations rows:  ${stratTurnCount.rows[0].count} (Expected: 4)`);

    if (parseInt(stratRowCount.rows[0].count, 10) !== 1) {
      throw new Error(`FAIL: Expected exactly 1 row in investigations for strategy thread, found ${stratRowCount.rows[0].count}`);
    }
    if (parseInt(stratTurnCount.rows[0].count, 10) !== 4) {
      throw new Error(`FAIL: Expected exactly 4 rows in conversations for strategy thread, found ${stratTurnCount.rows[0].count}`);
    }
    console.log(`  ✓ PASS: Exactly 1 strategy thread in investigations and 4 what-if turns in conversations`);

    // Verify Sidebar History shows EXACTLY ONE entry for the strategy thread
    const histRes2 = await HistoryService.getHistory(testUserId);
    const matchingStrat = histRes2.investigations.filter(it => it.conversation_id === testStratConvId || it.id === stratThreadId);
    console.log(`    Sidebar history matching strategy entries: ${matchingStrat.length} (Expected: 1)`);
    if (matchingStrat.length !== 1) {
      throw new Error(`FAIL: Expected exactly 1 strategy entry in sidebar, found ${matchingStrat.length}`);
    }
    console.log(`  ✓ PASS: Sidebar history displays exactly ONE entry for the 4-turn strategy thread`);

    // Verify Strategy History Loading restores all 4 turns
    const loadedStrat = await HistoryService.getInvestigationById(stratThreadId, testUserId);
    console.log(`    Loaded strategy turns count: ${loadedStrat.turns?.length} (Expected: 4)`);
    if (!loadedStrat.turns || loadedStrat.turns.length !== 4) {
      throw new Error(`FAIL: Expected 4 restored strategy turns, got ${loadedStrat.turns?.length}`);
    }
    for (let i = 0; i < loadedStrat.turns.length; i++) {
      const turn = loadedStrat.turns[i];
      console.log(`      Turn ${i + 1}: Q: "${turn.question}"`);
      console.log(`              A: "${turn.answer.slice(0, 70)}..."`);
      if (turn.question !== stratTurns[i].q) {
        throw new Error(`FAIL: Turn ${i + 1} question mismatch.`);
      }
      if (!turn.response) {
        throw new Error(`FAIL: Turn ${i + 1} strategy response missing.`);
      }
    }
    console.log(`  ✓ PASS: All 4 strategy turns restored in order with full what-if reports and simulations`);

    // -------------------------------------------------------------
    // PART 3: RAW DATABASE QUERY DUMPS (FOR VERIFICATION EVIDENCE)
    // -------------------------------------------------------------
    console.log('\n--- PART 3: RAW POSTGRESQL TABLE STRUCTURE DUMP ---');
    const rawInvRows = await pool.query(
      `SELECT id, conversation_id, user_id, question, session, timestamp 
       FROM investigations 
       WHERE user_id = $1 
       ORDER BY timestamp ASC`,
      [testUserId]
    );
    console.log('\n[RAW DB] investigations (Threads in Sidebar):');
    console.table(rawInvRows.rows);

    const rawConvRows = await pool.query(
      `SELECT id, conversation_id, question, SUBSTRING(answer FROM 1 FOR 60) as answer_snippet, timestamp 
       FROM conversations 
       WHERE user_id = $1 
       ORDER BY id ASC`,
      [testUserId]
    );
    console.log('\n[RAW DB] conversations (Chronological Turns within Threads):');
    console.table(rawConvRows.rows);

    console.log('\n=================================================================');
    console.log('ALL MULTI-TURN THREAD INTEGRITY CHECKS PASSED PERFECTLY!');
    console.log('=================================================================');
  } finally {
    // Cleanup
    await pool.query(`DELETE FROM conversations WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM investigations WHERE user_id = $1`, [testUserId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
    console.log(`✓ Cleaned up test user and records.`);
    await pool.end();
  }
}

runMultiTurnIntegrityTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
