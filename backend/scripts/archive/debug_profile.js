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
  console.log('\n=== Profile Debug ===\n');

  // Register user
  const email = `debug${Date.now()}@test.com`;
  const regBody = JSON.stringify({ name: 'Debug User', email, password: 'Test1234!' });
  const r1 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(regBody) }
  }, regBody);
  console.log('Register status:', r1.status);
  console.log('Register body:', r1.body.slice(0, 300));

  const setCookie = r1.headers['set-cookie'];
  const cookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
  console.log('Cookie:', cookie.slice(0, 60));

  // Get profile
  const r2 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/profile', method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('\nProfile status:', r2.status);
  console.log('Profile body:', r2.body.slice(0, 500));

  // Add address
  const addrBody = JSON.stringify({
    fullName: 'Debug User',
    phone: '9876543210',
    addressLine: '123 Debug St',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
    isDefault: true
  });
  const r3 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/addresses', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(addrBody), Cookie: cookie }
  }, addrBody);
  console.log('\nAdd address status:', r3.status);
  console.log('Add address body:', r3.body.slice(0, 500));

  // List addresses
  const r4 = await req({
    hostname: 'localhost', port: 5000,
    path: '/api/users/addresses', method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('\nList addresses status:', r4.status);
  console.log('List addresses body:', r4.body.slice(0, 500));
}

run().catch(e => console.error('Error:', e.message));
