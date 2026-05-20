import axios from 'axios';

const BACKEND_URL = 'https://lumina-api-2573.onrender.com';
// Let's test the backend directly since Vercel NEXT_PUBLIC_API_URL points to it.

async function testApp() {
  console.log('Testing Health Endpoint...');
  try {
    const health = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Health OK:', health.data);
  } catch (e) {
    console.log('❌ Health Failed:', e.message);
  }

  const randomUser = `testuser_${Date.now()}`;
  let token = null;

  console.log('\nTesting Registration...');
  try {
    const reg = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, {
      email: `${randomUser}@example.com`,
      username: randomUser,
      password: 'Password123!',
      displayName: 'Test User'
    });
    console.log('✅ Registration OK. User:', reg.data.data.user.username);
    token = reg.data.data.accessToken;
  } catch (e) {
    console.log('❌ Registration Failed:', e.response?.data || e.message);
  }

  if (token) {
    console.log('\nTesting Analytics Overview (BigInt Fix)...');
    try {
      const analytics = await axios.get(`${BACKEND_URL}/api/v1/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Analytics OK:', analytics.data.data);
    } catch (e) {
      console.log('❌ Analytics Failed:', e.response?.data || e.message);
    }
  }
}

testApp();
