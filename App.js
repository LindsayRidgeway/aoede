import React, { useState, useEffect } from 'react';
import { MainUI } from './UI';
import { fetchBookTextFromChatGPT, fetchNextBookSection, getAllBookText, translateText } from './api';
import { getStoredStudyLanguage, detectLanguageCode, detectedLanguageCode } from './listeningSpeed'; 
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import { handleNextSentence } from './sentenceProcessor';
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
  
  // Extract words from text (works with any script)
  const extractWords = (text) => {
    if (!text) return [];
    
    // First split by whitespace to get initial words
    const wordCandidates = text.split(/\s+/);
    
    // Clean punctuation from each word individually
    const cleaned = wordCandidates.map(word => 
      word.replace(/[^\p{L}\p{N}]/gu, '') // Remove anything that's not a letter or number
    );
    
    // Remove empty strings
    return cleaned.filter(word => word && word.length > 0);
  };
  
  // Custom translation setter that handles word extraction
  const customSetStudyLangSentence = (text) => {
    console.log("Setting study lang sentence:", text);
    
    // Update the sentence state
    setStudyLangSentence(text);
    
    if (!text) return;
    
    // Extract all words
    const words = extractWords(text);
    console.log("Extracted words:", words);
    
    // Process immediately for the UI
    processWords(words);
  };
  
  // Process words for both lists
  const processWords = (words) => {
    if (!words || words.length === 0) return;
    
    // Filter out words that have been marked as too hard
    const lowerCaseTooHardWords = new Set(tooHardWordsList.map(w => w.toLowerCase()));
    const newWords = words.filter(word => 
      !lowerCaseTooHardWords.has(word.toLowerCase())
    );
    
    console.log("Setting newWordsList:", newWords);
    
    // Update new words list
    setNewWordsList([...newWords]);
    
    // Add all words to history
    updateHistoryWords(words);
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
            sourceText = bookData.text;
            setSourceLanguage(bookData.language);
            sentences = splitIntoSentences(sourceText);
            
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
      processWords(words);
    }
  }, []);
  
  // Function to update history words
  const updateHistoryWords = async (wordsToAdd) => {
    try {
      if (!wordsToAdd || wordsToAdd.length === 0) return;
      
      let currentHistory = [...historyWords];
      const lowerHistoryWords = new Set(currentHistory.map(w => w.toLowerCase()));
      
      let updated = false;
      for (const word of wordsToAdd) {
        if (!word || word.length === 0) continue;
        
        if (!lowerHistoryWords.has(word.toLowerCase())) {
          currentHistory.push(word);
          lowerHistoryWords.add(word.toLowerCase());
          updated = true;
        }
      }
      
      if (updated) {
        currentHistory.sort();
        setHistoryWords(currentHistory);
        await AsyncStorage.setItem('historyWords', JSON.stringify(currentHistory));
      }
    } catch (error) {
      console.error("Error updating history words:", error);
    }
  };
  
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
      const { text, language } = await fetchBookTextFromChatGPT(userQuery);
      
      sourceText = text;
      const sourceLang = language || "en";
      setSourceLanguage(sourceLang);
      
      sentences = splitIntoSentences(sourceText);
      currentSentenceIndex = 0;
      
      adaptiveSentences = [];
      currentAdaptiveIndex = 0;
      
      setLoadProgress({ sections: 1, loading: false, complete: false });
      
      await saveCurrentState();
      
      if (sentences.length > 0) {
        await handleNextSentence(
          sentences, 
          adaptiveSentences, 
          currentSentenceIndex, 
          currentAdaptiveIndex, 
          tooHardWords,
          sourceLang,
          loadProgress, 
          customSetStudyLangSentence, 
          setNativeLangSentence, 
          setLoadingBook,
          setLoadProgress,
          openaiKey
        );
      }
      
      startBackgroundLoading(setLoadProgress);
    } catch (error) {
      console.error("Error loading book:", error);
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
    }
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
  
  // Handle word feedback
  const handleWordFeedback = async (words, isTooHard) => {
    if (isTooHard) {
      words.forEach(word => tooHardWords.add(word.toLowerCase()));
      
      const updatedTooHardList = Array.from(tooHardWords);
      setTooHardWordsList(updatedTooHardList);
      
      if (studyLangSentence) {
        const allWords = extractWords(studyLangSentence);
        const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
        const filteredNewWords = allWords.filter(word => 
          !lowerCaseTooHardWords.has(word.toLowerCase())
        );
        
        setNewWordsList(filteredNewWords);
      }
    } else {
      words.forEach(word => tooHardWords.delete(word.toLowerCase()));
      
      const updatedTooHardList = Array.from(tooHardWords);
      setTooHardWordsList(updatedTooHardList);
      
      if (studyLangSentence) {
        const allWords = extractWords(studyLangSentence);
        const lowerCaseTooHardWords = new Set(updatedTooHardList.map(w => w.toLowerCase()));
        const filteredNewWords = allWords.filter(word => 
          !lowerCaseTooHardWords.has(word.toLowerCase())
        );
        
        setNewWordsList(filteredNewWords);
      }
    }
    
    await saveCurrentState();
  };

  // Clear history
  const clearHistory = async () => {
    setShowConfirmation(true);
  };

  // Confirm clear history
  const confirmClearHistory = async () => {
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
      nextSentence={processNextSentence}
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
      historyWords={historyWords}
    />
  );
}