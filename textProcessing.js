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
      // If translation fails, use original sentences as fallback
      translatedSentences.push(...batch);
    }
  }
  
  return translatedSentences;
};

// Enhanced language code detection with more localized language names support
export const detectLanguageCode = (languageName) => {
  if (!languageName) return "";
  
  // Normalize the input (lowercase, trim spaces)
  const normalizedInput = languageName.toLowerCase().trim();
  
  // Comprehensive language map including native language names
  const languageMap = {
    // English language names
    'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de', 'italian': 'it',
    'portuguese': 'pt', 'dutch': 'nl', 'russian': 'ru', 'japanese': 'ja', 'chinese': 'zh',
    'korean': 'ko', 'arabic': 'ar', 'hindi': 'hi', 'turkish': 'tr', 'vietnamese': 'vi',
    'thai': 'th', 'indonesian': 'id', 'hebrew': 'he', 'polish': 'pl', 'swedish': 'sv',
    'greek': 'el', 'czech': 'cs', 'danish': 'da', 'finnish': 'fi', 'norwegian': 'no',
    'romanian': 'ro', 'hungarian': 'hu', 'ukrainian': 'uk', 'bulgarian': 'bg', 'croatian': 'hr',
    'serbian': 'sr', 'slovak': 'sk', 'slovenian': 'sl', 'latvian': 'lv', 'lithuanian': 'lt',
    'estonian': 'et', 'albanian': 'sq', 'macedonian': 'mk', 'icelandic': 'is', 'maltese': 'mt',
    
    // Native language names
    'español': 'es', 'français': 'fr', 'deutsch': 'de', 'italiano': 'it', 'português': 'pt',
    'nederlands': 'nl', 'русский': 'ru', '日本語': 'ja', '中文': 'zh', '한국어': 'ko',
    'العربية': 'ar', 'हिन्दी': 'hi', 'türkçe': 'tr', 'tiếng việt': 'vi', 'ไทย': 'th',
    'bahasa indonesia': 'id', 'עברית': 'he', 'polski': 'pl', 'svenska': 'sv', 'ελληνικά': 'el',
    'čeština': 'cs', 'dansk': 'da', 'suomi': 'fi', 'norsk': 'no', 'română': 'ro',
    'magyar': 'hu', 'українська': 'uk', 'български': 'bg', 'hrvatski': 'hr', 'српски': 'sr',
    'slovenčina': 'sk', 'slovenščina': 'sl', 'latviešu': 'lv', 'lietuvių': 'lt', 'eesti': 'et',
    
    // Common alternate names
    'american': 'en', 'british': 'en', 'chinese simplified': 'zh', 'chinese traditional': 'zh',
    'mandarin': 'zh', 'cantonese': 'zh', 'castilian': 'es', 'castellano': 'es', 'brazilian': 'pt',
    'brazilian portuguese': 'pt', 'português brasileiro': 'pt', 'farsi': 'fa', 'persian': 'fa',
    'flemish': 'nl', 'vlaams': 'nl', 'afrikaans': 'af', 'hebrew': 'he', 'aramaic': 'arc',
    'yiddish': 'yi', 'arabic': 'ar', 'hindi': 'hi', 'bengali': 'bn', 'punjabi': 'pa',
    'swahili': 'sw', 'latinoamericano': 'es', 'latin american spanish': 'es',
    
    // Short forms that might be entered
    'eng': 'en', 'spa': 'es', 'fre': 'fr', 'fra': 'fr', 'ger': 'de', 'deu': 'de', 'ita': 'it',
    'por': 'pt', 'dut': 'nl', 'nld': 'nl', 'rus': 'ru', 'jpn': 'ja', 'chi': 'zh', 'zho': 'zh',
    'kor': 'ko', 'ara': 'ar', 'hin': 'hi', 'tur': 'tr', 'vie': 'vi', 'tha': 'th', 'ind': 'id',
    'heb': 'he', 'pol': 'pl', 'swe': 'sv'
  };
  
  // Direct lookup
  if (languageMap[normalizedInput]) {
    return languageMap[normalizedInput];
  }
  
  // If it's a 2-letter code already, return it
  if (/^[a-z]{2}$/.test(normalizedInput)) {
    return normalizedInput;
  }
  
  // Try to find a partial match
  for (const [key, value] of Object.entries(languageMap)) {
    if (normalizedInput.includes(key) || key.includes(normalizedInput)) {
      return value;
    }
  }
  
  // Default to English if no match found
  return 'en';
};