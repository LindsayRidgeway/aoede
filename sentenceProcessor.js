import { 
  generateAdaptiveSentences, 
  translateAndSetSentences,
  loadNextSection,
  saveCurrentState
} from './sentenceManager';

// Handle processing of next sentence with tracking to avoid duplicates
export const handleNextSentence = async (
  sentences,
  adaptiveSentences,
  currentSentenceIndex,
  currentAdaptiveIndex,
  tooHardWords,
  sourceLanguage,
  loadProgress,
  setStudyLangSentence,
  setNativeLangSentence,
  setLoadingBook,
  setLoadProgress,
  openaiKey
) => {
  // Get module for direct state modification
  const appModule = require('./App');

  // Check if we have sentences to display
  if (!appModule.sentences || appModule.sentences.length === 0) {
    setStudyLangSentence("Error: No content available. Please load a book.");
    setNativeLangSentence("Error: No content available. Please load a book.");
    return;
  }
  
  setLoadingBook(true);
  
  try {
    // Track current sentence to ensure we don't repeat it
    let currentSentenceText = "";
    if (appModule.adaptiveSentences && appModule.adaptiveSentences.length > 0 && 
        appModule.currentAdaptiveIndex < appModule.adaptiveSentences.length) {
      currentSentenceText = appModule.adaptiveSentences[appModule.currentAdaptiveIndex];
    }
    
    // Check if we have more adaptive sentences for the current source sentence
    if (appModule.adaptiveSentences && appModule.adaptiveSentences.length > 0 && 
        appModule.currentAdaptiveIndex < appModule.adaptiveSentences.length - 1) {
      // If so, increment the adaptive index and show the next adaptive sentence
      appModule.currentAdaptiveIndex++;
      let adaptiveSentence = appModule.adaptiveSentences[appModule.currentAdaptiveIndex];
      
      // Verify we're not showing the same sentence again
      if (adaptiveSentence === currentSentenceText) {
        // Skip to the next one if possible
        if (appModule.currentAdaptiveIndex < appModule.adaptiveSentences.length - 1) {
          appModule.currentAdaptiveIndex++;
          adaptiveSentence = appModule.adaptiveSentences[appModule.currentAdaptiveIndex];
        } else {
          // Otherwise move to the next source sentence
          if (appModule.currentSentenceIndex < appModule.sentences.length) {
            const nextSourceSentence = appModule.sentences[appModule.currentSentenceIndex];
            appModule.currentSentenceIndex++;
            
            // Generate new adaptive sentences
            appModule.adaptiveSentences = await generateAdaptiveSentences(nextSourceSentence, tooHardWords, openaiKey);
            appModule.currentAdaptiveIndex = 0;
            
            await saveCurrentState();
            
            if (appModule.adaptiveSentences.length > 0) {
              await translateAndSetSentences(
                appModule.adaptiveSentences[0], 
                sourceLanguage, 
                setStudyLangSentence, 
                setNativeLangSentence
              );
              setLoadingBook(false);
              return;
            } else {
              await translateAndSetSentences(
                nextSourceSentence, 
                sourceLanguage, 
                setStudyLangSentence, 
                setNativeLangSentence
              );
              setLoadingBook(false);
              return;
            }
          }
        }
      }
      
      // Save state
      await saveCurrentState();
      
      // Translate and display
      await translateAndSetSentences(
        adaptiveSentence, 
        sourceLanguage, 
        setStudyLangSentence, 
        setNativeLangSentence
      );
    } else {
      // We've finished the current adaptive sentences, move to the next source sentence
      if (appModule.currentSentenceIndex < appModule.sentences.length) {
        const nextSourceSentence = appModule.sentences[appModule.currentSentenceIndex];
        appModule.currentSentenceIndex++;
        
        // Generate adaptive sentences for this source sentence
        appModule.adaptiveSentences = await generateAdaptiveSentences(nextSourceSentence, tooHardWords, openaiKey);
        appModule.currentAdaptiveIndex = 0;
        
        // Save state
        await saveCurrentState();
        
        // Translate and display the first adaptive sentence
        if (appModule.adaptiveSentences.length > 0) {
          await translateAndSetSentences(
            appModule.adaptiveSentences[0], 
            sourceLanguage, 
            setStudyLangSentence, 
            setNativeLangSentence
          );
        } else {
          // Fallback if no adaptive sentences were generated
          await translateAndSetSentences(
            nextSourceSentence, 
            sourceLanguage, 
            setStudyLangSentence, 
            setNativeLangSentence
          );
        }
      } else {
        // We've reached the end of available sentences, attempt to load the next section
        // Keep current sentence visible while loading - don't modify setStudyLangSentence or setNativeLangSentence
        // The UI will show a loading indicator separately
        
        // Load the next section directly (no background process)
        const moreContentAvailable = await loadNextSection(setLoadingBook);
        
        if (moreContentAvailable) {
          // Reset sentence index to continue from the first new sentence
          appModule.currentSentenceIndex = appModule.sentences.length - 1;
          
          // Process the next sentence
          await handleNextSentence(
            appModule.sentences,
            appModule.adaptiveSentences,
            appModule.currentSentenceIndex,
            appModule.currentAdaptiveIndex,
            tooHardWords,
            sourceLanguage,
            loadProgress,
            setStudyLangSentence,
            setNativeLangSentence,
            setLoadingBook,
            setLoadProgress,
            openaiKey
          );
        } else {
          // No more content available, loop back to beginning
          appModule.currentSentenceIndex = 0;
          
          if (appModule.sentences.length > 0) {
            // Generate adaptive sentences for the first source sentence
            const firstSourceSentence = appModule.sentences[0];
            appModule.adaptiveSentences = await generateAdaptiveSentences(firstSourceSentence, tooHardWords, openaiKey);
            appModule.currentAdaptiveIndex = 0;
            
            // Save state
            await saveCurrentState();
            
            // Translate and display the first adaptive sentence
            if (appModule.adaptiveSentences.length > 0) {
              await translateAndSetSentences(
                appModule.adaptiveSentences[0], 
                sourceLanguage, 
                setStudyLangSentence, 
                setNativeLangSentence
              );
            } else {
              await translateAndSetSentences(
                firstSourceSentence, 
                sourceLanguage, 
                setStudyLangSentence, 
                setNativeLangSentence
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in handleNextSentence:", error);
    setStudyLangSentence("Error generating sentence.");
    setNativeLangSentence("Error generating sentence.");
  } finally {
    setLoadingBook(false);
  }
};