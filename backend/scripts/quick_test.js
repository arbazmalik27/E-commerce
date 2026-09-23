const http = require('http');

function req(opts, data) {
  return new Promise((res, rej) => {
    const r = http.request(opts, (resp) => {
      let body = '';
      resp.on('data', d => body += d);
      resp.on('end', () => res({ status: resp.statusCode, headers: resp.headers, body }));
    });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  let passed = 0;
  let failed = 0;

  function check(name, condition, detail = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  console.log('\n=== Profile & Address API Quick Test ===\n');

  // 1. Unauthenticated checks
  console.log('1. Auth guard checks...');
  const r1 = await req({ hostname: 'localhost', port: 5000, path: '/api/users/profile', method: 'GET' });
  check('GET /api/users/profile blocked (401)', r1.status === 401, `got ${r1.status}`);

  const r2 = await req({ hostname: 'localhost', port: 5000, path: '/api/users/addresses', method: 'GET' });
  check('GET /api/users/addresses blocked (401)', r2.status === 401, `got ${r2.status}`);

  // 2. Register user
  console.log('\n2. Registering test user...');
  const email = `quicktest${Date.now()}@test.com`;
  const regBody = JSON.stringify({ name: 'QuickTest User', email, password: 'Test1234!' });
  const r3 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) }
  }, regBody);
  check('Registration succeeds (200/201)', r3.status === 200 || r3.status === 201, `got ${r3.status}: ${r3.body.slice(0, 100)}`);

  // Extract cookie
  const setCookie = r3.headers['set-cookie'];
  const cookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
  check('Auth cookie set', !!cookie, `cookie: ${cookie.slice(0, 50)}`);

  // 3. Get profile
  console.log('\n3. Authenticated profile access...');
  const r4 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/profile', method: 'GET',
    headers: { Cookie: cookie }
  });
  check('GET /api/users/profile (200)', r4.status === 200, `got ${r4.status}: ${r4.body.slice(0, 100)}`);
  const profileData = r4.status === 200 ? JSON.parse(r4.body) : null;
  const profile = profileData && profileData.user;
  check('Profile has name and email', profile && profile.name && profile.email);

  // 4. Update profile
  console.log('\n4. Update profile name...');
  const updateBody = JSON.stringify({ name: 'Updated Name' });
  const r5 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/profile', method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody), Cookie: cookie }
  }, updateBody);
  check('PUT /api/users/profile (200)', r5.status === 200, `got ${r5.status}: ${r5.body.slice(0, 100)}`);
  const updatedData = r5.status === 200 ? JSON.parse(r5.body) : null;
  const updated = updatedData && updatedData.user;
  check('Name updated correctly', updated && updated.name === 'Updated Name');

  // 5. Add address
  console.log('\n5. Address CRUD...');
  const addrBody = JSON.stringify({
    fullName: 'Test Address User',
    phone: '9876543210',
    addressLine: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    isDefault: true
  });
  const r6 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/addresses', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(addrBody), Cookie: cookie }
  }, addrBody);
  check('POST /api/users/addresses (201)', r6.status === 201, `got ${r6.status}: ${r6.body.slice(0, 100)}`);

  // 6. List addresses
  const r7 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/addresses', method: 'GET',
    headers: { Cookie: cookie }
  });
  check('GET /api/users/addresses (200)', r7.status === 200, `got ${r7.status}`);
  const addrData = r7.status === 200 ? JSON.parse(r7.body) : {};
  const addresses = addrData.addresses || [];
  check('Address list not empty', Array.isArray(addresses) && addresses.length > 0);
  const addrId = addresses.length > 0 ? addresses[0]._id : null;

  if (addrId) {
    // 7. Edit address
    const editBody = JSON.stringify({ city: 'Delhi', state: 'Delhi', postalCode: '110001' });
    const r8 = await req({
      hostname: 'localhost', port: 5000,
      path: `/api/users/addresses/${addrId}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(editBody), Cookie: cookie }
    }, editBody);
    check('PUT /api/users/addresses/:id (200)', r8.status === 200, `got ${r8.status}: ${r8.body.slice(0, 100)}`);

    // 8. Set as default
    const r9 = await req({
      hostname: 'localhost', port: 5000,
      path: `/api/users/addresses/${addrId}/default`, method: 'PATCH',
      headers: { Cookie: cookie }
    });
    check('PATCH /api/users/addresses/:id/default (200)', r9.status === 200, `got ${r9.status}`);

    // 9. Delete address
    const r10 = await req({
      hostname: 'localhost', port: 5000,
      path: `/api/users/addresses/${addrId}`, method: 'DELETE',
      headers: { Cookie: cookie }
    });
    check('DELETE /api/users/addresses/:id (200)', r10.status === 200, `got ${r10.status}`);
  } else {
    console.log('  ⚠ Skipping edit/default/delete (no address ID)');
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Test crashed:', e.message);
  process.exit(1);
});
