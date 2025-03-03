import React, { useState, useEffect } from 'react';
import { MainUI } from './UI';
import { fetchNextBookSection, getAllBookText, translateText } from './api';
import { getStoredStudyLanguage, detectLanguageCode, detectedLanguageCode } from './listeningSpeed'; 
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import { handleNextSentence } from './sentenceProcessor';
import { extractWords, processWords, handleWordFeedback } from './wordProcessor';
import { handleLoadBook } from './bookHandler';
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
  const [historyWords, setHistoryWords] = useState([]);
  
  // Custom translation setter that handles word extraction
  const customSetStudyLangSentence = (text) => {
    // Update the sentence state
    setStudyLangSentence(text);
    
    if (!text) return;
    
    // Extract all words
    const words = extractWords(text);
    
    // Process immediately for the UI
    processWords(words, tooHardWordsList, setNewWordsList, historyWords, setHistoryWords);
  };
  
  // Set source text and update state variables
  const setSourceTextAndVariables = (text, language) => {
    sourceText = text;
    setSourceLanguage(language);
    
    // Split into sentences
    sentences = splitIntoSentences(text);
    currentSentenceIndex = 0;
    
    // Reset adaptive sentences
    adaptiveSentences = [];
    currentAdaptiveIndex = 0;
  };
  
  // Update global state variables
  const setStateVariables = (newSentences, newIndex, newAdaptive, newAdaptiveIndex) => {
    sentences = newSentences;
    currentSentenceIndex = newIndex;
    adaptiveSentences = newAdaptive;
    currentAdaptiveIndex = newAdaptiveIndex;
  };
  
  useEffect(() => {
    const initialize = async () => {
      translateLabels(setUiText);
      loadStoredSettings(setUserQuery, setSpeechRate);
      
      const language = await getStoredStudyLanguage();
      setStudyLanguage(language);
      await detectLanguageCode(language);
      
      try {
        const savedTooHardWords = await AsyncStorage.getItem('tooHardWords');
        if (savedTooHardWords) {
          const parsedWords = JSON.parse(savedTooHardWords);
          tooHardWords = new Set(parsedWords);
          setTooHardWordsList(parsedWords);
        }
        
        const savedHistory = await AsyncStorage.getItem('historyWords');
        if (savedHistory) {
          setHistoryWords(JSON.parse(savedHistory));
        }
        
        const hasStoredBook = await AsyncStorage.getItem('bookSections');
        
        if (hasStoredBook) {
          const bookData = await getAllBookText();
          
          if (bookData && bookData.text) {
            setSourceTextAndVariables(bookData.text, bookData.language);
            
            const savedIndex = await AsyncStorage.getItem('currentSentenceIndex');
            if (savedIndex) {
              currentSentenceIndex = parseInt(savedIndex, 10);
            }
            
            const savedAdaptiveSentences = await AsyncStorage.getItem('adaptiveSentences');
            const savedAdaptiveIndex = await AsyncStorage.getItem('currentAdaptiveIndex');
            
            if (savedAdaptiveSentences) {
              adaptiveSentences = JSON.parse(savedAdaptiveSentences);
              if (savedAdaptiveIndex) {
                currentAdaptiveIndex = parseInt(savedAdaptiveIndex, 10);
              }
              
              if (adaptiveSentences.length > 0 && currentAdaptiveIndex < adaptiveSentences.length) {
                const adaptiveSentence = adaptiveSentences[currentAdaptiveIndex];
                await translateAndSetSentences(adaptiveSentence, bookData.language, customSetStudyLangSentence, setNativeLangSentence);
              } else {
                await handleNextSentence(
                  sentences, 
                  adaptiveSentences, 
                  currentSentenceIndex, 
                  currentAdaptiveIndex, 
                  tooHardWords,
                  sourceLanguage,
                  loadProgress, 
                  customSetStudyLangSentence, 
                  setNativeLangSentence, 
                  setLoadingBook,
                  setLoadProgress,
                  openaiKey
                );
              }
            } else if (sentences.length > 0) {
              await handleNextSentence(
                sentences, 
                adaptiveSentences, 
                currentSentenceIndex, 
                currentAdaptiveIndex, 
                tooHardWords,
                sourceLanguage,
                loadProgress, 
                customSetStudyLangSentence, 
                setNativeLangSentence, 
                setLoadingBook,
                setLoadProgress,
                openaiKey
              );
            }
            
            startBackgroundLoading(setLoadProgress);
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    
    initialize();
  }, []);

  // Process the current sentence when component mounts
  useEffect(() => {
    if (studyLangSentence) {
      const words = extractWords(studyLangSentence);
      processWords(words, tooHardWordsList, setNewWordsList, historyWords, setHistoryWords);
    }
  }, []);
  
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
  
  // Load book handler wrapper
  const loadBookHandler = async () => {
    await handleLoadBook(
      userQuery,
      setLoadingBook,
      text => sourceText = text,
      setSourceLanguage,
      setStateVariables,
      setLoadProgress,
      customSetStudyLangSentence,
      setNativeLangSentence,
      openaiKey
    );
  };
  
  // Process next sentence
  const processNextSentence = async () => {
    await handleNextSentence(
      sentences, 
      adaptiveSentences, 
      currentSentenceIndex, 
      currentAdaptiveIndex, 
      tooHardWords,
      sourceLanguage,
      loadProgress, 
      customSetStudyLangSentence, 
      setNativeLangSentence, 
      setLoadingBook,
      setLoadProgress,
      openaiKey
    );
  };
  
  // Word feedback handler wrapper
  const wordFeedbackHandler = async (words, isTooHard) => {
    await handleWordFeedback(
      words, 
      isTooHard, 
      tooHardWords, 
      setTooHardWordsList, 
      studyLangSentence, 
      setNewWordsList, 
      saveCurrentState
    );
  };

  // Clear history button handler
  const clearHistoryHandler = async () => {
    setShowConfirmation(true);
  };

  // Confirm clear history handler
  const confirmClearHistoryHandler = async () => {
    try {
      tooHardWords.clear();
      setTooHardWordsList([]);
      
      setHistoryWords([]);
      await AsyncStorage.removeItem('historyWords');
      
      adaptiveSentences = [];
      currentAdaptiveIndex = 0;
      
      await saveCurrentState();
      
      setShowConfirmation(false);
      
      if (sentences.length > 0) {
        const currentSourceIndex = Math.max(0, currentSentenceIndex - 1);
        const currentSourceSentence = sentences[currentSourceIndex];
        
        adaptiveSentences = await generateAdaptiveSentences(currentSourceSentence, tooHardWords, openaiKey);
        currentAdaptiveIndex = 0;
        
        await saveCurrentState();
        
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

  // Cancel clear history
  const cancelClearHistory = () => {
    setShowConfirmation(false);
  };
  
  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
      loadBook={loadBookHandler}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}
      speakSentence={toggleSpeak}
      nextSentence={processNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      onWordFeedback={wordFeedbackHandler}
      knownWords={tooHardWordsList}
      newWords={newWordsList}
      clearHistory={clearHistoryHandler}
      showConfirmation={showConfirmation}
      confirmClearHistory={confirmClearHistoryHandler}
      cancelClearHistory={cancelClearHistory}
      loadProgress={loadProgress}
      historyWords={historyWords}
    />
  );
}