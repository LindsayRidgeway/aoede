import Constants from 'expo-constants';

// Import all simplification prompts statically
import getSimplificationPrompt6 from './simplifiers/simplify6';
import getSimplificationPrompt9 from './simplifiers/simplify9';
import getSimplificationPrompt12 from './simplifiers/simplify12';
import getSimplificationPrompt15 from './simplifiers/simplify15';
import getSimplificationPrompt18 from './simplifiers/simplify18';

// Get API keys using both old and new Expo Constants paths for compatibility
const getConstantValue = (key) => {
  // Try the new path (expoConfig.extra) first - Expo SDK 46+
  if (Constants?.expoConfig?.extra && Constants.expoConfig.extra[key] !== undefined) {
    return Constants.expoConfig.extra[key];
  }
  
  // Fallback to old path (manifest.extra) - before Expo SDK 46
  if (Constants?.manifest?.extra && Constants.manifest.extra[key] !== undefined) {
    return Constants.manifest.extra[key];
  }
  
  // For Expo Go and other environments - check extra at top level
  if (Constants?.extra && Constants.extra[key] !== undefined) {
    return Constants.extra[key];
  }
  
  // Check the direct path in Constants as last resort
  if (Constants && Constants[key] !== undefined) {
    return Constants[key];
  }
  
  return null;
};

// Get API keys from Expo Constants
const anthropicKey = getConstantValue('EXPO_PUBLIC_ANTHROPIC_API_KEY');
const googleKey = getConstantValue('EXPO_PUBLIC_GOOGLE_API_KEY');
export const CORS_PROXY = getConstantValue('EXPO_PUBLIC_CORS_PROXY') || '';

// Log API key status for debugging
console.log('Anthropic API key available:', !!anthropicKey);
console.log('Google API key available:', !!googleKey);

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
      console.error("Missing Anthropic API key. Please check your app.json configuration.");
      return null;
    }
    
    // Additional validation to ensure we have usable source text
    if (!sourceText) {
      console.error("Source text is missing");
      return null;
    }
    
    if (typeof sourceText !== 'string') {
      console.error("Source text is not a string, type is:", typeof sourceText);
      return null;
    }
    
    if (sourceText.length < 10) {
      console.error("Source text is too short, length:", sourceText.length);
      return null;
    }
    
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    
    console.log(`Sending text to Claude API for processing with reading level: ${readingLevel}`);
    console.log("Text length:", sourceText.length);
    console.log("Sample:", sourceText.substring(0, 50) + "...");
    
    // Get the appropriate prompt function based on reading level
    const getPrompt = getPromptForLevel(readingLevel);
    const prompt = getPrompt(sourceText, targetLanguage, readingLevel);
    
    console.log("Sending request to Claude API...");
    
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
      console.error(`API error (status ${response.status}):`, responseText);
      return null;
    }
    
    const data = await response.json();
    console.log("Response received from Claude API for processing");
    
    if (data.error) {
      console.error("Claude API error:", data.error);
      return null;
    }
    
    if (!data.content || data.content.length === 0) {
      console.error("No content in Claude API response");
      return null;
    }
    
    // Get the processed text
    const processedText = data.content[0].text.trim();
    console.log("Processed text received:", processedText.substring(0, 100) + "...");
    
    // Remove any potential intro sentence like "Here are simplified sentences in Russian:"
    const cleanedText = processedText.replace(/^[^\.!?]*(?:[\.!?]|:)\s*/i, '');
    
    return cleanedText;
  } catch (error) {
    console.error("Error processing source text:", error);
    return null;
  }
};

// Translate a batch of sentences using Google Translate
export const translateBatch = async (textArray, sourceLang, targetLang) => {
  if (!googleKey) {
    console.error("Google API Key Missing");
    return textArray; // Return original text as fallback
  }
  
  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
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
    
    const data = await response.json();
    
    // Handle API errors
    if (data.error) {
      console.error("Translation API error:", data.error);
      return textArray; // Return original text as fallback
    }
    
    if (!data.data?.translations || data.data.translations.length === 0) {
      console.error("No translations in response:", data);
      return textArray; // Return original text as fallback
    }
    
    return data.data.translations.map(t => t.translatedText);
  } catch (error) {
    console.error("Translation failed:", error);
    return textArray; // Return original text as fallback
  }
};