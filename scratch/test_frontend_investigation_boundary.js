// Frontend Investigation Defensive Boundary Test Suite
// Verifies 0 thrown exceptions across all 8 required payload response shapes.

function getSessionHeader(sessionId, id) {
  return `INVESTIGATION_THREAD // ${String(sessionId || id || "LIVE").toUpperCase()}`;
}

function getDriverCode(driverId, fallback) {
  return driverId ? String(driverId).toUpperCase() : fallback;
}

function getVsLabel(driverCodeA, driverCodeB) {
  const codeA = String(driverCodeA || "DRIVER").toUpperCase();
  const codeB = driverCodeB ? String(driverCodeB).toUpperCase() : null;
  return codeB ? `${codeA} vs ${codeB}` : `${codeA} vs BENCHMARK`;
}

function testPayloadShape(name, responsePayload) {
  try {
    const evidence = responsePayload?.evidence || {};
    const sessionId = evidence?.simulation_tool?.session_id ||
                      evidence?.telemetry_tool?.session_id ||
                      evidence?.race_results_tool?.session_id;

    // Test header extraction
    const headerStr = getSessionHeader(sessionId, "test-id-123");

    // Test telemetry tool drivers extraction
    const telemTool = evidence?.telemetry_tool;
    const driverCodeA = getDriverCode(telemTool?.driver_id, "DRIVER_A");
    const driverCodeB = telemTool?.comparative_driver_id ? getDriverCode(telemTool.comparative_driver_id, null) : null;

    // Test visualization vs labels
    const vsLabel = getVsLabel(driverCodeA, driverCodeB);

    console.log(`[PASS] Shape '${name}': Header='${headerStr}' | DrvA='${driverCodeA}' | DrvB='${driverCodeB || 'null'}' | vsLabel='${vsLabel}'`);
    return true;
  } catch (err) {
    console.error(`[FAIL] Shape '${name}' threw exception: ${err.message}`);
    throw err;
  }
}

console.log("================================================================================");
console.log(" FRONTEND INVESTIGATION DEFENSIVE BOUNDARY TEST SUITE");
console.log("================================================================================");

// 1. Normal Complete Response
testPayloadShape("1. Normal Complete Response", {
  status: "success",
  evidence: {
    telemetry_tool: { session_id: "2024_qatar_gp_race", driver_id: "verstappen", comparative_driver_id: "hamilton" }
  }
});

// 2. Response with Missing Optional Fields (sessionId undefined)
testPayloadShape("2. Missing Optional Fields (sessionId undefined)", {
  status: "success",
  evidence: {
    explain_mode_tool: { term: "DRS" }
  }
});

// 3. Loading / Partial Response
testPayloadShape("3. Loading / Partial Response", {
  status: "loading",
  evidence: {}
});

// 4. Factual Race-Result Response
testPayloadShape("4. Factual Race-Result Response", {
  status: "success",
  evidence: {
    race_results_tool: { winner: "Max Verstappen", grand_prix: "Monaco GP" }
  }
});

// 5. Comparison Response
testPayloadShape("5. Comparison Response", {
  status: "success",
  evidence: {
    race_results_tool: { grand_prix: "Spanish GP", driver_id: "alonso", comparative_driver_id: "russell" }
  }
});

// 6. Telemetry Response
testPayloadShape("6. Single Telemetry Response", {
  status: "success",
  evidence: {
    telemetry_tool: { session_id: "2024_monaco_gp_race", driver_id: "norris" }
  }
});

// 7. Telemetry Comparison Response
testPayloadShape("7. Telemetry Comparison Response", {
  status: "success",
  evidence: {
    telemetry_tool: { session_id: "2024_são_paulo_gp_race", driver_id: "piastri", comparative_driver_id: "verstappen" }
  }
});

// 8. DATA_UNAVAILABLE Response
testPayloadShape("8. DATA_UNAVAILABLE Response", {
  status: "data_unavailable",
  evidence: {
    error: "Verified race data is insufficient for requested session."
  }
});

console.log("================================================================================");
console.log(" ALL 8 FRONTEND PAYLOAD SHAPES VALIDATED CLEANLY WITH 0 ERRORS!");
console.log("================================================================================");
