import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testOpenRouter() {
  console.log('Testing OpenRouter connection with the new key...');
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a test bot.' },
          { role: 'user', content: 'Say "OpenRouter connection is successful!"' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://lumina-web-drab.vercel.app',
          'X-Title': 'Lumina'
        }
      }
    );
    console.log('✅ Success! OpenRouter Response:');
    console.log(response.data.choices[0].message.content);
  } catch (error) {
    console.log('❌ Error connecting to OpenRouter:');
    console.error(error.response?.data || error.message);
  }
}

testOpenRouter();
