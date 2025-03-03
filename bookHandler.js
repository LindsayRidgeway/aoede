import { fetchBookTextFromChatGPT } from './api';
import { splitIntoSentences, saveCurrentState, startBackgroundLoading } from './sentenceManager';
import { handleNextSentence } from './sentenceProcessor';

// Handle book loading
export const handleLoadBook = async (
  userQuery,
  setLoadingBook,
  setSourceText,
  setSourceLanguage,
  setStateVariables,
  setLoadProgress,
  customSetStudyLangSentence,
  setNativeLangSentence,
  openaiKey
) => {
  if (!userQuery) return;
  
  setLoadingBook(true);
  
  try {
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    
    // Update source text and language
    const sourceLang = language || "en";
    setSourceText(text);
    setSourceLanguage(sourceLang);
    
    // Update state variables
    const sentences = splitIntoSentences(text);
    setStateVariables(sentences, 0, [], 0);
    
    // Reset loading progress
    setLoadProgress({ sections: 1, loading: false, complete: false });
    
    // Save state
    await saveCurrentState();
    
    // Load first sentence
    if (sentences.length > 0) {
      await handleNextSentence(
        sentences, 
        [], 
        0, 
        0, 
        new Set(),
        sourceLang,
        { sections: 1, loading: false, complete: false }, 
        customSetStudyLangSentence, 
        setNativeLangSentence, 
        setLoadingBook,
        setLoadProgress,
        openaiKey
      );
    }
    
    // Start background loading of additional sections
    startBackgroundLoading(setLoadProgress);
  } catch (error) {
    console.error("Error loading book:", error);
    customSetStudyLangSentence("Error loading content.");
    setNativeLangSentence("Error loading content.");
  } finally {
    setLoadingBook(false);
  }
};

// Clear history
export const clearHistory = async (
  setShowConfirmation,
  tooHardWords,
  setTooHardWordsList,
  setHistoryWords,
  adaptiveSentences,
  currentAdaptiveIndex,
  currentSentenceIndex,
  sentences,
  sourceLanguage,
  customSetStudyLangSentence,
  setNativeLangSentence,
  openaiKey
) => {
  try {
    // Clear too-hard words
    tooHardWords.clear();
    setTooHardWordsList([]);
    
    // Clear history words
    setHistoryWords([]);
    await AsyncStorage.removeItem('historyWords');
    
    // Reset adaptive sentences
    adaptiveSentences = [];
    currentAdaptiveIndex = 0;
    
    // Save state
    await saveCurrentState();
    
    // Close confirmation dialog
    setShowConfirmation(false);
    
    // Regenerate current sentence
    if (sentences.length > 0) {
      const currentSourceIndex = Math.max(0, currentSentenceIndex - 1);
      const currentSourceSentence = sentences[currentSourceIndex];
      
      // Generate new adaptive sentences
      adaptiveSentences = await generateAdaptiveSentences(currentSourceSentence, tooHardWords, openaiKey);
      currentAdaptiveIndex = 0;
      
      // Save state
      await saveCurrentState();
      
      // Display the first adaptive sentence
      if (adaptiveSentences.length > 0) {
        await translateAndSetSentences(
          adaptiveSentences[0], 
          sourceLanguage, 
          customSetStudyLangSentence, 
          setNativeLangSentence
        );
      } else {
        await translateAndSetSentences(
          currentSourceSentence, 
          sourceLanguage, 
          customSetStudyLangSentence, 
          setNativeLangSentence
        );
      }
    }
  } catch (error) {
    console.error("Error clearing history:", error);
  }
};