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
  initialized: false
};

// Get API keys using updated function
const anthropicKey = getConstantValue('EXPO_PUBLIC_ANTHROPIC_API_KEY');
const googleKey = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');
const openaiKey = getConstantValue('EXPO_PUBLIC_OPENAI_API_KEY');
export const CORS_PROXY = getConstantValue('EXPO_PUBLIC_CORS_PROXY') || '';

// Store initial values for debugging
apiDebugResults.initialized = true;
apiDebugResults.anthropicKey = anthropicKey;
apiDebugResults.googleKey = googleKey;
apiDebugResults.corsProxy = CORS_PROXY;

// Log API keys availability (safe version)
logKeyDetails('ANTHROPIC_API_KEY', anthropicKey);
logKeyDetails('GOOGLE_API_KEY', googleKey);
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
  const openaiKey = getConstantValue('EXPO_PUBLIC_OPENAI_API_KEY');

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

  // Optimization: For reading level 18, we don't need to call the API at all
  if (readingLevel === 18) {
    // For level 18, just return the source text as-is
    // Split by periods, question marks, or exclamation points and add line breaks
    const sentenceEndings = /([.!?])\s+/g;
    const formattedText = sourceText.replace(sentenceEndings, "$1\n");
    return formattedText;
  }

  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  apiDebugResults.lastOpenAIAttempt = {
    time: new Date().toISOString(),
    url: apiUrl,
    apiKey: openaiKey
  };

  const getPrompt = getPromptForLevel(readingLevel);
  const prompt = getPrompt(sourceText, targetLanguage, readingLevel);

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
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
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

    return processedText;
  } catch (error) {
    console.log(`[API] Error in processSourceText (OpenAI): ${error.message}`);
    apiDebugResults.lastOpenAIAttempt.error = error.message;
    return null;
  }
};

// Translate a batch of sentences using Google Translate
export const translateBatch = async (textArray, sourceLang, targetLang) => {
  if (!googleKey) {
    console.log('[API] No Google API key available for translation');
    
    apiDebugResults.lastGoogleAttempt = {
      error: 'No API key available',
      time: new Date().toISOString()
    };
    
    return textArray; // Return original text as fallback
  }
  
  try {
    const apiUrl = `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`;
    
    // Store API call details for debugging
    apiDebugResults.lastGoogleAttempt = {
      time: new Date().toISOString(),
      url: apiUrl,
      apiKey: googleKey,
      sourceLang,
      targetLang
    };
    
    const response = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: textArray,
          source: sourceLang,
          target: targetLang,
          format: "text"
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[API] Google Translate API error: ${response.status} - ${errorText}`);
      
      // Store error for debugging
      apiDebugResults.lastGoogleAttempt.error = {
        status: response.status,
        text: errorText
      };
      
      return textArray; // Return original text as fallback
    }
    
    const data = await response.json();
    
    // Handle API errors
    if (data.error) {
      console.log(`[API] Google Translate API returned error: ${JSON.stringify(data.error)}`);
      
      // Store error for debugging
      apiDebugResults.lastGoogleAttempt.error = data.error;
      
      return textArray; // Return original text as fallback
    }
    
    if (!data.data?.translations || data.data.translations.length === 0) {
      console.log('[API] No translations in Google API response');
      
      // Store error for debugging
      apiDebugResults.lastGoogleAttempt.error = 'No translations in response';
      
      return textArray; // Return original text as fallback
    }
    
    // Success! Store for debugging
    apiDebugResults.lastGoogleAttempt.success = true;
    
    return data.data.translations.map(t => t.translatedText);
  } catch (error) {
    console.log(`[API] Error in translateBatch: ${error.message}`);
    
    // Store error for debugging
    if (apiDebugResults.lastGoogleAttempt) {
      apiDebugResults.lastGoogleAttempt.error = error.message;
    }
    
    return textArray; // Return original text as fallback
  }
};