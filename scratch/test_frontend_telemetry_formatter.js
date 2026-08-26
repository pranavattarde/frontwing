/**
 * Frontend Telemetry Formatting & Visualization Unit Test Suite
 * Tests TelemetryCard metric formatter, hover edge-cases, and comparative labels.
 */

const assert = require('assert');

// The formatVal logic from TelemetryCard.jsx
function formatVal(point, met) {
  if (!point || point[met] === undefined || point[met] === null) return "N/A";
  const raw = point[met];
  const num = typeof raw === "boolean" ? (raw ? 100 : 0) : Number(raw);
  return isNaN(num) || !isFinite(num) ? "N/A" : num.toFixed(0);
}

// Visualization label generator logic from TelemetryCard.jsx & SectorComparisonGraph.jsx
function getComparisonHeaderLabel(driverA, driverB, metric) {
  const codeA = driverA?.code || "DRIVER";
  const codeB = driverB?.code;
  const vsPart = (codeB && codeB.trim() !== "") ? ` vs ${codeB.trim()}` : "";
  return `${metric.toUpperCase()}_TRACE // ${codeA}${vsPart}`;
}

function getSectorVsLabel(driverCode, comparativeDriverCode) {
  const codeA = driverCode ? driverCode.toUpperCase() : "DRIVER";
  const codeB = comparativeDriverCode ? comparativeDriverCode.toUpperCase() : null;
  return codeB ? `${codeA} vs ${codeB}` : `${codeA} vs BENCHMARK`;
}

function runFrontendFormatterTests() {
  console.log("================================================================================");
  console.log(" FRONTEND TELEMETRY CARD FORMATTER & VISUALIZATION TEST SUITE");
  console.log("================================================================================");

  // 1. Edge Case Inputs Matrix (Requirement 6)
  const edgeCases = [
    { name: "number (float)", point: { speed: 305.4 }, met: "speed", expected: "305" },
    { name: "integer", point: { gear: 8 }, met: "gear", expected: "8" },
    { name: "zero integer", point: { speed: 0 }, met: "speed", expected: "0" },
    { name: "numeric string", point: { throttle: "98.5" }, met: "throttle", expected: "99" },

    { name: "boolean true", point: { brake: true }, met: "brake", expected: "100" },
    { name: "boolean false", point: { brake: false }, met: "brake", expected: "0" },
    { name: "null value", point: { speed: null }, met: "speed", expected: "N/A" },
    { name: "undefined value", point: { speed: undefined }, met: "speed", expected: "N/A" },
    { name: "missing key", point: {}, met: "speed", expected: "N/A" },
    { name: "null point", point: null, met: "speed", expected: "N/A" },
    { name: "undefined point", point: undefined, met: "speed", expected: "N/A" },
    { name: "NaN value", point: { speed: NaN }, met: "speed", expected: "N/A" },
    { name: "Infinity value", point: { speed: Infinity }, met: "speed", expected: "N/A" },
    { name: "-Infinity value", point: { speed: -Infinity }, met: "speed", expected: "N/A" },
    { name: "malformed object value", point: { speed: { invalid: 123 } }, met: "speed", expected: "N/A" },
    { name: "malformed array value", point: { speed: [100, 200] }, met: "speed", expected: "N/A" }
  ];

  for (const tc of edgeCases) {
    let result;
    try {
      result = formatVal(tc.point, tc.met);
    } catch (err) {
      assert.fail(`Formatter THREW an exception for ${tc.name}: ${err.message}`);
    }
    assert.strictEqual(result, tc.expected, `Mismatch for ${tc.name}: expected '${tc.expected}', got '${result}'`);
    console.log(`[PASS] Edge case '${tc.name}': returned '${result}' cleanly.`);
  }

  // 2. Multi-Point Hover Loop (Requirement 6)
  console.log("\n--- Testing Multi-Point Hover Loop across Entire Telemetry Series ---");
  const mockSeries = [
    { distanceM: 0, speed: 280.5, throttle: 100, brake: 0, gear: 7 },
    { distanceM: 50, speed: 312.0, throttle: 100, brake: false, gear: 8 },
    { distanceM: 100, speed: 180.2, throttle: 0, brake: true, gear: 4 },
    { distanceM: 150, speed: 120.0, throttle: 0, brake: 85.5, gear: 3 },
    { distanceM: 200, speed: null, throttle: undefined, brake: NaN, gear: Infinity },
    { distanceM: 250, speed: "295.4", throttle: "100", brake: 0.0, gear: "7" }
  ];

  for (let idx = 0; idx < mockSeries.length; idx++) {
    const pt = mockSeries[idx];
    for (const metric of ["speed", "throttle", "brake", "gear"]) {
      let formatted;
      assert.doesNotThrow(() => {
        formatted = formatVal(pt, metric);
      }, `Formatter threw on point ${idx} for metric ${metric}`);
      assert.strictEqual(typeof formatted, "string");
      assert.notStrictEqual(formatted, "undefined");
      assert.notStrictEqual(formatted, "NaN");
    }
  }
  console.log(`[PASS] Multi-point hover loop over ${mockSeries.length} points executed with 0 errors.`);

  // 3. Visualization Semantics & Driver Labels (Requirement 7)
  console.log("\n--- Testing Visualization Semantics & Driver Labels ---");
  
  // Case A: 2-Driver Comparison (Verstappen vs Hamilton)
  const header2Driver = getComparisonHeaderLabel({ code: "VER" }, { code: "HAM" }, "speed");
  console.log(`Header Label (2 drivers): '${header2Driver}'`);
  assert.strictEqual(header2Driver, "SPEED_TRACE // VER vs HAM");
  assert(!header2Driver.includes("VER vs BENCHMARK"));
  assert(!header2Driver.endsWith("VS"));

  const sector2Driver = getSectorVsLabel("VER", "HAM");
  console.log(`Sector Label (2 drivers): '${sector2Driver}'`);
  assert.strictEqual(sector2Driver, "VER vs HAM");

  // Case B: Single Driver (Fallback to benchmark only when comparative driver truly absent)
  const header1Driver = getComparisonHeaderLabel({ code: "VER" }, null, "speed");
  console.log(`Header Label (1 driver): '${header1Driver}'`);
  assert.strictEqual(header1Driver, "SPEED_TRACE // VER");

  const sector1Driver = getSectorVsLabel("VER", null);
  console.log(`Sector Label (1 driver): '${sector1Driver}'`);
  assert.strictEqual(sector1Driver, "VER vs BENCHMARK");

  // Regression check: no incomplete "VERSTAPPEN VS" or missing code string
  const incompleteHeader = getComparisonHeaderLabel({ code: "VER" }, { code: "" }, "speed");
  assert.strictEqual(incompleteHeader, "SPEED_TRACE // VER");

  console.log("[PASS] Visualization semantics and driver labels validated cleanly.");
  console.log("\n================================================================================");
  console.log(" ALL FRONTEND FORMATTER & VISUALIZATION TESTS PASSED 100% CLEANLY!");
  console.log("================================================================================");
}

runFrontendFormatterTests();
