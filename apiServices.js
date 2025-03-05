import Constants from "expo-constants";

// Get API keys from app.json
const anthropicKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const googleKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY;
const CORS_PROXY = Constants.expoConfig?.extra?.EXPO_PUBLIC_CORS_PROXY || "";

// Step 1: Fetch the source text
export const fetchSourceText = async (title) => {
  try {
    if (!anthropicKey) {
      console.error("Missing Anthropic API key");
      return null;
    }
    
    console.log(`Using CORS proxy: ${CORS_PROXY}`);
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2000,
        messages: [
          { 
            role: "user", 
            content: `Please provide EXACTLY the first 10 sentences from the beginning of "${title}" in its original language. I need the EXACT opening sentences that appear in the published work, in sequential order, starting with the very first sentence.

IMPORTANT:
1. Start with the VERY FIRST sentence of the book/story
2. Provide EXACTLY 10 consecutive sentences in their original order
3. DO NOT skip any sentences or paragraphs
4. DO NOT include any intro sentences, explanations, or commentary
5. DO NOT summarize or paraphrase - I need the EXACT text
6. DO NOT include chapter headings, title, or any text that isn't part of the narrative

Format your response exactly as follows:

ORIGINAL_TEXT:
[First sentence of the work]
[Second sentence of the work]
[Third sentence of the work]
...and so on for exactly 10 sentences

LANGUAGE: [language code]

Remember: I need the literal beginning of the text, starting with the first actual sentence.`
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
    console.log("Response received from Claude API for source text");
    
    if (data.error) {
      console.error("Claude API error:", data.error);
      return null;
    }
    
    if (!data.content || data.content.length === 0) {
      console.error("No content in Claude API response");
      return null;
    }
    
    // Get the response text
    const fullResponse = data.content[0].text.trim();
    console.log("Source text response received:", fullResponse.substring(0, 100) + "...");
    
    // Extract the original text
    const originalTextMatch = fullResponse.match(/ORIGINAL_TEXT:\s*([\s\S]*?)(?=\s*LANGUAGE:|$)/);
    if (originalTextMatch && originalTextMatch[1]) {
      return originalTextMatch[1].trim();
    }
    
    // If we couldn't extract the original text, return the whole response
    return fullResponse;
  } catch (error) {
    console.error("Error fetching source text:", error);
    return null;
  }
};

// Step 2: Process the source text - translate and simplify
export const processSourceText = async (sourceText, targetLanguage) => {
  try {
    if (!anthropicKey) {
      console.error("Missing Anthropic API key");
      return null;
    }
    
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    const ageGroup = 6; // Hardcoded to 6 as requested
    
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
            content: `Here are some consecutive sentences from a book that I need simplified:

${sourceText}

Please translate these sentences into ${targetLanguage} if they're not already in that language, and then simplify them so that a ${ageGroup}-year-old native speaker of ${targetLanguage} could understand them.

CRITICAL REQUIREMENTS:
1. Maintain the EXACT SAME SEQUENCE of content and events as the original text
2. Do not skip any information or jump ahead in the story
3. Each original sentence should be represented in your simplified version
4. Preserve the narrative flow and order of events exactly as they appear

Guidelines for simplification:
1. Replace complex vocabulary with simpler words
2. Break down sentences longer than 10-12 words into multiple shorter sentences
3. Use vocabulary a ${ageGroup}-year-old would know
4. Eliminate abstract concepts
5. Focus on concrete, visual descriptions
6. Split sentences with multiple clauses into separate sentences
7. Target sentence length: 4-8 words, maximum 10 words
8. Each simplified sentence must be clear and comprehensible to a ${ageGroup}-year-old

Please aim to create about 25-30 simplified sentences total from these original sentences.

VERY IMPORTANT: Format your response by listing ONLY ONE simplified sentence per line. Each sentence must be a complete thought ending with a period, question mark, or exclamation point. DO NOT include any explanations or commentary.`
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