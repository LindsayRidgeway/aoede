import React, { useState, useEffect } from 'react';
import { MainUI } from './UI';
import { fetchBookTextFromChatGPT } from './api';
import { loadBook } from './loadBook';
import { loadStoredSettings } from './loadStoredSettings';
import { speakSentenceWithPauses } from './listeningSpeed';
import { translateLabels } from './translateLabels';
import { translateText } from './api';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Re-added missing import

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
    
  useEffect(() => {
      const userLang = navigator.language.split('-')[0] || "en";
      
      translateLabels(setUiText);  // ✅ Now passes setUiText correctly
      loadStoredSettings(setUserQuery, setSpeechRate);
  }, []);

    return (
	<MainUI
	    uiText={uiText}
	    userQuery={userQuery}  
	    setUserQuery={(query) => updateUserQuery(query, setUserQuery)}
	    loadBook={() => loadBook(userQuery, setLoadingBook, setSentence, setDetectedLanguage, studyLanguage, setTranslatedSentence)}
	    sentence={translatedSentence}
	    showText={showText}
	    showTranslation={showTranslation}
	    setShowText={setShowText}
	    setShowTranslation={setShowTranslation}
	    speechRate={speechRate}
	    setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}
	    speakSentence={() => {
	      console.log(`🎯 DEBUG: Passing listeningSpeed: ${listeningSpeed}`);  // ✅ Log what’s passed
	      speakSentenceWithPauses(translatedSentence, listeningSpeed);
	    }}
	    loadingBook={loadingBook}
	    listeningSpeed={listeningSpeed}
            setListeningSpeed={setListeningSpeed}
            studyLanguage={studyLanguage}
            setStudyLanguage={setStudyLanguage}
	  />
  );
}
