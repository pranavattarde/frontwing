async function test() {
  const loginRes = await fetch('http://localhost:5000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@frontwing.com', password: 'password123' })
  });
  let token;
  if (loginRes.ok) {
    const d = await loginRes.json();
    token = d.token;
  } else {
    const regRes = await fetch('http://localhost:5000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost_test@frontwing.com', password: 'password123', name: 'Ghost Tester' })
    });
    const d = await regRes.json();
    token = d.token;
  }
  console.log('Token acquired:', !!token);

  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };

  // 1. Years
  const yearsRes = await fetch('http://localhost:5000/api/ghost-battle/available-years', { headers });
  const years = await yearsRes.json();
  console.log('Years response:', yearsRes.status, 'Years count:', years.years?.length, 'Years:', years.years);

  // 2. GPs
  const gpsRes = await fetch('http://localhost:5000/api/ghost-battle/available-gps?year=2024', { headers });
  const gps = await gpsRes.json();
  console.log('GPs response:', gpsRes.status, 'GPs count:', gps.gps?.length);

  // 3. Roster
  const rosterRes = await fetch('http://localhost:5000/api/ghost-battle/drivers-teams?session_id=2024_british_gp_race', { headers });
  const roster = await rosterRes.json();
  console.log('Roster response:', rosterRes.status, 'Drivers:', roster.drivers?.length, 'Teams:', roster.teams?.length);

  // 4. Server-side validation: 1 driver rejected
  const badRes = await fetch('http://localhost:5000/api/ghost-battle/data', {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: '2024_british_gp_race', driver_ids: ['HAM'] })
  });
  console.log('1-driver validation response (expected 400):', badRes.status);
  const badData = await badRes.json();
  console.log('Rejection message:', badData.message);

  // 5. Valid 2 drivers
  const dataRes = await fetch('http://localhost:5000/api/ghost-battle/data', {
    method: 'POST',
    headers,
    body: JSON.stringify({ session_id: '2024_british_gp_race', driver_ids: ['HAM', 'VER'] })
  });
  console.log('Valid data response (expected 200):', dataRes.status);
  const data = await dataRes.json();
  console.log('Circuit points:', data.circuit?.centerline?.length, 'Drivers processed:', data.drivers?.length);
  console.log('Driver 1:', data.drivers?.[0]?.code, 'Lap time:', data.drivers?.[0]?.lap_time_str);
  console.log('Driver 2:', data.drivers?.[1]?.code, 'Lap time:', data.drivers?.[1]?.lap_time_str);
}

test().catch(console.error);
