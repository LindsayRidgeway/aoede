// apiServices.js - API service functions for Aoede
import { getConstantValue, logKeyDetails } from './apiUtils';

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
  try {
    if (!anthropicKey) {
      console.log('[API] No Anthropic API key available for simplification');
      apiDebugResults.lastAnthropicAttempt = {
        error: 'No API key available',
        time: new Date().toISOString()
      };
      return null;
    }
    
    // Additional validation to ensure we have usable source text
    if (!sourceText) {
      return null;
    }
    
    if (typeof sourceText !== 'string') {
      return null;
    }
    
    if (sourceText.length < 10) {
      return null;
    }
    
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    
    // Store API call details for debugging
    apiDebugResults.lastAnthropicAttempt = {
      time: new Date().toISOString(),
      url: apiUrl,
      apiKey: anthropicKey,
      cors: CORS_PROXY
    };
    
    // Get the appropriate prompt function based on reading level
    const getPrompt = getPromptForLevel(readingLevel);
    const prompt = getPrompt(sourceText, targetLanguage, readingLevel);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 4000,
        messages: [
          { 
            role: "user", 
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.log(`[API] Anthropic API error: ${response.status} - ${responseText}`);
      
      // Store error for debugging
      apiDebugResults.lastAnthropicAttempt.error = {
        status: response.status,
        text: responseText
      };
      
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`[API] Anthropic API returned error: ${JSON.stringify(data.error)}`);
      
      // Store error for debugging
      apiDebugResults.lastAnthropicAttempt.error = data.error;
      
      return null;
    }
    
    if (!data.content || data.content.length === 0) {
      console.log('[API] No content in Anthropic API response');
      
      // Store error for debugging
      apiDebugResults.lastAnthropicAttempt.error = 'No content in response';
      
      return null;
    }
    
    // Success! Store for debugging
    apiDebugResults.lastAnthropicAttempt.success = true;
    
    // Get the processed text
    const processedText = data.content[0].text.trim();
    
    // Remove any potential intro sentence like "Here are simplified sentences in Russian:"
    const cleanedText = processedText.replace(/^[^\.!?]*(?:[\.!?]|:)\s*/i, '');
    
    return cleanedText;
  } catch (error) {
    console.log(`[API] Error in processSourceText: ${error.message}`);
    
    // Store error for debugging
    if (apiDebugResults.lastAnthropicAttempt) {
      apiDebugResults.lastAnthropicAttempt.error = error.message;
    }
    
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