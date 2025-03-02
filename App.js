import React, { useState, useEffect } from 'react';

import { MainUI } from './UI';
import { fetchBookTextFromChatGPT } from './api';
import { getStoredStudyLanguage, detectLanguageCode } from './listeningSpeed'; 
import { loadBook } from './loadBook';
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses, stopSpeaking } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { translateText } from './api';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';

import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");  
  const [sentence, setSentence] = useState("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [studyLanguage, setStudyLanguage] = useState("ru");
  const [listeningSpeed, setListeningSpeed] = useState(1.0);
  const [loadingBook, setLoadingBook] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    translateLabels(setUiText);
    loadStoredSettings(setUserQuery, setSpeechRate);

    getStoredStudyLanguage().then(async (language) => {
      setStudyLanguage(language);
      await detectLanguageCode(language);
    });
  }, []);
  
  // Toggle speak function
  const toggleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakSentenceWithPauses(sentence, listeningSpeed, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
  };
  
  // Handle book loading
  const handleLoadBook = () => {
    loadBook(
      userQuery, 
      setLoadingBook, 
      setSentence, 
      setDetectedLanguage, 
      studyLanguage, 
      setTranslatedSentence
    );
  };
    
  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}  
      setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
      loadBook={handleLoadBook}
      sentence={sentence}
      translatedSentence={translatedSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}
      speakSentence={toggleSpeak}
      isSpeaking={isSpeaking}
      loadingBook={loadingBook}
      listeningSpeed={listeningSpeed}
      setListeningSpeed={setListeningSpeed}
      studyLanguage={studyLanguage}
      setStudyLanguage={setStudyLanguage}
    />
  );
}