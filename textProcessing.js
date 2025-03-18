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
  
  // Pattern for detecting common title formats
  const titlePattern = /^(?:(?:BOOK|Chapter|CHAPTER|Part|PART|Volume|VOLUME|Section|SECTION)\s+[IVXLCDM\d]+|Introduction|Preface|Prologue|Epilogue|Afterword|Conclusion|Appendix|Note to the Reader|Foreword)(?:\s*[-:]\s*[^\.]*)?$/i;
  
  // Process each line
  for (let line of lines) {
    // Check if the line matches a title pattern first
    if (titlePattern.test(line)) {
      // It's a title, preserve it as is and add a period if it doesn't end with punctuation
      if (!/[.!?]$/.test(line)) {
        sentences.push(line + '.');
      } else {
        sentences.push(line);
      }
      continue;
    }
    
    // Handle normal sentence splitting
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
    const matches = line.match(sentenceRegex);
    
    if (matches && matches.length > 0) {
      sentences.push(...matches);
    } else if (line.length > 5) {
      // If we couldn't split it and it's reasonably long, it might be a title or header
      // Add it as a sentence (with a period if it doesn't have ending punctuation)
      if (!/[.!?]$/.test(line)) {
        sentences.push(line + '.');
      } else {
        sentences.push(line);
      }
    }
  }
  
  // If we don't have many sentences from line processing, try direct text processing
  if (sentences.length < 10) {
    // Check if there are potential titles in the text that we should preserve
    const potentialTitles = text.match(/(?:^|\n)(?:(?:BOOK|Chapter|CHAPTER|Part|PART|Volume|VOLUME|Section|SECTION)\s+[IVXLCDM\d]+|Introduction|Preface|Prologue|Epilogue|Afterword|Note to the Reader|Foreword)(?:\s*[-:]\s*[^\.]*)?(?:\n|$)/gi);
    
    if (potentialTitles && potentialTitles.length > 0) {
      // If we found potential titles, make sure they're included
      for (let title of potentialTitles) {
        title = title.trim();
        if (title.length > 0) {
          if (!/[.!?]$/.test(title)) {
            sentences.push(title + '.');
          } else {
            sentences.push(title);
          }
        }
      }
    }
    
    // Also apply the regular sentence detection
    const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (matches && matches.length > 0) {
      // Combine with existing sentences, avoiding duplicates
      const existingSentences = new Set(sentences.map(s => s.trim()));
      for (let match of matches) {
        if (!existingSentences.has(match.trim())) {
          sentences.push(match);
        }
      }
    }
  }
  
  // Enhanced detection for chapter titles with names
  const chapterWithNameRegex = /^(?:(?:BOOK|Chapter|CHAPTER|Part|PART)\s+[IVXLCDM\d]+)\s*[:\.-]\s*(.+)/i;
  for (let i = 0; i < sentences.length; i++) {
    const chapterNameMatch = sentences[i].match(chapterWithNameRegex);
    if (chapterNameMatch && chapterNameMatch[1] && chapterNameMatch[1].length > 0) {
      // This is a chapter with a name - make sure it's properly formatted
      let chapterName = chapterNameMatch[1].trim();
      if (!/[.!?]$/.test(chapterName)) {
        chapterName += '.';
      }
      // Replace the original with properly formatted version
      sentences[i] = sentences[i].replace(chapterWithNameRegex, (match, nameGroup) => {
        return match.replace(nameGroup, chapterName);
      });
    }
  }
  
  // Ensure each sentence ends with a punctuation mark and filter out junk
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
    return sentence.length > 3 && 
           !sentence.includes('©') &&
           !sentence.includes('®');
  });
  
  return sentences;
};

// Translate sentences using Google Translate
export const translateSentences = async (sentences, sourceLang, targetLang) => {
  console.log(`[DEBUG] translateSentences called with: sourceLang=${sourceLang}, targetLang=${targetLang}`);
  console.log(`[DEBUG] Sample sentence: "${sentences[0]?.substring(0, 30)}..."`);
  
  if (!sentences || sentences.length === 0) {
    console.log(`[DEBUG] No sentences to translate, returning empty array`);
    return [];
  }
  
  // Skip translation if languages are the same
  if (sourceLang && targetLang && sourceLang.toLowerCase() === targetLang.toLowerCase()) {
    console.log(`[DEBUG] Source and target languages are identical (${sourceLang}). No translation needed.`);
    return sentences;
  }
  
  // Validation check - this is critical
  if (!sourceLang || !targetLang) {
    console.log(`[DEBUG] INVALID LANGUAGE CODES: sourceLang=${sourceLang}, targetLang=${targetLang}`);
    return sentences; // Return original sentences as fallback
  }
  
  // Force language codes to lowercase - Google API expects lowercase
  const normalizedSource = sourceLang.toLowerCase();
  const normalizedTarget = targetLang.toLowerCase();
  
  console.log(`[DEBUG] Normalized language codes: source=${normalizedSource}, target=${normalizedTarget}`);
  
  // Explicit check for Italian to see if it's being treated specially somehow
  if (normalizedSource === 'it') {
    console.log(`[DEBUG] SOURCE LANGUAGE IS ITALIAN`);
  }
  
  // Batch translations to avoid too many API calls
  const translatedSentences = [];
  const batchSize = 10;
  
  // Override console.log temporarily to get more verbose logging
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('[Translation]')) {
      args[0] = '[DEBUG] ' + args[0];
    }
    originalConsoleLog.apply(console, args);
  };
  
  try {
    // Actually perform the translation
    for (let i = 0; i < sentences.length; i += batchSize) {
      const batch = sentences.slice(i, i + batchSize);
      
      try {
        console.log(`[DEBUG] Translating batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(sentences.length/batchSize)}`);
        console.log(`[DEBUG] Calling translateBatch with: source=${normalizedSource}, target=${normalizedTarget}`);
        
        // Call the translation API
        const translations = await translateBatch(batch, normalizedSource, normalizedTarget);
        
        // DEBUG: Compare before and after translation
        if (translations && translations.length > 0) {
          console.log(`[DEBUG] Translation Example:`);
          console.log(`[DEBUG] Original: "${batch[0].substring(0, 30)}..."`);
          console.log(`[DEBUG] Translated: "${translations[0].substring(0, 30)}..."`);
          
          // Check if translation actually happened
          const unchanged = batch.every((original, index) => 
            original === translations[index]
          );
          
          if (unchanged) {
            console.log(`[DEBUG] WARNING: All sentences unchanged after translation!`);
          }
          
          translatedSentences.push(...translations);
        } else {
          console.log(`[DEBUG] Empty translation result, using original batch`);
          translatedSentences.push(...batch);
        }
      } catch (error) {
        console.log(`[DEBUG] Error translating batch: ${error.message || 'Unknown error'}`);
        console.log(`[DEBUG] Error details:`, error);
        // If translation fails, use original sentences as fallback
        translatedSentences.push(...batch);
      }
    }
  } finally {
    // Restore original console.log
    console.log = originalConsoleLog;
  }
  
  console.log(`[DEBUG] translateSentences completed with ${translatedSentences.length} sentences`);
  return translatedSentences;
};

// Detect language code - no language-specific logic
export const detectLanguageCode = (languageName) => {
  if (!languageName) return "";
  
  // Log for debugging
  console.log(`[Lang] Detecting language code for: ${languageName}`);
  
  // If the input is already a valid ISO language code, just return it
  // This covers both basic 2-letter codes and extended codes with region
  if (/^[a-z]{2}(-[a-z]{2,})?$/i.test(languageName)) {
    // Convert to lowercase for consistency
    const code = languageName.toLowerCase();
    console.log(`[Lang] Input is already a language code: ${code}`);
    return code;
  }
  
  // For anything else, just pass through
  console.log(`[Lang] Unable to convert to standard language code: ${languageName}`);
  return languageName;
};