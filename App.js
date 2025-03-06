import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { MainUI } from './UI';
import ListeningSpeed from './listeningSpeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateLabels } from './translateLabels';
import { loadContent } from './contentLoader';
import { toggleSpeak, processNextSentence } from './audioControls';

export default function App() {
  const [uiText, setUiText] = useState({});
  const [selectedBook, setSelectedBook] = useState("");  
  const [studyLangSentence, setStudyLangSentence] = useState(""); 
  const [nativeLangSentence, setNativeLangSentence] = useState(""); 
  const [showText, setShowText] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("");
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [sourceLanguage, setSourceLanguage] = useState("en");
  
  // Initialize the app
  useEffect(() => {
    const initialize = async () => {
      try {
        translateLabels(setUiText);
        
        // Load stored settings
        try {
          const storedSelectedBook = await AsyncStorage.getItem("selectedBook");
          const storedSpeechRate = await AsyncStorage.getItem("speechRate");
          
          if (storedSelectedBook !== null) {
            setSelectedBook(storedSelectedBook);
          }
          
          if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
          }
        } catch (error) {
          console.error("Error loading stored settings:", error);
        }
        
        const language = await ListeningSpeed.getStoredStudyLanguage();
        setStudyLanguage(language);
        await ListeningSpeed.detectLanguageCode(language);
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
    
    initialize();
  }, []);
  
  // Handle speak button click
  const handleToggleSpeak = () => {
    toggleSpeak(isSpeaking, setIsSpeaking, studyLangSentence, listeningSpeed);
  };
  
  // Handle next sentence button click
  const handleNextSentence = () => {
    processNextSentence(
      sentences, 
      currentSentenceIndex, 
      setCurrentSentenceIndex,
      setStudyLangSentence, 
      setNativeLangSentence, 
      Alert.alert
    );
  };
  
  // Handle book selection change
  const handleBookChange = async (bookId) => {
    setSelectedBook(bookId);
    try {
      await AsyncStorage.setItem("selectedBook", bookId);
    } catch (error) {
      console.error("Error saving selectedBook:", error);
    }
  };
  
  // Handle load book button click
  const handleLoadBook = async () => {
    await loadContent(
      selectedBook,
      studyLanguage,
      setLoadingBook,
      setSentences,
      setStudyLangSentence,
      setNativeLangSentence,
      setSourceLanguage,
      setCurrentSentenceIndex
    );
  };
  
  return (
    <MainUI
      uiText={uiText}
      selectedBook={selectedBook}
      setSelectedBook={handleBookChange}
      loadBook={handleLoadBook}
      sentence={studyLangSentence}
      translatedSentence={nativeLangSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={handleToggleSpeak}
      nextSentence={handleNextSentence}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
      currentSentenceIndex={currentSentenceIndex}
      totalSentences={sentences.length}
    />
  );
}