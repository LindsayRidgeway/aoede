import React, { useState, useEffect } from 'react';
import { fetchBookTextFromChatGPT, translateText } from './api';
import { MainUI } from './UI';
import * as Speech from 'expo-speech';

export default function App() {
  const [uiText, setUiText] = useState({});
  const [userQuery, setUserQuery] = useState("");
  const [sentence, setSentence] = useState("");
  const [translatedSentence, setTranslatedSentence] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [showText, setShowText] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);

  useEffect(() => {
    const userLang = navigator.language.split('-')[0] || "en";
    const labels = [
      "Calliope", "Enter a book title or genre", "Play", "Next Sentence",
      "Load Book", "Show Foreign Sentence", "Show Translation", "Reading Speed"
    ];

    const translateLabels = async () => {
      const translatedLabels = await Promise.all(labels.map(label => translateText(label, "en", userLang)));
      setUiText({
        appName: translatedLabels[0],
        enterBook: translatedLabels[1],
        play: translatedLabels[2],
        next: translatedLabels[3],
        loadBook: translatedLabels[4],
        showText: translatedLabels[5],
        showTranslation: translatedLabels[6],
        readingSpeed: translatedLabels[7]
      });
    };

    translateLabels();
  }, []);

  const loadBook = async () => {
    if (!userQuery) return;
    const { text, language } = await fetchBookTextFromChatGPT(userQuery);
    setSentence(text);
    setDetectedLanguage(language || "en");

    if (language !== "ru") {
      translateText(text, language || "en", "ru").then(setTranslatedSentence);
    } else {
      setTranslatedSentence(text);
    }
  };

  const speakSentence = () => {
    Speech.stop();
    Speech.getAvailableVoicesAsync().then(voices => {
      const russianVoice = voices.find(voice => voice.language.startsWith('ru'));
      Speech.speak(sentence || "", {
        rate: speechRate,
        language: "ru",
        voice: russianVoice ? russianVoice.identifier : undefined
      });
    });
  };

  const nextSentence = () => {
    setSentence("");  
    setTranslatedSentence(""); 
  };

  return (
    <MainUI
      uiText={uiText}
      userQuery={userQuery}
      setUserQuery={setUserQuery}
      loadBook={loadBook}
      sentence={sentence}
      translatedSentence={translatedSentence}
      showText={showText}
      showTranslation={showTranslation}
      setShowText={setShowText}
      setShowTranslation={setShowTranslation}
      speechRate={speechRate}
      setSpeechRate={setSpeechRate}
      speakSentence={speakSentence}   // ✅ Restored Listen function
      nextSentence={nextSentence}     // ✅ Restored Next Sentence function
    />
  );
}