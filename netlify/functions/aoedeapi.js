// functions/aoedeApi.js — CORS-enabled version

const getSimplificationPrompt6 = require('./simplifiers/simplify6.js').default;
const getSimplificationPrompt9 = require('./simplifiers/simplify9.js').default;
const getSimplificationPrompt12 = require('./simplifiers/simplify12.js').default;
const getSimplificationPrompt15 = require('./simplifiers/simplify15.js').default;
const getSimplificationPrompt18 = require('./simplifiers/simplify18.js').default;

const fetch = require('node-fetch');

const getPromptForLevel = (readingLevel) => {
  const map = {
    6: getSimplificationPrompt6,
    9: getSimplificationPrompt9,
    12: getSimplificationPrompt12,
    15: getSimplificationPrompt15,
    18: getSimplificationPrompt18,
  };
  return map[readingLevel] || getSimplificationPrompt6;
};

exports.handler = async (event, context) => {
  const { mode, text, sourceLang, targetLang, bookLang, studyLang, userLang, readingLevel, speakingRate, voiceName, languageCode } = JSON.parse(event.body || '{}');

  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "OK",
    };
  }

  try {
    switch (mode) {
      case 'translateOpenAI': {
        const prompt = `Translate the input sentence from ${sourceLang} to ${targetLang}. Return only the translated sentence, with no comments or other output. Input: ${text}`;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.3,
          }),
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: data.choices?.[0]?.message?.content || text }),
        };
      }

      case 'translateGoogle': {
        const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: data.data?.translations?.[0]?.translatedText || text }),
        };
      }

      case 'simplify': {
        const promptFn = getPromptForLevel(readingLevel);
		const prompt = promptFn({
		  sourceText: text,
		  bookLanguage: bookLang,
		  studyLanguage: studyLang,
		});
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.3,
          }),
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: data.choices?.[0]?.message?.content || null }),
        };
      }

      case 'getLanguages': {
        const res = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?key=${googleKey}&target=${targetLang}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: data.data?.languages || [] }),
        };
      }

      case 'getGoogleVoices': {
        const res = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${googleKey}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ voices: data.voices || [] }),
        };
      }

      case 'tts': {
        const ttsBody = {
          input: { text },
          voice: { languageCode, ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: speakingRate || 1.0 },
        };
        if (voiceName) ttsBody.voice.name = voiceName;

        const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ttsBody),
        });
        const data = await res.json();
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: data.audioContent || null }),
        };
      }

      default:
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ error: 'Invalid mode' }),
        };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
