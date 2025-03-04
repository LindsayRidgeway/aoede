import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';

const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;
const googleKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_API_KEY;

// Maximum number of sequential book sections to fetch
const MAX_SECTIONS = 5;

// Track the current book and section number
let currentBookTitle = "";
let currentSectionNumber = 0;

// Initialize book retrieval
export const fetchBookTextFromChatGPT = async (query) => {
  try {
    console.log("DEBUG-FBTFCGPT1: Fetching book text for query:", query);
    
    if (!openaiKey) {
      console.log("DEBUG-FBTFCGPT2: OpenAI API key missing");
      return { text: "⚠ OpenAI API Key Missing", language: "en" };
    }

    // Reset state for new book request
    if (query !== currentBookTitle) {
      console.log("DEBUG-FBTFCGPT3: New book request, resetting state");
      currentBookTitle = query;
      currentSectionNumber = 0;
      
      // Clear stored sections for new book
      await AsyncStorage.removeItem('bookSections');
      console.log("DEBUG-FBTFCGPT4: Cleared stored sections");
    }

    // Fetch the first section immediately
    console.log("DEBUG-FBTFCGPT5: Fetching first section");
    const firstSection = await fetchBookSection(query, 1);
    console.log("DEBUG-FBTFCGPT6: First section language:", firstSection.language);
    
    // Store first section details
    const sections = [{
      text: firstSection.text,
      language: firstSection.language
    }];
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('bookSections', JSON.stringify(sections));
    await AsyncStorage.setItem('currentBookTitle', query);
    console.log("DEBUG-FBTFCGPT7: Saved first section to storage");
    
    return firstSection;
  } catch (error) {
    console.error("DEBUG-FBTFCGPT-ERROR: Error in fetchBookTextFromChatGPT:", error);
    return { text: "⚠ Book fetch failed", language: "en" };
  }
};

// Fetch a specific section of the book
export const fetchBookSection = async (bookTitle, sectionNumber) => {
  try {
    console.log(`DEBUG-FBS1: Fetching section ${sectionNumber} of "${bookTitle}"`);
    
    if (!openaiKey) {
      console.log("DEBUG-FBS2: OpenAI API key missing");
      return { text: "⚠ OpenAI API Key Missing", language: "en" };
    }

    const requestBody = {
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You retrieve sections of books in their original language. For section ${sectionNumber}, provide several paragraphs (at least 500 words if available) from the requested book or genre. Respond with ONLY the text content, followed by the detected two-letter ISO language code (e.g., 'fr', 'de', 'ru') on the last line. The language code must be alone on the last line and contain only the two-letter code.` 
        },
        { 
          role: "user", 
          content: `Provide section ${sectionNumber} of "${bookTitle}" in its original language. If this is section 1, start from the beginning. If it's a later section, continue where the previous section would have left off. Include several paragraphs and end with the language code on a new line.` 
        }
      ],
      max_tokens: 4000
    };

    console.log("DEBUG-FBS3: Sending request to OpenAI");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log("DEBUG-FBS4: Received response from OpenAI");

    if (!data.choices || data.choices.length === 0) {
      console.log("DEBUG-FBS5: No choices in response:", data);
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    const fullResponse = data.choices[0].message.content.trim();
    console.log("DEBUG-FBS6: Response length:", fullResponse.length);
    
    const parts = fullResponse.split("\n");
    console.log("DEBUG-FBS7: Split into", parts.length, "parts");

    if (parts.length < 2) {
      console.log("DEBUG-FBS8: Not enough parts in response");
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    // Get the language code from the last line
    let detectedLanguage = parts[parts.length - 1].trim().toLowerCase();
    console.log("DEBUG-FBS9: Raw detected language:", detectedLanguage);
    
    detectedLanguage = detectedLanguage.replace(/[^a-z]/g, "");
    console.log("DEBUG-FBS10: Cleaned language code:", detectedLanguage);
    
    if (!/^[a-z]{2}$/i.test(detectedLanguage)) {
      console.log("DEBUG-FBS11: Invalid language code format, defaulting to 'en'");
      detectedLanguage = "en";
    }

    // Extract text (everything except the last line with the language code)
    let text = parts.slice(0, -1).join("\n").trim();
    console.log("DEBUG-FBS12: Extracted text length:", text.length);

    return { text, language: detectedLanguage };
  } catch (error) {
    console.error("DEBUG-FBS-ERROR: Error fetching book section:", error);
    return { text: "⚠ Book fetch failed", language: "en" };
  }
};

// Function to get the next section of the current book
export const fetchNextBookSection = async () => {
  try {
    console.log("DEBUG-FNBS1: Fetching next book section");
    
    // Retrieve stored book sections
    const storedSectionsStr = await AsyncStorage.getItem('bookSections');
    const storedBookTitle = await AsyncStorage.getItem('currentBookTitle');
    
    if (!storedSectionsStr || !storedBookTitle) {
      console.log("DEBUG-FNBS2: No book data available");
      return null; // No book data available
    }
    
    const storedSections = JSON.parse(storedSectionsStr);
    console.log("DEBUG-FNBS3: Found", storedSections.length, "stored sections");
    
    // Check if we've already reached the maximum number of sections
    if (storedSections.length >= MAX_SECTIONS) {
      console.log("DEBUG-FNBS4: Maximum sections already retrieved");
      return null; // Maximum sections already retrieved
    }
    
    // Fetch the next section
    const nextSectionNumber = storedSections.length + 1;
    console.log("DEBUG-FNBS5: Fetching section number", nextSectionNumber);
    
    const nextSection = await fetchBookSection(storedBookTitle, nextSectionNumber);
    console.log("DEBUG-FNBS6: Next section fetched, length:", nextSection.text.length);
    
    // Check if the next section has meaningful content (at least 100 chars)
    if (nextSection.text.length < 100) {
      console.log("DEBUG-FNBS7: No meaningful content in next section");
      return null; // No more content available
    }
    
    // Add to stored sections
    storedSections.push({
      text: nextSection.text,
      language: nextSection.language
    });
    
    // Save updated sections
    await AsyncStorage.setItem('bookSections', JSON.stringify(storedSections));
    console.log("DEBUG-FNBS8: Updated stored sections");
    
    return nextSection;
  } catch (error) {
    console.error("DEBUG-FNBS-ERROR: Error fetching next book section:", error);
    return null;
  }
};

// Get all available book text (combines all fetched sections)
export const getAllBookText = async () => {
  try {
    console.log("DEBUG-GABT1: Getting all book text");
    const storedSectionsStr = await AsyncStorage.getItem('bookSections');
    
    if (!storedSectionsStr) {
      console.log("DEBUG-GABT2: No stored sections found");
      return { text: "", language: "en" };
    }
    
    const storedSections = JSON.parse(storedSectionsStr);
    console.log("DEBUG-GABT3: Found", storedSections.length, "stored sections");
    
    if (storedSections.length === 0) {
      console.log("DEBUG-GABT4: No sections in stored data");
      return { text: "", language: "en" };
    }
    
    // Combine all section texts
    const combinedText = storedSections.map(section => section.text).join("\n\n");
    console.log("DEBUG-GABT5: Combined text length:", combinedText.length);
    
    // Use the language of the first section
    const language = storedSections[0].language;
    console.log("DEBUG-GABT6: Using language:", language);
    
    return { text: combinedText, language };
  } catch (error) {
    console.error("DEBUG-GABT-ERROR: Error getting all book text:", error);
    return { text: "", language: "en" };
  }
};

// ✅ Google Translate API Integration
export const translateText = async (text, sourceLang, targetLang) => {
  console.log(`DEBUG-TT1: Translating from ${sourceLang} to ${targetLang}`);
  console.log("DEBUG-TT2: Text to translate (first 50 chars):", text.substring(0, 50));
  
  if (!text) {
    console.log("DEBUG-TT3: Empty text, nothing to translate");
    return "";
  }
  
  if (sourceLang === targetLang) {
    console.log("DEBUG-TT4: Source and target languages match, returning original");
    return text;
  }

  try {
    if (!googleKey) {
      console.log("DEBUG-TT5: Google API Key Missing");
      return "⚠ Google API Key Missing";
    }

    console.log("DEBUG-TT6: Sending request to Google Translate API");
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${googleKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text"
        })
      }
    );

    const data = await response.json();
    console.log("DEBUG-TT7: Received response from Google Translate API");

    if (!data.data?.translations || data.data.translations.length === 0) {
      console.log("DEBUG-TT8: No translations in response:", data);
      return "⚠ Translation failed";
    }

    const translatedText = data.data.translations[0].translatedText;
    console.log("DEBUG-TT9: Translation received, length:", translatedText.length);
    console.log("DEBUG-TT10: First 50 chars of translation:", translatedText.substring(0, 50));
    
    return translatedText;
  } catch (error) {
    console.error("DEBUG-TT-ERROR: Translation failed:", error);
    return "⚠ Translation failed";
  }
};