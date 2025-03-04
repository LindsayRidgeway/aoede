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
    
    // Get system language
    const nativeLang = navigator.language.split('-')[0] || "en";
    
    // Add some console logging to debug the translation flow
    console.log(`Translation flow:
      Source language: ${sourceLang}
      Study language: ${studyLangCode}
      System language: ${nativeLang}
      Original sentence: "${sentence.substring(0, 100)}${sentence.length > 100 ? '...' : ''}"
    `);
    
    // STUDY LANGUAGE HANDLING
    let studySentence = "";
    if (sourceLang !== studyLangCode) {
      try {
        // Verify we have a valid source language
        const validSourceLang = sourceLang || "en";
        
        // Explicitly translate from source to study language
        const translatedToStudy = await translateText(sentence, validSourceLang, studyLangCode);
        studySentence = translatedToStudy.replace(/^"|"$/g, "");
        
        console.log(`Successfully translated to study language: "${studySentence.substring(0, 100)}${studySentence.length > 100 ? '...' : ''}"`);
      } catch (translateError) {
        console.error("Error translating to study language:", translateError);
        studySentence = sentence; // Fallback to original text
      }
    } else {
      // Source is already in study language
      studySentence = sentence;
      console.log("Source is already in study language, using original");
    }
    
    // Set the study language text
    setStudyLangSentence(studySentence);
    
    // SYSTEM LANGUAGE HANDLING - COMPLETELY SEPARATE FROM STUDY LANGUAGE
    if (sourceLang !== nativeLang) {
      try {
        // Verify we have a valid source language
        const validSourceLang = sourceLang || "en";
        
        // Always translate directly from source to system language
        // This is key - we never translate from study language to system language
        const translatedToNative = await translateText(sentence, validSourceLang, nativeLang);
        const nativeSentence = translatedToNative.replace(/^"|"$/g, "");
        
        console.log(`Successfully translated to system language: "${nativeSentence.substring(0, 100)}${nativeSentence.length > 100 ? '...' : ''}"`);
        
        // Verify the translation is actually in the system language
        // If it looks like it's still in the source language, try again with a different approach
        if (isSameLanguage(nativeSentence, sentence) && validSourceLang !== nativeLang) {
          console.log("Translation may have failed - trying again with English as pivot language");
          
          // Use English as a pivot language if direct translation fails
          const translatedToEnglish = await translateText(sentence, validSourceLang, "en");
          const pivotText = translatedToEnglish.replace(/^"|"$/g, "");
          
          if (nativeLang !== "en") {
            const translatedFromEnglish = await translateText(pivotText, "en", nativeLang);
            const pivotedNativeSentence = translatedFromEnglish.replace(/^"|"$/g, "");
            setNativeLangSentence(pivotedNativeSentence);
          } else {
            setNativeLangSentence(pivotText);
          }
        } else {
          setNativeLangSentence(nativeSentence);
        }
      } catch (translateError) {
        console.error("Error translating to system language:", translateError);
        setNativeLangSentence("Translation failed. Please try again.");
      }
    } else {
      // Source is already in system language
      console.log("Source is already in system language, using original");
      setNativeLangSentence(sentence);
    }
  } catch (error) {
    console.error("Error in translation process:", error);
    setStudyLangSentence("Error translating sentence.");
    setNativeLangSentence("Error translating sentence.");
  }
};

// Helper function to check if two strings seem to be in the same language
// This is a simple heuristic, not foolproof
const isSameLanguage = (str1, str2) => {
  // Check if a significant portion of words from str1 appear in str2
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  let matchCount = 0;
  for (const word of words1) {
    if (words2.includes(word)) {
      matchCount++;
    }
  }
  
  // If more than 30% of words match, they might be in the same language
  return matchCount > 0 && (matchCount / words1.length) > 0.3;
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
  
  try {
    // Get the source language
    const { detectedLanguageCode } = require('./listeningSpeed');
    const sourceLang = detectedLanguageCode || "en";
    
    // Translate source sentence to English for better AI processing
    let englishSentence = sourceSentence;
    let needsTranslation = false;
    
    if (sourceLang !== "en") {
      needsTranslation = true;
      const translatedSentence = await translateText(sourceSentence, sourceLang, "en");
      englishSentence = translatedSentence.replace(/^"|"$/g, "");
    }
    
    // Prepare prompt with English instructions
    const prompt = `
      Generate sentences for a language learner based on this original sentence:
      "${englishSentence}"
      
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
    
    // If we need to translate back to source language
    if (needsTranslation && sourceLang !== "en") {
      // Translate each adaptive sentence back to the source language
      const translatedAdaptives = await Promise.all(
        adaptives.map(async (sentence) => {
          const translatedBack = await translateText(sentence, "en", sourceLang);
          return translatedBack.replace(/^"|"$/g, "");
        })
      );
      return translatedAdaptives;
    }
    
    // Otherwise return English adaptives (for English source)
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