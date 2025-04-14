// apiServices.js - API service functions for Aoede
import { getConstantValue, logKeyDetails } from './apiUtilsXXX';

// Import all simplification prompts statically
import getSimplificationPrompt6 from './simplifiers/simplify6';
import getSimplificationPrompt9 from './simplifiers/simplify9';
import getSimplificationPrompt12 from './simplifiers/simplify12';
import getSimplificationPrompt15 from './simplifiers/simplify15';
import getSimplificationPrompt18 from './simplifiers/simplify18';

// Store API call results for debugging - this will be accessible from the debug UI
export const apiDebugResults = {
  lastAnthropicAttempt: null,
  lastGoogleAttempt: null,
  lastOpenAIAttempt: null,
  initialized: false
};

// Arrays to store processed sentences
let arraySL = []; // Study Language sentences
let arrayUL = []; // User Language sentences
let indexSL = 0;  // Current index in SL array
let indexUL = 0;  // Current index in UL array

// Get API keys using updated function
const anthropicKey = getConstantValue('ANTHROPIC_API_KEY');
const googleKey = getConstantValue('GOOGLE_API_KEY');
const openaiKey = getConstantValue('OPENAI_API_KEY');
export const CORS_PROXY = getConstantValue('CORS_PROXY') || '';

// Store initial values for debugging
apiDebugResults.initialized = true;
apiDebugResults.anthropicKey = anthropicKey;
apiDebugResults.googleKey = googleKey;
apiDebugResults.openaiKey = openaiKey;
apiDebugResults.corsProxy = CORS_PROXY;

// Log API keys availability (safe version)
logKeyDetails('ANTHROPIC_API_KEY', anthropicKey);
logKeyDetails('GOOGLE_API_KEY', googleKey);
logKeyDetails('OPENAI_API_KEY', openaiKey);
logKeyDetails('CORS_PROXY', CORS_PROXY);

// Function to get the appropriate simplification prompt based on reading level
export const getPromptForLevel = (readingLevel) => {
  // Default to level 6 if not specified or invalid
  const level = readingLevel || 6;
  
  // Map of reading levels to prompt functions
  const promptMap = {
    6: getSimplificationPrompt6,
    9: getSimplificationPrompt9,
    12: getSimplificationPrompt12,
    15: getSimplificationPrompt15,
    18: getSimplificationPrompt18
  };
  
  // Return the appropriate prompt function, or default to level 6
  return promptMap[level] || getSimplificationPrompt6;
};

// Process the source text - translate and simplify
export const processSourceText = async (sourceText, targetLanguage, readingLevel = 6) => {
  // Reset the sentence arrays and indices when processing new content
  arraySL = [];
  arrayUL = [];
  indexSL = 0;
  indexUL = 0;
  
  console.log('[API] Resetting sentence arrays and indices for new content');
  
  const openaiKey = getConstantValue('OPENAI_API_KEY');

  if (!openaiKey) {
    console.log('[API] No OpenAI API key available for simplification');
    apiDebugResults.lastOpenAIAttempt = {
      error: 'No API key available',
      time: new Date().toISOString()
    };
    return null;
  }

  if (!sourceText || typeof sourceText !== 'string' || sourceText.length < 3) {
    return null;
  }

  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  apiDebugResults.lastOpenAIAttempt = {
    time: new Date().toISOString(),
    url: apiUrl,
    apiKey: openaiKey
  };

  const getPrompt = getPromptForLevel(readingLevel);
  
  // Important: The prompt expects (sourceText, bookLanguage, studyLanguage, userLanguage)
  const bookLanguage = "English"; // Source text language (likely English)
  const studyLanguage = targetLanguage; // Target language for study (e.g., Russian)
  const userLanguage = "English"; // Language for translations back to user
  
  console.log(`[API] Processing source text to ${targetLanguage} at reading level ${readingLevel}`);
  const prompt = getPrompt(sourceText, bookLanguage, studyLanguage, userLanguage);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a translation and simplification assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[API] OpenAI API error: ${response.status} - ${errorText}`);
      apiDebugResults.lastOpenAIAttempt.error = {
        status: response.status,
        text: errorText
      };
      return null;
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.log('[API] No response content from OpenAI');
      apiDebugResults.lastOpenAIAttempt.error = 'No response choices';
      return null;
    }

    apiDebugResults.lastOpenAIAttempt.success = true;
    const processedText = data.choices[0].message.content.trim();
    
    // Split the processed text into lines
    const lines = processedText.split('\n').filter(line => line.trim().length > 0);
    console.log(`[API] Successfully processed source text, received ${lines.length} lines`);
    
    // Parse the lines into SL and UL arrays
    // The format is alternating: [SL, UL, SL, UL, ...]
    for (let i = 0; i < lines.length; i++) {
      if (i % 2 === 0) {
        // Even indices (0, 2, 4...) are Study Language sentences
        arraySL.push(lines[i]);
        console.log(`[API] Added to SL[${arraySL.length-1}]: "${lines[i].substring(0, 50)}${lines[i].length > 50 ? '...' : ''}"`);
      } else {
        // Odd indices (1, 3, 5...) are User Language sentences
        arrayUL.push(lines[i]);
        console.log(`[API] Added to UL[${arrayUL.length-1}]: "${lines[i].substring(0, 50)}${lines[i].length > 50 ? '...' : ''}"`);
      }
    }
    
    // Log the final arrays
    console.log(`[API] Created arrays: SL=${arraySL.length} sentences, UL=${arrayUL.length} sentences`);
    
    // Return the processed text as before
    return processedText;
  } catch (error) {
    console.log(`[API] Error in processSourceText (OpenAI): ${error.message}`);
    apiDebugResults.lastOpenAIAttempt.error = error.message;
    return null;
  }
};

// Get the next Study Language sentence
export function getSL() {
  if (indexSL >= arraySL.length) {
    console.log(`[API] getSL: End of array reached (index=${indexSL}, length=${arraySL.length})`);
    return null;
  }
  
  const sentence = arraySL[indexSL];
  console.log(`[API] getSL[${indexSL}]: "${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}"`);
  indexSL++;
  return sentence;
}

// Get the next User Language sentence
export function getUL() {
  if (indexUL >= arrayUL.length) {
    console.log(`[API] getUL: End of array reached (index=${indexUL}, length=${arrayUL.length})`);
    return null;
  }
  
  const sentence = arrayUL[indexUL];
  console.log(`[API] getUL[${indexUL}]: "${sentence.substring(0, 50)}${sentence.length > 50 ? '...' : ''}"`);
  indexUL++;
  return sentence;
}

// For backward compatibility: when translating with GPT-4o instead of Google Translate
export const translateBatch = async (textArray, sourceLang, targetLang) => {
  // Skip translation if languages are identical
  if (sourceLang === targetLang) {
    return textArray;
  }

  console.log(`[API] translateBatch: ${sourceLang} to ${targetLang} (${textArray?.length || 0} items)`);
  
  // If array is invalid, just return it
  if (!textArray || !Array.isArray(textArray) || textArray.length === 0) {
    return textArray;
  }
  
  // Log what we've been asked to translate
  console.log(`[API] translateBatch input sample:`);
  for (let i = 0; i < Math.min(4, textArray.length); i++) {
    console.log(`[API] Input[${i}]: "${textArray[i].substring(0, 50)}${textArray[i].length > 50 ? '...' : ''}"`);
  }
  
  // If we're translating from Study Language to User Language
  if (sourceLang === 'ru' && targetLang === 'en') {
    console.log(`[API] translateBatch: Requested Russian to English, using parallel UL array`);
    
    // Return corresponding sentences from the UL array
    const result = [];
    for (let i = 0; i < Math.min(textArray.length, arrayUL.length); i++) {
      result.push(arrayUL[i]);
      console.log(`[API] Returning UL[${i}]: "${arrayUL[i].substring(0, 50)}${arrayUL[i].length > 50 ? '...' : ''}"`);
    }
    
    console.log(`[API] translateBatch: Returning ${result.length} UL sentences`);
    return result;
  }
  
  // If we're translating from User Language to Study Language
  if (sourceLang === 'en' && targetLang === 'ru') {
    console.log(`[API] translateBatch: Requested English to Russian, using parallel SL array`);
    
    // Return corresponding sentences from the SL array
    const result = [];
    for (let i = 0; i < Math.min(textArray.length, arraySL.length); i++) {
      result.push(arraySL[i]);
      console.log(`[API] Returning SL[${i}]: "${arraySL[i].substring(0, 50)}${arraySL[i].length > 50 ? '...' : ''}"`);
    }
    
    console.log(`[API] translateBatch: Returning ${result.length} SL sentences`);
    return result;
  }
  
  // For other language combinations, return the input (should never happen)
  console.log(`[API] translateBatch: Unexpected language combination, returning original`);
  return textArray;
};