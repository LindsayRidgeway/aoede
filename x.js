const fs = require('fs');
const https = require('https');

const API_KEY = 'AIzaSyDvrAsHGvT7nurWKi3w0879zLWFYtpEgJ0';

// Change this text and languageCode to test different languages
//const text = 'Bonjour mon amour';
const text = 'Привет, как дела?';
const languageCode = 'ru-RU';
const voiceName = 'ru-RU-Standard-A';  // Try adjusting voice if needed
const speakingRate = 1.0;

const requestData = {
  input: { text },
  voice: { languageCode, name: voiceName },
  audioConfig: { audioEncoding: 'MP3', speakingRate }
};

const options = {
  hostname: 'texttospeech.googleapis.com',
  path: `/v1/text:synthesize?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.audioContent) {
        const buffer = Buffer.from(response.audioContent, 'base64');
        fs.writeFileSync('output.mp3', buffer);
        console.log('✅ MP3 saved as output.mp3');
      } else {
        console.error('❌ No audioContent:', response);
      }
    } catch (err) {
      console.error('❌ Error parsing response:', err);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(JSON.stringify(requestData));
req.end();
