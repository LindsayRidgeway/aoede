import { translateBatch } from './apiServices';

// Parse the processed text into sentences
export const parseIntoSentences = (text) => {
  if (!text) return [];
  
  // First, remove any obvious HTML tags that might have survived
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Split by newlines first
  let lines = text.split('\n')
                 .map(line => line.trim())
                 .filter(line => line.length > 0);
  
  // Initialize an array for the final sentences
  let sentences = [];
  
  // Define a simple sentence-splitting regex
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  
  // Apply regex to each line
  for (let line of lines) {
    const matches = line.match(sentenceRegex);
    
    if (matches && matches.length > 0) {
      sentences.push(...matches);
    } else if (line.length > 10) {
      // If we couldn't split it and it's reasonably long, use the whole line
      sentences.push(line);
    }
  }
  
  // If we don't have many sentences from line processing, try direct text processing
  if (sentences.length < 10) {
    const matches = text.match(sentenceRegex);
    if (matches && matches.length > sentences.length) {
      sentences = matches;
    }
  }
  
  // Ensure each sentence ends with a punctuation mark
  sentences = sentences.map(sentence => {
    // Clean up the sentence
    sentence = sentence.trim();
    
    // If the sentence doesn't end with a punctuation mark, add a period
    if (!/[.!?]$/.test(sentence)) {
      return sentence + '.';
    }
    return sentence;
  })
  .filter(sentence => {
    // Remove very short sentences or likely HTML fragments
    return sentence.length > 10 && 
           !sentence.includes('©') &&
           !sentence.includes('®');
  });
  
  return sentences;
};

// Translate sentences using Google Translate
export const translateSentences = async (sentences, sourceLang, targetLang) => {
  if (!sentences || sentences.length === 0) return [];
  if (sourceLang === targetLang) return sentences;
  
  const translatedSentences = [];
  
  // Detect language code for source language if needed
  const sourceLanguageCode = detectLanguageCode(sourceLang);
  
  // Batch translations to avoid too many API calls
  const batchSize = 10;
  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);
    
    try {
      const translations = await translateBatch(batch, sourceLanguageCode, targetLang);
      translatedSentences.push(...translations);
    } catch (error) {
      console.error(`Error translating batch ${i} to ${i + batchSize}:`, error);
      // If translation fails, use original sentences as fallback
      translatedSentences.push(...batch);
    }
  }
  
  return translatedSentences;
};

// Basic language code detection
export const detectLanguageCode = (languageName) => {
  const languageMap = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'dutch': 'nl',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh',
    'korean': 'ko',
    'arabic': 'ar',
    'hindi': 'hi',
    'turkish': 'tr',
    'vietnamese': 'vi',
    'thai': 'th',
    'indonesian': 'id',
    'hebrew': 'he',
    'polish': 'pl',
    'swedish': 'sv',
    'greek': 'el',
    'czech': 'cs',
    'danish': 'da',
    'finnish': 'fi',
    'norwegian': 'no',
    'romanian': 'ro',
    'hungarian': 'hu'
  };
  
  const lowercaseName = languageName.toLowerCase();
  
  // Try to find an exact match
  if (languageMap[lowercaseName]) {
    return languageMap[lowercaseName];
  }
  
  // If it's a 2-letter code already, return it
  if (/^[a-z]{2}$/.test(lowercaseName)) {
    return lowercaseName;
  }
  
  // Try to find a partial match
  for (const [key, value] of Object.entries(languageMap)) {
    if (lowercaseName.includes(key) || key.includes(lowercaseName)) {
      return value;
    }
  }
  
  // Default to English if no match found
  return 'en';
};