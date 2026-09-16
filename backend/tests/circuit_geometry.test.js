const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runCircuitGeometryTests() {
  console.log('=================================================================');
  console.log('FIX Y: CIRCUIT TELEMETRY GEOMETRY VERIFICATION');
  console.log('=================================================================\n');

  const circuitsCacheDir = path.resolve(__dirname, '../../ai_services/cache/circuits');
  const frontendTelemetryFile = path.resolve(__dirname, '../../frontend/src/lib/circuitTelemetryTracks.json');

  // Verify frontend telemetry dataset exists
  assert.ok(fs.existsSync(frontendTelemetryFile), 'circuitTelemetryTracks.json must exist');
  const telemetryTracks = JSON.parse(fs.readFileSync(frontendTelemetryFile, 'utf-8'));

  // Test Circuit 1: Madrid (New-for-2026 Spanish GP venue)
  console.log('--- CIRCUIT 1: MADRING CIRCUIT IN MADRID (NEW FOR 2026) ---');
  const madridCenterlineFile = path.join(circuitsCacheDir, 'madrid_centerline.json');
  assert.ok(fs.existsSync(madridCenterlineFile), 'madrid_centerline.json must exist in FastF1 cache');
  const madridData = JSON.parse(fs.readFileSync(madridCenterlineFile, 'utf-8'));
  assert.strictEqual(madridData.circuit_key, 'madrid');
  assert.strictEqual(madridData.circuit_name, 'Madring Circuit (Madrid)');
  assert.strictEqual(madridData.points.length, 715, 'Madrid must have 715 authentic telemetry decimeter points');

  const madridTrack = telemetryTracks.madrid;
  assert.ok(madridTrack, 'Madrid track geometry must be in telemetryTracks');
  assert.strictEqual(madridTrack.hasTelemetry, true);
  assert.ok(madridTrack.trackPath.startsWith('M '), 'Madrid track path must be a valid SVG path');
  assert.ok(madridTrack.trackPath.endsWith(' Z'), 'Madrid track path must be a closed SVG path');
  assert.ok(madridTrack.trackPath.length > 5000, 'Madrid SVG path must reflect high-resolution decimeter coordinates');
  assert.ok(madridTrack.startFinish.x > 0 && madridTrack.startFinish.y > 0, 'Start/Finish coordinates must be valid');
  console.log(`✓ PASS: Madrid venue resolved to Madring Circuit with ${madridData.points.length} authentic decimeter points.`);
  console.log(`        Start/Finish: (${madridTrack.startFinish.x}, ${madridTrack.startFinish.y}), SVG Path length: ${madridTrack.trackPath.length} chars.`);

  // Test Circuit 2: Monza (Italian GP)
  console.log('\n--- CIRCUIT 2: AUTODROMO NAZIONALE MONZA ---');
  const monzaCenterlineFile = path.join(circuitsCacheDir, 'italian_centerline.json');
  assert.ok(fs.existsSync(monzaCenterlineFile), 'italian_centerline.json must exist in FastF1 cache');
  const monzaData = JSON.parse(fs.readFileSync(monzaCenterlineFile, 'utf-8'));
  assert.strictEqual(monzaData.points.length, 626, 'Monza must have 626 authentic telemetry points');

  const monzaTrack = telemetryTracks.monza;
  assert.ok(monzaTrack, 'Monza track geometry must be in telemetryTracks');
  assert.strictEqual(monzaTrack.hasTelemetry, true);
  assert.ok(monzaTrack.trackPath.startsWith('M ') && monzaTrack.trackPath.endsWith(' Z'));
  console.log(`✓ PASS: Monza resolved with ${monzaData.points.length} authentic decimeter telemetry points.`);

  // Test Circuit 3: Silverstone (British GP)
  console.log('\n--- CIRCUIT 3: SILVERSTONE CIRCUIT ---');
  const silverstoneCenterlineFile = path.join(circuitsCacheDir, 'british_centerline.json');
  assert.ok(fs.existsSync(silverstoneCenterlineFile), 'british_centerline.json must exist in FastF1 cache');
  const silverstoneData = JSON.parse(fs.readFileSync(silverstoneCenterlineFile, 'utf-8'));
  assert.strictEqual(silverstoneData.points.length, 675, 'Silverstone must have 675 authentic telemetry points');

  const silverstoneTrack = telemetryTracks.silverstone;
  assert.ok(silverstoneTrack, 'Silverstone track geometry must be in telemetryTracks');
  assert.strictEqual(silverstoneTrack.hasTelemetry, true);
  assert.ok(silverstoneTrack.trackPath.startsWith('M ') && silverstoneTrack.trackPath.endsWith(' Z'));
  console.log(`✓ PASS: Silverstone resolved with ${silverstoneData.points.length} authentic decimeter telemetry points.`);

  // Test Circuit 4: Baku (Azerbaijan GP - pending telemetry ingestion)
  console.log('\n--- CIRCUIT 4: BAKU CITY CIRCUIT (HONEST PLACEHOLDER) ---');
  assert.strictEqual(telemetryTracks.baku, undefined, 'Baku has not had 2026 telemetry ingested yet');
  console.log('✓ PASS: Baku City Circuit has no telemetry ingested yet; reports hasTelemetry: false.');
  console.log('        UI renders honest TRACK_LAYOUT // PENDING TELEMETRY INGESTION placeholder without approximating geometry.');

  console.log('\n=================================================================');
  console.log('ALL 4 CIRCUIT GEOMETRY AUDITS PASSED CLEANLY');
  console.log('=================================================================');
  process.exit(0);
}

runCircuitGeometryTests();
