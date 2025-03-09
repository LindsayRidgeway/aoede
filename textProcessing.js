import { translateBatch } from './apiServices';

// Parse the processed text into sentences
export const parseIntoSentences = (text) => {
  if (!text) return [];
  
  // First, remove any obvious HTML tags that might have survived
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Split by newlines first (Claude usually puts one sentence per line)
  let lines = text.split('\n')
                 .map(line => line.trim())
                 .filter(line => line.length > 0);
  
  // Initialize an array for the final sentences
  let sentences = [];
  
  // Define a more robust sentence-splitting regex
  // This handles periods, exclamation marks, question marks followed by space or end of string
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
  
  // Handle case where we have few or no newlines - use regex directly on text
  if (lines.length < 3) {
    const matches = text.match(sentenceRegex);
    if (matches && matches.length > 0) {
      sentences = matches.map(s => s.trim()).filter(s => s.length > 0);
    }
  } else {
    // Process each line - some lines may contain multiple sentences
    for (let line of lines) {
      // Try to split by sentence endings
      const matches = line.match(sentenceRegex);
      
      if (matches && matches.length > 0) {
        sentences.push(...matches.map(s => s.trim()).filter(s => s.length > 0));
      } else {
        // If we couldn't split it and it's reasonably long, use the whole line
        if (line.length > 10) {
          sentences.push(line);
        }
      }
    }
  }
  
  // Ensure each sentence ends with a punctuation mark and filter out very short ones
  sentences = sentences
    .map(sentence => {
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
             !sentence.includes('®') &&
             !/^[\d\s.,]+$/.test(sentence); // Filter out sentences that are just numbers
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