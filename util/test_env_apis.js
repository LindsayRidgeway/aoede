// test_env_apis.js
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// GOOGLE TTS
async function testGoogleTTS() {
  const text = 'Bonjour';
  const lang = 'fr';
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`;

  const payload = {
    input: { text },
    voice: { languageCode: lang, ssmlGender: 'NEUTRAL' },
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const response = await axios.post(url, payload);
    const buffer = Buffer.from(response.data.audioContent, 'base64');
    const filePath = './google_test_output.mp3';
    fs.writeFileSync(filePath, buffer);
    console.log('✅ Google TTS succeeded. MP3 saved to:', filePath);
  } catch (error) {
    console.error('❌ Google TTS failed:', error.response?.data || error.message);
  }
}

// CLAUDE HAIKU
async function testAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello in French' }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );

    const reply = response.data?.content?.[0]?.text || '(no reply text)';
    console.log('✅ Anthropic (Haiku) response:', reply);
  } catch (error) {
    console.error('❌ Anthropic request failed:', error.response?.data || error.message);
  }
}

(async () => {
  console.log('\n🔍 Testing Google TTS...');
  await testGoogleTTS();

  console.log('\n🔍 Testing Anthropic (Haiku)...');
  await testAnthropic();
})();