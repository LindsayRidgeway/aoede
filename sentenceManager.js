import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchNextBookSection, getAllBookText, translateText } from './api';

// Split text into sentences
export const splitIntoSentences = (text) => {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
};

// Helper function to translate and set sentences in both languages
export const translateAndSetSentences = async (sentence, sourceLang, setStudyLangSentence, setNativeLangSentence) => {
  try {
    if (!sentence || sentence.trim() === "") {
      return;
    }
    
    // Get the detected language code from listeningSpeed.js
    const { detectedLanguageCode } = require('./listeningSpeed');
    
    // Translate to study language
    const studyLangCode = detectedLanguageCode || "en";
    if (sourceLang !== studyLangCode) {
      const translatedToStudy = await translateText(sentence, sourceLang, studyLangCode);
      setStudyLangSentence(translatedToStudy.replace(/^"|"$/g, ""));
    } else {
      setStudyLangSentence(sentence);
    }
    
    // Translate to user's native language
    const nativeLang = navigator.language.split('-')[0] || "en";
    if (sourceLang !== nativeLang) {
      const translatedToNative = await translateText(sentence, sourceLang, nativeLang);
      setNativeLangSentence(translatedToNative.replace(/^"|"$/g, ""));
    } else {
      setNativeLangSentence(sentence);
    }
  } catch (error) {
    console.error("Error translating sentence:", error);
    setStudyLangSentence("Error translating sentence.");
    setNativeLangSentence("Error translating sentence.");
  }
};

// Save current state
export const saveCurrentState = async () => {
  try {
    const appModule = require('./App');
    await AsyncStorage.setItem('tooHardWords', JSON.stringify(Array.from(appModule.tooHardWords)));
    await AsyncStorage.setItem('currentSentenceIndex', appModule.currentSentenceIndex.toString());
    await AsyncStorage.setItem('adaptiveSentences', JSON.stringify(appModule.adaptiveSentences));
    await AsyncStorage.setItem('currentAdaptiveIndex', appModule.currentAdaptiveIndex.toString());
  } catch (error) {
    console.error("Error saving current state:", error);
  }
};

// Load the next section of content when needed
export const loadNextSection = async (setLoadingBook) => {
  try {
    setLoadingBook(true);
    
    // Fetch the next section
    const nextSection = await fetchNextBookSection();
    
    if (nextSection && nextSection.text) {
      // Get all sections and update our text
      const allText = await getAllBookText();
      
      // Get app module for state update
      const appModule = require('./App');
      
      // Update source text
      appModule.sourceText = allText.text;
      
      // Update sentences array with new content
      appModule.sentences = splitIntoSentences(allText.text);
      
      // Save state
      await saveCurrentState();
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error loading additional section:", error);
    return false;
  } finally {
    setLoadingBook(false);
  }
};

// Generate adaptive sentences from a single source sentence
export const generateAdaptiveSentences = async (sourceSentence, knownWords, openaiKey) => {
  try {
    if (!sourceSentence || sourceSentence.trim() === "") {
      return [];
    }
    
    // Count unknown words in the source sentence
    const words = sourceSentence.split(/\s+/);
    const unknownWordsCount = countUnknownWords(words, knownWords);
    
    // If the sentence has 0-1 unknown words, return it as is (regardless of length)
    if (unknownWordsCount <= 1) {
      return [sourceSentence];
    }
    
    // For sentences with multiple unknown words, generate adaptive sentences
    return await generateAdaptiveSentencesWithAI(sourceSentence, knownWords, openaiKey);
  } catch (error) {
    console.error("Error generating adaptive sentences:", error);
    return [sourceSentence];
  }
};

// Count how many unknown words are in a sentence
const countUnknownWords = (words, knownWords) => {
  const lowerCaseKnownWords = new Set(Array.from(knownWords).map(w => w.toLowerCase()));
  
  return words.filter(word => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
    return cleanWord.length > 0 && !lowerCaseKnownWords.has(cleanWord);
  }).length;
};

// Generate adaptive sentences using AI
const generateAdaptiveSentencesWithAI = async (sourceSentence, knownWords, openaiKey) => {
  const knownWordsArray = Array.from(knownWords);
  
  const prompt = `
    Generate sentences for a language learner based on this original sentence:
    "${sourceSentence}"
    
    The learner knows these words:
    ${knownWordsArray.join(', ')}
    
    Important rules:
    1. Never include more than ONE unknown word per sentence
    2. If a sentence has zero or one unknown words, it can be any length
    3. If you must include more than one unknown word, limit the sentence to 6 words maximum
    4. Create complete, meaningful sentences - not fragments
    5. Preserve the original sentence structure where possible - do NOT default to Subject-Verb-Object format
    6. Simplify unknown words when appropriate, but don't simplify known words
    7. Return only the simplified sentences with no explanations
    
    Prioritize:
    - Sentences with zero unknown words to build confidence 
    - Maintaining natural sentence structure and flow
    - Complete, grammatical sentences
  `;
  
  try {
    // Call the AI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You create comprehensible sentences for language learners that sound like natural spoken language, not literary text. Your goal is to help the user's listening comprehension."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.4
      })
    });

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from AI");
    }
    
    // Split the response into separate sentences
    const adaptiveText = data.choices[0].message.content.trim();
    const adaptives = adaptiveText.split(/\n+/).filter(s => s.trim().length > 0);
    
    // If we get no valid sentences back, do a more mechanical approach
    if (adaptives.length === 0) {
      // Try to create at least one sentence with 0-1 unknown words
      const simpleSentence = simplifyToOneUnknownWord(sourceSentence, knownWords);
      return [simpleSentence];
    }
    
    return adaptives;
  } catch (error) {
    console.error("Error fetching from AI:", error);
    return [sourceSentence];
  }
};

// Fallback function that mechanically tries to create a sentence with at most one unknown word
const simplifyToOneUnknownWord = (sourceSentence, knownWords) => {
  const words = sourceSentence.split(/\s+/);
  const lowerCaseKnownWords = new Set(Array.from(knownWords).map(w => w.toLowerCase()));
  
  // Find unknown words
  const unknownWords = words.filter(word => {
    const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
    return cleanWord.length > 0 && !lowerCaseKnownWords.has(cleanWord);
  });
  
  if (unknownWords.length <= 1) {
    return sourceSentence; // Already meets our criteria
  }
  
  // Keep only the first unknown word, replace others with placeholders
  let result = sourceSentence;
  let foundFirst = false;
  
  for (const word of unknownWords) {
    if (!foundFirst) {
      foundFirst = true;
      continue; // Keep the first unknown word
    }
    
    // Replace other unknown words with a generic term
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(wordRegex, 'this');
  }
  
  return result;
};