import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchBookTextFromChatGPT } from './api';
import { detectedLanguageCode } from './listeningSpeed';
import Constants from "expo-constants";

// State variables to track position in text
let sourceText = "";
let currentSentenceIndex = 0;
let sentences = [];
let knownWords = new Set();

// OpenAI key from config
const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

// Load the saved state from AsyncStorage
export const loadGeneratorState = async () => {
  try {
    // Load known words
    const savedKnownWords = await AsyncStorage.getItem('knownWords');
    if (savedKnownWords) {
      knownWords = new Set(JSON.parse(savedKnownWords));
    }
    
    // Load source text
    const savedSourceText = await AsyncStorage.getItem('sourceText');
    if (savedSourceText) {
      sourceText = savedSourceText;
      sentences = splitIntoSentences(sourceText);
    }
    
    // Load current position
    const savedIndex = await AsyncStorage.getItem('currentSentenceIndex');
    if (savedIndex) {
      currentSentenceIndex = parseInt(savedIndex, 10);
    }
    
    return {
      knownWords: Array.from(knownWords),
      position: currentSentenceIndex,
      hasSource: sourceText.length > 0
    };
  } catch (error) {
    return {
      knownWords: [],
      position: 0,
      hasSource: false
    };
  }
};

// Save the current state to AsyncStorage
export const saveGeneratorState = async () => {
  try {
    await AsyncStorage.setItem('knownWords', JSON.stringify(Array.from(knownWords)));
    await AsyncStorage.setItem('sourceText', sourceText);
    await AsyncStorage.setItem('currentSentenceIndex', currentSentenceIndex.toString());
  } catch (error) {
    // Handle silently
  }
};

// Update known words based on user feedback
export const updateKnownWords = async (words) => {
  // Add words to the known words set
  words.forEach(word => knownWords.add(word.toLowerCase()));
  await saveGeneratorState();
  return Array.from(knownWords);
};

// Remove words from known words set
export const removeFromKnownWords = async (words) => {
  // Remove words from the known words set
  words.forEach(word => knownWords.delete(word.toLowerCase()));
  await saveGeneratorState();
  return Array.from(knownWords);
};

// Load new source material
export const loadSourceMaterial = async (query) => {
  try {
    const result = await fetchBookTextFromChatGPT(query);
    sourceText = result.text;
    sentences = splitIntoSentences(sourceText);
    currentSentenceIndex = 0;
    await saveGeneratorState();
    return true;
  } catch (error) {
    return false;
  }
};

// Split text into sentences
const splitIntoSentences = (text) => {
  // Basic sentence splitting - can be improved
  return text.split(/(?<=[.!?])\s+/);
};

// Generate next adaptive sentence
export const generateNextSentence = async () => {
  if (!sourceText || sentences.length === 0) {
    return { sentence: "", success: false };
  }
  
  // Get the next sentence from the source
  let sourceSentence = "";
  if (currentSentenceIndex < sentences.length) {
    sourceSentence = sentences[currentSentenceIndex];
    currentSentenceIndex++;
  } else {
    // Loop back to the beginning if we've reached the end
    currentSentenceIndex = 0;
    sourceSentence = sentences[0];
  }
  
  await saveGeneratorState();
  
  // If we have no known words yet, just return the source sentence
  if (knownWords.size === 0) {
    return { 
      sentence: sourceSentence,
      success: true,
      original: true
    };
  }
  
  // Make sure the sentence is in the study language
  const targetLang = detectedLanguageCode || "en";
  
  // Generate adaptive sentence based on the source and known words
  const adaptiveSentence = await generateAdaptiveSentence(sourceSentence, targetLang);
  return {
    sentence: adaptiveSentence,
    success: true,
    original: adaptiveSentence === sourceSentence
  };
};

// Use AI to generate an adaptive sentence
const generateAdaptiveSentence = async (sourceSentence, targetLang) => {
  try {
    // Prepare the prompt for the AI
    const knownWordsArray = Array.from(knownWords);
    
    // Analyze the source sentence to see if it already fits our criteria
    const words = sourceSentence.split(/\s+/);
    const unknownWordsInSource = words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
      return cleanWord.length > 0 && !knownWords.has(cleanWord);
    });
    
    // If the source sentence already has 0-1 unknown words, use it directly
    if (unknownWordsInSource.length <= 1) {
      return sourceSentence;
    }
    
    // If the source sentence is short (≤ 6 words), use it directly
    if (words.length <= 6) {
      return sourceSentence;
    }
    
    // Otherwise, use AI to generate an adaptive sentence
    const prompt = `
      You are helping a language learner by generating simplified sentences for listening practice.
      
      Here is the list of words the user already knows:
      ${knownWordsArray.join(', ')}
      
      Original sentence: "${sourceSentence}"
      
      Please adapt this sentence according to these rules:
      1. The sentence should contain AT MOST ONE unknown word (not in the known words list)
      2. If you need to break the original sentence into multiple shorter sentences, do so
      3. Each sentence should be no longer than 6 words if it contains an unknown word
      4. Preserve the original sentence structure and style where possible (don't default to SVO)
      5. You may simplify unknown words when necessary
      6. IMPORTANT: Don't create sentences in SVO (Subject-Verb-Object) format unless the original was in that format
      7. The output MUST be in the ${targetLang} language
      
      Return ONLY the simplified sentence(s) in the ${targetLang} language, nothing else.
    `;
    
    // Call the AI API
    const response = await fetchSentenceFromAI(prompt);
    
    return response;
  } catch (error) {
    // If anything goes wrong, return the original sentence
    return sourceSentence;
  }
};

// Make the actual API call to get an adaptive sentence
const fetchSentenceFromAI = async (prompt) => {
  try {
    // For now, we'll use the same API as for book fetching
    // This will be replaced with a more specific implementation
    const requestBody = {
      model: "gpt-3.5-turbo", // Using GPT-3.5 for cost efficiency
      messages: [
        { role: "system", content: "You are a language learning assistant that simplifies sentences for beginners." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.3 // Lower temperature for more consistent results
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
      throw new Error("No response from AI");
    }
    
    return data.choices[0].message.content.trim();
  } catch (error) {
    throw error;
  }
};