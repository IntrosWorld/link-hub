const fetch = require('node-fetch'); // You might need to install node-fetch if not present, or use built-in fetch in newer Node

const BASE_URL = 'http://localhost:3000';

async function testProtectedEndpoint(method, endpoint, body = null) {
    console.log(`Testing ${method} ${endpoint} without token...`);
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(`${BASE_URL}${endpoint}`, options);

        if (res.status === 401) {
            console.log('✅ Success: Recieved 401 Unauthorized as expected.');
        } else {
            console.error(`❌ FAILED: Expected 401, got ${res.status}`);
        }
    } catch (err) {
        console.error('❌ Error hitting endpoint:', err);
    }
}

async function runTests() {
    console.log('--- Starting Auth Verification ---');
    await testProtectedEndpoint('POST', '/api/hubs', { handle: 'test-hub' });
    await testProtectedEndpoint('POST', '/api/links', { hubId: 1, title: 'test', url: 'http://test.com' });
    await testProtectedEndpoint('DELETE', '/api/links/1');
    await testProtectedEndpoint('GET', '/api/hubs'); // Should fail for listing

    console.log('\n--- Testing Public Endpoint ---');
    const res = await fetch(`${BASE_URL}/api/hubs/some-handle`);
    if (res.status === 404 || res.status === 200) {
        console.log(`✅ Public endpoint accessible (Status: ${res.status})`);
    } else {
        console.log(`❓ Public endpoint returned ${res.status}`);
    }
}

runTests();
