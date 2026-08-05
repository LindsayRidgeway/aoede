// functions/aoedeApi.js — CORS-enabled version

const getSimplificationPrompt6 = require('./simplifiers/simplify6.js').default;
const getSimplificationPrompt9 = require('./simplifiers/simplify9.js').default;
const getSimplificationPrompt12 = require('./simplifiers/simplify12.js').default;
const getSimplificationPrompt15 = require('./simplifiers/simplify15.js').default;
const getSimplificationPrompt18 = require('./simplifiers/simplify18.js').default;

const fetch = require('node-fetch');
const OPENAI_SIMPLIFICATION_MODEL = 'gpt-5.6-sol';
const OPENAI_REASONING_EFFORT = 'medium';
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};
const ALLOWED_REMOTE_FETCH_HOSTS = new Set([
  'www.gutenberg.org',
  'gutenberg.org',
  'gutenberg.net.au'
]);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isTransientOpenAIStatus = (status) => [408, 409, 429, 500, 502, 503, 504].includes(status);

const callOpenAIChat = async (openaiKey, prompt, model) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    let data;

    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_completion_tokens: 800,
          reasoning_effort: OPENAI_REASONING_EFFORT,
        }),
      });

      data = await res.json();
    } catch (error) {
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
      throw error;
    }

    if ((!res.ok || data.error) && isTransientOpenAIStatus(res.status) && attempt < maxAttempts) {
      await sleep(300 * attempt);
      continue;
    }

    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `OpenAI request failed with status ${res.status}`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    return content;
  }

  throw new Error('OpenAI request failed after retries');
};

const getCharsetFromText = (text) => {
  if (!text) return null;

  const match =
    text.match(/<meta[^>]+charset=["']?\s*([a-zA-Z0-9._-]+)/i) ||
    text.match(/<meta[^>]+content=["'][^"']*charset=([a-zA-Z0-9._-]+)/i);

  return match ? match[1] : null;
};

const normalizeCharset = (charset) => {
  if (!charset) return 'utf-8';

  const normalized = charset.toLowerCase().trim();

  if (normalized === 'iso-8859-1' || normalized === 'latin1') {
    return 'windows-1252';
  }

  return normalized;
};

const decodeResponseText = async (response) => {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const headerCharset = response.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1] || null;
  const previewText = new TextDecoder('ascii').decode(bytes.slice(0, 4096));
  const metaCharset = getCharsetFromText(previewText);
  const charset = normalizeCharset(metaCharset || headerCharset);

  try {
    return new TextDecoder(charset).decode(bytes);
  } catch (error) {
    return new TextDecoder('utf-8').decode(bytes);
  }
};

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
      headers: CORS_HEADERS,
      body: "OK",
    };
  }

  try {
    switch (mode) {
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
        const result = await callOpenAIChat(openaiKey, prompt, OPENAI_SIMPLIFICATION_MODEL);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ result }),
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

      case 'fetchRemoteText': {
        const { url } = JSON.parse(event.body || '{}');
        const parsedUrl = new URL(url);

        if (!ALLOWED_REMOTE_FETCH_HOSTS.has(parsedUrl.hostname)) {
          return {
            statusCode: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: 'Remote fetch host is not allowed' }),
          };
        }

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
          },
        });

        if (!res.ok) {
          return {
            statusCode: res.status,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: `HTTP error ${res.status}: ${res.statusText}` }),
          };
        }

        const remoteText = await decodeResponseText(res);
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ result: remoteText }),
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
