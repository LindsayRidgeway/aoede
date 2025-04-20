// textProcessing.js - Helper functions for text processing
import { translateBatch } from './apiServices';

// Simple regex-based language code detection
export const detectLanguageCode = (input) => {
if (__DEV__) console.log("MODULE 0098: textProcessing.detectLanguageCode");
  if (!input) {
    if (__DEV__) console.log('No language input provided');
    return 'en'; // Default to English
  }
  
  // Normalize input to lowercase and trim
  const normalizedInput = input.toLowerCase().trim();
  
  // If input is already a valid language code (2-3 chars), return it
  if (/^[a-z]{2,3}(-[a-z]{2,4})?$/i.test(normalizedInput)) {
    return normalizedInput;
  }
  
  // If input is a language name, try to convert it to a code
  // We're only storing commonly used languages for efficiency
  const languageMap = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh',
    'korean': 'ko',
    'arabic': 'ar',
    'dutch': 'nl',
    'swedish': 'sv',
    'finnish': 'fi',
    'norwegian': 'no',
    'danish': 'da',
    'polish': 'pl',
    'turkish': 'tr',
    'czech': 'cs',
    'hungarian': 'hu',
    'greek': 'el',
    'hebrew': 'he',
    'thai': 'th',
    'ukrainian': 'uk',
    'vietnamese': 'vi',
    'hindi': 'hi',
    'romanian': 'ro'
  };
  
  // Check if the normalized input is directly in our map
  if (languageMap[normalizedInput]) {
    return languageMap[normalizedInput];
  }
  
  // Otherwise see if it's a partial match
  for (const [name, code] of Object.entries(languageMap)) {
    if (name.includes(normalizedInput) || normalizedInput.includes(name)) {
      return code;
    }
  }
  
  // If all else fails, just return the input - the API will often
  // handle common language names correctly
  return normalizedInput;
};

// Parse text into sentences
export const parseIntoSentences = (text) => {
if (__DEV__) console.log("MODULE 0099: textProcessing.parseIntoSentences");
  if (!text) {
    return [];
  }
  
  // First split by newlines - these are natural sentence breaks
  let sentences = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // If we got a reasonable number of sentences, return them
  if (sentences.length >= 3) {
    return sentences;
  }
  
  // Otherwise, try to split by sentence endings
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  const matches = text.match(sentenceRegex);
  
  if (matches && matches.length > 0) {
    sentences = matches
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }
  
  // Last resort - just return lines split by punctuation
  sentences = text.split(/[.!?]/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => part + '.');
  
  return sentences;
};
