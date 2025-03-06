import { fetchSourceText, processSourceText } from './apiServices';
import { parseIntoSentences, translateSentences, detectLanguageCode } from './textProcessing';

// Load book handler
export const loadContent = async (bookId, studyLanguage, setLoadingBook, setSentences, setStudyLangSentence, 
  setNativeLangSentence, setSourceLanguage, setCurrentSentenceIndex, readingLevel = 6) => {
  
  if (!bookId || !studyLanguage) return false;
  
  setLoadingBook(true);
  
  try {
    console.log(`Loading content for book ID: "${bookId}" in language: "${studyLanguage}" with reading level: ${readingLevel}`);
    
    // Step 1: Get the original sentences from the source material
    const sourceText = await fetchSourceText(bookId);
    console.log("Source text fetched successfully");
    
    if (!sourceText || sourceText.length === 0) {
      console.error("Failed to fetch source text or no content returned");
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
      setLoadingBook(false);
      return false;
    }
    
    // Clean up the response - remove any potential explanatory text
    const cleanSourceText = sourceText.replace(/^[^A-Za-z0-9\u00C0-\u017F]+/g, '').trim();
    
    // Step 2: Process the text - translate to study language and simplify
    const processedText = await processSourceText(cleanSourceText, studyLanguage, readingLevel);
    console.log("Text processed successfully");
    
    if (!processedText || processedText.length === 0) {
      console.error("Failed to process source text or no content returned");
      setStudyLangSentence("Error processing content.");
      setNativeLangSentence("Error processing content.");
      setLoadingBook(false);
      return false;
    }
    
    // Step 3: Parse the processed text into sentences
    const simplifiedSentences = parseIntoSentences(processedText);
    console.log(`Extracted ${simplifiedSentences.length} simplified sentences`);
    
    if (simplifiedSentences.length === 0) {
      console.error("Failed to parse sentences");
      setStudyLangSentence("Error parsing sentences.");
      setNativeLangSentence("Error parsing sentences.");
      setLoadingBook(false);
      return false;
    }
    
    // Step 4: Translate each sentence to native language using Google Translate
    const translatedSentences = await translateSentences(simplifiedSentences, studyLanguage, navigator.language.split('-')[0] || "en");
    console.log(`Translated ${translatedSentences.length} sentences`);
    
    if (translatedSentences.length === 0) {
      console.error("Failed to translate sentences");
      setStudyLangSentence("Error translating sentences.");
      setNativeLangSentence("Error translating sentences.");
      setLoadingBook(false);
      return false;
    }
    
    // Create paired sentences
    const pairedSentences = [];
    const maxLength = Math.min(simplifiedSentences.length, translatedSentences.length);
    
    for (let i = 0; i < maxLength; i++) {
      pairedSentences.push({
        original: simplifiedSentences[i],
        translation: translatedSentences[i]
      });
    }
    
    // Set state with the paired sentences
    setSentences(pairedSentences);
    setSourceLanguage(detectLanguageCode(studyLanguage));
    setCurrentSentenceIndex(0);
    
    // Display first sentence
    if (pairedSentences.length > 0) {
      setStudyLangSentence(pairedSentences[0].original);
      setNativeLangSentence(pairedSentences[0].translation);
      
      // Log the first few sentences for debugging
      const sampleSize = Math.min(3, pairedSentences.length);
      for (let i = 0; i < sampleSize; i++) {
        console.log(`Sentence ${i+1}:`);
        console.log(`Original: ${pairedSentences[i].original}`);
        console.log(`Translation: ${pairedSentences[i].translation}`);
      }
      
      return true;
    } else {
      console.error("No paired sentences created");
      setStudyLangSentence("Error creating sentences.");
      setNativeLangSentence("Error creating sentences.");
      return false;
    }
  } catch (error) {
    console.error("Error loading book:", error);
    setStudyLangSentence("Error loading content.");
    setNativeLangSentence("Error loading content.");
    return false;
  } finally {
    setLoadingBook(false);
  }
};