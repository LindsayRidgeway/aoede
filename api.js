import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { splitIntoSentences } from './textUtils';

// Get API keys and CORS proxy from app.json
const anthropicKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const googleKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY;
const CORS_PROXY = Constants.expoConfig?.extra?.EXPO_PUBLIC_CORS_PROXY || "";

// Maximum number of sequential book sections to fetch
const MAX_SECTIONS = 5;

// Track the current book and section number
let currentBookTitle = "";
let currentSectionNumber = 0;

// Initialize book retrieval
export const fetchBookTextFromChatGPT = async (query) => {
  try {
    if (!anthropicKey) {
      console.error("Missing Anthropic API key");
      return { text: "⚠ Anthropic API Key Missing", language: "en" };
    }

    // Reset state for new book request
    if (query !== currentBookTitle) {
      currentBookTitle = query;
      currentSectionNumber = 0;
      
      // Clear stored sections for new book
      await AsyncStorage.removeItem('bookSections');
    }

    // Fetch the first section immediately
    const firstSection = await fetchBookSection(query, 1);
    
    // Store first section details
    const sections = [{
      text: firstSection.text,
      language: firstSection.language
    }];
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('bookSections', JSON.stringify(sections));
    await AsyncStorage.setItem('currentBookTitle', query);
    
    return firstSection;
  } catch (error) {
    console.error("Error in fetchBookTextFromChatGPT:", error);
    return { text: "⚠ Book fetch failed", language: "en" };
  }
};

// Fetch a specific section of the book
export const fetchBookSection = async (bookTitle, sectionNumber) => {
  try {
    if (!anthropicKey) {
      console.error("Missing Anthropic API key");
      return { text: "⚠ Anthropic API Key Missing", language: "en" };
    }

    console.log(`Fetch book section: ${bookTitle}, section ${sectionNumber}`);
    console.log(`Using CORS proxy: ${CORS_PROXY}`);

    // Check if we need direct request or proxy
    const apiUrl = `${CORS_PROXY}https://api.anthropic.com/v1/messages`;
    console.log(`Full API URL: ${apiUrl}`);

    // Use CORS proxy to avoid CORS issues
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
            content: `You retrieve sections of books in their original language. For section ${sectionNumber}, provide several paragraphs (at least 500 words if available) from "${bookTitle}" or a book of that genre. 
            
            If this is section 1, start from the beginning. If it's a later section, continue where the previous section would have left off.
            
            Respond with ONLY the text content, followed by the detected two-letter ISO language code (e.g., 'fr', 'de', 'ru') on the last line. The language code must be alone on the last line and contain only the two-letter code.` 
          }
        ]
      })
    });

    // Check if response is ok
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`API error (status ${response.status}):`, responseText);
      return { 
        text: `⚠ Book fetch failed: API returned status ${response.status}`, 
        language: "en" 
      };
    }

    const data = await response.json();

    if (data.error) {
      console.error("Claude API error:", data.error);
      return { text: `⚠ Book fetch failed: ${data.error.message}`, language: "en" };
    }

    if (!data.content || data.content.length === 0) {
      return { text: "⚠ Book fetch failed: No content in response", language: "en" };
    }

    const fullResponse = data.content[0].text.trim();
    const parts = fullResponse.split("\n");

    if (parts.length < 2) {
      return { text: "⚠ Book fetch failed: Invalid response format", language: "en" };
    }

    // Get the language code from the last line
    let detectedLanguage = parts[parts.length - 1].trim().toLowerCase();
    detectedLanguage = detectedLanguage.replace(/[^a-z]/g, "");
    
    if (!/^[a-z]{2}$/i.test(detectedLanguage)) {
      detectedLanguage = "en";
    }

    // Extract text (everything except the last line with the language code)
    let text = parts.slice(0, -1).join("\n").trim();

    return { text, language: detectedLanguage };
  } catch (error) {
    console.error("Error fetching book section:", error);
    return { text: `⚠ Book fetch failed: ${error.message}`, language: "en" };
  }
};

// Function to get the next section of the current book
export const fetchNextBookSection = async () => {
  try {
    // Retrieve stored book sections
    const storedSectionsStr = await AsyncStorage.getItem('bookSections');
    const storedBookTitle = await AsyncStorage.getItem('currentBookTitle');
    
    if (!storedSectionsStr || !storedBookTitle) {
      return null; // No book data available
    }
    
    const storedSections = JSON.parse(storedSectionsStr);
    
    // Check if we've already reached the maximum number of sections
    if (storedSections.length >= MAX_SECTIONS) {
      return null; // Maximum sections already retrieved
    }
    
    // Fetch the next section
    const nextSectionNumber = storedSections.length + 1;
    const nextSection = await fetchBookSection(storedBookTitle, nextSectionNumber);
    
    // Check if the next section has meaningful content (at least 100 chars)
    if (nextSection.text.length < 100) {
      return null; // No more content available
    }
    
    // Add to stored sections
    storedSections.push({
      text: nextSection.text,
      language: nextSection.language
    });
    
    // Save updated sections
    await AsyncStorage.setItem('bookSections', JSON.stringify(storedSections));
    
    return nextSection;
  } catch (error) {
    console.error("Error fetching next book section:", error);
    return null;
  }
};

// Get all available book text (combines all fetched sections)
export const getAllBookText = async () => {
  try {
    const storedSectionsStr = await AsyncStorage.getItem('bookSections');
    
    if (!storedSectionsStr) {
      return { text: "", language: "en" };
    }
    
    const storedSections = JSON.parse(storedSectionsStr);
    
    if (storedSections.length === 0) {
      return { text: "", language: "en" };
    }
    
    // Combine all section texts
    const combinedText = storedSections.map(section => section.text).join("\n\n");
    
    // Use the language of the first section
    const language = storedSections[0].language;
    
    return { text: combinedText, language };
  } catch (error) {
    console.error("Error getting all book text:", error);
    return { text: "", language: "en" };
  }
};

// Enhanced Google Translate API Integration with retry & error handling
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text) return "";
  if (sourceLang === targetLang) return text;

  // For logging purposes
  const textPreview = text.substring(0, 50) + (text.length > 50 ? "..." : "");
  console.log(`Translating from ${sourceLang} to ${targetLang}: "${textPreview}"`);

  try {
    if (!googleKey) {
      console.error("Google API Key Missing");
      return "⚠ Google API Key Missing";
    }

    // Ensure we have valid language codes
    const validSourceLang = sourceLang || "auto";
    const validTargetLang = targetLang || "en";

    // First attempt: direct translation
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source: validSourceLang,
          target: validTargetLang,
          format: "text"
        })
      }
    );

    const data = await response.json();

    // Handle API errors
    if (data.error) {
      console.error("Translation API error:", data.error);
      
      // If the error is related to the source language, try with auto-detection
      if (data.error.message && data.error.message.includes("language")) {
        console.log("Retrying with auto-detected source language");
        
        const retryResponse = await fetch(
          `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              q: text,
              target: validTargetLang,
              format: "text"
            })
          }
        );
        
        const retryData = await retryResponse.json();
        
        if (!retryData.data?.translations || retryData.data.translations.length === 0) {
          return "⚠ Translation failed";
        }
        
        return retryData.data.translations[0].translatedText;
      }
      
      return "⚠ Translation failed";
    }

    if (!data.data?.translations || data.data.translations.length === 0) {
      console.error("No translations in response:", data);
      return "⚠ Translation failed";
    }

    const translatedText = data.data.translations[0].translatedText;
    const resultPreview = translatedText.substring(0, 50) + (translatedText.length > 50 ? "..." : "");
    console.log(`Translation result: "${resultPreview}"`);
    
    return translatedText;
  } catch (error) {
    console.error("Translation failed:", error);
    return "⚠ Translation failed";
  }
};