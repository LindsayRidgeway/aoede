import React, { useState, useEffect } from 'react';

import { MainUI } from './UI';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { getStoredStudyLanguage, detectLanguageCode, detectedLanguageCode } from './listeningSpeed'; 
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple state variables for sentence adaptation
let sourceText = "";
let currentSentenceIndex = 0;
let sentences = [];
let knownWords = new Set();

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); // Sentence in study language
  const [nativeLangSentence, setNativeLangSentence] = useState(""); // Sentence in user's native language
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [knownWordsList, setKnownWordsList] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  
  useEffect(() => {
    const initialize = async () => {
      translateLabels(setUiText);
      loadStoredSettings(setUserQuery, setSpeechRate);
      
      // Load study language first - critical for initial translations
      const language = await getStoredStudyLanguage();
      setStudyLanguage(language);
      await detectLanguageCode(language);
      
      // Load known words
      try {
        const savedKnownWords = await AsyncStorage.getItem('knownWords');
        if (savedKnownWords) {
          knownWords = new Set(JSON.parse(savedKnownWords));
          setKnownWordsList(Array.from(knownWords));
        }
        
        // Load source text and language if available
        const savedSourceText = await AsyncStorage.getItem('sourceText');
        const savedSourceLang = await AsyncStorage.getItem('sourceLanguage');
        
        if (savedSourceText && savedSourceLang) {
          sourceText = savedSourceText;
          setSourceLanguage(savedSourceLang);
          sentences = splitIntoSentences(sourceText);
          
          // Load current position
          const savedIndex = await AsyncStorage.getItem('currentSentenceIndex');
          if (savedIndex) {
            currentSentenceIndex = parseInt(savedIndex, 10);
          }
          
          // Generate current sentence - with proper translations
          if (sentences.length > 0) {
            // Get the current sentence
            let sentence = "";
            if (currentSentenceIndex < sentences.length) {
              sentence = sentences[currentSentenceIndex];
            } else {
              currentSentenceIndex = 0;
              sentence = sentences[0];
            }
            
            // Now explicitly translate to both languages
            await translateAndSetSentences(sentence, savedSourceLang);
          }
        }
      } catch (error) {
        // Handle silently
      }
    };
    
    initialize();
  }, []);
  
  // Helper function to translate and set sentences in both languages
  const translateAndSetSentences = async (sentence, sourceLang) => {
    try {
      // Translate to study language
      const studyLangCode = detectedLanguageCode || "en";
      if (sourceLang !== studyLangCode) {
        const translatedToStudy = await translateText(sentence, sourceLang, studyLangCode);
        setStudyLangSentence(translatedToStudy.replace(/^"|"$/g, ""));
      } else {
        setStudyLangSentence(sentence);
      }
      
      // Translate to user's native language
      const nativeLang = navigator.language.split('-')[0] || "en";
      if (sourceLang !== nativeLang) {
        const translatedToNative = await translateText(sentence, sourceLang, nativeLang);
        setNativeLangSentence(translatedToNative.replace(/^"|"$/g, ""));
      } else {
        setNativeLangSentence(sentence);
      }
    } catch (error) {
      setStudyLangSentence("Error translating sentence.");
      setNativeLangSentence("Error translating sentence.");
    }
  };
  
  // Split text into sentences
  const splitIntoSentences = (text) => {
    return text.split(/(?<=[.!?])\s+/);
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
  
  // Save current state
  const saveCurrentState = async () => {
    try {
      await AsyncStorage.setItem('knownWords', JSON.stringify(Array.from(knownWords)));
      await AsyncStorage.setItem('sourceText', sourceText);
      await AsyncStorage.setItem('currentSentenceIndex', currentSentenceIndex.toString());
      await AsyncStorage.setItem('sourceLanguage', sourceLanguage);
    } catch (error) {
      // Handle silently
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
      
      // Save state
      await saveCurrentState();
      
      // Generate first sentence
      if (sentences.length > 0) {
        const sentence = sentences[0];
        await translateAndSetSentences(sentence, sourceLang);
      } else {
        setStudyLangSentence("No content available.");
        setNativeLangSentence("No content available.");
      }
    } catch (error) {
      setStudyLangSentence("Error loading content.");
      setNativeLangSentence("Error loading content.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle next sentence
  const handleNextSentence = async () => {
    if (sentences.length === 0) {
      setStudyLangSentence("No content available. Please load a book.");
      setNativeLangSentence("No content available. Please load a book.");
      return;
    }
    
    setLoadingBook(true);
    
    try {
      // Get next sentence
      let sentence = "";
      if (currentSentenceIndex < sentences.length) {
        sentence = sentences[currentSentenceIndex];
        currentSentenceIndex++;
      } else {
        currentSentenceIndex = 0;
        sentence = sentences[0];
      }
      
      // Save current position
      await saveCurrentState();
      
      // Translate to both languages
      await translateAndSetSentences(sentence, sourceLanguage);
    } catch (error) {
      setStudyLangSentence("Error generating sentence.");
      setNativeLangSentence("Error generating sentence.");
    } finally {
      setLoadingBook(false);
    }
  };
  
  // Handle word feedback
  const handleWordFeedback = async (words, isKnown) => {
    if (isKnown) {
      // Add words to known words
      words.forEach(word => knownWords.add(word.toLowerCase()));
    } else {
      // Remove words from known words
      words.forEach(word => knownWords.delete(word.toLowerCase()));
    }
    
    // Update state
    setKnownWordsList(Array.from(knownWords));
    await saveCurrentState();
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
      knownWords={knownWordsList}
    />
  );
}