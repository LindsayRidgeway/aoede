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
    if (!openaiKey) {
      return { text: "⚠ OpenAI API Key Missing", language: "en" };
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
    if (!openaiKey) {
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return { text: "⚠ Book fetch failed", language: "en" };
    }

    const fullResponse = data.choices[0].message.content.trim();
    const parts = fullResponse.split("\n");

    if (parts.length < 2) {
      return { text: "⚠ Book fetch failed", language: "en" };
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
    return { text: "⚠ Book fetch failed", language: "en" };
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

// ✅ Google Translate API Integration
export const translateText = async (text, sourceLang, targetLang) => {
  if (!text || sourceLang === targetLang) return text;

  try {
    if (!googleKey) {
      return "⚠ Google API Key Missing";
    }

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

    if (!data.data?.translations || data.data.translations.length === 0) {
      return "⚠ Translation failed";
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    return "⚠ Translation failed";
  }
};