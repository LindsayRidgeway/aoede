import React, { useState, useEffect } from 'react';
import { MainUI } from './UI';
import { fetchBookTextFromChatGPT, fetchNextBookSection, getAllBookText, translateText } from './api';
import { getStoredStudyLanguage, detectLanguageCode, detectedLanguageCode } from './listeningSpeed'; 
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { 
  generateAdaptiveSentences, 
  translateAndSetSentences,
  splitIntoSentences,
  saveCurrentState,
  startBackgroundLoading
} from './sentenceManager';

// Global state shared between files
export let sourceText = "";
export let currentSentenceIndex = 0;
export let sentences = [];
export let tooHardWords = new Set(); // Words that are too hard for the user
export let adaptiveSentences = [];
export let currentAdaptiveIndex = 0;

// Variables for background section loading
export let isLoadingNextSection = false;
export let needsMoreContent = false;

// OpenAI key from config
const openaiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); 
  const [nativeLangSentence, setNativeLangSentence] = useState(""); 
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [tooHardWordsList, setTooHardWordsList] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [newWordsList, setNewWordsList] = useState([]);
  const [loadProgress, setLoadProgress] = useState({ sections: 1, loading: false, complete: false });
  
  useEffect(() => {
    const initialize = async () => {
      translateLabels(setUiText);
      loadStoredSettings(setUserQuery, setSpeechRate);
      
      // Load study language first - critical for initial translations
      const language = await getStoredStudyLanguage();
      setStudyLanguage(language);
      await detectLanguageCode(language);
      
      // Load too hard words
      try {
        const savedTooHardWords = await AsyncStorage.getItem('tooHardWords');
        if (savedTooHardWords) {
          const parsedWords = JSON.parse(savedTooHardWords);
          tooHardWords = new Set(parsedWords);
          setTooHardWordsList(parsedWords);
        }
        
        // Check if we have a book already loaded
        const hasStoredBook = await AsyncStorage.getItem('bookSections');
        
        if (hasStoredBook) {
          // Get the full book text from all sections
          const bookData = await getAllBookText();
          
          if (bookData && bookData.text) {
            sourceText = bookData.text;
            setSourceLanguage(bookData.language);
            sentences = splitIntoSentences(sourceText);
            
            // Load current position
            const savedIndex = await AsyncStorage.getItem('currentSentenceIndex');
            if (savedIndex) {
              currentSentenceIndex = parseInt(savedIndex, 10);
            }
            
            // Load adaptive sentences if available
            const savedAdaptiveSentences = await AsyncStorage.getItem('adaptiveSentences');
            const savedAdaptiveIndex = await AsyncStorage.getItem('currentAdaptiveIndex');
            
            if (savedAdaptiveSentences) {
              adaptiveSentences = JSON.parse(savedAdaptiveSentences);
              if (savedAdaptiveIndex) {
                currentAdaptiveIndex = parseInt(savedAdaptiveIndex, 10);
              }
              
              // If we have adaptive sentences, use them
              if (adaptiveSentences.length > 0 && currentAdaptiveIndex < adaptiveSentences.length) {
                // Get the current adaptive sentence
                const adaptiveSentence = adaptiveSentences[currentAdaptiveIndex];
                await translateAndSetSentences(adaptiveSentence, bookData.language, setStudyLangSentence, setNativeLangSentence);
              } else {
                // Otherwise, generate new adaptive sentences
                await handleNextSentence();
              }
            } else if (sentences.length > 0) {
              // No adaptive sentences yet, but we have source sentences
              await handleNextSentence();
            }
            
            // Start background loading of additional sections
            startBackgroundLoading(setLoadProgress);
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    
    initialize();
  }, []);

  // Extract new words from current sentence
  useEffect(() => {
    if (studyLangSentence) {
      // Extract words from the sentence
      const words = studyLangSentence
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Filter to only show words that haven't been marked as too hard
      const lowerCaseTooHardWords = new Set(tooHardWordsList.map(w => w.toLowerCase()));
      const newWords = words.filter(word => 
        !lowerCaseTooHardWords.has(word.toLowerCase())
      );
      
      // Update new words list
      setNewWordsList([...new Set(newWords)]);
    }
  }, [studyLangSentence, tooHardWordsList]);
  
  // Toggle speak function
  const toggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakSentenceWithPauses(studyLangSentence, listeningSpeed, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };
  
  // Handle book loading
  const handleLoadBook = async () => {
    if (!userQuery) return;
    
    setLoadingBook(true);
    
    try {
      // Fetch book text
      const { text, language } = await fetchBookTextFromChatGPT(userQuery);
      
      // Set source text and language
      sourceText = text;
      const sourceLang = language || "en";
      setSourceLanguage(sourceLang);
      
      // Split into sentences
      sentences = splitIntoSentences(sourceText);
      currentSentenceIndex = 0;
      
      // Reset adaptive sentences
      adaptiveSentences = [];
      currentAdaptiveIndex = 0;
      
      // Reset loading progress
      setLoadProgress({ sections: 1, loading: false, complete: false });
      
      // Save state
      await saveCurrentState();
      
      // Generate first adaptive sentence
      if (sentences.length > 0) {
        await handleNextSentence();
      }
      
      // Start background loading of additional sections
      startBackgroundLoading(setLoadProgress);
    } catch (error) {
      console.error("Error loading book:", error);
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle next sentence
  const handleNextSentence = async () => {
    // Check if we have sentences to display
    if (sentences.length === 0) {
      console.log("No sentences available");
      setStudyLangSentence("Error: No content available. Please load a book.");
      setNativeLangSentence("Error: No content available. Please load a book.");
      return;
    }
    
    setLoadingBook(true);
    
    try {
      // Check if we have more adaptive sentences for the current source sentence
      if (adaptiveSentences.length > 0 && currentAdaptiveIndex < adaptiveSentences.length - 1) {
        // If so, increment the adaptive index and show the next adaptive sentence
        currentAdaptiveIndex++;
        const adaptiveSentence = adaptiveSentences[currentAdaptiveIndex];
        
        // Save state
        await saveCurrentState();
        
        // Translate and display
        await translateAndSetSentences(adaptiveSentence, sourceLanguage, setStudyLangSentence, setNativeLangSentence);
      } else {
        // We've finished the current adaptive sentences, move to the next source sentence
        if (currentSentenceIndex < sentences.length) {
          const nextSourceSentence = sentences[currentSentenceIndex];
          currentSentenceIndex++;
          
          // Generate adaptive sentences for this source sentence
          adaptiveSentences = await generateAdaptiveSentences(nextSourceSentence, tooHardWords, openaiKey);
          currentAdaptiveIndex = 0;
          
          // Save state
          await saveCurrentState();
          
          // Translate and display the first adaptive sentence
          if (adaptiveSentences.length > 0) {
            await translateAndSetSentences(adaptiveSentences[0], sourceLanguage, setStudyLangSentence, setNativeLangSentence);
          } else {
            // Fallback if no adaptive sentences were generated
            await translateAndSetSentences(nextSourceSentence, sourceLanguage, setStudyLangSentence, setNativeLangSentence);
          }
          
          // Check if we're getting close to the end of our content
          if (currentSentenceIndex > (sentences.length * 0.7)) {
            // Start background loading of next section if not already loading
            needsMoreContent = true;
            if (!isLoadingNextSection) {
              startBackgroundLoading(setLoadProgress);
            }
          }
        } else {
          // We've reached the end of the source text
          
          // Check if we're still loading more content
          if (isLoadingNextSection || (!loadProgress.complete && needsMoreContent)) {
            // Display loading message
            setStudyLangSentence("Loading more content...");
            setNativeLangSentence("Loading more content...");
            
            // Wait for content to load (retry in 2 seconds)
            setTimeout(() => {
              if (currentSentenceIndex >= sentences.length) {
                handleNextSentence();
              }
            }, 2000);
          } else if (loadProgress.complete) {
            // No more content to load, loop back to beginning
            currentSentenceIndex = 0;
            
            if (sentences.length > 0) {
              // Generate adaptive sentences for the first source sentence
              const firstSourceSentence = sentences[0];
              adaptiveSentences = await generateAdaptiveSentences(firstSourceSentence, tooHardWords, openaiKey);
              currentAdaptiveIndex = 0;
              
              // Save state
              await saveCurrentState();
              
              // Translate and display the first adaptive sentence
              if (adaptiveSentences.length > 0) {
                await translateAndSetSentences(adaptiveSentences[0], sourceLanguage, setStudyLangSentence, setNativeLangSentence);
              } else {
                await translateAndSetSentences(firstSourceSentence, sourceLanguage, setStudyLangSentence, setNativeLangSentence);
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
  
  // Handle word feedback
  const handleWordFeedback = async (words, isTooHard) => {
    if (isTooHard) {
      // Add words to too-hard words list
      words.forEach(word => tooHardWords.add(word.toLowerCase()));
    } else {
      // Remove words from too-hard words list
      words.forEach(word => tooHardWords.delete(word.toLowerCase()));
    }
    
    // Update state
    setTooHardWordsList(Array.from(tooHardWords));
    await saveCurrentState();
  };

  // Clear history
  const clearHistory = async () => {
    setShowConfirmation(true);
  };

  // Confirm clear history
  const confirmClearHistory = async () => {
    try {
      // Clear too-hard words
      tooHardWords.clear();
      setTooHardWordsList([]);
      
      // Also clear history words in AsyncStorage
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
        // Reset to beginning of current sentence's adaptive sentences
        const currentSourceIndex = Math.max(0, currentSentenceIndex - 1);
        const currentSourceSentence = sentences[currentSourceIndex];
        
        // Generate new adaptive sentences
        adaptiveSentences = await generateAdaptiveSentences(currentSourceSentence, tooHardWords, openaiKey);
        currentAdaptiveIndex = 0;
        
        // Save state
        await saveCurrentState();
        
        // Display the first adaptive sentence
        if (adaptiveSentences.length > 0) {
          await translateAndSetSentences(adaptiveSentences[0], sourceLanguage, setStudyLangSentence, setNativeLangSentence);
        } else {
          await translateAndSetSentences(currentSourceSentence, sourceLanguage, setStudyLangSentence, setNativeLangSentence);
        }
      }
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  // Cancel clear history
  const cancelClearHistory = () => {
    setShowConfirmation(false);
  };
  
  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
      loadBook={handleLoadBook}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}
      speakSentence={toggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      onWordFeedback={handleWordFeedback}
      knownWords={tooHardWordsList}
      newWords={newWordsList}
      clearHistory={clearHistory}
      showConfirmation={showConfirmation}
      confirmClearHistory={confirmClearHistory}
      cancelClearHistory={cancelClearHistory}
      loadProgress={loadProgress}
    />
  );
}