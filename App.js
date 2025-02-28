import React, { useState, useEffect } from 'react';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { loadBook } from './loadBook';
import { loadStoredSettings } from './loadStoredSettings';
import { translateLabels } from './translateLabels';
import { updateSpeechRate } from './listeningSpeed';
import { updateUserQuery } from './updateUserQuery';
import { MainUI } from './UI';
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
  const [loadingBook, setLoadingBook] = useState(false);

  useEffect(() => {
      const userLang = navigator.language.split('-')[0] || "en";
      const labels = [
	"Calliope", "Source Material", "Enter a book title or genre", "Listen", "Next Sentence",
	"Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed"
      ];
      translateLabels(setUiText);  // ✅ Now passes setUiText correctly
      loadStoredSettings(setUserQuery, setSpeechRate);
  }, []);

  return (
    <MainUI
        uiText={uiText}
        userQuery={userQuery}  
        setUserQuery={(query) => updateUserQuery(query, setUserQuery)}  // ✅ Ensure correct function call
       loadBook={() => loadBook(userQuery, setLoadingBook, setSentence, setDetectedLanguage, studyLanguage, setTranslatedSentence)}  // ✅ Now correctly passing parameters

	sentence={translatedSentence}
	showText={showText}
	showTranslation={showTranslation}
	setShowText={setShowText}
	setShowTranslation={setShowTranslation}
        speechRate={speechRate}
        setSpeechRate={(rate) => updateSpeechRate(rate, setSpeechRate)}  // ✅ Correctly passing parameters     
	speakSentence={() => {
	  if (!translatedSentence) return;
	  Speech.stop();
	  Speech.speak(translatedSentence, { rate: speechRate, language: studyLanguage });
	}}
	loadingBook={loadingBook}
    />
  );
}
